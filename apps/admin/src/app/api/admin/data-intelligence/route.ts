import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, isErrorResponse } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const db = createSupabaseAdminClient();

  // Run all queries in parallel
  const [
    profilesRes,
    projectsRes,
    activeProjectsRes,
    subsAllRes,
    subsPaidRes,
    subsTrialingRes,
    aiEventsRes,
    discoveryAllRes,
    discoveryCompletedRes,
    exportsRes,
  ] = await Promise.all([
    db.from('profiles').select('id', { count: 'exact', head: true }),
    db.from('projects').select('id', { count: 'exact', head: true }),
    db.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    db.from('subscriptions').select('id', { count: 'exact', head: true }),
    db.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    db.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'trialing'),
    db.from('ai_events').select('success'),
    db.from('discovery_sessions').select('id', { count: 'exact', head: true }),
    db.from('discovery_sessions').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    db.from('exports').select('id', { count: 'exact', head: true }),
  ]);

  const totalUsers = profilesRes.count ?? 0;
  const totalProjects = projectsRes.count ?? 0;
  const activeProjects = activeProjectsRes.count ?? 0;
  const totalSubs = subsAllRes.count ?? 0;
  const paidSubs = subsPaidRes.count ?? 0;
  const trialingSubs = subsTrialingRes.count ?? 0;
  const totalDiscoveries = discoveryAllRes.count ?? 0;
  const completedDiscoveries = discoveryCompletedRes.count ?? 0;
  const totalExports = exportsRes.count ?? 0;

  // AI success rate
  const aiEvents = (aiEventsRes.data ?? []) as { success: boolean }[];
  const totalAiCalls = aiEvents.length;
  const aiSuccessCount = aiEvents.filter((e) => e.success).length;
  const aiSuccessRate = totalAiCalls > 0 ? parseFloat(((aiSuccessCount / totalAiCalls) * 100).toFixed(1)) : 100;

  // Compute health score components
  // AI success rate contributes 30%
  const aiHealthScore = aiSuccessRate;
  const aiWeighted = aiHealthScore * 0.3;

  // Active project ratio (projects/users) contributes 20%
  // Normalize: 2+ projects per user = 100%
  const projectsPerUser = totalUsers > 0 ? activeProjects / totalUsers : 0;
  const projectRatioScore = Math.min(100, projectsPerUser * 50);
  const projectWeighted = projectRatioScore * 0.2;

  // Subscription health (paid/total) contributes 25%
  const paidTotal = paidSubs + trialingSubs;
  const subHealthScore = totalSubs > 0 ? (paidTotal / totalSubs) * 100 : 0;
  const subWeighted = subHealthScore * 0.25;

  // Engagement (discoveries completed / started) contributes 25%
  const discoveryCompletionRate = totalDiscoveries > 0
    ? parseFloat(((completedDiscoveries / totalDiscoveries) * 100).toFixed(1))
    : 0;
  const engagementWeighted = discoveryCompletionRate * 0.25;

  const healthScore = Math.round(aiWeighted + projectWeighted + subWeighted + engagementWeighted);

  return NextResponse.json({
    health_score: healthScore,
    metrics: {
      ai_success_rate: aiSuccessRate,
      ai_total_calls: totalAiCalls,
      discovery_completion_rate: discoveryCompletionRate,
      discovery_total: totalDiscoveries,
      discovery_completed: completedDiscoveries,
      subscription_health: totalSubs > 0 ? parseFloat(((paidTotal / totalSubs) * 100).toFixed(1)) : 0,
      paid_subscriptions: paidSubs,
      trialing_subscriptions: trialingSubs,
      total_subscriptions: totalSubs,
      projects_per_user: parseFloat(projectsPerUser.toFixed(2)),
      active_projects: activeProjects,
      total_projects: totalProjects,
    },
    platform_stats: {
      total_users: totalUsers,
      total_projects: totalProjects,
      active_projects: activeProjects,
      total_subscriptions: totalSubs,
      paid_subscriptions: paidSubs,
      trialing_subscriptions: trialingSubs,
      total_ai_calls: totalAiCalls,
      ai_success_count: aiSuccessCount,
      total_discoveries: totalDiscoveries,
      completed_discoveries: completedDiscoveries,
      total_exports: totalExports,
    },
  });
}
