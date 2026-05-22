import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, isErrorResponse } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

/**
 * GET /api/admin/users/[id]
 * Full detail for one user — profile, subscription, projects, usage, AI activity.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const db = createSupabaseAdminClient();

  const { data: profile, error } = await db
    .from('profiles')
    .select('id, email, full_name, avatar_url, role, created_at, timezone, email_notifications, marketing_opt_in')
    .eq('id', id)
    .maybeSingle();

  if (error || !profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const [subRes, projectsRes, quotaRes, aiRes] = await Promise.all([
    db.from('subscriptions')
      .select('plan_tier, status, amount_cents, interval, current_period_start, current_period_end, cancel_at, provider, provider_subscription_id, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    db.from('projects')
      .select('id, name, phase, status, created_at')
      .eq('user_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    db.from('usage_quotas')
      .select('projects_created, discoveries_completed, reality_checks_completed, artifacts_generated, exports_run, voice_minutes_used, ai_cost_cents, period_start')
      .eq('user_id', id)
      .order('period_start', { ascending: false })
      .limit(1)
      .maybeSingle(),
    db.from('ai_events')
      .select('cost_cents, success')
      .eq('user_id', id),
  ]);

  const aiEvents = aiRes.data ?? [];
  const aiCostCents = aiEvents.reduce((sum, e) => sum + (e.cost_cents ?? 0), 0);
  const aiSuccessCount = aiEvents.filter((e) => e.success).length;

  return NextResponse.json({
    profile,
    subscription: subRes.data ?? null,
    projects: projectsRes.data ?? [],
    usage: quotaRes.data ?? null,
    ai: {
      event_count: aiEvents.length,
      success_count: aiSuccessCount,
      total_cost_cents: parseFloat(aiCostCents.toFixed(4)),
    },
  });
}
