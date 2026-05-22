import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, isErrorResponse } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

/**
 * GET /api/admin/funnel
 * Activation funnel — counts DISTINCT USERS who reached each stage.
 * Counting raw rows (e.g. total projects) inflates stages past 100%;
 * a funnel must measure how many signed-up users reached each step.
 */
export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const db = createSupabaseAdminClient();

  const [profilesRes, projectsRes, discoveryRes, artifactsRes, exportsRes, paidRes] =
    await Promise.all([
      db.from('profiles').select('id', { count: 'exact', head: true }),
      db.from('projects').select('user_id'),
      db.from('discovery_sessions').select('user_id').eq('status', 'completed'),
      db.from('artifacts').select('user_id'),
      db.from('exports').select('user_id'),
      db.from('subscriptions').select('user_id').neq('plan_tier', 'free').in('status', ['active', 'trialing']),
    ]);

  // Count distinct, non-null user_ids in a result set.
  const distinctUsers = (rows: { user_id: string | null }[] | null) =>
    new Set((rows ?? []).map((r) => r.user_id).filter(Boolean)).size;

  return NextResponse.json({
    signups: profilesRes.count ?? 0,
    discovery_started: distinctUsers(projectsRes.data),
    discovery_completed: distinctUsers(discoveryRes.data),
    artifacts_generated: distinctUsers(artifactsRes.data),
    exported: distinctUsers(exportsRes.data),
    paid: distinctUsers(paidRes.data),
  });
}
