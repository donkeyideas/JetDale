// ============================================================
// DELETE /api/projects/[id]
// Server-authoritative hard delete via the admin client so RLS,
// stale browser auth, and sync races can't resurrect the row.
// Cascade deletes artifacts, chat_messages, reality_checks, etc.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyUser, isErrorResponse } from '@/lib/stripe';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await verifyUser(req);
  if (isErrorResponse(user)) return user;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Missing project id' }, { status: 400 });
  }

  const db = createSupabaseAdminClient();

  // Verify ownership before deleting (the admin client bypasses RLS).
  const { data: project, error: lookupErr } = await db
    .from('projects')
    .select('id, user_id')
    .eq('id', id)
    .maybeSingle();

  if (lookupErr) {
    return NextResponse.json({ error: lookupErr.message }, { status: 500 });
  }
  if (!project) {
    // Already gone — treat as success so the UI stays consistent.
    return NextResponse.json({ ok: true, alreadyGone: true });
  }
  if (project.user_id !== user.id) {
    return NextResponse.json({ error: 'Not your project' }, { status: 403 });
  }

  const { error: deleteErr } = await db
    .from('projects')
    .delete()
    .eq('id', id);

  if (deleteErr) {
    return NextResponse.json(
      { error: `Delete failed: ${deleteErr.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
