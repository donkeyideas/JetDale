// ============================================================
// Jetdale — AI Chat Edge Function (Workspace Chat)
// Handles conversational AI within the project workspace.
// Users can ask questions, request artifact changes, and get
// planning guidance. Streams responses via SSE.
//
// Actions:
//   - send_message: Save user message, load context, stream AI, save response
//   - get_history: Load last N messages for a project
// ============================================================

import { getAuthUser, getAdminClient, AuthError } from '../_shared/auth.ts';
import { callAIStream } from '../_shared/deepseek.ts';
import { checkAIRateLimit } from '../_shared/rate-limit.ts';
import {
  sseResponse,
  jsonResponse,
  errorResponse,
  corsResponse,
  rateLimitResponse,
} from '../_shared/response.ts';

// ------------------------------------------------------------
// Constants
// ------------------------------------------------------------

const MAX_HISTORY_MESSAGES = 50;
const CONTEXT_MESSAGE_COUNT = 20;
const AI_MODEL = 'deepseek-v4-flash' as const;

const BANNED_PHRASES: Record<string, string> = {
  'delve': 'explore',
  'leverage': 'use',
  'robust': 'strong',
  'cutting-edge': 'modern',
  'seamless': 'smooth',
  'navigate': 'move through',
  'harness the power': 'use',
  'harness': 'use',
  'unlock the potential': 'enable',
  'unlock': 'enable',
  'game-changer': 'significant change',
  'paradigm shift': 'major change',
  'paradigm': 'approach',
  'synergy': 'combined effect',
  'holistic': 'comprehensive',
  'streamline': 'simplify',
  'spearhead': 'lead',
};

// ------------------------------------------------------------
// Entry point
// ------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    const user = await getAuthUser(req);
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'send_message':
        return await handleSendMessage(user, body);
      case 'get_history':
        return await handleGetHistory(user, body);
      default:
        return errorResponse(`Unknown action: ${action}`, 400);
    }
  } catch (err) {
    if (err instanceof AuthError) {
      return errorResponse(err.message, err.status);
    }
    console.error('ai-chat error:', err);
    return errorResponse('Internal server error', 500);
  }
});

// ------------------------------------------------------------
// ACTION: send_message
// Save user message, load context, stream AI response, save AI response.
// ------------------------------------------------------------

