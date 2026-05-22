'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import type { SocialPost } from '@/lib/admin-types';
import s from '../admin.module.css';

const PLATFORMS = ['twitter', 'linkedin', 'facebook', 'instagram'] as const;
const CHAR_LIMITS: Record<string, number> = { twitter: 280, linkedin: 3000, facebook: 63206, instagram: 2200 };
const PLATFORM_LABELS: Record<string, string> = { twitter: '𝕏 Twitter', linkedin: 'in LinkedIn', facebook: 'f Facebook', instagram: '◻ Instagram' };
const STATUS_FILTERS = ['all', 'draft', 'scheduled', 'published', 'failed'] as const;

function statusCls(st: string) {
  if (st === 'published') return s.statusGreen;
  if (st === 'scheduled') return s.statusYellow;
  if (st === 'failed') return s.statusRed;
  return s.statusGray;
}

export default function SocialPostsPage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formPlatform, setFormPlatform] = useState<typeof PLATFORMS[number]>('twitter');
  const [formContent, setFormContent] = useState('');
  const [formStatus, setFormStatus] = useState<'draft' | 'scheduled'>('draft');
  const [saving, setSaving] = useState(false);

  // AI generator state
  const [aiTopic, setAiTopic] = useState('');
  const [aiTone, setAiTone] = useState('professional');
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState('');

  const fetchPosts = useCallback(async () => {
    try {
      const res = await adminFetch<{ data: SocialPost[] }>('/api/admin/social-posts');
      setPosts(res.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  function startCreate() {
    setCreating(true);
    setEditingId(null);
    setFormPlatform('twitter');
    setFormContent('');
    setFormStatus('draft');
  }

  function startEdit(post: SocialPost) {
    setCreating(false);
    setEditingId(post.id);
    setFormPlatform(post.platform);
    setFormContent(post.content);
    setFormStatus(post.status === 'scheduled' ? 'scheduled' : 'draft');
  }

  function cancelForm() {
    setCreating(false);
    setEditingId(null);
    setAiTopic('');
    setAiError('');
  }

  async function generateWithAI() {
    if (!aiTopic.trim()) return;
    setGenerating(true);
    setAiError('');
    try {
      const res = await fetch('/api/admin/social-posts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ topic: aiTopic, platform: formPlatform, tone: aiTone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setFormContent(data.content);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Generation failed');
    }
    setGenerating(false);
  }

  async function savePost() {
    setSaving(true);
    try {
      if (creating) {
        await fetch('/api/admin/social-posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ platform: formPlatform, content: formContent, status: formStatus }),
        });
      } else if (editingId) {
        await fetch('/api/admin/social-posts', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ id: editingId, content: formContent, status: formStatus }),
        });
      }
      await fetchPosts();
      cancelForm();
    } catch { /* ignore */ }
    setSaving(false);
  }

  async function deletePost(id: string) {
    if (!confirm('Delete this post?')) return;
    await fetch(`/api/admin/social-posts?id=${id}`, { method: 'DELETE', credentials: 'include' });
    await fetchPosts();
  }

  const filtered = filter === 'all' ? posts : posts.filter((p) => p.status === filter);
  const charLimit = CHAR_LIMITS[formPlatform] ?? 280;
  const charCount = formContent.length;
  const charPct = charCount / charLimit;

  const counts = {
    draft: posts.filter((p) => p.status === 'draft').length,
    published: posts.filter((p) => p.status === 'published').length,
    scheduled: posts.filter((p) => p.status === 'scheduled').length,
  };

  return (
    <>
      <header className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Social Posts</h1>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'var(--muted)', marginLeft: 8 }}>
            {posts.length} total
          </span>
        </div>
        <div className={s.headerControls}>
          <button className={s.btnPrimary} onClick={startCreate}>+ New Post</button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className={s.kpiGrid} style={{ marginBottom: 20 }}>
        <div className={s.card}>
          <div className={s.cardTitle}>Drafts</div>
          <div className={s.cardValue}>{counts.draft}</div>
        </div>
        <div className={s.card}>
          <div className={s.cardTitle}>Scheduled</div>
          <div className={s.cardValue}>{counts.scheduled}</div>
        </div>
        <div className={s.card}>
          <div className={s.cardTitle}>Published</div>
          <div className={s.cardValue}>{counts.published}</div>
        </div>
        <div className={s.card}>
          <div className={s.cardTitle}>Total Posts</div>
          <div className={s.cardValue}>{posts.length}</div>
        </div>
      </div>

      {loading ? (
        <div className={s.card}><div className={s.chartPlaceholder}>Loading posts…</div></div>
      ) : (creating || editingId) ? (
        /* ── Editor ──────────────────────────────────────── */
        <div className={s.card}>
          <div className={s.sectionTitle}>{creating ? 'New Post' : 'Edit Post'}</div>

          {/* Platform selector */}
          {creating && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Platform</label>
              <div className={s.filterGroup}>
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    className={`${s.filterPill} ${formPlatform === p ? s.filterPillActive : ''}`}
                    onClick={() => setFormPlatform(p)}
                  >
                    {PLATFORM_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AI Generator */}
          <div style={{
            marginBottom: 16,
            padding: 16,
            border: '1px solid var(--rule)',
            borderRadius: 8,
            background: 'linear-gradient(135deg, rgba(255,91,31,0.04), rgba(255,91,31,0.01))',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 16 }}>&#9733;</span>
              <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 14, fontWeight: 600 }}>AI Generate</span>
              <span style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: 'var(--muted)', marginLeft: 'auto' }}>
                {PLATFORM_LABELS[formPlatform]} &middot; {CHAR_LIMITS[formPlatform]} char limit
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                type="text"
                placeholder="Topic or idea for your post..."
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && aiTopic.trim()) generateWithAI(); }}
                style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--rule)', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }}
              />
              <select
                value={aiTone}
                onChange={(e) => setAiTone(e.target.value)}
                style={{ padding: '8px 10px', border: '1px solid var(--rule)', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', background: 'var(--paper)', color: 'var(--ink)' }}
              >
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="witty">Witty</option>
                <option value="inspirational">Inspirational</option>
                <option value="educational">Educational</option>
              </select>
              <button
                className={s.btnPrimary}
                onClick={generateWithAI}
                disabled={generating || !aiTopic.trim()}
                style={{ whiteSpace: 'nowrap', fontSize: 12 }}
              >
                {generating ? 'Generating…' : 'Generate'}
              </button>
            </div>
            {aiError && (
              <div style={{ fontSize: 12, color: 'var(--error)', marginTop: 4 }}>{aiError}</div>
            )}
          </div>

          {/* Content */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <label style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: 'var(--muted)', textTransform: 'uppercase' }}>Content</label>
              <span style={{
                fontSize: 11,
                fontFamily: "'Space Mono', monospace",
                color: charPct > 1 ? 'var(--error)' : charPct > 0.9 ? 'var(--gold)' : 'var(--muted)',
              }}>
                {charCount}/{charLimit}
              </span>
            </div>
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              rows={6}
              placeholder={`Write your ${formPlatform} post...`}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--rule)', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}
            />
          </div>

          {/* Status */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Status</label>
            <div className={s.filterGroup}>
              <button className={`${s.filterPill} ${formStatus === 'draft' ? s.filterPillActive : ''}`} onClick={() => setFormStatus('draft')}>Draft</button>
              <button className={`${s.filterPill} ${formStatus === 'scheduled' ? s.filterPillActive : ''}`} onClick={() => setFormStatus('scheduled')}>Scheduled</button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className={s.btnPrimary} onClick={savePost} disabled={saving || !formContent.trim()}>
              {saving ? 'Saving…' : creating ? 'Create Post' : 'Save Changes'}
            </button>
            <button className={s.btnOutline} onClick={cancelForm}>Cancel</button>
          </div>
        </div>
      ) : (
        /* ── Post List ──────────────────────────────────── */
        <>
          <div style={{ marginBottom: 16 }}>
            <div className={s.filterGroup}>
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f}
                  className={`${s.filterPill} ${filter === f ? s.filterPillActive : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div style={{ border: '1px solid var(--rule)', borderRadius: 8, overflowX: 'auto', WebkitOverflowScrolling: 'touch', background: 'var(--paper)' }}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Platform</th>
                  <th>Content</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((post) => (
                  <tr key={post.id}>
                    <td>
                      <span className={`${s.tag} ${post.platform === 'twitter' ? s.tagPro : post.platform === 'linkedin' ? s.tagTeam : s.tagTrial}`}>
                        {post.platform}
                      </span>
                    </td>
                    <td style={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>
                      {post.content}
                    </td>
                    <td>
                      <span className={`${s.statusBadge} ${statusCls(post.status)}`}>
                        <span className={s.statusDot} />
                        {post.status}
                      </span>
                    </td>
                    <td style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'var(--muted)' }}>
                      {new Date(post.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {post.status === 'draft' && (
                          <button className={s.btnOutline} style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => startEdit(post)}>Edit</button>
                        )}
                        <button className={s.btnOutline} style={{ fontSize: 11, padding: '2px 8px', color: 'var(--error)' }} onClick={() => deletePost(post.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>No posts found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
