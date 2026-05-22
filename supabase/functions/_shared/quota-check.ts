// ============================================================
// Jetdale — Quota Check (Edge Function shared utility)
// Checks user's usage against plan limits before allowing actions.
// ============================================================

import { getAdminClient } from './auth.ts';

interface QuotaResult {
  allowed: boolean;
  reason?: string;
  limit?: string;
  current?: number;
  max?: number;
}

// Plan limits (mirrors packages/shared/src/limits.ts)
const PLAN_LIMITS = {
  free: {
    projectsPerMonth: 1,
    artifactsPerProject: 5,
    realityChecksPerMonth: 1,
    exportsPerMonth: 1,
    voiceMinutesPerMonth: 10,
    chatMessagesPerDay: 10,
  },
  pro: {
    projectsPerMonth: 10,
    artifactsPerProject: Infinity,
    realityChecksPerMonth: Infinity,
    exportsPerMonth: Infinity,
    voiceMinutesPerMonth: 240,
    chatMessagesPerDay: 200,
  },
  team: {
    projectsPerMonth: Infinity,
    artifactsPerProject: Infinity,
    realityChecksPerMonth: Infinity,
    exportsPerMonth: Infinity,
    voiceMinutesPerMonth: 600,
    chatMessagesPerDay: Infinity,
  },
  enterprise: {
    projectsPerMonth: Infinity,
    artifactsPerProject: Infinity,
    realityChecksPerMonth: Infinity,
    exportsPerMonth: Infinity,
    voiceMinutesPerMonth: Infinity,
    chatMessagesPerDay: Infinity,
  },
} as const;

type CheckableLimit = keyof (typeof PLAN_LIMITS)['free'];

/**
 * Check if a user can perform an action based on their plan limits.
 */
export async function checkQuota(
  userId: string,
  planTier: string,
  limitKey: CheckableLimit,
): Promise<QuotaResult> {
  const tier = (planTier in PLAN_LIMITS ? planTier : 'free') as keyof typeof PLAN_LIMITS;
  const max = PLAN_LIMITS[tier][limitKey];

  if (max === Infinity) {
    return { allowed: true };
  }

  const supabase = getAdminClient();
  const { data: quota } = await supabase
    .from('usage_quotas')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!quota) {
    return { allowed: true }; // No quota row yet = new user, allow
  }

  // Map limit keys to quota columns
  const quotaMap: Record<CheckableLimit, number> = {
    projectsPerMonth: quota.projects_created,
    artifactsPerProject: quota.artifacts_generated,
    realityChecksPerMonth: quota.reality_checks_completed ?? 0,
    exportsPerMonth: quota.exports_run,
    voiceMinutesPerMonth: quota.voice_minutes_used,
    chatMessagesPerDay: 0, // checked differently via chat_messages count
  };

  const current = quotaMap[limitKey] ?? 0;

  if (current >= max) {
    return {
      allowed: false,
      reason: 'limit_exceeded',
      limit: limitKey,
      current,
      max,
    };
  }

  return { allowed: true, current, max };
}

/**
 * Increment a usage counter after a successful action.
 */
export async function incrementQuota(
  userId: string,
  field:
    | 'projects_created'
    | 'discoveries_completed'
    | 'reality_checks_completed'
    | 'artifacts_generated'
    | 'exports_run',
  amount: number = 1,
): Promise<void> {
  const supabase = getAdminClient();

  // Atomic increment via RPC
  await supabase.rpc('increment_quota_field', {
    p_user_id: userId,
    p_field: field,
    p_amount: amount,
  });
}

/**
 * Increment voice minutes used.
 */
export async function incrementVoiceMinutes(
  userId: string,
  minutes: number,
): Promise<void> {
  const supabase = getAdminClient();
  await supabase.rpc('increment_voice_minutes', {
    p_user_id: userId,
    p_minutes: minutes,
  });
}
