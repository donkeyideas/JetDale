'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type PostSummary = {
  id: string;
  type: 'blog' | 'guide';
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image: string | null;
  tags: string[];
  published_at: string | null;
  created_at: string;
};

export default function BlogListingPage() {
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'blog' | 'guide'>('all');

  useEffect(() => {
    fetch('/api/blog')
      .then((r) => r.json())
      .then((data) => {
        if (data.posts) setPosts(data.posts);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? posts : posts.filter((p) => p.type === filter);

  return (
    <div>
      {/* Hero */}
      <section
        style={{
          maxWidth: 1400,
          margin: '0 auto',
          padding: '80px 32px 40px',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <span style={{ width: 32, height: 1, background: 'var(--accent)', display: 'inline-block' }} />
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: 'var(--accent)',
            }}
          >
            Blog
          </span>
          <span style={{ width: 32, height: 1, background: 'var(--accent)', display: 'inline-block' }} />
        </div>

        <h1
          style={{
            fontFamily: "'Bricolage Grotesque', -apple-system, sans-serif",
            fontSize: 'clamp(36px, 5vw, 64px)',
            fontWeight: 600,
            letterSpacing: '-0.035em',
            lineHeight: 1.05,
            marginBottom: 16,
          }}
        >
          Insights &amp; Guides
        </h1>

        <p
          style={{
            fontSize: 18,
            color: 'var(--muted)',
            maxWidth: 500,
            margin: '0 auto 48px',
            lineHeight: 1.6,
          }}
        >
          Learn how to plan, validate, and launch your next project with confidence.
        </p>

        {/* Filter toggle */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: 'var(--paper-2)',
            borderRadius: 100,
            padding: 4,
            marginBottom: 64,
          }}
        >
          {(['all', 'blog', 'guide'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                fontFamily: "'Manrope', -apple-system, sans-serif",
                fontSize: 14,
                fontWeight: 500,
                padding: '10px 24px',
                borderRadius: 100,
                border: 'none',
                cursor: 'pointer',
                background: filter === f ? 'var(--ink)' : 'transparent',
                color: filter === f ? 'var(--paper)' : 'var(--muted)',
                transition: 'all 0.2s ease',
              }}
            >
              {f === 'all' ? 'All' : f === 'blog' ? 'Articles' : 'Guides'}
            </button>
          ))}
        </div>
      </section>

      {/* Posts Grid */}
      <section
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '0 32px 100px',
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)', fontSize: 15 }}>
            Loading posts...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: 24,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              No posts yet
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 15 }}>
              Check back soon for new articles and guides.
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 24,
            }}
          >
            {filtered.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'var(--paper-2)',
                  border: '1px solid var(--paper-3)',
                  borderRadius: 16,
                  overflow: 'hidden',
                  textDecoration: 'none',
                  color: 'var(--ink)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'none';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                {post.cover_image && (
                  <div
                    style={{
                      height: 180,
                      background: `url(${post.cover_image}) center/cover`,
                      borderBottom: '1px solid var(--paper-3)',
                    }}
                  />
                )}
                <div style={{ padding: 28, flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* Type badge */}
                  <div style={{ marginBottom: 12 }}>
                    <span
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 10,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: post.type === 'guide' ? 'var(--accent)' : 'var(--muted)',
                        fontWeight: 700,
                      }}
                    >
                      {post.type}
                    </span>
                  </div>

                  {/* Title */}
                  <h2
                    style={{
                      fontFamily: "'Bricolage Grotesque', -apple-system, sans-serif",
                      fontSize: 22,
                      fontWeight: 600,
                      letterSpacing: '-0.02em',
                      lineHeight: 1.2,
                      marginBottom: 10,
                    }}
                  >
                    {post.title}
                  </h2>

                  {/* Excerpt */}
                  {post.excerpt && (
                    <p
                      style={{
                        fontSize: 14,
                        color: 'var(--muted)',
                        lineHeight: 1.6,
                        marginBottom: 16,
                        flex: 1,
                      }}
                    >
                      {post.excerpt}
                    </p>
                  )}

                  {/* Footer: tags + date */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {post.tags?.slice(0, 2).map((tag, i) => (
                        <span
                          key={i}
                          style={{
                            fontFamily: "'Space Mono', monospace",
                            fontSize: 10,
                            padding: '3px 8px',
                            borderRadius: 4,
                            background: 'rgba(14, 15, 12, 0.06)',
                            color: 'var(--muted)',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 10,
                        color: 'var(--muted)',
                        flexShrink: 0,
                      }}
                    >
                      {new Date(post.published_at ?? post.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