async function handleSendMessage(
  user: { id: string; email: string; planTier: string },
  body: {
    projectId: string;
    message: string;
    artifactContext?: string; // artifact type currently open, e.g. "roadmap"
  },
) {
  const { projectId, message, artifactContext } = body;

  if (!projectId) {
    return errorResponse('projectId is required', 400);
  }
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return errorResponse('message is required and must be non-empty', 400);
  }

  const admin = getAdminClient();

  // ---- Verify user owns the project ----
  const { data: project } = await admin
    .from('projects')
    .select('id, name, archetype_id, phase, status')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single();

  if (!project) {
    return errorResponse('Project not found', 404);
  }

  // ---- Rate limit ----
  const rateCheck = await checkAIRateLimit(user.id, user.planTier);
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfter!);
  }

  // ---- Save user message ----
  const referencedArtifactIds: string[] = [];

  // If an artifact context was specified, look up the current artifact id
  if (artifactContext) {
    const { data: contextArtifact } = await admin
      .from('artifacts')
      .select('id')
      .eq('project_id', projectId)
      .eq('type', artifactContext)
      .eq('is_current', true)
      .single();

    if (contextArtifact) {
      referencedArtifactIds.push(contextArtifact.id);
    }
  }

  const { error: userMsgErr } = await admin.from('chat_messages').insert({
    project_id: projectId,
    user_id: user.id,
    role: 'user',
    content: message.trim(),
    references_artifact_ids: referencedArtifactIds.length > 0 ? referencedArtifactIds : null,
  });

  if (userMsgErr) {
    console.error('Failed to save user message:', userMsgErr);
    return errorResponse('Failed to save message', 500);
  }

  // ---- Load context ----
  // 1. Chat history (last N messages for this project)
  const { data: history } = await admin
    .from('chat_messages')
    .select('role, content, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(CONTEXT_MESSAGE_COUNT);

  // Reverse so oldest first (query was DESC for limit, we need chronological order)
  const chatHistory = (history || []).reverse();

  // 2. Project archetype info
  let archetypeSlug = 'unknown';
  if (project.archetype_id) {
    const { data: archetype } = await admin
      .from('archetypes')
      .select('slug')
      .eq('id', project.archetype_id)
      .single();
    if (archetype) {
      archetypeSlug = archetype.slug;
    }
  }

  // 3. Currently active artifact content (if user has one open)
  let artifactBlock = '';
  if (artifactContext) {
    const { data: activeArtifact } = await admin
      .from('artifacts')
      .select('type, title, content_markdown')
      .eq('project_id', projectId)
      .eq('type', artifactContext)
      .eq('is_current', true)
      .eq('status', 'ready')
      .single();

    if (activeArtifact?.content_markdown) {
      artifactBlock = `
=== CURRENTLY OPEN ARTIFACT: ${activeArtifact.type.toUpperCase()} ===
${activeArtifact.title ? `Title: ${activeArtifact.title}` : ''}
${activeArtifact.content_markdown}
=== END ARTIFACT ===`;
    }
  }

  // ---- Build messages for AI ----
  const systemPrompt = buildSystemPrompt(
    project.name,
    archetypeSlug,
    project.phase,
    artifactBlock,
  );

  const aiMessages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  // Add chat history (skip system messages, keep user + assistant)
  for (const msg of chatHistory) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      aiMessages.push({ role: msg.role, content: msg.content });
    }
  }

  // The latest user message is already in chatHistory (we inserted it above),
  // but we ensure the conversation ends with the user's message.
  // If the last message in our array is not the current user message, add it.
  const lastMsg = aiMessages[aiMessages.length - 1];
  if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== message.trim()) {
    aiMessages.push({ role: 'user', content: message.trim() });
  }

  // ---- Stream AI response ----
  const { stream: aiStream, done: aiDone } = callAIStream({
    model: AI_MODEL,
    eventType: 'workspace_chat',
    userId: user.id,
    projectId,
    messages: aiMessages,
    maxTokens: 2000,
    temperature: 0.5,
  });

  // Wrap the AI stream to:
  //  - Remap { text: "..." } chunks to { token: "..." } for the client
  //  - Accumulate the full response text
  //  - Save the AI message to chat_messages after the stream ends
  //  - Send a final { done: true } event
  let fullResponse = '';
  const encoder = new TextEncoder();

  const wrappedStream = new ReadableStream({
    async start(controller) {
      const reader = aiStream.getReader();
      try {
        while (true) {
          const { done: readerDone, value } = await reader.read();
          if (readerDone) break;

          // Decode and process each SSE line from the underlying stream
          const text = new TextDecoder().decode(value);
          const lines = text.split('\n');

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;

            const payload = line.slice(6).trim();
            if (!payload) continue;

            try {
              const parsed = JSON.parse(payload);

              if (parsed.text) {
                // Accumulate full response
                fullResponse += parsed.text;

                // Forward as { token: "..." } for the client
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ token: parsed.text })}\n\n`,
                  ),
                );
              }

              if (parsed.done) {
                // The underlying stream signaled completion — we handle our own done event below
              }
            } catch {
              // Unparseable line, skip
            }
          }
        }

        // Clean banned phrases from the full response
        const cleanedResponse = cleanBannedPhrases(fullResponse);

        // Send done event to client
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`),
        );
        controller.close();

        // Save the AI response to chat_messages (fire-and-forget, non-blocking for the stream)
        const aiStats = await aiDone;

        await admin.from('chat_messages').insert({
          project_id: projectId,
          user_id: user.id,
          role: 'assistant',
          content: cleanedResponse,
          references_artifact_ids: referencedArtifactIds.length > 0 ? referencedArtifactIds : null,
          prompt_tokens: aiStats.promptTokens,
          completion_tokens: aiStats.completionTokens,
          cost_cents: aiStats.costCents,
        });

        // Update project last_activity_at
        await admin
          .from('projects')
          .update({ last_activity_at: new Date().toISOString() })
          .eq('id', projectId);
      } catch (err) {
        console.error('ai-chat stream error:', err);
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`,
            ),
          );
          controller.close();
        } catch {
          // Controller may already be closed
        }

        // Still try to save whatever we accumulated
        if (fullResponse.length > 0) {
          const cleaned = cleanBannedPhrases(fullResponse);
          await admin.from('chat_messages').insert({
            project_id: projectId,
            user_id: user.id,
            role: 'assistant',
            content: cleaned + '\n\n[Response was interrupted]',
            references_artifact_ids: referencedArtifactIds.length > 0 ? referencedArtifactIds : null,
          });
        }
      }
    },
  });

  return sseResponse(wrappedStream);
}

// ------------------------------------------------------------
// ACTION: get_history
// Load last N messages for a project.
// ------------------------------------------------------------

async function handleGetHistory(
  user: { id: string },
  body: { projectId: string; limit?: number },
) {
  const { projectId } = body;

  if (!projectId) {
    return errorResponse('projectId is required', 400);
  }

  const admin = getAdminClient();

  // Verify user owns the project
  const { data: project } = await admin
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single();

  if (!project) {
    return errorResponse('Project not found', 404);
  }

  const messageLimit = Math.min(body.limit ?? MAX_HISTORY_MESSAGES, MAX_HISTORY_MESSAGES);

  const { data: messages, error: messagesErr } = await admin
    .from('chat_messages')
    .select('id, role, content, references_artifact_ids, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(messageLimit);

  if (messagesErr) {
    console.error('Failed to load chat history:', messagesErr);
    return errorResponse('Failed to load chat history', 500);
  }

  // Return in chronological order (oldest first)
  const chronological = (messages || []).reverse();

  return jsonResponse({ messages: chronological });
}

// ------------------------------------------------------------
// System prompt builder
// ------------------------------------------------------------

function buildSystemPrompt(
  projectName: string,
  archetypeSlug: string,
  projectPhase: string,
  artifactBlock: string,
): string {
  const archetypeDescriptions: Record<string, string> = {
    indie_software:
      'The user is building an indie software product (SaaS, web app, mobile app, or developer tool). You understand distribution, pricing, and bootstrapped growth.',
    ai_built_app:
      'The user is building an application using AI coding tools (Lovable, Cursor, Claude Code, Bolt, Replit). You understand the capabilities and limits of AI-assisted development.',
    mobile_game:
      'The user is building a mobile or indie game. You understand scope creep in game development, monetization models, and realistic timelines.',
    wedding_event:
      'The user is planning a wedding or event. You understand vendor coordination, budget allocation, timeline management, and guest experience.',
    home_renovation:
      'The user is planning a home renovation. You understand contractor selection, permitting, realistic budgets, and common pitfalls.',
  };

  const archetypeContext = archetypeDescriptions[archetypeSlug]
    || 'The user is working on a project that involves planning and execution.';

  return `You are a project planning assistant for "${projectName}" inside Jetdale, a project planning tool.

${archetypeContext}

The project is currently in the "${projectPhase}" phase.
${artifactBlock}

YOUR ROLE:
- Answer questions about the project, its artifacts, and next steps.
- When the user asks about a specific artifact, reference the artifact content provided above.
- Suggest concrete improvements to artifacts when asked. Describe what should change and why.
- Give honest, specific advice grounded in the project's actual details.
- If the user's plan has gaps or risks, point them out directly.
- Keep responses focused and useful. Avoid filler.

RESPONSE FORMAT:
- Use markdown for structure when helpful (headers, bullet points, bold).
- Keep responses concise: aim for 100-400 words unless the user asks for something detailed.
- For artifact change suggestions, clearly state what section to modify and what the new content should be.

RULES:
- Never use these words or phrases: delve, leverage, robust, cutting-edge, seamless, navigate, harness, unlock, game-changer, paradigm, synergy, holistic, streamline, spearhead.
- Do not use emojis.
- Do not start responses with "Great question!" or similar filler.
- Be direct. If something is a bad idea, say so with a reason.
- If you do not have enough context to answer well, say what information you need.`;
}

// ------------------------------------------------------------
// Utility: clean banned phrases from AI output
// ------------------------------------------------------------

function cleanBannedPhrases(text: string): string {
  let cleaned = text;
  for (const [phrase, replacement] of Object.entries(BANNED_PHRASES)) {
    const regex = new RegExp(phrase, 'gi');
    cleaned = cleaned.replace(regex, replacement);
  }
  return cleaned;
}
