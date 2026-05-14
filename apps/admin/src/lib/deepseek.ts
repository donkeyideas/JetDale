// ============================================================
// Jetdale — Server-side DeepSeek API Client
// OpenAI-compatible format, native fetch, no SDK needed.
// Only used in API routes (server-side).
// ============================================================

const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';

export async function callDeepSeek(opts: {
  model: 'fast' | 'deep';
  systemPrompt: string;
  userMessage?: string;
  stream?: boolean;
}): Promise<Response> {
  const model =
    opts.model === 'fast'
      ? process.env.DEEPSEEK_MODEL_FAST || 'deepseek-v4-flash'
      : process.env.DEEPSEEK_MODEL_DEEP || 'deepseek-v4-flash';

  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: opts.systemPrompt },
  ];
  if (opts.userMessage) {
    messages.push({ role: 'user', content: opts.userMessage });
  }

  return fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: opts.stream ?? false,
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });
}
