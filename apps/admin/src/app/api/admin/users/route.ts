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
  const plan = url.searchParams.get('plan') ?? '';

  const db = createSupabaseAdminClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Build profile query
  let query = db
    .from('profiles')
    .select('id, email, full_name, avatar_url, role, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
  }

  const { data: profiles, count: total, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!profiles?.length) {
    return NextResponse.json({ data: [], total: 0, page, pageSize, totalPages: 0 });
  }

  const userIds = profiles.map((p) => p.id);

  // Get subscriptions and project counts in parallel
  const [subsRes, projRes] = await Promise.all([
    db.from('subscriptions').select('user_id, plan_tier, status, amount_cents').in('user_id', userIds),
    db.from('projects').select('user_id').in('user_id', userIds).eq('status', 'active'),
  ]);

  const subMap: Record<string, { plan_tier: string; status: string; amount_cents: number }> = {};
  for (const s of subsRes.data ?? []) subMap[s.user_id] = s;

  const projCountMap: Record<string, number> = {};
  for (const p of projRes.data ?? []) {
    projCountMap[p.user_id] = (projCountMap[p.user_id] ?? 0) + 1;
  }

  let rows = profiles.map((p) => {
    const sub = subMap[p.id];
    return {
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      role: p.role,
      created_at: p.created_at,
      plan_tier: sub?.plan_tier ?? 'free',
      subscription_status: sub?.status ?? null,
      mrr_cents: sub?.amount_cents ?? 0,
      project_count: projCountMap[p.id] ?? 0,
      last_activity_at: null,
    };
  });

  // Filter by plan tier
  if (plan && plan !== 'all') {
    if (plan === 'churned') {
      rows = rows.filter((r) => r.subscription_status === 'canceled');
    } else {
      rows = rows.filter((r) => r.plan_tier === plan);
    }
  }

  return NextResponse.json({
    data: rows,
    total: total ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((total ?? 0) / pageSize),
  });
}
