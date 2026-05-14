import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, isErrorResponse } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

function deriveSeverity(action: string): 'info' | 'warning' | 'critical' {
  const critical = ['delete', 'suspend', 'ban', 'purge'];
  const warning = ['role_change', 'refund', 'api_key', 'billing', 'permission'];
  const lower = action.toLowerCase();
  if (critical.some((k) => lower.includes(k))) return 'critical';
  if (warning.some((k) => lower.includes(k))) return 'warning';
  return 'info';
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '20')));
  const search = url.searchParams.get('search')?.trim() ?? '';
  const severity = url.searchParams.get('severity') ?? '';

  const db = createSupabaseAdminClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Get total count
  let countQuery = db.from('audit_log').select('id', { count: 'exact', head: true });
  if (search) countQuery = countQuery.or(`action.ilike.%${search}%,target_type.ilike.%${search}%,target_id.ilike.%${search}%`);
  const { count: total } = await countQuery;

  // Get paginated data
  let query = db
    .from('audit_log')
    .select('id, actor_id, action, target_type, target_id, ip_address, created_at')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search) query = query.or(`action.ilike.%${search}%,target_type.ilike.%${search}%,target_id.ilike.%${search}%`);
  const { data: logs, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Resolve actor names
  const actorIds = [...new Set((logs ?? []).map((l) => l.actor_id).filter(Boolean))];
  const { data: profiles } = actorIds.length
    ? await db.from('profiles').select('id, email, full_name').in('id', actorIds)
    : { data: [] };

  const profileMap: Record<string, { email: string; full_name: string | null }> = {};
  for (const p of profiles ?? []) profileMap[p.id] = p;

  const rows = (logs ?? []).map((l) => {
    const actor = l.actor_id ? profileMap[l.actor_id] : null;
    return {
      id: l.id,
      actor_email: actor?.email ?? null,
      actor_name: actor?.full_name ?? null,
      action: l.action,
      target_type: l.target_type,
      target_id: l.target_id,
      ip_address: l.ip_address,
      created_at: l.created_at,
      severity: deriveSeverity(l.action),
    };
  });

  // Filter by severity client-side (derived, not in DB)
  const filtered = severity ? rows.filter((r) => r.severity === severity) : rows;

  return NextResponse.json({
    data: filtered,
    total: total ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((total ?? 0) / pageSize),
  });
}
