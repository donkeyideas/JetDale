import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, isErrorResponse } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const db = createSupabaseAdminClient();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const { data: events } = await db
    .from('ai_events')
    .select('event_type, model, cost_cents, latency_ms, success, created_at')
    .gte('created_at', thirtyDaysAgo);

  type Row = {
    event_type: string;
    model: string;
    cost_cents: number | null;
    latency_ms: number | null;
    success: boolean;
    created_at: string;
  };
  const all = (events ?? []) as Row[];

  // KPIs
  const totalGenerations = all.length;
  const successCount = all.filter((e) => e.success).length;
  const successRate = totalGenerations > 0
    ? parseFloat(((successCount / totalGenerations) * 100).toFixed(1))
    : 0;
  const latencies = all.filter((e) => e.latency_ms != null).map((e) => e.latency_ms as number);
  const avgLatencyMs = latencies.length
    ? Math.round(latencies.reduce((s, l) => s + l, 0) / latencies.length)
    : 0;
  const totalCostCents = all.reduce((s, e) => s + (e.cost_cents ?? 0), 0);

  // Daily: group by day for last 30 days
  const dailyMap: Record<string, { count: number; cost_cents: number }> = {};
  for (const e of all) {
    const day = e.created_at.slice(0, 10);
    if (!dailyMap[day]) dailyMap[day] = { count: 0, cost_cents: 0 };
    dailyMap[day].count += 1;
    dailyMap[day].cost_cents += e.cost_cents ?? 0;
  }
  const daily = Object.entries(dailyMap)
    .map(([day, data]) => ({ day, ...data }))
    .sort((a, b) => a.day.localeCompare(b.day));

  // By event_type
  const typeMap: Record<string, { count: number; cost_cents: number }> = {};
  for (const e of all) {
    const t = e.event_type;
    if (!typeMap[t]) typeMap[t] = { count: 0, cost_cents: 0 };
    typeMap[t].count += 1;
    typeMap[t].cost_cents += e.cost_cents ?? 0;
  }
  const byType = Object.entries(typeMap)
    .map(([event_type, data]) => ({ event_type, ...data }))
    .sort((a, b) => b.count - a.count);

  // By model
  const modelMap: Record<string, { count: number; cost_cents: number; latency_sum: number; latency_count: number; success_count: number }> = {};
  for (const e of all) {
    const m = e.model;
    if (!modelMap[m]) modelMap[m] = { count: 0, cost_cents: 0, latency_sum: 0, latency_count: 0, success_count: 0 };
    modelMap[m].count += 1;
    modelMap[m].cost_cents += e.cost_cents ?? 0;
    if (e.latency_ms != null) {
      modelMap[m].latency_sum += e.latency_ms;
      modelMap[m].latency_count += 1;
    }
    if (e.success) modelMap[m].success_count += 1;
  }
  const byModel = Object.entries(modelMap)
    .map(([model, data]) => ({
      model,
      count: data.count,
      cost_cents: data.cost_cents,
      avg_latency_ms: data.latency_count > 0 ? Math.round(data.latency_sum / data.latency_count) : 0,
      success_rate: data.count > 0 ? parseFloat(((data.success_count / data.count) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    kpis: {
      total_generations: totalGenerations,
      success_rate: successRate,
      avg_latency_ms: avgLatencyMs,
      total_cost_cents: totalCostCents,
    },
    daily,
    by_type: byType,
    by_model: byModel,
  });
}
