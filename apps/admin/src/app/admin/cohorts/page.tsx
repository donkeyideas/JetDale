'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import type { CohortRow } from '@/lib/admin-types';
import { downloadReport } from '@/lib/report';
import s from '../admin.module.css';
import d from '../dashboard.module.css';

function cohortBg(val: number | null): string {
  if (val === null) return 'transparent';
  const alpha = Math.min(val / 100, 1) * 0.6 + 0.05;
  return `rgba(255, 91, 31, ${alpha.toFixed(2)})`;
}

function cohortFg(val: number | null): string {
  if (val === null) return 'transparent';
  return val >= 70 ? 'var(--white)' : 'var(--ink)';
}

interface CohortMatrix {
  months: string[];
  rows: { label: string; cohort_size: number; values: (number | null)[] }[];
}

function buildMatrix(data: CohortRow[]): CohortMatrix {
  // Group by cohort_month
  const grouped: Record<string, CohortRow[]> = {};
  for (const row of data) {
    if (!grouped[row.cohort_month]) grouped[row.cohort_month] = [];
    grouped[row.cohort_month].push(row);
  }

  const cohortMonths = Object.keys(grouped).sort();
  if (!cohortMonths.length) return { months: [], rows: [] };

  // Max periods
  const maxPeriods = Math.max(...cohortMonths.map((m) => grouped[m].length));
  const periodHeaders = Array.from({ length: maxPeriods }, (_, i) => `M${i}`);

  const rows = cohortMonths.map((month) => {
    const entries = grouped[month].sort(
      (a, b) => (a.activity_month ?? '').localeCompare(b.activity_month ?? ''),
    );
    const cohort_size = entries[0]?.cohort_size ?? 0;
    const values = Array.from({ length: maxPeriods }, (_, i): number | null => {
      const entry = entries[i];
      if (!entry || cohort_size <= 0 || entry.active_users == null) return null;
      return Math.round((entry.active_users / cohort_size) * 100);
    });
    const dt = new Date(month);
    const label = Number.isNaN(dt.getTime())
      ? 'Unknown'
      : dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return { label, cohort_size, values };
  });

  return { months: periodHeaders, rows };
}

export default function CohortsPage() {
  const [data, setData] = useState<CohortRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch<{ data: CohortRow[] }>('/api/admin/cohorts')
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const matrix = buildMatrix(data);

  // Compute KPIs — only count real, finite numbers (skip null/undefined).
  const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  const m1Vals = matrix.rows.map((r) => r.values[1]).filter(isNum);
  const m3Vals = matrix.rows.map((r) => r.values[3]).filter(isNum);
  const avgM1 = m1Vals.length ? Math.round(m1Vals.reduce((a, b) => a + b, 0) / m1Vals.length) : 0;
  const avgM3 = m3Vals.length ? Math.round(m3Vals.reduce((a, b) => a + b, 0) / m3Vals.length) : 0;
  const bestCohort = matrix.rows.reduce((best, row) => {
    const m1 = row.values[1] ?? 0;
    return m1 > (best.values[1] ?? 0) ? row : best;
  }, matrix.rows[0] ?? { label: '-', values: [0, 0], cohort_size: 0 });

  return (
    <>
      <header className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Cohorts</h1>
        </div>
        <div className={s.headerControls}>
          <button type="button" className={s.btnOutline} onClick={() => downloadReport('cohorts', data)}>Export</button>
        </div>
      </header>

      <div className={s.kpiGrid}>
        <div className={s.card}>
          <div className={s.cardTitle}>Avg M1 Retention</div>
          <div className={s.cardValue}>{avgM1}%</div>
        </div>
        <div className={s.card}>
          <div className={s.cardTitle}>Avg M3 Retention</div>
          <div className={s.cardValue}>{avgM3}%</div>
        </div>
        <div className={s.card}>
          <div className={s.cardTitle}>Total Cohorts</div>
          <div className={s.cardValue}>{matrix.rows.length}</div>
        </div>
        <div className={s.card}>
          <div className={s.cardTitle}>Best Cohort</div>
          <div className={s.cardValue}>{bestCohort?.label ?? '-'}</div>
        </div>
      </div>

      {loading ? (
        <div className={s.card}><div className={s.chartPlaceholder}>Loading cohorts…</div></div>
      ) : matrix.rows.length === 0 ? (
        <div className={s.card}><div className={s.chartPlaceholder}>No cohort data available</div></div>
      ) : (
        <div className={s.card}>
          <div className={s.sectionTitle}>Cohort Retention Heatmap</div>
          <table className={d.cohortTable}>
            <thead>
              <tr>
                <th>Cohort</th>
                <th>Size</th>
                {matrix.months.map((m) => <th key={m}>{m}</th>)}
              </tr>
            </thead>
            <tbody>
              {matrix.rows.map((row) => (
                <tr key={row.label}>
                  <td className={d.cohortRowLabel}>{row.label}</td>
                  <td className={d.cohortRowLabel}>{row.cohort_size}</td>
                  {row.values.map((val, j) => (
                    <td
                      key={j}
                      style={{ background: cohortBg(val), color: cohortFg(val) }}
                    >
                      {val !== null ? `${val}%` : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
