import type { Metadata } from 'next';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://jetdale.com';

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;

  try {
    const db = createSupabaseAdminClient();
    const { data } = await db
      .from('blog_posts')
      .select('title, excerpt, cover_image, tags, published_at, type')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();

    if (data) {
      const title = data.title;
      const description = data.excerpt ?? `Read "${data.title}" on the Jetdale blog.`;

      return {
        title,
        description,
        keywords: data.tags ?? [],
        openGraph: {
          type: 'article',
          title,
          description,
          url: `/blog/${slug}`,
          publishedTime: data.published_at ?? undefined,
          tags: data.tags ?? [],
          images: data.cover_image ? [{ url: data.cover_image, alt: title }] : ['/og-image.png'],
        },
        twitter: {
          card: 'summary_large_image',
          title,
          description,
          images: data.cover_image ? [data.cover_image] : ['/og-image.png'],
        },
        alternates: {
          canonical: `${SITE_URL}/blog/${slug}`,
        },
      };
    }
  } catch {
    // Fall through to defaults
  }

  return {
    title: 'Blog Post',
    description: 'Read this article on the Jetdale blog.',
  };
}

export default function BlogPostLayout({ children }: { children: React.ReactNode }) {
  return children;
}
