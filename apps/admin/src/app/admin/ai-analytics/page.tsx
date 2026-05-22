'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import type { AiAnalyticsData } from '@/lib/admin-types';
import { humanize } from '@/lib/format';
import { downloadReport } from '@/lib/report';
import s from '../admin.module.css';

function fmtDollars(cents: number) {
  const dollars = cents / 100;
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(1)}k`;
  if (dollars >= 1) return `$${dollars.toFixed(2)}`;
  return `$${dollars.toFixed(4)}`;
}

export default function AiAnalyticsPage() {
  const [data, setData] = useState<AiAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch<AiAnalyticsData>('/api/admin/ai-analytics')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const daily = data?.daily ?? [];
  const byType = data?.by_type ?? [];
  const byModel = data?.by_model ?? [];
  const maxCount = daily.reduce((m, d) => Math.max(m, d.count), 0);
  const maxTypeCount = byType[0]?.count ?? 1;

  return (
    <>
      <header className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>AI Analytics</h1>
        </div>
        <div className={s.headerControls}>
          <button type="button" className={s.btnOutline} onClick={() => downloadReport('ai-analytics', data)}>Download Report</button>
        </div>
      </header>

      {loading ? (
        <div className={s.card}><div className={s.chartPlaceholder}>Loading AI analytics...</div></div>
      ) : (
        <>
          <div className={s.kpiGrid} style={{ marginBottom: 24 }}>
            <div className={`${s.card} ${s.cardFeatured}`}>
              <div className={s.cardTitle}>Total Generations</div>
              <div className={s.cardValue}>{(data?.kpis.total_generations ?? 0).toLocaleString()}</div>
            </div>
            <div className={s.card}>
              <div className={s.cardTitle}>Success Rate</div>
              <div className={s.cardValue}>{data?.kpis.success_rate ?? 0}%</div>
            </div>
            <div className={s.card}>
              <div className={s.cardTitle}>Avg Latency</div>
              <div className={s.cardValue}>{(data?.kpis.avg_latency_ms ?? 0).toLocaleString()}ms</div>
            </div>
            <div className={s.card}>
              <div className={s.cardTitle}>Total Cost</div>
              <div className={s.cardValue}>{fmtDollars(data?.kpis.total_cost_cents ?? 0)}</div>
            </div>
          </div>

          <div className={s.card} style={{ marginBottom: 24 }}>
            <div className={s.sectionTitle}>Daily Generations (Last 30 Days)</div>
            {daily.length > 0 ? (
              <svg width="100%" height={160} viewBox={`0 0 ${daily.length * 20} 160`}>
                {daily.map((d, i) => {
                  const h = maxCount > 0 ? (d.count / maxCount) * 140 : 0;
                  return <rect key={i} x={i * 20 + 2} y={160 - h} width={16} height={h} rx={3} fill="var(--accent)" opacity={0.8} />;
                })}
              </svg>
            ) : (
              <div className={s.chartPlaceholder}>No daily data available</div>
            )}
          </div>

          <div className={s.card} style={{ marginBottom: 24 }}>
            <div className={s.sectionTitle}>Usage by Event Type</div>
            {byType.map((t) => (
              <div key={t.event_type} className={s.hBarRow}>
                <span className={s.hBarLabel}>{humanize(t.event_type)}</span>
                <div className={s.hBarTrack}>
                  <div className={s.hBar} style={{ width: `${Math.round((t.count / maxTypeCount) * 100)}%` }} />
                </div>
                <span className={s.hBarValue}>{t.count.toLocaleString()}</span>
              </div>
            ))}
            {byType.length === 0 && (
              <div className={s.chartPlaceholder}>No event data available</div>
            )}
          </div>

          <div className={s.card}>
            <div className={s.sectionTitle}>Model Performance</div>
            {byModel.length > 0 ? (
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>Generations</th>
                    <th>Cost</th>
                    <th>Avg Latency</th>
                    <th>Success Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {byModel.map((m) => (
                    <tr key={m.model}>
                      <td>{humanize(m.model)}</td>
                      <td>{m.count.toLocaleString()}</td>
                      <td>{fmtDollars(m.cost_cents)}</td>
                      <td>{m.avg_latency_ms.toLocaleString()}ms</td>
                      <td>
                        <span className={`${s.statusBadge} ${m.success_rate >= 95 ? s.statusGreen : m.success_rate >= 80 ? s.statusYellow : s.statusRed}`}>
                          <span className={s.statusDot} />
                          {m.success_rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            ) : (
              <div className={s.chartPlaceholder}>No model data available</div>
            )}
          </div>
        </>
      )}
    </>
  );
}
