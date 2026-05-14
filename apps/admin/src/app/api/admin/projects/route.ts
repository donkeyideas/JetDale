import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, isErrorResponse } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '20')));
  const search = url.searchParams.get('search')?.trim() ?? '';
  const phase = url.searchParams.get('phase') ?? '';

  const db = createSupabaseAdminClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = db
    .from('projects')
    .select('id, user_id, archetype_id, name, phase, status, progress_pct, created_at, last_activity_at', { count: 'exact' })
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search) query = query.ilike('name', `%${search}%`);
  if (phase) query = query.eq('phase', phase);

  const { data: projects, count: total, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!projects?.length) {
    return NextResponse.json({ data: [], total: 0, page, pageSize, totalPages: 0 });
  }

  const userIds = [...new Set(projects.map((p) => p.user_id))];
  const archIds = [...new Set(projects.map((p) => p.archetype_id).filter(Boolean))];

  const [profilesRes, archRes, artifactRes] = await Promise.all([
    db.from('profiles').select('id, email, full_name').in('id', userIds),
    archIds.length ? db.from('archetypes').select('id, name').in('id', archIds) : Promise.resolve({ data: [] }),
    db.from('artifacts').select('project_id').in('project_id', projects.map((p) => p.id)),
  ]);

  const profileMap: Record<string, { email: string; full_name: string | null }> = {};
  for (const p of profilesRes.data ?? []) profileMap[p.id] = p;

  const archMap: Record<string, string> = {};
  for (const a of archRes.data ?? []) archMap[a.id] = a.name;

  const artifactCountMap: Record<string, number> = {};
  for (const a of artifactRes.data ?? []) {
    artifactCountMap[a.project_id] = (artifactCountMap[a.project_id] ?? 0) + 1;
  }

  const rows = projects.map((p) => {
    const profile = profileMap[p.user_id];
    return {
      id: p.id,
      name: p.name,
      phase: p.phase,
      status: p.status,
      progress_pct: p.progress_pct ?? 0,
      created_at: p.created_at,
      last_activity_at: p.last_activity_at,
      user_email: profile?.email ?? '',
      user_name: profile?.full_name ?? null,
      archetype_name: p.archetype_id ? archMap[p.archetype_id] ?? null : null,
      artifact_count: artifactCountMap[p.id] ?? 0,
    };
  });

  return NextResponse.json({
    data: rows,
    total: total ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((total ?? 0) / pageSize),
  });
}
