'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import type { BlogPost } from '@/lib/admin-types';
import s from '../admin.module.css';

// ── Helpers ──────────────────────────────────────────────────

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function isHTML(str: string): boolean {
  return /<[a-z][\s\S]*>/i.test(str);
}

const FILTERS = ['all', 'blog', 'guide', 'draft', 'published'] as const;
type Filter = (typeof FILTERS)[number];

function matchesFilter(post: BlogPost, filter: Filter): boolean {
  switch (filter) {
    case 'all': return true;
    case 'blog': return post.type === 'blog';
    case 'guide': return post.type === 'guide';
    case 'draft': return post.status === 'draft';
    case 'published': return post.status === 'published';
  }
}

// ── Toolbar button definitions ───────────────────────────────

interface ToolbarAction {
  label: string;
  prefix: string;
  suffix: string;
  block?: boolean;
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { label: 'B',       prefix: '<strong>',      suffix: '</strong>' },
  { label: 'I',       prefix: '<em>',           suffix: '</em>' },
  { label: 'Link',    prefix: '<a href="url">', suffix: '</a>' },
  { label: 'H2',      prefix: '<h2>',           suffix: '</h2>',       block: true },
  { label: 'H3',      prefix: '<h3>',           suffix: '</h3>',       block: true },
  { label: 'UL',      prefix: '<li>',           suffix: '</li>',       block: true },
  { label: 'Quote',   prefix: '<blockquote>',   suffix: '</blockquote>', block: true },
  { label: 'P',       prefix: '<p>',            suffix: '</p>',        block: true },
  { label: 'Img',     prefix: '<img src="',     suffix: '" alt="" />' },
];

