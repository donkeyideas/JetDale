import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, isErrorResponse } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const db = createSupabaseAdminClient();

  const [usersRes, projectsRes, mrrRes, flagsRes] = await Promise.all([
    db.from('profiles').select('id', { count: 'exact', head: true }),
    db.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    db.from('mv_mrr_snapshot').select('mrr_cents').order('snapshot_date', { ascending: false }).limit(1).maybeSingle(),
    db.from('feature_flags').select('key', { count: 'exact', head: true }),
  ]);

  const totalUsers = usersRes.count ?? 0;
  const totalProjects = projectsRes.count ?? 0;
  const mrrCents = mrrRes.data?.mrr_cents ?? 0;
  const totalFlags = flagsRes.count ?? 0;

  const fmtK = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  const fmtMrr = (cents: number) => `$${fmtK(Math.round(cents / 100))}`;

  return NextResponse.json({
    mrr: fmtMrr(mrrCents),
    users: fmtK(totalUsers),
    projects: fmtK(totalProjects),
    flags: totalFlags,
  });
}
