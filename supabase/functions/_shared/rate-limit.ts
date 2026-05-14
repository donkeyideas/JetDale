// ============================================================
// Jetdale — Rate Limiting (Edge Function shared utility)
// Per-user rate limiting using Postgres for state.
// ============================================================

import { getAdminClient } from './auth.ts';

interface RateLimitCheck {
  allowed: boolean;
  retryAfter?: number; // seconds
  current: number;
  limit: number;
}

/**
 * Check if a user has exceeded their rate limit for a given action.
 * Uses a sliding window approach with Postgres.
 */
export async function checkRateLimit(
  userId: string,
  action: string,
  maxRequests: number | 'unlimited',
  windowSeconds: number,
): Promise<RateLimitCheck> {
  if (maxRequests === 'unlimited') {
    return { allowed: true, current: 0, limit: -1 };
  }

  const supabase = getAdminClient();
  const windowStart = new Date(
    Date.now() - windowSeconds * 1000,
  ).toISOString();

  // Count recent events of this type for this user
  const { count } = await supabase
    .from('ai_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', windowStart);

  const current = count ?? 0;

  if (current >= maxRequests) {
    // Estimate when the oldest event in the window expires
    const { data: oldest } = await supabase
      .from('ai_events')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', windowStart)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    const retryAfter = oldest
      ? Math.ceil(
          (new Date(oldest.created_at).getTime() +
            windowSeconds * 1000 -
            Date.now()) /
            1000,
        )
      : windowSeconds;

    return {
      allowed: false,
      retryAfter: Math.max(1, retryAfter),
      current,
      limit: maxRequests,
    };
  }

  return { allowed: true, current, limit: maxRequests };
}

/**
 * Convenience: check AI call rate limit based on user's plan tier.
 */
export async function checkAIRateLimit(
  userId: string,
  planTier: string,
): Promise<RateLimitCheck> {
  const limits: Record<string, { perMinute: number | 'unlimited'; perDay: number | 'unlimited' }> = {
    free: { perMinute: 5, perDay: 50 },
    pro: { perMinute: 30, perDay: 1000 },
    team: { perMinute: 60, perDay: 'unlimited' },
    enterprise: { perMinute: 120, perDay: 'unlimited' },
  };

  const tierLimits = limits[planTier] ?? limits.free;

  // Check per-minute limit first
  const minuteCheck = await checkRateLimit(
    userId,
    'ai_call',
    tierLimits.perMinute,
    60,
  );
  if (!minuteCheck.allowed) return minuteCheck;

  // Then check daily limit
  return checkRateLimit(userId, 'ai_call', tierLimits.perDay, 86400);
}
