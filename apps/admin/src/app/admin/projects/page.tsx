'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import type { AdminProjectRow, PaginatedResponse } from '@/lib/admin-types';
import s from '../admin.module.css';

function phaseBadge(phase: string) {
  const map: Record<string, string> = {
    discovery: s.statusYellow,
    generation: s.statusGreen,
    complete: s.statusGreen,
    idle: s.statusGray,
  };
  return (
    <span className={`${s.statusBadge} ${map[phase] ?? s.statusGray}`}>
      <span className={s.statusDot} />
      {phase}
    </span>
  );
}

export default function ProjectsPage() {
  const [data, setData] = useState<AdminProjectRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch<PaginatedResponse<AdminProjectRow>>('/api/admin/projects', {
        page,
        pageSize: 20,
        search: search || undefined,
      });
      setData(res.data);
      setTotal(res.total);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function handleSearch(val: string) {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 300);
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <>
      <header className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Projects</h1>
          <span style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            color: 'var(--muted)',
            marginLeft: 8,
          }}>
            {total.toLocaleString()} total
          </span>
        </div>
        <div className={s.headerControls}>
          <div className={s.searchWrapper}>
            <svg className={s.searchIcon} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="7" cy="7" r="5" /><path d="M11 11l3.5 3.5" />
            </svg>
            <input
              className={s.searchInput}
              type="text"
              placeholder="Search projects..."
              defaultValue={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <button className={s.btnOutline}>Export</button>
        </div>
      </header>

      <div className={s.kpiGrid}>
        <div className={s.card}>
          <div className={s.cardTitle}>Active Projects</div>
          <div className={s.cardValue}>{total.toLocaleString()}</div>
        </div>
        <div className={s.card}>
          <div className={s.cardTitle}>Avg Artifacts/Project</div>
          <div className={s.cardValue}>
            {data.length > 0 ? (data.reduce((s, p) => s + p.artifact_count, 0) / data.length).toFixed(1) : '0'}
          </div>
        </div>
        <div className={s.card}>
          <div className={s.cardTitle}>Avg Progress</div>
          <div className={s.cardValue}>
            {data.length > 0 ? `${Math.round(data.reduce((s, p) => s + p.progress_pct, 0) / data.length)}%` : '0%'}
          </div>
        </div>
      </div>

      {loading ? (
        <div className={s.card}><div className={s.chartPlaceholder}>Loading projects…</div></div>
      ) : (
        <div style={{ border: '1px solid var(--rule)', borderRadius: 8, overflow: 'hidden', background: 'var(--paper)' }}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Project</th>
                <th>Owner</th>
                <th>Archetype</th>
                <th>Phase</th>
                <th>Progress</th>
                <th>Artifacts</th>
                <th>Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {data.map((proj) => (
                <tr key={proj.id}>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>{proj.name}</td>
                  <td style={{ fontSize: 12 }}>{proj.user_name ?? proj.user_email}</td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{proj.archetype_name ?? '-'}</td>
                  <td>{phaseBadge(proj.phase)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 60, height: 6, borderRadius: 3, background: 'var(--rule)', overflow: 'hidden' }}>
                        <div style={{ width: `${proj.progress_pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11 }}>{proj.progress_pct}%</span>
                    </div>
                  </td>
                  <td style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, textAlign: 'center' }}>{proj.artifact_count}</td>
                  <td style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'var(--muted)' }}>
                    {proj.last_activity_at ? new Date(proj.last_activity_at).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>No projects found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className={s.pagination}>
          <span className={s.paginationInfo}>Showing {((page - 1) * 20) + 1}-{Math.min(page * 20, total)} of {total.toLocaleString()} projects</span>
          <div className={s.paginationButtons}>
            <button className={s.pageBtn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>&lsaquo;</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((p) => (
              <button key={p} className={`${s.pageBtn} ${p === page ? s.pageBtnActive : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className={s.pageBtn} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>&rsaquo;</button>
          </div>
        </div>
      )}
    </>
  );
}