// ── Component ────────────────────────────────────────────────

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [formType, setFormType] = useState<'blog' | 'guide'>('blog');
  const [formTitle, setFormTitle] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formExcerpt, setFormExcerpt] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formStatus, setFormStatus] = useState<'draft' | 'published'>('draft');

  // AI generation
  const [aiTopic, setAiTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);

  // Preview
  const [showPreview, setShowPreview] = useState(false);

  // Track whether the slug was manually edited
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const contentRef = useRef<HTMLTextAreaElement>(null);

  // ── Data fetching ────────────────────────────────────────

  const fetchPosts = useCallback(async () => {
    try {
      const res = await adminFetch<{ data: BlogPost[] }>('/api/admin/blog');
      setPosts(res.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // ── Editor helpers ───────────────────────────────────────

  function resetForm() {
    setFormType('blog');
    setFormTitle('');
    setFormSlug('');
    setFormExcerpt('');
    setFormContent('');
    setFormTags('');
    setFormStatus('draft');
    setSlugManuallyEdited(false);
    setShowAiPanel(false);
    setShowPreview(false);
    setAiTopic('');
  }

  function openNewPost() {
    resetForm();
    setEditing(null);
    setIsNew(true);
  }

  function openEditPost(post: BlogPost) {
    setFormType(post.type);
    setFormTitle(post.title);
    setFormSlug(post.slug);
    setFormExcerpt(post.excerpt ?? '');
    setFormContent(post.content ?? '');
    setFormTags((post.tags ?? []).join(', '));
    setFormStatus(post.status);
    setSlugManuallyEdited(true);
    setEditing(post);
    setIsNew(false);
    setShowAiPanel(false);
    setShowPreview(false);
  }

  function cancelEditor() {
    setEditing(null);
    setIsNew(false);
    resetForm();
  }

  function handleTitleChange(value: string) {
    setFormTitle(value);
    if (!slugManuallyEdited) {
      setFormSlug(generateSlug(value));
    }
  }

  function handleSlugChange(value: string) {
    setFormSlug(value);
    setSlugManuallyEdited(true);
  }

  // ── AI Generate ────────────────────────────────────────────

  async function handleGenerate() {
    const topic = aiTopic.trim() || formTitle.trim();
    if (!topic) {
      alert('Please enter a topic or title first.');
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch('/api/admin/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ topic, type: formType }),
      });

      const data = await res.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      if (data.content) setFormContent(data.content);
      if (data.excerpt) setFormExcerpt(data.excerpt);
      if (data.tags?.length) setFormTags(data.tags.join(', '));

      // Auto-generate title and slug from topic if empty
      if (!formTitle.trim()) {
        setFormTitle(topic);
        setFormSlug(generateSlug(topic));
      }

      setShowAiPanel(false);
    } catch {
      alert('Failed to generate content. Please try again.');
    }
    setGenerating(false);
  }

  // ── Toolbar text insertion ───────────────────────────────

  const insertMarkdown = useCallback((action: ToolbarAction) => {
    const textarea = contentRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);

    let insertion: string;
    if (action.block && selected.length === 0) {
      insertion = action.prefix + 'text' + action.suffix;
    } else {
      insertion = action.prefix + (selected || 'text') + action.suffix;
    }

    const before = text.substring(0, start);
    const after = text.substring(end);
    const newValue = before + insertion + after;

    setFormContent(newValue);

    requestAnimationFrame(() => {
      textarea.focus();
      const cursorPos = start + action.prefix.length;
      const cursorEnd = cursorPos + (selected.length || 4);
      textarea.setSelectionRange(cursorPos, cursorEnd);
    });
  }, []);

  // ── Save ─────────────────────────────────────────────────

  async function handleSave() {
    if (!formTitle.trim() || !formSlug.trim()) {
      alert('Title and slug are required.');
      return;
    }

    setSaving(true);
    const tags = formTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      if (isNew) {
        await fetch('/api/admin/blog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            type: formType,
            title: formTitle.trim(),
            slug: formSlug.trim(),
            excerpt: formExcerpt.trim() || null,
            content: formContent || null,
            status: formStatus,
            tags,
          }),
        });
      } else if (editing) {
        await fetch('/api/admin/blog', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            id: editing.id,
            type: formType,
            title: formTitle.trim(),
            slug: formSlug.trim(),
            excerpt: formExcerpt.trim() || null,
            content: formContent || null,
            status: formStatus,
            tags,
          }),
        });
      }
      await fetchPosts();
      cancelEditor();
    } catch {
      alert('Failed to save post. Please try again.');
    }
    setSaving(false);
  }

  // ── Delete ───────────────────────────────────────────────

  async function handleDelete(post: BlogPost) {
    if (!confirm(`Delete "${post.title}"? This action cannot be undone.`)) return;

    try {
      await fetch(`/api/admin/blog?id=${encodeURIComponent(post.id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      await fetchPosts();
    } catch {
      alert('Failed to delete post. Please try again.');
    }
  }

  // ── Filter posts ─────────────────────────────────────────

  const filteredPosts = posts.filter((p) => matchesFilter(p, filter));
  const showEditor = isNew || editing !== null;

  // ── Stats ────────────────────────────────────────────────

  const totalPosts = posts.length;
  const publishedCount = posts.filter((p) => p.status === 'published').length;
  const blogCount = posts.filter((p) => p.type === 'blog').length;
  const guideCount = posts.filter((p) => p.type === 'guide').length;

  // ── Render ───────────────────────────────────────────────

  return (
    <>
      <header className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Blog &amp; Guides</h1>
          <span style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            color: 'var(--muted)',
            marginLeft: 8,
          }}>
            {totalPosts} posts
          </span>
        </div>
        <div className={s.headerControls}>
          {!showEditor && (
            <button className={s.btnPrimary} onClick={openNewPost}>
              + New Post
            </button>
          )}
        </div>
      </header>

      {/* KPI Cards */}
      <div className={s.kpiGrid}>
        <div className={`${s.card} ${s.cardFeatured}`}>
          <div className={s.cardTitle}>Total Posts</div>
          <div className={s.cardValue}>{totalPosts}</div>
        </div>
        <div className={s.card}>
          <div className={s.cardTitle}>Published</div>
          <div className={s.cardValue}>{publishedCount}</div>
        </div>
        <div className={s.card}>
          <div className={s.cardTitle}>Blog Posts</div>
          <div className={s.cardValue}>{blogCount}</div>
        </div>
        <div className={s.card}>
          <div className={s.cardTitle}>Guides</div>
          <div className={s.cardValue}>{guideCount}</div>
        </div>
      </div>

      {showEditor ? (
        /* ══════════════════════════════════════════════════════
           EDITOR VIEW
           ══════════════════════════════════════════════════════ */
        <div className={s.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <h2 className={s.sectionTitle} style={{ marginBottom: 0 }}>
              {isNew ? 'New Post' : `Editing: ${editing?.title}`}
            </h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className={s.btnOutline}
                onClick={() => setShowPreview(!showPreview)}
                style={{
                  fontSize: 11,
                  padding: '6px 14px',
                  background: showPreview ? 'var(--ink)' : undefined,
                  color: showPreview ? 'var(--paper)' : undefined,
                }}
              >
                {showPreview ? 'Editor' : 'Preview'}
              </button>
              <button
                className={s.btnOutline}
                onClick={() => setShowAiPanel(!showAiPanel)}
                style={{
                  fontSize: 11,
                  padding: '6px 14px',
                  borderColor: 'var(--accent)',
                  color: 'var(--accent)',
                }}
              >
                Generate with AI
              </button>
            </div>
          </div>

          {/* AI Generation Panel */}
          {showAiPanel && (
            <div style={{
              marginBottom: 24,
              padding: 20,
              border: '1px solid var(--accent)',
              borderRadius: 8,
              background: 'rgba(255, 91, 31, 0.04)',
            }}>
              <div style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 10,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
                marginBottom: 12,
                fontWeight: 700,
              }}>
                AI Content Generator
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder={formTitle || 'Enter a topic for AI to write about...'}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleGenerate(); }}
                  style={{
                    flex: 1,
                    fontFamily: "'Manrope', sans-serif",
                    fontSize: 13,
                    padding: '10px 14px',
                    border: '1px solid var(--rule)',
                    borderRadius: 6,
                    background: 'var(--paper)',
                    color: 'var(--ink)',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  className={s.btnPrimary}
                  onClick={handleGenerate}
                  disabled={generating}
                  style={{
                    opacity: generating ? 0.5 : 1,
                    background: 'var(--accent)',
                    flexShrink: 0,
                  }}
                >
                  {generating ? 'Generating...' : 'Generate'}
                </button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                {formTitle ? `Using title "${formTitle}" as topic. Override by typing a custom topic above.` : 'Enter a topic and the AI will generate a full blog post with excerpt and tags.'}
              </div>
            </div>
          )}

          {/* Type Selector */}
          <div style={{ marginBottom: 20 }}>
            <div className={s.sectionTitle}>Type</div>
            <div className={s.filterGroup}>
              <button
                className={`${s.filterPill} ${formType === 'blog' ? s.filterPillActive : ''}`}
                onClick={() => setFormType('blog')}
              >
                Blog
              </button>
              <button
                className={`${s.filterPill} ${formType === 'guide' ? s.filterPillActive : ''}`}
                onClick={() => setFormType('guide')}
              >
                Guide
              </button>
            </div>
          </div>

          {/* Title */}
          <div style={{ marginBottom: 20 }}>
            <div className={s.sectionTitle}>Title</div>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Enter post title..."
              style={{
                width: '100%',
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                padding: '12px 16px',
                border: '1px solid var(--rule)',
                borderRadius: 6,
                background: 'var(--paper)',
                color: 'var(--ink)',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Slug */}
          <div style={{ marginBottom: 20 }}>
            <div className={s.sectionTitle}>Slug</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 12,
                color: 'var(--muted)',
                flexShrink: 0,
              }}>
                /blog/
              </span>
              <input
                type="text"
                value={formSlug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="post-slug"
                style={{
                  flex: 1,
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 13,
                  padding: '10px 14px',
                  border: '1px solid var(--rule)',
                  borderRadius: 6,
                  background: 'var(--paper)',
                  color: 'var(--ink)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Excerpt */}
          <div style={{ marginBottom: 20 }}>
            <div className={s.sectionTitle}>Excerpt</div>
            <textarea
              value={formExcerpt}
              onChange={(e) => setFormExcerpt(e.target.value)}
              placeholder="Brief summary of the post..."
              rows={3}
              style={{
                width: '100%',
                fontFamily: "'Manrope', sans-serif",
                fontSize: 13,
                lineHeight: 1.6,
                padding: '12px 16px',
                border: '1px solid var(--rule)',
                borderRadius: 6,
                background: 'var(--paper)',
                color: 'var(--ink)',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Content — Editor or Preview */}
          <div style={{ marginBottom: 20 }}>
            <div className={s.sectionTitle}>Content</div>

            {showPreview ? (
              /* ── Preview Panel ── */
              <div style={{
                border: '1px solid var(--rule)',
                borderRadius: 6,
                padding: 24,
                background: 'var(--paper)',
                minHeight: 300,
              }}>
                {formContent ? (
                  isHTML(formContent) ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: formContent }}
                      style={{
                        fontFamily: "'Manrope', -apple-system, sans-serif",
                        fontSize: 15,
                        lineHeight: 1.8,
                        color: 'var(--ink)',
                      }}
                      className="blog-preview-content"
                    />
                  ) : (
                    <div style={{
                      fontFamily: "'Manrope', -apple-system, sans-serif",
                      fontSize: 15,
                      lineHeight: 1.8,
                      color: 'var(--ink)',
                      whiteSpace: 'pre-wrap',
                    }}>
                      {formContent}
                    </div>
                  )
                ) : (
                  <div style={{ color: 'var(--muted)', fontSize: 14, fontStyle: 'italic' }}>
                    No content to preview. Write or generate content first.
                  </div>
                )}

                {/* Preview styles */}
                <style>{`
                  .blog-preview-content h2 {
                    font-family: 'Bricolage Grotesque', -apple-system, sans-serif;
                    font-size: 24px;
                    font-weight: 600;
                    letter-spacing: -0.02em;
                    margin: 32px 0 12px;
                    line-height: 1.2;
                  }
                  .blog-preview-content h3 {
                    font-family: 'Bricolage Grotesque', -apple-system, sans-serif;
                    font-size: 20px;
                    font-weight: 600;
                    margin: 24px 0 10px;
                    line-height: 1.3;
                  }
                  .blog-preview-content p {
                    margin: 0 0 16px;
                  }
                  .blog-preview-content ul, .blog-preview-content ol {
                    margin: 0 0 16px;
                    padding-left: 24px;
                  }
                  .blog-preview-content li {
                    margin-bottom: 6px;
                  }
                  .blog-preview-content blockquote {
                    margin: 20px 0;
                    padding: 12px 20px;
                    border-left: 3px solid var(--accent);
                    background: var(--paper-2);
                    border-radius: 0 6px 6px 0;
                    font-style: italic;
                    color: var(--muted);
                  }
                  .blog-preview-content a {
                    color: var(--accent);
                    text-decoration: underline;
                  }
                  .blog-preview-content strong {
                    font-weight: 700;
                  }
                  .blog-preview-content hr {
                    border: none;
                    height: 1px;
                    background: var(--paper-3);
                    margin: 32px 0;
                  }
                  .blog-preview-content img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 6px;
                    margin: 16px 0;
                  }
                `}</style>
              </div>
            ) : (
              /* ── Code Editor ── */
              <>
                {/* Rich text toolbar */}
                <div style={{
                  display: 'flex',
                  gap: 4,
                  padding: '8px 12px',
                  border: '1px solid var(--rule)',
                  borderBottom: 'none',
                  borderRadius: '6px 6px 0 0',
                  background: 'rgba(14, 15, 12, 0.02)',
                  flexWrap: 'wrap',
                }}>
                  {TOOLBAR_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => insertMarkdown(action)}
                      title={action.label}
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '4px 10px',
                        border: '1px solid var(--rule)',
                        borderRadius: 4,
                        background: 'var(--paper)',
                        color: 'var(--ink)',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                        lineHeight: 1.2,
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLButtonElement).style.background = 'rgba(14, 15, 12, 0.06)';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLButtonElement).style.background = 'var(--paper)';
                      }}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>

                <textarea
                  ref={contentRef}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Write your content using HTML tags... Use the toolbar above or the AI generator."
                  rows={15}
                  style={{
                    width: '100%',
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 13,
                    lineHeight: 1.6,
                    padding: '16px',
                    border: '1px solid var(--rule)',
                    borderTop: 'none',
                    borderRadius: '0 0 6px 6px',
                    background: 'var(--paper)',
                    color: 'var(--ink)',
                    resize: 'vertical',
                    minHeight: 300,
                    boxSizing: 'border-box',
                  }}
                />
              </>
            )}
          </div>

          {/* Tags */}
          <div style={{ marginBottom: 20 }}>
            <div className={s.sectionTitle}>Tags</div>
            <input
              type="text"
              value={formTags}
              onChange={(e) => setFormTags(e.target.value)}
              placeholder="startup, saas, growth (comma-separated)"
              style={{
                width: '100%',
                fontFamily: "'Manrope', sans-serif",
                fontSize: 13,
                padding: '10px 14px',
                border: '1px solid var(--rule)',
                borderRadius: 6,
                background: 'var(--paper)',
                color: 'var(--ink)',
                boxSizing: 'border-box',
              }}
            />
            {formTags.trim() && (
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {formTags.split(',').map((tag) => tag.trim()).filter(Boolean).map((tag, i) => (
                  <span key={i} className={`${s.tag} ${s.tagFree}`}>{tag}</span>
                ))}
              </div>
            )}
          </div>

          {/* Status */}
          <div style={{ marginBottom: 28 }}>
            <div className={s.sectionTitle}>Status</div>
            <div className={s.filterGroup}>
              <button
                className={`${s.filterPill} ${formStatus === 'draft' ? s.filterPillActive : ''}`}
                onClick={() => setFormStatus('draft')}
              >
                Draft
              </button>
              <button
                className={`${s.filterPill} ${formStatus === 'published' ? s.filterPillActive : ''}`}
                onClick={() => setFormStatus('published')}
              >
                Published
              </button>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, borderTop: '1px solid var(--rule)', paddingTop: 20 }}>
            <button
              className={s.btnPrimary}
              onClick={handleSave}
              disabled={saving}
              style={{ opacity: saving ? 0.5 : 1 }}
            >
              {saving ? 'Saving...' : isNew ? 'Create Post' : 'Save Changes'}
            </button>
            <button className={s.btnOutline} onClick={cancelEditor}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════
           LIST VIEW
           ══════════════════════════════════════════════════════ */
        <>
          {/* Filter Pills */}
          <div className={s.filterGroup} style={{ marginBottom: 24 }}>
            {FILTERS.map((f) => (
              <button
                key={f}
                className={`${s.filterPill} ${filter === f ? s.filterPillActive : ''}`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className={s.card}>
              <div className={s.chartPlaceholder}>Loading posts...</div>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className={s.placeholderPage}>
              <div className={s.placeholderTitle}>
                {posts.length === 0 ? 'No posts yet' : 'No posts match this filter'}
              </div>
              <div className={s.placeholderSub}>
                {posts.length === 0
                  ? 'Click "+ New Post" to create your first blog post or guide'
                  : 'Try selecting a different filter above'}
              </div>
            </div>
          ) : (
            <div style={{ border: '1px solid var(--rule)', borderRadius: 8, overflow: 'hidden', background: 'var(--paper)' }}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Tags</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPosts.map((post) => (
                    <tr key={post.id}>
                      {/* Title */}
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>
                          {post.title}
                        </div>
                        <div style={{
                          fontFamily: "'Space Mono', monospace",
                          fontSize: 10,
                          color: 'var(--muted)',
                          marginTop: 2,
                        }}>
                          /{post.slug}
                        </div>
                      </td>

                      {/* Type */}
                      <td>
                        <span className={`${s.tag} ${post.type === 'blog' ? s.tagPro : s.tagTeam}`}>
                          {post.type}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`${s.statusBadge} ${post.status === 'published' ? s.statusGreen : s.statusGray}`}>
                          <span className={s.statusDot} />
                          {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                        </span>
                      </td>

                      {/* Tags */}
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {(post.tags ?? []).slice(0, 3).map((tag, i) => (
                            <span
                              key={i}
                              style={{
                                fontFamily: "'Space Mono', monospace",
                                fontSize: 10,
                                padding: '2px 8px',
                                borderRadius: 4,
                                background: 'rgba(14, 15, 12, 0.06)',
                                color: 'var(--muted)',
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                          {(post.tags ?? []).length > 3 && (
                            <span style={{
                              fontFamily: "'Space Mono', monospace",
                              fontSize: 10,
                              color: 'var(--muted)',
                            }}>
                              +{post.tags.length - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 11,
                        color: 'var(--muted)',
                      }}>
                        {new Date(post.created_at).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {post.status === 'published' && (
                            <a
                              href={`/blog/${post.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={s.btnOutline}
                              style={{
                                padding: '4px 12px',
                                fontSize: 10,
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                              }}
                            >
                              View
                            </a>
                          )}
                          <button
                            className={s.btnOutline}
                            onClick={() => openEditPost(post)}
                            style={{ padding: '4px 12px', fontSize: 10 }}
                          >
                            Edit
                          </button>
                          <button
                            className={s.btnOutline}
                            onClick={() => handleDelete(post)}
                            style={{
                              padding: '4px 12px',
                              fontSize: 10,
                              color: 'var(--error)',
                              borderColor: 'var(--error)',
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
