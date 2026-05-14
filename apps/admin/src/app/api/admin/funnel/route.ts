import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, isErrorResponse } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const db = createSupabaseAdminClient();

  // Try materialized view first — sum across all daily rows
  const { data: funnelRows } = await db
    .from('mv_activation_funnel')
    .select('*');

  if (funnelRows && funnelRows.length > 0) {
    const totals = {
      signups: funnelRows.reduce((s: number, r: Record<string, number>) => s + (r.signups ?? 0), 0),
      discovery_started: funnelRows.reduce((s: number, r: Record<string, number>) => s + (r.discovery_started ?? 0), 0),
      discovery_completed: funnelRows.reduce((s: number, r: Record<string, number>) => s + (r.discovery_completed ?? 0), 0),
      artifacts_generated: funnelRows.reduce((s: number, r: Record<string, number>) => s + (r.artifacts_generated ?? 0), 0),
      exported: funnelRows.reduce((s: number, r: Record<string, number>) => s + (r.exported ?? 0), 0),
      paid: funnelRows.reduce((s: number, r: Record<string, number>) => s + (r.paid ?? 0), 0),
    };
    return NextResponse.json(totals);
  }

  // Fallback: compute from tables
  const [signupsRes, projectsRes, discoveryRes, artifactsRes, exportsRes, paidRes] = await Promise.all([
    db.from('profiles').select('id', { count: 'exact', head: true }),
    db.from('projects').select('id', { count: 'exact', head: true }),
    db.from('discovery_sessions').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    db.from('artifacts').select('id', { count: 'exact', head: true }),
    db.from('exports').select('id', { count: 'exact', head: true }),
    db.from('subscriptions').select('id', { count: 'exact', head: true }).neq('plan_tier', 'free'),
  ]);

  const signups = signupsRes.count ?? 0;
  const stages = {
    signups,
    discovery_started: projectsRes.count ?? 0,
    discovery_completed: discoveryRes.count ?? 0,
    artifacts_generated: artifactsRes.count ?? 0,
    exported: exportsRes.count ?? 0,
    paid: paidRes.count ?? 0,
  };

  return NextResponse.json(stages);
}
