// ============================================================
// Jetdale — DeepSeek AI Client (Edge Function shared utility)
// OpenAI-compatible SDK pointed at DeepSeek API.
// All AI calls go through this wrapper for logging and cost tracking.
// ============================================================

import OpenAI from 'npm:openai@^4.0.0';
import { createClient } from 'npm:@supabase/supabase-js@^2.0.0';

const client = new OpenAI({
  apiKey: Deno.env.get('DEEPSEEK_API_KEY'),
  baseURL: Deno.env.get('DEEPSEEK_BASE_URL') || 'https://api.deepseek.com',
});

type DeepSeekModel = 'deepseek-v4-flash' | 'deepseek-v4-pro';
type AiEventType =
  | 'discovery_question'
  | 'discovery_answer'
  | 'reality_check'
  | 'artifact_generation'
  | 'workspace_chat'
  | 'export_prep';

interface CallOptions {
  model: DeepSeekModel;
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
  maxTokens?: number;
  temperature?: number;
  userId?: string;
  projectId?: string;
  eventType: AiEventType;
}

interface CallResult {
  content: string;
  promptTokens: number;
  completionTokens: number;
  costCents: number;
  latencyMs: number;
}

// DeepSeek pricing (cents per 1M tokens)
const PRICING = {
  'deepseek-v4-flash': { input: 14, output: 28 },
  'deepseek-v4-pro': {
    promoEnd: new Date('2026-06-01T00:00:00Z'),
    promoInput: 43.5,
    promoOutput: 87,
    regularInput: 174,
    regularOutput: 348,
  },
} as const;

function calculateCostCents(
  model: DeepSeekModel,
  promptTokens: number,
  completionTokens: number,
): number {
  if (model === 'deepseek-v4-flash') {
    const p = PRICING['deepseek-v4-flash'];
    return parseFloat(
      ((promptTokens / 1_000_000) * p.input +
        (completionTokens / 1_000_000) * p.output).toFixed(4),
    );
  }
  const p = PRICING['deepseek-v4-pro'];
  const promo = new Date() < p.promoEnd;
  const inputRate = promo ? p.promoInput : p.regularInput;
  const outputRate = promo ? p.promoOutput : p.regularOutput;
  return parseFloat(
    ((promptTokens / 1_000_000) * inputRate +
      (completionTokens / 1_000_000) * outputRate).toFixed(4),
  );
}

/**
 * Call DeepSeek (non-streaming). Returns full response with token counts.
 */
export async function callAI(opts: CallOptions): Promise<CallResult> {
  const start = Date.now();
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const response = await client.chat.completions.create({
      model: opts.model,
      messages: opts.messages as OpenAI.ChatCompletionMessageParam[],
      stream: false,
      max_tokens: opts.maxTokens ?? 32000,
      temperature: opts.temperature ?? 0.4,
    });

    const latencyMs = Date.now() - start;
    const promptTokens = response.usage?.prompt_tokens ?? 0;
    const completionTokens = response.usage?.completion_tokens ?? 0;
    const costCents = calculateCostCents(
      opts.model,
      promptTokens,
      completionTokens,
    );

    // Log to ai_events
    await supabase.from('ai_events').insert({
      user_id: opts.userId,
      project_id: opts.projectId,
      event_type: opts.eventType,
      model: opts.model,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      cost_cents: costCents,
      latency_ms: latencyMs,
      success: true,
    });

    // Update user's AI cost quota
    if (opts.userId) {
      await supabase.rpc('increment_ai_cost', {
        p_user_id: opts.userId,
        p_cost: costCents,
      });
    }

    return {
      content: response.choices[0]?.message?.content ?? '',
      promptTokens,
      completionTokens,
      costCents,
      latencyMs,
    };
  } catch (err) {
    const latencyMs = Date.now() - start;
    // Log failure
    await supabase.from('ai_events').insert({
      user_id: opts.userId,
      project_id: opts.projectId,
      event_type: opts.eventType,
      model: opts.model,
      prompt_tokens: 0,
      completion_tokens: 0,
      cost_cents: 0,
      latency_ms: latencyMs,
      success: false,
      error_message: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Call DeepSeek with streaming. Returns a ReadableStream of SSE events.
 */
export function callAIStream(opts: CallOptions): {
  stream: ReadableStream;
  done: Promise<{ promptTokens: number; completionTokens: number; costCents: number }>;
} {
  const start = Date.now();
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let resolveStats: (stats: {
    promptTokens: number;
    completionTokens: number;
    costCents: number;
  }) => void;

  const done = new Promise<{
    promptTokens: number;
    completionTokens: number;
    costCents: number;
  }>((resolve) => {
    resolveStats = resolve;
  });

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.chat.completions.create({
          model: opts.model,
          messages: opts.messages as OpenAI.ChatCompletionMessageParam[],
          stream: true,
          max_tokens: opts.maxTokens ?? 32000,
          temperature: opts.temperature ?? 0.4,
        });

        const encoder = new TextEncoder();

        for await (const chunk of response) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: delta })}\n\n`),
            );
          }
          // Capture usage from final chunk
          if (chunk.usage) {
            totalPromptTokens = chunk.usage.prompt_tokens ?? 0;
            totalCompletionTokens = chunk.usage.completion_tokens ?? 0;
          }
        }

        const latencyMs = Date.now() - start;
        const costCents = calculateCostCents(
          opts.model,
          totalPromptTokens,
          totalCompletionTokens,
        );

        // Send done event
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ done: true, promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens, costCents })}\n\n`,
          ),
        );
        controller.close();

        // Log to ai_events
        await supabase.from('ai_events').insert({
          user_id: opts.userId,
          project_id: opts.projectId,
          event_type: opts.eventType,
          model: opts.model,
          prompt_tokens: totalPromptTokens,
          completion_tokens: totalCompletionTokens,
          cost_cents: costCents,
          latency_ms: latencyMs,
          success: true,
        });

        if (opts.userId) {
          await supabase.rpc('increment_ai_cost', {
            p_user_id: opts.userId,
            p_cost: costCents,
          });
        }

        resolveStats({ promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens, costCents });
      } catch (err) {
        const latencyMs = Date.now() - start;
        await supabase.from('ai_events').insert({
          user_id: opts.userId,
          project_id: opts.projectId,
          event_type: opts.eventType,
          model: opts.model,
          prompt_tokens: 0,
          completion_tokens: 0,
          cost_cents: 0,
          latency_ms: latencyMs,
          success: false,
          error_message: err instanceof Error ? err.message : String(err),
        });
        controller.error(err);
        resolveStats({ promptTokens: 0, completionTokens: 0, costCents: 0 });
      }
    },
  });

  return { stream, done };
}

export { client as rawClient, calculateCostCents };
