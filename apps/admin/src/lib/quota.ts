// ============================================================
// Jetdale — Plan quota enforcement (Next.js server side)
// The web app's AI routes and project creation run here, not in
// the Supabase edge functions, so plan limits must be enforced
// in these helpers. Mirrors supabase/functions/_shared/quota-check.ts.
// ============================================================

import { createSupabaseAdminClient } from './supabase-server';

export const PLAN_LIMITS: Record<
  string,
  { projectsPerMonth: number; artifactsPerProject: number; chatMessagesPerDay: number }
> = {
  free: { projectsPerMonth: 1, artifactsPerProject: 5, chatMessagesPerDay: 10 },
  pro: { projectsPerMonth: 10, artifactsPerProject: Infinity, chatMessagesPerDay: 200 },
  team: { projectsPerMonth: Infinity, artifactsPerProject: Infinity, chatMessagesPerDay: Infinity },
  enterprise: { projectsPerMonth: Infinity, artifactsPerProject: Infinity, chatMessagesPerDay: Infinity },
};

function limitsFor(tier: string) {
  return PLAN_LIMITS[tier] ?? PLAN_LIMITS.free;
}

export interface QuotaResult {
  allowed: boolean;
  current: number;
  max: number;
  tier: string;
}

/** Resolve a user's plan tier from their active subscription (defaults to 'free'). */
export async function getUserPlanTier(userId: string): Promise<string> {
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from('subscriptions')
    .select('plan_tier')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.plan_tier as string) ?? 'free';
}

/** True for staff accounts, which are exempt from plan quotas. */
export async function isStaff(userId: string): Promise<boolean> {
  const db = createSupabaseAdminClient();
  const { data } = await db.from('profiles').select('role').eq('id', userId).maybeSingle();
  const role = data?.role as string | undefined;
  return role === 'admin' || role === 'investor_readonly';
}

/** Monthly artifact-generation quota — mirrors usage_quotas.artifacts_generated. */
export async function checkArtifactQuota(userId: string, tier: string): Promise<QuotaResult> {
  const max = limitsFor(tier).artifactsPerProject;
  if (max === Infinity) return { allowed: true, current: 0, max, tier };

  const db = createSupabaseAdminClient();
  const { data } = await db
    .from('usage_quotas')
    .select('artifacts_generated')
    .eq('user_id', userId)
    .maybeSingle();
  const current = (data?.artifacts_generated as number) ?? 0;
  return { allowed: current < max, current, max, tier };
}

/** Increment the monthly artifact counter after a successful generation. */
export async function incrementArtifactQuota(userId: string): Promise<void> {
  const db = createSupabaseAdminClient();
  await db.rpc('increment_quota_field', {
    p_user_id: userId,
    p_field: 'artifacts_generated',
    p_amount: 1,
  });
}

/** Daily chat-message quota — counted from chat_messages for the current UTC day. */
export async function checkChatQuota(userId: string, tier: string): Promise<QuotaResult> {
  const max = limitsFor(tier).chatMessagesPerDay;
  if (max === Infinity) return { allowed: true, current: 0, max, tier };

  const db = createSupabaseAdminClient();
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const { count } = await db
    .from('chat_messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('role', 'user')
    .gte('created_at', startOfDay.toISOString());
  const current = count ?? 0;
  return { allowed: current < max, current, max, tier };
}

/** Monthly project-creation quota — counted from the projects table. */
export async function checkProjectQuota(userId: string, tier: string): Promise<QuotaResult> {
  const max = limitsFor(tier).projectsPerMonth;
  if (max === Infinity) return { allowed: true, current: 0, max, tier };

  const db = createSupabaseAdminClient();
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const { count } = await db
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfMonth.toISOString());
  const current = count ?? 0;
  return { allowed: current < max, current, max, tier };
}
