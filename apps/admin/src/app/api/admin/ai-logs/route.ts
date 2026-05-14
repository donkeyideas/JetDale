import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, isErrorResponse } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const url = new URL(req.url);
  const period = url.searchParams.get('period') ?? '24h';
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '20')));

  const db = createSupabaseAdminClient();

  // Calculate date threshold
  const hours: Record<string, number> = { '1h': 1, '24h': 24, '7d': 168, '30d': 720 };
  const h = hours[period] ?? 24;
  const since = new Date(Date.now() - h * 3600000).toISOString();

  // KPIs for the period
  const { data: kpiRows } = await db
    .from('ai_events')
    .select('cost_cents, latency_ms, success')
    .gte('created_at', since);

  const events = (kpiRows ?? []) as { cost_cents: number | null; latency_ms: number | null; success: boolean }[];
  const totalGenerations = events.length;
  const totalCostCents = events.reduce((s, e) => s + (e.cost_cents ?? 0), 0);
  const latencies = events.filter((e) => e.latency_ms != null).map((e) => e.latency_ms as number);
  const avgLatencyMs = latencies.length ? Math.round(latencies.reduce((s, l) => s + l, 0) / latencies.length) : 0;
  const successCount = events.filter((e) => e.success).length;
  const successRate = totalGenerations ? ((successCount / totalGenerations) * 100).toFixed(1) : '0';

  // Paginated log table
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: logs, count: total } = await db
    .from('ai_events')
    .select('id, user_id, project_id, event_type, model, prompt_tokens, completion_tokens, cost_cents, latency_ms, success, error_message, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  // Resolve users/projects
  type LogRow = { id: string; user_id: string | null; project_id: string | null; event_type: string; model: string; prompt_tokens: number; completion_tokens: number; cost_cents: number; latency_ms: number | null; success: boolean; error_message: string | null; created_at: string };
  const logRows = (logs ?? []) as LogRow[];
  const userIds = [...new Set(logRows.map((l) => l.user_id).filter(Boolean))] as string[];
  const projIds = [...new Set(logRows.map((l) => l.project_id).filter(Boolean))] as string[];

  const [profilesRes, projRes] = await Promise.all([
    userIds.length ? db.from('profiles').select('id, email').in('id', userIds) : Promise.resolve({ data: [] }),
    projIds.length ? db.from('projects').select('id, name').in('id', projIds) : Promise.resolve({ data: [] }),
  ]);

  const profileMap: Record<string, string> = {};
  for (const p of profilesRes.data ?? []) profileMap[p.id] = p.email;
  const projMap: Record<string, string> = {};
  for (const p of projRes.data ?? []) projMap[p.id] = p.name;

  const rows = logRows.map((l) => ({
    id: l.id,
    user_email: l.user_id ? profileMap[l.user_id] ?? null : null,
    project_name: l.project_id ? projMap[l.project_id] ?? null : null,
    event_type: l.event_type,
    model: l.model,
    prompt_tokens: l.prompt_tokens,
    completion_tokens: l.completion_tokens,
    cost_cents: l.cost_cents,
    latency_ms: l.latency_ms,
    success: l.success,
    error_message: l.error_message,
    created_at: l.created_at,
  }));

  return NextResponse.json({
    kpis: {
      totalGenerations,
      totalCostCents,
      avgLatencyMs,
      successRate: parseFloat(successRate),
    },
    data: rows,
    total: total ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((total ?? 0) / pageSize),
  });
}
