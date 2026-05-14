import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, isErrorResponse } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const db = createSupabaseAdminClient();

  const [
    mrrRes,
    usersRes,
    projectsRes,
    paidRes,
    trialingRes,
    discoveryRes,
    funnelAllRes,
    cohortRes,
    aiRes,
    activityRes,
    archRes,
  ] = await Promise.all([
    db.from('mv_mrr_snapshot').select('mrr_cents').order('snapshot_date', { ascending: false }).limit(1).maybeSingle(),
    db.from('profiles').select('id', { count: 'exact', head: true }),
    db.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    db.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active').neq('plan_tier', 'free'),
    db.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'trialing'),
    db.from('discovery_sessions').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    db.from('mv_activation_funnel').select('*'),
    db.from('mv_cohort_retention').select('*').order('cohort_month', { ascending: true }),
    db.from('ai_events').select('cost_cents, latency_ms, success').gte('created_at', new Date(Date.now() - 86400000).toISOString()),
    db.from('audit_log').select('id, action, actor_id, target_type, target_id, created_at').order('created_at', { ascending: false }).limit(10),
    db.from('archetypes').select('id, name'),
  ]);

  // KPIs
  const mrrCents = mrrRes.data?.mrr_cents ?? 0;
  const totalUsers = usersRes.count ?? 0;
  const activeProjects = projectsRes.count ?? 0;
  const paidCustomers = paidRes.count ?? 0;
  const trialingSubs = trialingRes.count ?? 0;
  const discoveryCompleted = discoveryRes.count ?? 0;
  const discoveryPct = totalUsers > 0 ? Math.round((discoveryCompleted / totalUsers) * 100) : 0;

  // AI stats (24h)
  const aiEvents = (aiRes.data ?? []) as { cost_cents: number | null; latency_ms: number | null; success: boolean }[];
  const aiAvgLatency = aiEvents.length
    ? Math.round(aiEvents.filter((e) => e.latency_ms).reduce((s, e) => s + (e.latency_ms ?? 0), 0) / aiEvents.filter((e) => e.latency_ms).length)
    : 0;
  const aiSuccessRate = aiEvents.length
    ? ((aiEvents.filter((e) => e.success).length / aiEvents.length) * 100).toFixed(1)
    : '0';
  const aiDailyCost = aiEvents.reduce((s, e) => s + (e.cost_cents ?? 0), 0);

  // ARPU
  const arpuCents = paidCustomers > 0 ? Math.round(mrrCents / paidCustomers) : 0;

  // Funnel: sum across all daily rows from MV, or compute from tables when empty
  const funnelRows = funnelAllRes.data ?? [];
  let funnel: { signups: number; discovery_started: number; discovery_completed: number; artifacts_generated: number; exported: number; paid: number } | null = null;
  if (funnelRows.length > 0) {
    funnel = {
      signups: funnelRows.reduce((s: number, r: Record<string, number>) => s + (r.signups ?? 0), 0),
      discovery_started: funnelRows.reduce((s: number, r: Record<string, number>) => s + (r.discovery_started ?? 0), 0),
      discovery_completed: funnelRows.reduce((s: number, r: Record<string, number>) => s + (r.discovery_completed ?? 0), 0),
      artifacts_generated: funnelRows.reduce((s: number, r: Record<string, number>) => s + (r.artifacts_generated ?? 0), 0),
      exported: funnelRows.reduce((s: number, r: Record<string, number>) => s + (r.exported ?? 0), 0),
      paid: funnelRows.reduce((s: number, r: Record<string, number>) => s + (r.paid ?? 0), 0),
    };
  }
  if (!funnel) {
    const [artifactsCount, exportsCount] = await Promise.all([
      db.from('artifacts').select('id', { count: 'exact', head: true }),
      db.from('exports').select('id', { count: 'exact', head: true }),
    ]);
    funnel = {
      signups: totalUsers,
      discovery_started: activeProjects,
      discovery_completed: discoveryCompleted,
      artifacts_generated: artifactsCount.count ?? 0,
      exported: exportsCount.count ?? 0,
      paid: paidCustomers,
    };
  }

  // Archetype project counts — show ALL archetypes (not just those with projects)
  const { data: archProjects } = await db.from('projects').select('archetype_id').eq('status', 'active');
  const archCountMap: Record<string, number> = {};
  for (const p of archProjects ?? []) {
    if (p.archetype_id) archCountMap[p.archetype_id] = (archCountMap[p.archetype_id] ?? 0) + 1;
  }
  const allArchetypes = (archRes.data ?? []).map((a) => ({
    name: a.name,
    count: archCountMap[a.id] ?? 0,
  })).sort((a, b) => b.count - a.count);
  const maxArch = allArchetypes[0]?.count || 1;

  // Activity feed — resolve actor names
  const actorIds = [...new Set((activityRes.data ?? []).map((a) => a.actor_id).filter(Boolean))];
  const { data: actorProfiles } = actorIds.length
    ? await db.from('profiles').select('id, email, full_name').in('id', actorIds)
    : { data: [] };
  const actorMap: Record<string, string> = {};
  for (const p of actorProfiles ?? []) actorMap[p.id] = p.full_name ?? p.email;

  const activities = (activityRes.data ?? []).map((a) => ({
    id: a.id,
    action: a.action,
    actor: a.actor_id ? actorMap[a.actor_id] ?? null : 'System',
    target: a.target_id ? `${a.target_type ?? ''}:${a.target_id}` : null,
    created_at: a.created_at,
  }));

  return NextResponse.json({
    kpis: {
      mrr_cents: mrrCents,
      arr_cents: mrrCents * 12,
      paying_customers: paidCustomers,
      trialing_subs: trialingSubs,
      total_users: totalUsers,
      active_projects: activeProjects,
      discovery_completion_pct: discoveryPct,
      arpu_cents: arpuCents,
      churn_rate: 0,
      active_subs: paidCustomers + trialingSubs,
    },
    funnel,
    cohorts: cohortRes.data ?? [],
    ai: {
      avg_latency_ms: aiAvgLatency,
      success_rate: parseFloat(aiSuccessRate),
      daily_cost_cents: aiDailyCost,
      daily_generations: aiEvents.length,
    },
    top_archetypes: allArchetypes.map((a) => ({
      name: a.name,
      count: a.count,
      pct: maxArch > 0 ? Math.round((a.count / maxArch) * 100) : 0,
    })),
    activities,
  });
}
