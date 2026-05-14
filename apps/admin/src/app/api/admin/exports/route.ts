import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, isErrorResponse } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const db = createSupabaseAdminClient();

  // Service role bypasses owner-only RLS on exports table
  const { data: exports, error } = await db
    .from('exports')
    .select('id, target, status, created_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const all = exports ?? [];
  const total = all.length;

  // Count by target (pdf, markdown, notion, etc.)
  const byTarget: Record<string, number> = {};
  for (const e of all) {
    const t = e.target ?? 'unknown';
    byTarget[t] = (byTarget[t] ?? 0) + 1;
  }

  // Count by doc type — we can get this from joined artifacts if available,
  // but since exports don't store doc_type directly, we count by target
  const byDocType: Record<string, number> = {};

  return NextResponse.json({
    total,
    by_target: byTarget,
    by_doc_type: byDocType,
  });
}
