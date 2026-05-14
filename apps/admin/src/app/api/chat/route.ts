// ============================================================
// POST /api/chat — Streaming workspace chat via DeepSeek
// Body: { archetypeName, expertPersona, projectName, activeArtifact?,
//         recentMessages, discoverySummary, userMessage }
// Returns: SSE stream
// ============================================================

import { NextRequest } from 'next/server';
import { callDeepSeek } from '@/lib/deepseek';
import { buildWorkspaceChatPrompt } from '@jetdale/shared';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const systemPrompt = buildWorkspaceChatPrompt({
      archetypeName: body.archetypeName || 'Software project',
      expertPersona: body.expertPersona || 'You are a veteran product strategist who has helped launch 50+ products.',
      projectName: body.projectName || 'Untitled',
      activeArtifact: body.activeArtifact,
      recentMessages: body.recentMessages || [],
      discoverySummary: body.discoverySummary || '',
    });

    // Inject current date context
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const response = await callDeepSeek({
      model: 'fast',
      systemPrompt: systemPrompt + `\n\nToday's date is ${dateStr}. Use this as the baseline for all date references.`,
      userMessage: body.userMessage,
      stream: true,
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('DeepSeek chat error:', err);
      return new Response(JSON.stringify({ error: 'DeepSeek API error' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Proxy the SSE stream directly to the client
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    console.error('Chat route error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
