'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';

type BlogPostData = {
  id: string;
  type: 'blog' | 'guide';
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_image: string | null;
  tags: string[];
  published_at: string | null;
  created_at: string;
};

function isHTML(str: string): boolean {
  return /<[a-z][\s\S]*>/i.test(str);
}

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [post, setPost] = useState<BlogPostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/blog/${slug}`)
      .then((r) => {
        if (r.status === 404) {
          setNotFound(true);
          setLoading(false);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data?.post) setPost(data.post);
        setLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '120px 32px', textAlign: 'center', color: 'var(--muted)' }}>
        Loading...
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '120px 32px', textAlign: 'center' }}>
        <h1
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: 36,
            fontWeight: 600,
            marginBottom: 16,
          }}
        >
          Post not found
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 15, marginBottom: 32 }}>
          This post may have been removed or doesn&apos;t exist.
        </p>
        <Link
          href="/blog"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: 'var(--ink)',
            color: 'var(--paper)',
            borderRadius: 999,
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Back to Blog
        </Link>
      </div>
    );
  }

  const publishDate = post.published_at ?? post.created_at;
  const contentIsHTML = post.content ? isHTML(post.content) : false;

  // Build JSON-LD for this blog post (SEO/AEO)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt ?? `Read ${post.title} on the Jetdale blog.`,
    url: `https://jetdale.com/blog/${post.slug}`,
    datePublished: publishDate,
    dateModified: publishDate,
    author: { '@type': 'Organization', name: 'Jetdale', url: 'https://jetdale.com' },
    publisher: {
      '@type': 'Organization',
      name: 'Jetdale',
      logo: { '@type': 'ImageObject', url: 'https://jetdale.com/og-image.png' },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://jetdale.com/blog/${post.slug}` },
    keywords: post.tags?.join(', ') ?? '',
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://jetdale.com' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://jetdale.com/blog' },
      { '@type': 'ListItem', position: 3, name: post.title, item: `https://jetdale.com/blog/${post.slug}` },
    ],
  };

  return (
    <article style={{ maxWidth: 800, margin: '0 auto', padding: '80px 32px 100px' }}>
      {/* Structured Data for SEO/AEO */}
      <Script id="ld-blogpost" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Script id="ld-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      {/* Breadcrumb */}
      <div style={{ marginBottom: 32 }}>
        <Link
          href="/blog"
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            textDecoration: 'none',
          }}
        >
          &larr; Back to Blog
        </Link>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: post.type === 'guide' ? 'var(--accent)' : 'var(--muted)',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: 100,
              background: post.type === 'guide' ? 'rgba(255,91,31,0.1)' : 'rgba(14,15,12,0.06)',
            }}
          >
            {post.type}
          </span>
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              color: 'var(--muted)',
            }}
          >
            {new Date(publishDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>

        <h1
          style={{
            fontFamily: "'Bricolage Grotesque', -apple-system, sans-serif",
            fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: 600,
            letterSpacing: '-0.035em',
            lineHeight: 1.1,
            marginBottom: 16,
          }}
        >
          {post.title}
        </h1>

        {post.excerpt && (
          <p
            style={{
              fontSize: 18,
              color: 'var(--muted)',
              lineHeight: 1.6,
              marginBottom: 0,
            }}
          >
            {post.excerpt}
          </p>
        )}
      </div>

      {/* Cover image */}
      {post.cover_image && (
        <div
          style={{
            marginBottom: 48,
            borderRadius: 12,
            overflow: 'hidden',
            border: '1px solid var(--paper-3)',
          }}
        >
          <img
            src={post.cover_image}
            alt={post.title}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </div>
      )}

      {/* Divider */}
      <div style={{ width: 48, height: 2, background: 'var(--accent)', marginBottom: 48 }} />

      {/* Content */}
      {post.content && (
        contentIsHTML ? (
          <div
            dangerouslySetInnerHTML={{ __html: post.content }}
            style={{
              fontFamily: "'Manrope', -apple-system, sans-serif",
              fontSize: 16,
              lineHeight: 1.8,
              color: 'var(--ink)',
            }}
            className="blog-content"
          />
        ) : (
          <div
            style={{
              fontFamily: "'Manrope', -apple-system, sans-serif",
              fontSize: 16,
              lineHeight: 1.8,
              color: 'var(--ink)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {post.content}
          </div>
        )
      )}

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div style={{ marginTop: 48, paddingTop: 32, borderTop: '1px solid var(--paper-3)' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {post.tags.map((tag, i) => (
              <span
                key={i}
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  padding: '6px 14px',
                  borderRadius: 100,
                  background: 'var(--paper-2)',
                  border: '1px solid var(--paper-3)',
                  color: 'var(--muted)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Blog content styles */}
      <style>{`
        .blog-content h2 {
          font-family: 'Bricolage Grotesque', -apple-system, sans-serif;
          font-size: 28px;
          font-weight: 600;
          letter-spacing: -0.02em;
          margin: 48px 0 16px;
          line-height: 1.2;
        }
        .blog-content h3 {
          font-family: 'Bricolage Grotesque', -apple-system, sans-serif;
          font-size: 22px;
          font-weight: 600;
          letter-spacing: -0.01em;
          margin: 36px 0 12px;
          line-height: 1.3;
        }
        .blog-content p {
          margin: 0 0 20px;
        }
        .blog-content ul, .blog-content ol {
          margin: 0 0 20px;
          padding-left: 24px;
        }
        .blog-content li {
          margin-bottom: 8px;
        }
        .blog-content blockquote {
          margin: 24px 0;
          padding: 16px 24px;
          border-left: 3px solid var(--accent);
          background: var(--paper-2);
          border-radius: 0 8px 8px 0;
          font-style: italic;
          color: var(--muted);
        }
        .blog-content a {
          color: var(--accent);
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .blog-content a:hover {
          opacity: 0.8;
        }
        .blog-content strong {
          font-weight: 700;
          color: var(--ink);
        }
        .blog-content hr {
          border: none;
          height: 1px;
          background: var(--paper-3);
          margin: 40px 0;
        }
        .blog-content img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 24px 0;
        }
      `}</style>
    </article>
  );
}
