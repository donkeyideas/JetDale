// ============================================================
// Jetdale — AI Discovery Edge Function
// Handles the full discovery interview flow:
//   - start: detect archetype, create project + session
//   - get_question: return current question data
//   - answer: save answer, stream AI response, advance step
//   - save_draft: auto-save draft answers
// ============================================================

import { getAuthUser, getAdminClient, getUserClient, AuthError } from '../_shared/auth.ts';
import { callAIStream, callAI } from '../_shared/deepseek.ts';
import { checkAIRateLimit } from '../_shared/rate-limit.ts';
import { checkQuota, incrementQuota } from '../_shared/quota-check.ts';
import { jsonResponse, errorResponse, sseResponse, corsResponse, rateLimitResponse, limitExceededResponse } from '../_shared/response.ts';

// Inline archetype question data — loaded from discovery answers and archetype scripts.
// In production, these are loaded dynamically from the shared package.
// For Edge Functions (Deno), we duplicate the core routing logic.

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    const user = await getAuthUser(req);
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'start':
        return await handleStart(user, body);
      case 'get_question':
        return await handleGetQuestion(user, body);
      case 'answer':
        return await handleAnswer(req, user, body);
      case 'save_draft':
        return await handleSaveDraft(user, body);
      default:
        return errorResponse(`Unknown action: ${action}`, 400);
    }
  } catch (err) {
    if (err instanceof AuthError) {
      return errorResponse(err.message, err.status);
    }
    console.error('ai-discovery error:', err);
    return errorResponse('Internal server error', 500);
  }
});

// ============================================================
// ACTION: start — Create project + discovery session
// ============================================================

