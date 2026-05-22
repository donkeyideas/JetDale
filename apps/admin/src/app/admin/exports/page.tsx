'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import type { ExportStats } from '@/lib/admin-types';
import { humanize } from '@/lib/format';
import { downloadReport } from '@/lib/report';
import s from '../admin.module.css';

export default function ExportsPage() {
  const [stats, setStats] = useState<ExportStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch<ExportStats>('/api/admin/exports')
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const byTarget = stats?.by_target ?? {};
  const targetEntries = Object.entries(byTarget).sort((a, b) => b[1] - a[1]);
  const maxTarget = targetEntries[0]?.[1] ?? 1;

  return (
    <>
      <header className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Exports</h1>
        </div>
        <div className={s.headerControls}>
          <button type="button" className={s.btnOutline} onClick={() => downloadReport('exports', stats)}>Download Report</button>
        </div>
      </header>

      {loading ? (
        <div className={s.card}><div className={s.chartPlaceholder}>Loading export stats…</div></div>
      ) : (
        <>
          <div className={s.kpiGrid}>
            <div className={s.card}>
              <div className={s.cardTitle}>Total Exports</div>
              <div className={s.cardValue}>{(stats?.total ?? 0).toLocaleString()}</div>
            </div>
            {targetEntries.slice(0, 3).map(([target, count]) => (
              <div key={target} className={s.card}>
                <div className={s.cardTitle}>{humanize(target)} Exports</div>
                <div className={s.cardValue}>{count.toLocaleString()}</div>
              </div>
            ))}
          </div>

          <div className={s.card}>
            <div className={s.sectionTitle}>Exports by Target</div>
            {targetEntries.map(([target, count]) => (
              <div key={target} className={s.hBarRow}>
                <span className={s.hBarLabel}>{humanize(target)}</span>
                <div className={s.hBarTrack}>
                  <div className={s.hBar} style={{ width: `${Math.round((count / maxTarget) * 100)}%` }} />
                </div>
                <span className={s.hBarValue}>{count.toLocaleString()}</span>
              </div>
            ))}
            {targetEntries.length === 0 && (
              <div className={s.chartPlaceholder}>No exports found</div>
            )}
          </div>
        </>
      )}
    </>
  );
}
