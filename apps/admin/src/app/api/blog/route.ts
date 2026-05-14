import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

/**
 * GET /api/blog — Public blog listing (no auth required).
 * Returns published blog posts only, newest first.
 */
export async function GET() {
  const db = createSupabaseAdminClient();

  const { data, error } = await db
    .from('blog_posts')
    .select('id, type, title, slug, excerpt, cover_image, tags, published_at, created_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ posts: data ?? [] });
}