async function handleStart(
  user: { id: string; email: string; planTier: string },
  body: { ideaText?: string; archetypeSlug?: string },
) {
  const admin = getAdminClient();

  // Check project quota
  const quotaCheck = await checkQuota(user.id, user.planTier, 'projectsPerMonth');
  if (!quotaCheck.allowed) {
    return limitExceededResponse(quotaCheck.limit!, quotaCheck.current!, quotaCheck.max!);
  }

  let archetypeSlug = body.archetypeSlug;
  let projectName = 'Untitled project';

  // If no archetype provided, detect from ideaText
  if (!archetypeSlug && body.ideaText) {
    const detectionResult = await callAI({
      model: 'deepseek-v4-flash',
      eventType: 'discovery_question',
      userId: user.id,
      messages: [
        {
          role: 'system',
          content: `You are a project classifier. Given a one-sentence project description, determine which category it fits best. Respond with ONLY a JSON object: { "slug": "<archetype_slug>", "name": "<short_project_name>" }

Valid slugs:
- indie_software: SaaS, web apps, mobile apps, developer tools, browser extensions, marketplaces
- ai_built_app: Projects being built with AI coding tools (Lovable, Cursor, Claude Code, Bolt, Replit)
- mobile_game: Mobile games, PC games, indie games
- wedding_event: Weddings, corporate events, parties, fundraisers, galas
- home_renovation: Kitchen remodel, bathroom renovation, home addition, full renovation, basement finish

If unsure, default to indie_software.`,
        },
        {
          role: 'user',
          content: body.ideaText,
        },
      ],
      maxTokens: 100,
      temperature: 0.1,
    });

    try {
      const parsed = JSON.parse(detectionResult.content);
      archetypeSlug = parsed.slug || 'indie_software';
      projectName = parsed.name || 'Untitled project';
    } catch {
      archetypeSlug = 'indie_software';
    }
  }

  // Validate archetype exists and get its id + script_version
  const { data: archetype } = await admin
    .from('archetypes')
    .select('id, slug, question_count, script_version')
    .eq('slug', archetypeSlug)
    .eq('is_active', true)
    .single();

  if (!archetype) {
    return errorResponse(`Unknown or inactive archetype: ${archetypeSlug}`, 400);
  }

  // Create project — use archetype_id (uuid FK), not archetype_slug
  const { data: project, error: projectErr } = await admin
    .from('projects')
    .insert({
      user_id: user.id,
      name: projectName,
      archetype_id: archetype.id,
      phase: 'discovery',
      status: 'active',
      progress_pct: 0,
    })
    .select('id')
    .single();

  if (projectErr || !project) {
    return errorResponse('Failed to create project', 500);
  }

  // Create discovery session — use archetype_id, archetype_script_version,
  // current_question_index, total_questions (not slug/step columns)
  const { data: session, error: sessionErr } = await admin
    .from('discovery_sessions')
    .insert({
      project_id: project.id,
      user_id: user.id,
      archetype_id: archetype.id,
      archetype_script_version: archetype.script_version,
      status: 'in_progress',
      current_question_index: 0,
      total_questions: archetype.question_count,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (sessionErr || !session) {
    return errorResponse('Failed to create discovery session', 500);
  }

  // If ideaText was provided, save it as the first answer
  // question_index (not step_index), question_text is required,
  // answer_value must be jsonb
  if (body.ideaText) {
    await admin.from('discovery_answers').insert({
      session_id: session.id,
      question_key: 'spark',
      question_text: 'Describe your project idea in one sentence.',
      question_type: 'open_text',
      answer_value: JSON.stringify(body.ideaText),
      answer_text: body.ideaText,
      question_index: 0,
    });
  }

  // Increment project quota
  await incrementQuota(user.id, 'projects_created');

  return jsonResponse({
    sessionId: session.id,
    projectId: project.id,
    archetypeSlug,
    totalQuestions: archetype.question_count,
  });
}

// ============================================================
// ACTION: get_question — Return current question data
// ============================================================

async function handleGetQuestion(
  user: { id: string },
  body: { sessionId: string; step: number },
) {
  const admin = getAdminClient();

  // Load session — join through archetypes to get the slug
  // (projects doesn't have archetype_slug; it has archetype_id FK to archetypes)
  const { data: session } = await admin
    .from('discovery_sessions')
    .select('*, archetypes(slug)')
    .eq('id', body.sessionId)
    .eq('user_id', user.id)
    .single();

  if (!session) {
    return errorResponse('Session not found', 404);
  }

  // Get archetype slug from the joined archetypes table
  const archetypeSlug = (session as any).archetypes?.slug;

  // Load existing answers to provide context — use question_index (not step_index)
  const { data: answers } = await admin
    .from('discovery_answers')
    .select('question_key, answer_text, answer_value, question_index')
    .eq('session_id', body.sessionId)
    .order('question_index', { ascending: true });

  // Load previous AI response for context
  const { data: prevAiEvent } = await admin
    .from('ai_events')
    .select('created_at')
    .eq('project_id', session.project_id)
    .eq('event_type', 'discovery_answer')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Check for draft at this step — use question_index
  const existingAnswer = answers?.find((a: any) => a.question_index === body.step);

  return jsonResponse({
    id: session.id,
    projectId: session.project_id,
    archetypeSlug,
    totalQuestions: session.total_questions,
    currentStep: body.step,
    currentQuestion: {
      // The actual question content is loaded client-side from the archetype definition.
      // The server provides session state and existing answers.
      step: body.step,
      archetypeSlug,
    },
    existingAnswers: answers || [],
    draftAnswer: existingAnswer
      ? { text: existingAnswer.answer_text, value: existingAnswer.answer_value }
      : null,
    aiHint: null, // Previous AI response loaded client-side from chat history
  });
}

// ============================================================
// ACTION: answer — Save answer + stream AI response
// ============================================================

async function handleAnswer(
  req: Request,
  user: { id: string; planTier: string },
  body: {
    sessionId: string;
    step: number;
    answer: { type: string; value: unknown; text: string; questionText?: string };
  },
) {
  const admin = getAdminClient();

  // Rate limit check
  const rateCheck = await checkAIRateLimit(user.id, user.planTier);
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfter!);
  }

  // Load session — use correct column names: archetype_id, total_questions, current_question_index
  // Join archetypes to get slug for the AI prompt persona lookup
  const { data: session } = await admin
    .from('discovery_sessions')
    .select('id, project_id, archetype_id, total_questions, current_question_index, archetypes(slug)')
    .eq('id', body.sessionId)
    .eq('user_id', user.id)
    .single();

  if (!session) {
    return errorResponse('Session not found', 404);
  }

  const archetypeSlug = (session as any).archetypes?.slug;

  // Save answer (upsert by session + question_index)
  // question_index (not step_index), question_text is required,
  // answer_value must be jsonb (pass object/value, not stringified text)
  const { error: answerErr } = await admin
    .from('discovery_answers')
    .upsert(
      {
        session_id: session.id,
        question_key: `step_${body.step}`,
        question_text: body.answer.questionText || `Question ${body.step + 1}`,
        question_type: body.answer.type,
        answer_value: typeof body.answer.value === 'string'
          ? JSON.stringify(body.answer.value)
          : JSON.stringify(body.answer.value),
        answer_text: body.answer.text,
        question_index: body.step,
      },
      { onConflict: 'session_id,question_index' },
    );

  if (answerErr) {
    console.error('Failed to save answer:', answerErr);
    return errorResponse('Failed to save answer', 500);
  }

  // Load all answers for conversation context — use question_index
  const { data: allAnswers } = await admin
    .from('discovery_answers')
    .select('question_key, answer_text, question_index')
    .eq('session_id', session.id)
    .order('question_index', { ascending: true });

  // Build conversation history for the AI
  const conversationHistory = (allAnswers || []).map((a: any) => ({
    role: 'user' as const,
    content: `[Q${a.question_index + 1}] ${a.answer_text}`,
  }));

  // Calculate next step
  const nextStep = body.step + 1 >= session.total_questions ? -1 : body.step + 1;

  // Build the AI prompt
  const systemPrompt = buildQuickDiscoveryPrompt(archetypeSlug, body.step, session.total_questions);

  const userMessage = `The user answered: "${body.answer.text}"

${nextStep === -1 ? 'This was the final question. Give a brief wrap-up acknowledging their work and expressing excitement about generating their planning documents.' : 'Acknowledge their answer with a brief, specific insight, then transition naturally.'}`;

  // Stream AI response
  const { stream, done } = callAIStream({
    model: 'deepseek-v4-flash',
    eventType: 'discovery_answer',
    userId: user.id,
    projectId: session.project_id,
    messages: [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10), // Last 10 exchanges for context
      { role: 'user', content: userMessage },
    ],
    maxTokens: 300,
    temperature: 0.6,
  });

  // Create a wrapped stream that appends the nextStep info after AI response
  const encoder = new TextEncoder();
  const wrappedStream = new ReadableStream({
    async start(controller) {
      const reader = stream.getReader();
      try {
        while (true) {
          const { done: readerDone, value } = await reader.read();
          if (readerDone) break;

          // Forward the AI stream data, remapping 'text' to 'token' for client
          const text = new TextDecoder().decode(value);
          const lines = text.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(line.slice(6));
                if (parsed.text) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ token: parsed.text })}\n\n`),
                  );
                }
              } catch {
                controller.enqueue(value);
              }
            }
          }
        }

        // After stream is done, send the nextStep
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ nextStep })}\n\n`),
        );
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  // Update session current_question_index (not current_step)
  await admin
    .from('discovery_sessions')
    .update({
      current_question_index: nextStep === -1 ? session.total_questions : nextStep,
      ...(nextStep === -1
        ? { status: 'completed', completed_at: new Date().toISOString() }
        : {}),
    })
    .eq('id', session.id);

  // Update project progress
  const progressPct = Math.round(((body.step + 1) / session.total_questions) * 100);
  await admin
    .from('projects')
    .update({
      progress_pct: progressPct,
      last_activity_at: new Date().toISOString(),
      ...(nextStep === -1 ? { phase: 'artifacts' } : {}),
    })
    .eq('id', session.project_id);

  // If discovery is complete, increment quota
  if (nextStep === -1) {
    await incrementQuota(user.id, 'discoveries_completed');
  }

  // Wait for AI logging to complete (non-blocking for response)
  done.catch(console.error);

  return sseResponse(wrappedStream);
}

