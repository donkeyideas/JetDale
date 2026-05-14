import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, isErrorResponse } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('email_templates')
    .select('*')
    .order('category', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const body = await req.json();
  const { id, subject, html_body } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const db = createSupabaseAdminClient();
  const updates: Record<string, unknown> = {};
  if (typeof subject === 'string') updates.subject = subject;
  if (typeof html_body === 'string') updates.html_body = html_body;

  const { data, error } = await db
    .from('email_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
