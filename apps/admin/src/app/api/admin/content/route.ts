import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, isErrorResponse } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('site_content')
    .select('*')
    .order('page', { ascending: true })
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];

  // Group rows by page
  const grouped: Record<string, typeof rows> = {};
  for (const row of rows) {
    if (!grouped[row.page]) grouped[row.page] = [];
    grouped[row.page].push(row);
  }

  // Compute stats
  const pages = Object.keys(grouped);
  const totalSections = rows.length;
  const activeSections = rows.filter((r) => r.is_active).length;

  return NextResponse.json({
    grouped,
    stats: {
      totalPages: pages.length,
      totalSections,
      activeSections,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const body = await req.json();
  const { id, content, is_active } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const db = createSupabaseAdminClient();

  const updates: Record<string, unknown> = {};
  if (content !== undefined) updates.content = content;
  if (typeof is_active === 'boolean') updates.is_active = is_active;
  updates.updated_at = new Date().toISOString();
  updates.updated_by = auth.id;

  const { data, error } = await db
    .from('site_content')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log entry
  await db.from('audit_log').insert({
    actor_id: auth.id,
    action: 'site_content.update',
    target_type: 'site_content',
    target_id: id,
    after_state: updates,
    ip_address: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null,
  });

  return NextResponse.json(data);
}
