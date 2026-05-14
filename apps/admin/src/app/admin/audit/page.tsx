'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import type { AuditLogRow, PaginatedResponse } from '@/lib/admin-types';
import s from '../admin.module.css';

const SEVERITIES = ['', 'info', 'warning', 'critical'] as const;

function severityClass(sev: string) {
  if (sev === 'info') return s.statusGreen;
  if (sev === 'warning') return s.statusYellow;
  if (sev === 'critical') return s.statusRed;
  return '';
}

export default function AuditPage() {
  const [data, setData] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch<PaginatedResponse<AuditLogRow>>('/api/admin/audit', {
        page,
        pageSize: 20,
        search: search || undefined,
        severity: severity || undefined,
      });
      setData(res.data);
      setTotal(res.total);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, search, severity]);

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
          <h1 className={s.pageTitle}>Audit Trail</h1>
        </div>
        <div className={s.headerControls}>
          <div className={s.searchWrapper}>
            <svg className={s.searchIcon} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="7" cy="7" r="5" /><path d="M11 11l3.5 3.5" />
            </svg>
            <input
              className={s.searchInput}
              type="text"
              placeholder="Search audit log..."
              defaultValue={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div className={s.filterGroup}>
            {SEVERITIES.map((sev) => (
              <button
                key={sev || 'all'}
                className={`${s.filterPill} ${severity === sev ? s.filterPillActive : ''}`}
                onClick={() => { setSeverity(sev); setPage(1); }}
              >
                {sev || 'All'}
              </button>
            ))}
          </div>
          <button className={s.btnOutline}>Export</button>
        </div>
      </header>

      {loading ? (
        <div className={s.card}><div className={s.chartPlaceholder}>Loading audit log…</div></div>
      ) : (
        <div style={{ border: '1px solid var(--rule)', borderRadius: 8, overflow: 'hidden', background: 'var(--paper)' }}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Severity</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Target</th>
                <th>IP Address</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {data.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <span className={`${s.statusBadge} ${severityClass(entry.severity)}`}>
                      <span className={s.statusDot} />
                      {entry.severity}
                    </span>
                  </td>
                  <td style={{ fontFamily: "'Space Mono', monospace", fontSize: 11 }}>
                    {entry.action}
                  </td>
                  <td style={{ fontSize: 13, fontWeight: 500 }}>{entry.actor_name ?? entry.actor_email ?? 'System'}</td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{entry.target_id ?? '-'}</td>
                  <td style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'var(--muted)' }}>
                    {entry.ip_address ?? '-'}
                  </td>
                  <td style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'var(--muted)' }}>
                    {new Date(entry.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>No audit entries found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className={s.pagination}>
          <span className={s.paginationInfo}>Showing {((page - 1) * 20) + 1}-{Math.min(page * 20, total)} of {total.toLocaleString()} entries</span>
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
