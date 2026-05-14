'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import type { EmailTemplate } from '@/lib/admin-types';
import s from '../admin.module.css';

const CATEGORIES = ['all', 'transactional', 'lifecycle', 'auth'] as const;

function categoryColor(cat: string) {
  if (cat === 'transactional') return '#ef4444';
  if (cat === 'lifecycle') return 'var(--gold)';
  return '#22c55e';
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<EmailTemplate | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editHtml, setEditHtml] = useState('');
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await adminFetch<{ data: EmailTemplate[] }>('/api/admin/email-templates');
      setTemplates(res.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  function openTemplate(t: EmailTemplate) {
    setSelected(t);
    setEditSubject(t.subject);
    setEditHtml(t.html_body);
  }

  async function saveTemplate() {
    if (!selected) return;
    setSaving(true);
    try {
      await fetch('/api/admin/email-templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: selected.id, subject: editSubject, html_body: editHtml }),
      });
      await fetchTemplates();
      setSelected((prev) => prev ? { ...prev, subject: editSubject, html_body: editHtml } : null);
    } catch { /* ignore */ }
    setSaving(false);
  }

  const filtered = filter === 'all' ? templates : templates.filter((t) => t.category === filter);

  return (
    <>
      <header className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Email Templates</h1>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'var(--muted)', marginLeft: 8 }}>
            {templates.length} templates
          </span>
        </div>
      </header>

      <div style={{ marginBottom: 20 }}>
        <div className={s.filterGroup}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={`${s.filterPill} ${filter === c ? s.filterPillActive : ''}`}
              onClick={() => setFilter(c)}
            >
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className={s.card}><div className={s.chartPlaceholder}>Loading templates…</div></div>
      ) : selected ? (
        /* ── Template Editor ──────────────────────────────── */
        <div>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className={s.btnOutline} onClick={() => setSelected(null)}>Back</button>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 600 }}>
              {selected.name}
            </span>
            <span className={`${s.statusBadge}`} style={{ background: categoryColor(selected.category) + '22', color: categoryColor(selected.category) }}>
              <span className={s.statusDot} style={{ background: categoryColor(selected.category) }} />
              {selected.category}
            </span>
          </div>

          {selected.description && (
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>{selected.description}</div>
          )}

          <div className={s.bottomGrid}>
            {/* Left: Editor */}
            <div className={s.card}>
              <div className={s.sectionTitle}>Edit Template</div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Subject</label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--rule)', borderRadius: 6, fontSize: 14, fontFamily: 'inherit' }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>HTML Body</label>
                <textarea
                  value={editHtml}
                  onChange={(e) => setEditHtml(e.target.value)}
                  rows={18}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--rule)', borderRadius: 6, fontSize: 12, fontFamily: "'Space Mono', monospace", resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className={s.btnPrimary} onClick={saveTemplate} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button className={s.btnOutline} onClick={() => { setEditSubject(selected.subject); setEditHtml(selected.html_body); }}>
                  Revert
                </button>
              </div>
            </div>

            {/* Right: Preview */}
            <div className={s.card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div className={s.sectionTitle} style={{ margin: 0 }}>Preview</div>
                <div className={s.filterGroup}>
                  <button className={`${s.filterPill} ${previewMode === 'desktop' ? s.filterPillActive : ''}`} onClick={() => setPreviewMode('desktop')}>Desktop</button>
                  <button className={`${s.filterPill} ${previewMode === 'mobile' ? s.filterPillActive : ''}`} onClick={() => setPreviewMode('mobile')}>Mobile</button>
                </div>
              </div>
              {/* Email client simulation */}
              <div style={{
                border: '1px solid var(--rule)',
                borderRadius: 8,
                overflow: 'hidden',
                background: '#f8f8f8',
                maxWidth: previewMode === 'mobile' ? 390 : undefined,
                margin: previewMode === 'mobile' ? '0 auto' : undefined,
              }}>
                {/* Fake email header */}
                <div style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--rule)',
                  background: 'var(--paper)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: '#0e0f0c',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#f4f1ea',
                      fontSize: 13,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}>
                      J
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                        Jetdale <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 11 }}>&lt;hello@jetdale.com&gt;</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        to me
                      </div>
                    </div>
                  </div>
                  <div style={{
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'var(--ink)',
                    letterSpacing: '-0.01em',
                  }}>
                    {editSubject}
                  </div>
                </div>
                {/* Email content */}
                <iframe
                  srcDoc={editHtml}
                  title="Email Preview"
                  style={{
                    width: '100%',
                    height: 500,
                    border: 'none',
                    display: 'block',
                    background: '#eae7e0',
                  }}
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── Template List ──────────────────────────────── */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {filtered.map((t) => (
            <div key={t.id} className={s.card} style={{ cursor: 'pointer', padding: 0, overflow: 'hidden' }} onClick={() => openTemplate(t)}>
              {/* Mini preview thumbnail */}
              <div style={{ height: 120, overflow: 'hidden', borderBottom: '1px solid var(--rule)', position: 'relative', pointerEvents: 'none' }}>
                <iframe
                  srcDoc={t.html_body}
                  title={`Preview ${t.name}`}
                  style={{
                    width: 600,
                    height: 400,
                    border: 'none',
                    transform: 'scale(0.5)',
                    transformOrigin: 'top left',
                    pointerEvents: 'none',
                  }}
                  sandbox=""
                  tabIndex={-1}
                />
              </div>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 15, fontWeight: 600 }}>
                    {t.name}
                  </span>
                  <span className={`${s.statusBadge}`} style={{ background: categoryColor(t.category) + '22', color: categoryColor(t.category) }}>
                    <span className={s.statusDot} style={{ background: categoryColor(t.category) }} />
                    {t.category}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                  {t.description}
                </div>
                <div style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: 'var(--muted)' }}>
                  Subject: {t.subject}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className={s.card} style={{ gridColumn: '1 / -1' }}>
              <div className={s.chartPlaceholder}>No templates found</div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
