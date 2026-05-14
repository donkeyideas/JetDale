import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, isErrorResponse } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const db = createSupabaseAdminClient();

  // Current MRR from snapshot
  const { data: snapshot } = await db
    .from('mv_mrr_snapshot')
    .select('*')
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const mrrCents = snapshot?.mrr_cents ?? 0;

  // Subscriptions breakdown by plan
  const { data: subs } = await db
    .from('subscriptions')
    .select('plan_tier, amount_cents, status')
    .in('status', ['active', 'trialing']);

  const byPlan: Record<string, { mrr_cents: number; count: number }> = {};
  for (const s of subs ?? []) {
    const tier = s.plan_tier ?? 'free';
    if (!byPlan[tier]) byPlan[tier] = { mrr_cents: 0, count: 0 };
    byPlan[tier].mrr_cents += s.amount_cents ?? 0;
    byPlan[tier].count += 1;
  }

  const byPlanArr = Object.entries(byPlan)
    .map(([plan, data]) => ({ plan, ...data }))
    .sort((a, b) => b.mrr_cents - a.mrr_cents);

  // Churned MRR: recently canceled subscriptions
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: churned } = await db
    .from('subscriptions')
    .select('amount_cents')
    .eq('status', 'canceled')
    .gte('updated_at', thirtyDaysAgo);

  const churnedMrr = ((churned ?? []) as { amount_cents: number }[]).reduce((s, c) => s + (c.amount_cents ?? 0), 0);

  // New MRR: subscriptions created in last 30 days
  const { data: newSubs } = await db
    .from('subscriptions')
    .select('amount_cents')
    .in('status', ['active', 'trialing'])
    .gte('created_at', thirtyDaysAgo);

  const newMrr = ((newSubs ?? []) as { amount_cents: number }[]).reduce((s, c) => s + (c.amount_cents ?? 0), 0);

  return NextResponse.json({
    mrr_cents: mrrCents,
    new_mrr_cents: newMrr,
    churned_mrr_cents: churnedMrr,
    by_plan: byPlanArr,
    history: [],
  });
}
