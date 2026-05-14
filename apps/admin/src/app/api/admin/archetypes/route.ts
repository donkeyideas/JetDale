import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, isErrorResponse } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const db = createSupabaseAdminClient();

  const { data: archetypes, error } = await db
    .from('archetypes')
    .select('id, slug, name, category, is_active')
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Count projects per archetype
  const { data: projectCounts } = await db
    .from('projects')
    .select('archetype_id')
    .eq('status', 'active');

  const countMap: Record<string, number> = {};
  for (const p of projectCounts ?? []) {
    if (p.archetype_id) {
      countMap[p.archetype_id] = (countMap[p.archetype_id] ?? 0) + 1;
    }
  }

  const maxCount = Math.max(...Object.values(countMap), 1);

  const rows = (archetypes ?? []).map((a) => ({
    ...a,
    project_count: countMap[a.id] ?? 0,
    completion_rate: null,
  })).sort((a, b) => b.project_count - a.project_count);

  return NextResponse.json({ data: rows, maxCount });
}
