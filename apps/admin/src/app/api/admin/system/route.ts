import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, isErrorResponse } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const db = createSupabaseAdminClient();

  // AI metrics from ai_events (last 24h)
  const since24h = new Date(Date.now() - 86400000).toISOString();
  const { data: events } = await db
    .from('ai_events')
    .select('cost_cents, latency_ms, success, error_message, event_type, created_at')
    .gte('created_at', since24h);

  const all = (events ?? []) as { cost_cents: number | null; latency_ms: number | null; success: boolean; error_message: string | null; event_type: string; created_at: string }[];
  const latencies = all.filter((e) => e.latency_ms != null).map((e) => e.latency_ms as number).sort((a, b) => a - b);

  const percentile = (arr: number[], p: number) => {
    if (!arr.length) return 0;
    const idx = Math.ceil((p / 100) * arr.length) - 1;
    return arr[Math.max(0, idx)];
  };

  const avgLatency = latencies.length ? Math.round(latencies.reduce((s, l) => s + l, 0) / latencies.length) : 0;
  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);
  const successCount = all.filter((e) => e.success).length;
  const errorCount = all.length - successCount;
  const successRate = all.length ? parseFloat(((successCount / all.length) * 100).toFixed(2)) : 0;
  const errorRate = all.length ? parseFloat(((errorCount / all.length) * 100).toFixed(2)) : 0;
  const dailyCostCents = all.reduce((s, e) => s + (e.cost_cents ?? 0), 0);
  const dailyGenerations = all.length;
  const avgCostPerDoc = dailyGenerations > 0 ? parseFloat((dailyCostCents / dailyGenerations).toFixed(2)) : 0;

  // Platform usage counts
  const [projectsRes, artifactsRes, exportsRes, discoveryRes, usersRes] = await Promise.all([
    db.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    db.from('artifacts').select('id', { count: 'exact', head: true }),
    db.from('exports').select('id', { count: 'exact', head: true }),
    db.from('discovery_sessions').select('id', { count: 'exact', head: true }),
    db.from('profiles').select('id', { count: 'exact', head: true }),
  ]);

  // Recent errors
  const recentErrors = all
    .filter((e) => !e.success && e.error_message)
    .slice(0, 10)
    .map((e) => ({
      event_type: e.event_type,
      error_message: e.error_message,
      created_at: e.created_at,
    }));

  return NextResponse.json({
    ai: {
      avg_latency_ms: avgLatency,
      p95_latency_ms: p95,
      p99_latency_ms: p99,
      success_rate: successRate,
      error_rate: errorRate,
      daily_cost_cents: dailyCostCents,
      daily_generations: dailyGenerations,
      avg_cost_per_doc: avgCostPerDoc,
    },
    platform: {
      total_users: usersRes.count ?? 0,
      active_projects: projectsRes.count ?? 0,
      total_artifacts: artifactsRes.count ?? 0,
      total_exports: exportsRes.count ?? 0,
      total_discoveries: discoveryRes.count ?? 0,
    },
    recent_errors: recentErrors,
  });
}
