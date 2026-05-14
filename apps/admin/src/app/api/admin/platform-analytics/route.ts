import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, isErrorResponse } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const db = createSupabaseAdminClient();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString();

  // MRR from snapshot
  const { data: snapshot } = await db
    .from('mv_mrr_snapshot')
    .select('*')
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const mrrCents = snapshot?.mrr_cents ?? 0;

  // Total customers (profiles)
  const { count: totalCustomers } = await db
    .from('profiles')
    .select('id', { count: 'exact', head: true });

  // All subscriptions for plan analysis
  const { data: allSubs } = await db
    .from('subscriptions')
    .select('plan_tier, amount_cents, status, created_at, updated_at');

  type SubRow = { plan_tier: string | null; amount_cents: number; status: string; created_at: string; updated_at: string };
  const subs = (allSubs ?? []) as SubRow[];

  const activeSubs = subs.filter((s) => s.status === 'active' || s.status === 'trialing');
  const paidCustomers = activeSubs.filter((s) => (s.amount_cents ?? 0) > 0).length;

  // ARPU: MRR / paid customers
  const arpuCents = paidCustomers > 0 ? Math.round(mrrCents / paidCustomers) : 0;

  // LTV: ARPU * average lifetime months (estimate: 1 / churn_rate)
  // Churn rate: canceled in last 30 days / total active at start of period
  const canceledLast30 = subs.filter((s) => s.status === 'canceled' && s.updated_at >= thirtyDaysAgo).length;
  const activeAtStart = activeSubs.length + canceledLast30;
  const churnRate = activeAtStart > 0
    ? parseFloat(((canceledLast30 / activeAtStart) * 100).toFixed(2))
    : 0;
  const avgLifetimeMonths = churnRate > 0 ? Math.round(100 / churnRate) : 24;
  const ltvCents = arpuCents * avgLifetimeMonths;

  // MoM growth: signups last 30 days vs previous 30 days
  const signupsLast30 = (totalCustomers ?? 0);
  const { count: signups30 } = await db
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', thirtyDaysAgo);

  const { count: signupsPrev30 } = await db
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', sixtyDaysAgo)
    .lt('created_at', thirtyDaysAgo);

  const momGrowth = (signupsPrev30 ?? 0) > 0
    ? parseFloat((((signups30 ?? 0) - (signupsPrev30 ?? 0)) / (signupsPrev30 ?? 1) * 100).toFixed(1))
    : 0;

  // Monthly revenue history from snapshots
  const { data: snapshots } = await db
    .from('mv_mrr_snapshot')
    .select('snapshot_date, mrr_cents')
    .order('snapshot_date', { ascending: true })
    .limit(12);

  const monthlyRevenue = ((snapshots ?? []) as { snapshot_date: string; mrr_cents: number }[]).map((s) => ({
    month: s.snapshot_date.slice(0, 7),
    mrr_cents: s.mrr_cents,
  }));

  // Monthly signups: group profiles by month (last 6 months)
  const sixMonthsAgo = new Date(Date.now() - 180 * 86400000).toISOString();
  const { data: recentProfiles } = await db
    .from('profiles')
    .select('created_at')
    .gte('created_at', sixMonthsAgo);

  const signupMap: Record<string, number> = {};
  for (const p of (recentProfiles ?? []) as { created_at: string }[]) {
    const month = p.created_at.slice(0, 7);
    signupMap[month] = (signupMap[month] ?? 0) + 1;
  }
  const monthlySignups = Object.entries(signupMap)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Plan distribution
  const planMap: Record<string, number> = {};
  for (const s of activeSubs) {
    const plan = s.plan_tier ?? 'free';
    planMap[plan] = (planMap[plan] ?? 0) + 1;
  }
  const planDistribution = Object.entries(planMap)
    .map(([plan, count]) => ({ plan, count }))
    .sort((a, b) => b.count - a.count);

  // Engagement counts
  const [projectsRes, artifactsRes, exportsRes, discoveryRes, aiRes] = await Promise.all([
    db.from('projects').select('id', { count: 'exact', head: true }),
    db.from('artifacts').select('id', { count: 'exact', head: true }),
    db.from('exports').select('id', { count: 'exact', head: true }),
    db.from('discovery_sessions').select('id', { count: 'exact', head: true }),
    db.from('ai_events').select('id', { count: 'exact', head: true }),
  ]);

  return NextResponse.json({
    kpis: {
      mrr_cents: mrrCents,
      arr_cents: mrrCents * 12,
      arpu_cents: arpuCents,
      ltv_cents: ltvCents,
      total_customers: totalCustomers ?? 0,
      paid_customers: paidCustomers,
      churn_rate: churnRate,
      mom_growth: momGrowth,
    },
    monthly_revenue: monthlyRevenue,
    monthly_signups: monthlySignups,
    plan_distribution: planDistribution,
    engagement: {
      projects: projectsRes.count ?? 0,
      artifacts: artifactsRes.count ?? 0,
      exports: exportsRes.count ?? 0,
      discoveries: discoveryRes.count ?? 0,
      ai_calls: aiRes.count ?? 0,
    },
  });
}
