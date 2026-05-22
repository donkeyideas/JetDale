'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import type { SiteContentRow } from '@/lib/admin-types';
import { humanize } from '@/lib/format';
import s from '../admin.module.css';

const PAGE_TABS = ['Homepage', 'Features', 'Pricing', 'Use Cases', 'How It Works'] as const;

interface ContentResponse {
  grouped: Record<string, SiteContentRow[]>;
  stats: { totalPages: number; totalSections: number; activeSections: number };
}

/** Renders a JSON content object into a visual preview. */
function ContentPreview({ content }: { content: Record<string, unknown> }) {
  return (
    <div style={{
      padding: 20,
      background: 'var(--paper)',
      border: '1px solid var(--rule)',
      borderRadius: 6,
      fontFamily: "'Manrope', sans-serif",
      fontSize: 14,
      lineHeight: 1.7,
      color: 'var(--ink)',
    }}>
      {Object.entries(content).map(([key, value]) => {
        if (value === null || value === undefined) return null;
        const label = humanize(key);

        if (typeof value === 'string') {
          if (/<[a-z][\s\S]*>/i.test(value)) {
            return (
              <div key={key} style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
                  {label}
                </div>
                <div dangerouslySetInnerHTML={{ __html: value }} />
              </div>
            );
          }
          return (
            <div key={key} style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
                {label}
              </div>
              <div>{value}</div>
            </div>
          );
        }

        if (Array.isArray(value)) {
          return (
            <div key={key} style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
                {label}
              </div>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {value.map((item, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    {typeof item === 'object' ? JSON.stringify(item) : String(item)}
                  </li>
                ))}
              </ul>
            </div>
          );
        }

        if (typeof value === 'object') {
          return (
            <div key={key} style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
                {label}
              </div>
              <div style={{ padding: 12, background: 'var(--paper-2)', borderRadius: 4, fontSize: 13 }}>
                {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
                  <div key={k} style={{ marginBottom: 4 }}>
                    <strong>{humanize(k)}:</strong> {String(v)}
                  </div>
                ))}
              </div>
            </div>
          );
        }

        return (
          <div key={key} style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
              {label}
            </div>
            <div>{String(value)}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function ContentManagerPage() {
  const [grouped, setGrouped] = useState<Record<string, SiteContentRow[]>>({});
  const [stats, setStats] = useState({ totalPages: 0, totalSections: 0, activeSections: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(PAGE_TABS[0]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [editBuffers, setEditBuffers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [previewSections, setPreviewSections] = useState<Set<string>>(new Set());

  const fetchContent = useCallback(async () => {
    try {
      const res = await adminFetch<ContentResponse>('/api/admin/content');
      setGrouped(res.grouped);
      setStats(res.stats);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  function toggleSection(id: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function togglePreview(id: string) {
    setPreviewSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function getEditBuffer(row: SiteContentRow): string {
    if (editBuffers[row.id] !== undefined) return editBuffers[row.id];
    return JSON.stringify(row.content, null, 2);
  }

  function setEditBuffer(id: string, value: string) {
    setEditBuffers((prev) => ({ ...prev, [id]: value }));
  }

  function getPreviewContent(row: SiteContentRow): Record<string, unknown> | null {
    const raw = editBuffers[row.id];
    if (raw !== undefined) {
      try { return JSON.parse(raw); } catch { return null; }
    }
    return row.content;
  }

  async function saveSection(row: SiteContentRow) {
    const raw = editBuffers[row.id];
    if (raw === undefined) return;

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      alert('Invalid JSON. Please fix the syntax before saving.');
      return;
    }

    setSaving(row.id);
    try {
      await fetch('/api/admin/content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: row.id, content: parsed }),
      });
      await fetchContent();
      setEditBuffers((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
    } catch {
      alert('Failed to save. Please try again.');
    }
    setSaving(null);
  }

  async function toggleActive(row: SiteContentRow) {
    const newActive = !row.is_active;
    setGrouped((prev) => {
      const next = { ...prev };
      for (const page in next) {
        next[page] = next[page].map((r) =>
          r.id === row.id ? { ...r, is_active: newActive } : r,
        );
      }
      return next;
    });
    try {
      await fetch('/api/admin/content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: row.id, is_active: newActive }),
      });
      await fetchContent();
    } catch {
      fetchContent();
    }
  }

  const tabKey = activeTab.toLowerCase().replace(/\s+/g, '-');
  const sections = grouped[tabKey] ?? grouped[activeTab] ?? grouped[activeTab.toLowerCase()] ?? [];

  return (
    <>
      <header className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Content Manager</h1>
          <span style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            color: 'var(--muted)',
            marginLeft: 8,
          }}>
            {stats.totalSections} sections across {stats.totalPages} pages
          </span>
        </div>
      </header>

      {/* KPI Cards */}
      <div className={s.kpiGrid} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className={s.card}>
          <div className={s.cardTitle}>Total Pages</div>
          <div className={s.cardValue}>{stats.totalPages}</div>
        </div>
        <div className={s.card}>
          <div className={s.cardTitle}>Total Sections</div>
          <div className={s.cardValue}>{stats.totalSections}</div>
        </div>
        <div className={`${s.card} ${s.cardFeatured}`}>
          <div className={s.cardTitle}>Active Sections</div>
          <div className={s.cardValue}>{stats.activeSections}</div>
        </div>
      </div>

      {/* Page Tabs */}
      <div className={s.filterGroup} style={{ marginBottom: 24 }}>
        {PAGE_TABS.map((tab) => (
          <button
            key={tab}
            className={`${s.filterPill} ${activeTab === tab ? s.filterPillActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className={s.card}>
          <div className={s.chartPlaceholder}>Loading content...</div>
        </div>
      ) : sections.length === 0 ? (
        <div className={s.placeholderPage}>
          <div className={s.placeholderTitle}>No content sections for this page yet</div>
          <div className={s.placeholderSub}>
            Add sections to the &quot;{activeTab}&quot; page in your database to manage them here
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sections.map((row) => {
            const isExpanded = expandedSections.has(row.id);
            const isPreviewing = previewSections.has(row.id);
            const isDirty = editBuffers[row.id] !== undefined;
            const previewContent = getPreviewContent(row);
            return (
              <div key={row.id} className={s.card} style={{ padding: 0, overflow: 'hidden' }}>
                {/* Card Header — clickable to expand/collapse */}
                <div
                  onClick={() => toggleSection(row.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 24px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    borderBottom: isExpanded ? '1px solid var(--rule)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 12,
                      color: 'var(--muted)',
                      transition: 'transform 0.15s ease',
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      display: 'inline-block',
                    }}>
                      &#9654;
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>
                      {humanize(row.section)}
                    </span>
                    <span style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 10,
                      color: 'var(--muted)',
                    }}>
                      order: {row.sort_order}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className={`${s.statusBadge} ${row.is_active ? s.statusGreen : s.statusGray}`}>
                      <span className={s.statusDot} />
                      {row.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 10,
                      color: 'var(--muted)',
                    }}>
                      {new Date(row.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div style={{ padding: '20px 24px' }}>
                    {/* Preview / Editor toggle */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div className={s.sectionTitle} style={{ marginBottom: 0 }}>
                        {isPreviewing ? 'Preview' : 'Content (JSON)'}
                      </div>
                      <button
                        className={s.btnOutline}
                        onClick={(e) => { e.stopPropagation(); togglePreview(row.id); }}
                        style={{
                          fontSize: 10,
                          padding: '4px 12px',
                          background: isPreviewing ? 'var(--ink)' : undefined,
                          color: isPreviewing ? 'var(--paper)' : undefined,
                        }}
                      >
                        {isPreviewing ? 'Editor' : 'Preview'}
                      </button>
                    </div>

                    {isPreviewing ? (
                      previewContent ? (
                        <div style={{ marginBottom: 12 }}>
                          <ContentPreview content={previewContent} />
                        </div>
                      ) : (
                        <div style={{
                          padding: 20,
                          border: '1px solid var(--rule)',
                          borderRadius: 6,
                          color: 'var(--error)',
                          fontSize: 13,
                          marginBottom: 12,
                        }}>
                          Invalid JSON — cannot preview. Switch to Editor to fix.
                        </div>
                      )
                    ) : (
                      <div style={{ marginBottom: 12 }}>
                        <textarea
                          value={getEditBuffer(row)}
                          onChange={(e) => setEditBuffer(row.id, e.target.value)}
                          rows={12}
                          spellCheck={false}
                          style={{
                            width: '100%',
                            fontFamily: "'Space Mono', monospace",
                            fontSize: 12,
                            lineHeight: 1.5,
                            padding: 16,
                            border: '1px solid var(--rule)',
                            borderRadius: 6,
                            background: 'rgba(14, 15, 12, 0.02)',
                            color: 'var(--ink)',
                            resize: 'vertical',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <button
                        className={s.btnPrimary}
                        disabled={!isDirty || saving === row.id}
                        onClick={(e) => { e.stopPropagation(); saveSection(row); }}
                        style={{ opacity: (!isDirty || saving === row.id) ? 0.5 : 1 }}
                      >
                        {saving === row.id ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        className={s.btnOutline}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleActive(row);
                        }}
                      >
                        {row.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      {isDirty && (
                        <button
                          className={s.btnOutline}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditBuffers((prev) => {
                              const next = { ...prev };
                              delete next[row.id];
                              return next;
                            });
                          }}
                        >
                          Discard Changes
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
