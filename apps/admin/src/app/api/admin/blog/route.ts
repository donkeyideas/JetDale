import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, isErrorResponse } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('blog_posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const body = await req.json();
  const { type, title, slug, excerpt, content, status, tags } = body;

  if (!title || !slug) {
    return NextResponse.json({ error: 'title and slug are required' }, { status: 400 });
  }

  const db = createSupabaseAdminClient();

  const now = new Date().toISOString();
  const insert: Record<string, unknown> = {
    type: type ?? 'blog',
    title,
    slug,
    excerpt: excerpt ?? null,
    content: content ?? null,
    status: status ?? 'draft',
    tags: tags ?? [],
    author_id: auth.id,
    published_at: status === 'published' ? now : null,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await db
    .from('blog_posts')
    .insert(insert)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log entry
  await db.from('audit_log').insert({
    actor_id: auth.id,
    action: 'blog_post.create',
    target_type: 'blog_post',
    target_id: data.id,
    after_state: { title, slug, type, status },
    ip_address: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null,
  });

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const body = await req.json();
  const { id, ...fields } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const db = createSupabaseAdminClient();

  const allowed = ['type', 'title', 'slug', 'excerpt', 'content', 'cover_image', 'status', 'tags'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (fields[key] !== undefined) updates[key] = fields[key];
  }
  updates.updated_at = new Date().toISOString();

  // Set published_at when publishing for the first time
  if (fields.status === 'published') {
    // Only set published_at if not already set
    const { data: existing } = await db
      .from('blog_posts')
      .select('published_at')
      .eq('id', id)
      .single();
    if (existing && !existing.published_at) {
      updates.published_at = new Date().toISOString();
    }
  }

  const { data, error } = await db
    .from('blog_posts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log entry
  await db.from('audit_log').insert({
    actor_id: auth.id,
    action: 'blog_post.update',
    target_type: 'blog_post',
    target_id: id,
    after_state: updates,
    ip_address: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null,
  });

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'id query param is required' }, { status: 400 });

  const db = createSupabaseAdminClient();

  // Fetch for audit log before deletion
  const { data: existing } = await db
    .from('blog_posts')
    .select('title, slug')
    .eq('id', id)
    .single();

  const { error } = await db
    .from('blog_posts')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log entry
  await db.from('audit_log').insert({
    actor_id: auth.id,
    action: 'blog_post.delete',
    target_type: 'blog_post',
    target_id: id,
    after_state: existing ?? { id },
    ip_address: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null,
  });

  return NextResponse.json({ success: true });
}