// ============================================================
// ACTION: save_draft — Auto-save draft answer
// ============================================================

async function handleSaveDraft(
  user: { id: string },
  body: { sessionId: string; step: number; answer: { text: string } },
) {
  const admin = getAdminClient();

  // Verify ownership
  const { data: session } = await admin
    .from('discovery_sessions')
    .select('id')
    .eq('id', body.sessionId)
    .eq('user_id', user.id)
    .single();

  if (!session) {
    return errorResponse('Session not found', 404);
  }

  // Use question_index (not step_index), question_text is required,
  // answer_value must be jsonb, onConflict uses question_index
  await admin
    .from('discovery_answers')
    .upsert(
      {
        session_id: session.id,
        question_key: `draft_step_${body.step}`,
        question_text: `Draft for question ${body.step + 1}`,
        question_type: 'open_text',
        answer_value: JSON.stringify(body.answer.text),
        answer_text: body.answer.text,
        question_index: body.step,
      },
      { onConflict: 'session_id,question_index' },
    );

  return jsonResponse({ ok: true });
}

// ============================================================
// Helper: Build a quick discovery prompt for the AI response
// ============================================================

function buildQuickDiscoveryPrompt(
  archetypeSlug: string,
  step: number,
  totalSteps: number,
): string {
  const personas: Record<string, string> = {
    indie_software:
      'You are an experienced indie hacker and bootstrapped SaaS founder. You know SaaS metrics, distribution challenges, and realistic timelines cold.',
    ai_built_app:
      'You are a developer experienced with AI coding tools (Lovable, Cursor, Claude Code, Bolt). You know what these tools can and cannot do.',
    mobile_game:
      'You are an indie game developer who has shipped 5 titles. You push hard on scope control because every game dev underestimates by 3x.',
    wedding_event:
      'You are a veteran event planner with 12 years of experience. You are warm but direct about budget realities and timeline constraints.',
    home_renovation:
      'You are a licensed general contractor with 15 years of residential renovation experience. You push back on unrealistic budgets.',
  };

  const persona = personas[archetypeSlug] || personas.indie_software;

  return `${persona}

You are conducting question ${step + 1} of ${totalSteps} in a structured planning interview.

RESPONSE RULES:
- Respond in 2-5 natural sentences. No bullet points, no lists, no headers.
- Acknowledge what the user said with a specific observation or insight.
- If their answer is vague, ask them to be more specific.
- If their expectations seem unrealistic, say so respectfully.
- Transition naturally — do not say "let's move on" or "next question."
- Do not use emojis.
- Do not start with "Great!" or "That's great!" or similar.
- Do not use these phrases: delve, leverage, robust, cutting-edge, seamless, navigate, harness, unlock, game-changer, paradigm.`;
}
