import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, isErrorResponse } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('feature_flags')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const body = await req.json();
  const rawKey = typeof body.key === 'string' ? body.key.trim().toLowerCase() : '';

  if (!rawKey) {
    return NextResponse.json({ error: 'A flag key is required' }, { status: 400 });
  }
  if (!/^[a-z0-9][a-z0-9_.]*$/.test(rawKey)) {
    return NextResponse.json(
      { error: 'Key may only contain lowercase letters, numbers, dots and underscores' },
      { status: 400 },
    );
  }

  const enabled = body.enabled === true;
  const rolloutRaw = Number(body.rollout_percentage);
  const rollout_percentage = Number.isFinite(rolloutRaw)
    ? Math.min(100, Math.max(0, Math.round(rolloutRaw)))
    : 0;

  const db = createSupabaseAdminClient();

  const { data, error } = await db
    .from('feature_flags')
    .insert({ key: rawKey, enabled, rollout_percentage })
    .select()
    .single();

  if (error) {
    // 23505 = unique_violation (key already exists)
    if (error.code === '23505') {
      return NextResponse.json({ error: `Flag "${rawKey}" already exists` }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await db.from('audit_log').insert({
    actor_id: auth.id,
    action: 'feature_flag.create',
    target_type: 'feature_flag',
    target_id: null,
    after_state: { key: rawKey, enabled, rollout_percentage },
    ip_address: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null,
  });

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const body = await req.json();
  const { key, enabled, rollout_percentage } = body;

  if (!key) return NextResponse.json({ error: 'key is required' }, { status: 400 });

  const db = createSupabaseAdminClient();

  const updates: Record<string, unknown> = {};
  if (typeof enabled === 'boolean') updates.enabled = enabled;
  if (typeof rollout_percentage === 'number') updates.rollout_percentage = rollout_percentage;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await db
    .from('feature_flags')
    .update(updates)
    .eq('key', key)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log entry
  await db.from('audit_log').insert({
    actor_id: auth.id,
    action: 'feature_flag.update',
    target_type: 'feature_flag',
    target_id: null,
    after_state: { key, ...updates },
    ip_address: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null,
  });

  return NextResponse.json(data);
}
