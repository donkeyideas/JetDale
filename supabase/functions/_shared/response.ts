// ============================================================
// Jetdale — Standard HTTP Response Helpers for Edge Functions
// ============================================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

/**
 * Return a JSON success response.
 */
export function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

/**
 * Return a JSON error response.
 */
export function errorResponse(
  message: string,
  status: number = 400,
  details?: unknown,
): Response {
  return new Response(
    JSON.stringify({ error: message, details }),
    {
      status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    },
  );
}

/**
 * Return a rate-limited error response with Retry-After header.
 */
export function rateLimitResponse(retryAfter: number): Response {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded. Try again shortly.',
      reason: 'rate_limited',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    },
  );
}

/**
 * Return a limit exceeded response (triggers paywall on client).
 */
export function limitExceededResponse(
  limit: string,
  current: number,
  max: number,
): Response {
  return new Response(
    JSON.stringify({
      error: 'Plan limit exceeded.',
      reason: 'limit_exceeded',
      limit,
      current,
      max,
    }),
    {
      status: 429,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    },
  );
}

/**
 * Return a Server-Sent Events streaming response.
 */
export function sseResponse(stream: ReadableStream): Response {
  return new Response(stream, {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

/**
 * Handle CORS preflight.
 */
export function corsResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
