'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import type { AiLogRow } from '@/lib/admin-types';
import s from '../admin.module.css';

const PERIODS = ['1h', '24h', '7d', '30d'] as const;

interface AiKpis {
  totalGenerations: number;
  totalCostCents: number;
  avgLatencyMs: number;
  successRate: number;
}

interface AiLogsResponse {
  kpis: AiKpis;
  data: AiLogRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function AiLogsPage() {
  const [period, setPeriod] = useState<string>('24h');
  const [page, setPage] = useState(1);
  const [res, setRes] = useState<AiLogsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch<AiLogsResponse>('/api/admin/ai-logs', { period, page, pageSize: 20 });
      setRes(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [period, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const kpis = res?.kpis;
  const logs = res?.data ?? [];
  const totalPages = res?.totalPages ?? 0;
  const total = res?.total ?? 0;

  return (
    <>
      <header className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>AI Logs</h1>
        </div>
        <div className={s.headerControls}>
          <div className={s.segmented}>
            {PERIODS.map((p) => (
              <button
                key={p}
                className={`${s.segBtn} ${p === period ? s.segBtnActive : ''}`}
                onClick={() => { setPeriod(p); setPage(1); }}
              >
                {p}
              </button>
            ))}
          </div>
          <button className={s.btnOutline}>Export</button>
        </div>
      </header>

      <div className={s.kpiGrid}>
        <div className={s.card}>
          <div className={s.cardTitle}>Generations ({period})</div>
          <div className={s.cardValue}>{(kpis?.totalGenerations ?? 0).toLocaleString()}</div>
        </div>
        <div className={s.card}>
          <div className={s.cardTitle}>Avg Latency</div>
          <div className={s.cardValue}>{kpis?.avgLatencyMs ? `${(kpis.avgLatencyMs / 1000).toFixed(1)}s` : '-'}</div>
        </div>
        <div className={s.card}>
          <div className={s.cardTitle}>Token Cost ({period})</div>
          <div className={s.cardValue}>${((kpis?.totalCostCents ?? 0) / 100).toFixed(0)}</div>
        </div>
        <div className={s.card}>
          <div className={s.cardTitle}>Success Rate</div>
          <div className={s.cardValue}>{kpis?.successRate ?? 0}%</div>
        </div>
      </div>

      {loading ? (
        <div className={s.card}><div className={s.chartPlaceholder}>Loading AI logs…</div></div>
      ) : (
        <div className={s.card}>
          <div className={s.sectionTitle}>Recent Generations</div>
          <div style={{ overflowX: 'auto' }}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Project</th>
                  <th>Type</th>
                  <th>Model</th>
                  <th>Tokens</th>
                  <th>Latency</th>
                  <th>Cost</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td style={{ fontSize: 12 }}>{log.user_email ?? '-'}</td>
                    <td style={{ fontSize: 12, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.project_name ?? '-'}</td>
                    <td style={{ fontFamily: "'Space Mono', monospace", fontSize: 11 }}>{log.event_type}</td>
                    <td style={{ fontFamily: "'Space Mono', monospace", fontSize: 11 }}>{log.model}</td>
                    <td style={{ fontFamily: "'Space Mono', monospace", fontSize: 11 }}>{(log.prompt_tokens + log.completion_tokens).toLocaleString()}</td>
                    <td style={{ fontFamily: "'Space Mono', monospace", fontSize: 11 }}>{log.latency_ms ? `${(log.latency_ms / 1000).toFixed(1)}s` : '-'}</td>
                    <td style={{ fontFamily: "'Space Mono', monospace", fontSize: 11 }}>${(log.cost_cents / 100).toFixed(2)}</td>
                    <td>
                      <span className={`${s.statusBadge} ${log.success ? s.statusGreen : s.statusRed}`}>
                        <span className={s.statusDot} />
                        {log.success ? 'OK' : 'Err'}
                      </span>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>No AI events found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className={s.pagination}>
          <span className={s.paginationInfo}>Showing {((page - 1) * 20) + 1}-{Math.min(page * 20, total)} of {total.toLocaleString()}</span>
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
