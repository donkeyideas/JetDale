import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, isErrorResponse } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const db = createSupabaseAdminClient();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  // Fetch all events from last 30 days
  const { data: events } = await db
    .from('ai_events')
    .select('id, user_id, project_id, event_type, model, prompt_tokens, completion_tokens, cost_cents, latency_ms, success, error_message, created_at')
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false });

  type Row = {
    id: string;
    user_id: string | null;
    project_id: string | null;
    event_type: string;
    model: string;
    prompt_tokens: number;
    completion_tokens: number;
    cost_cents: number | null;
    latency_ms: number | null;
    success: boolean;
    error_message: string | null;
    created_at: string;
  };
  const all = (events ?? []) as Row[];

  // KPIs
  const totalInteractions = all.length;
  const totalCost30d = all.reduce((s, e) => s + (e.cost_cents ?? 0), 0);
  const totalTokens30d = all.reduce((s, e) => s + e.prompt_tokens + e.completion_tokens, 0);
  const latencies = all.filter((e) => e.latency_ms != null).map((e) => e.latency_ms as number);
  const avgResponseMs = latencies.length
    ? Math.round(latencies.reduce((s, l) => s + l, 0) / latencies.length)
    : 0;

  // By feature (event_type)
  const featureMap: Record<string, { calls: number; tokens: number; cost_cents: number; latency_sum: number; latency_count: number; success_count: number }> = {};
  for (const e of all) {
    const f = e.event_type;
    if (!featureMap[f]) featureMap[f] = { calls: 0, tokens: 0, cost_cents: 0, latency_sum: 0, latency_count: 0, success_count: 0 };
    featureMap[f].calls += 1;
    featureMap[f].tokens += e.prompt_tokens + e.completion_tokens;
    featureMap[f].cost_cents += e.cost_cents ?? 0;
    if (e.latency_ms != null) {
      featureMap[f].latency_sum += e.latency_ms;
      featureMap[f].latency_count += 1;
    }
    if (e.success) featureMap[f].success_count += 1;
  }
  const byFeature = Object.entries(featureMap)
    .map(([feature, data]) => ({
      feature,
      calls: data.calls,
      tokens: data.tokens,
      cost_cents: data.cost_cents,
      avg_latency_ms: data.latency_count > 0 ? Math.round(data.latency_sum / data.latency_count) : 0,
      success_rate: data.calls > 0 ? parseFloat(((data.success_count / data.calls) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.calls - a.calls);

  // By provider (model)
  const providerMap: Record<string, { calls: number; cost_cents: number; latency_sum: number; latency_count: number; success_count: number; total_tokens: number }> = {};
  for (const e of all) {
    const p = e.model;
    if (!providerMap[p]) providerMap[p] = { calls: 0, cost_cents: 0, latency_sum: 0, latency_count: 0, success_count: 0, total_tokens: 0 };
    providerMap[p].calls += 1;
    providerMap[p].cost_cents += e.cost_cents ?? 0;
    providerMap[p].total_tokens += e.prompt_tokens + e.completion_tokens;
    if (e.latency_ms != null) {
      providerMap[p].latency_sum += e.latency_ms;
      providerMap[p].latency_count += 1;
    }
    if (e.success) providerMap[p].success_count += 1;
  }
  const byProvider = Object.entries(providerMap)
    .map(([provider, data]) => ({
      provider,
      calls: data.calls,
      cost_cents: data.cost_cents,
      avg_latency_ms: data.latency_count > 0 ? Math.round(data.latency_sum / data.latency_count) : 0,
      success_rate: data.calls > 0 ? parseFloat(((data.success_count / data.calls) * 100).toFixed(1)) : 0,
      total_tokens: data.total_tokens,
    }))
    .sort((a, b) => b.calls - a.calls);

  // Cost trend: daily cost + calls
  const trendMap: Record<string, { cost_cents: number; calls: number }> = {};
  for (const e of all) {
    const date = e.created_at.slice(0, 10);
    if (!trendMap[date]) trendMap[date] = { cost_cents: 0, calls: 0 };
    trendMap[date].cost_cents += e.cost_cents ?? 0;
    trendMap[date].calls += 1;
  }
  const costTrend = Object.entries(trendMap)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Recent: last 20 events with user/project resolution
  const recentRows = all.slice(0, 20);
  const userIds = [...new Set(recentRows.map((l) => l.user_id).filter(Boolean))] as string[];
  const projIds = [...new Set(recentRows.map((l) => l.project_id).filter(Boolean))] as string[];

  const [profilesRes, projRes] = await Promise.all([
    userIds.length ? db.from('profiles').select('id, email').in('id', userIds) : Promise.resolve({ data: [] }),
    projIds.length ? db.from('projects').select('id, name').in('id', projIds) : Promise.resolve({ data: [] }),
  ]);

  const profileMap: Record<string, string> = {};
  for (const p of profilesRes.data ?? []) profileMap[p.id] = p.email;
  const projMap: Record<string, string> = {};
  for (const p of projRes.data ?? []) projMap[p.id] = p.name;

  const recent = recentRows.map((l) => ({
    id: l.id,
    user_email: l.user_id ? profileMap[l.user_id] ?? null : null,
    project_name: l.project_id ? projMap[l.project_id] ?? null : null,
    event_type: l.event_type,
    model: l.model,
    prompt_tokens: l.prompt_tokens,
    completion_tokens: l.completion_tokens,
    cost_cents: l.cost_cents ?? 0,
    latency_ms: l.latency_ms,
    success: l.success,
    error_message: l.error_message,
    created_at: l.created_at,
  }));

  return NextResponse.json({
    kpis: {
      total_interactions: totalInteractions,
      total_cost_30d: totalCost30d,
      total_tokens_30d: totalTokens30d,
      avg_response_ms: avgResponseMs,
    },
    by_feature: byFeature,
    by_provider: byProvider,
    cost_trend: costTrend,
    recent,
  });
}
