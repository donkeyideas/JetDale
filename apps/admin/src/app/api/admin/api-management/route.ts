import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, isErrorResponse } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const db = createSupabaseAdminClient();

  // Fetch all API configs
  const { data: configs, error: configError } = await db
    .from('api_configs')
    .select('*')
    .order('provider', { ascending: true });

  if (configError) return NextResponse.json({ error: configError.message }, { status: 500 });

  // Fetch usage stats from ai_events (all time)
  const { data: events } = await db
    .from('ai_events')
    .select('model, cost_cents, success');

  const allEvents = (events ?? []) as { model: string; cost_cents: number | null; success: boolean }[];

  // Aggregate stats by model
  const byModel: Record<string, { count: number; cost_cents: number; success: number }> = {};
  for (const e of allEvents) {
    const key = e.model ?? 'unknown';
    if (!byModel[key]) byModel[key] = { count: 0, cost_cents: 0, success: 0 };
    byModel[key].count += 1;
    byModel[key].cost_cents += e.cost_cents ?? 0;
    if (e.success) byModel[key].success += 1;
  }

  const modelStats = Object.entries(byModel).map(([model, stats]) => ({
    model,
    count: stats.count,
    cost_cents: stats.cost_cents,
    success_rate: stats.count > 0 ? parseFloat(((stats.success / stats.count) * 100).toFixed(1)) : 0,
  }));

  // Global KPIs
  const totalCalls = allEvents.length;
  const totalCostCents = allEvents.reduce((sum, e) => sum + (e.cost_cents ?? 0), 0);
  const totalSuccess = allEvents.filter((e) => e.success).length;
  const successRate = totalCalls > 0 ? parseFloat(((totalSuccess / totalCalls) * 100).toFixed(1)) : 0;
  const activeProviders = (configs ?? []).filter((c) => c.is_active).length;

  return NextResponse.json({
    configs: configs ?? [],
    kpis: {
      active_providers: activeProviders,
      total_calls: totalCalls,
      total_cost_cents: totalCostCents,
      success_rate: successRate,
    },
    model_stats: modelStats,
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const body = await req.json();
  const { id, api_key_encrypted, base_url, is_active } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const db = createSupabaseAdminClient();

  const updates: Record<string, unknown> = {};
  if (typeof api_key_encrypted === 'string') updates.api_key_encrypted = api_key_encrypted;
  if (typeof base_url === 'string') updates.base_url = base_url;
  if (typeof is_active === 'boolean') updates.is_active = is_active;
  updates.updated_at = new Date().toISOString();

  if (Object.keys(updates).length <= 1) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data, error } = await db
    .from('api_configs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log entry
  await db.from('audit_log').insert({
    actor_id: auth.id,
    action: 'api_config.update',
    target_type: 'api_config',
    target_id: id,
    after_state: updates,
    ip_address: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null,
  });

  return NextResponse.json(data);
}
