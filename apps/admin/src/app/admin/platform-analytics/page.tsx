'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import type { PlatformAnalyticsData } from '@/lib/admin-types';
import { downloadReport } from '@/lib/report';
import s from '../admin.module.css';

function fmtDollars(cents: number) {
  if (cents >= 100000) return `$${(cents / 100000).toFixed(1)}k`;
  return `$${(cents / 100).toLocaleString()}`;
}

export default function PlatformAnalyticsPage() {
  const [data, setData] = useState<PlatformAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch<PlatformAnalyticsData>('/api/admin/platform-analytics')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const planDist = data?.plan_distribution ?? [];
  const totalPlanCount = planDist.reduce((s, p) => s + p.count, 0);
  const maxPlanCount = planDist[0]?.count ?? 1;
  const engagement = data?.engagement ?? { projects: 0, artifacts: 0, exports: 0, discoveries: 0, ai_calls: 0 };

  return (
    <>
      <header className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Platform Analytics</h1>
        </div>
        <div className={s.headerControls}>
          <button type="button" className={s.btnOutline} onClick={() => downloadReport('platform-analytics', data)}>Download Report</button>
        </div>
      </header>

      {loading ? (
        <div className={s.card}><div className={s.chartPlaceholder}>Loading platform analytics...</div></div>
      ) : (
        <>
          <div className={s.kpiGrid} style={{ marginBottom: 24 }}>
            <div className={`${s.card} ${s.cardFeatured}`}>
              <div className={s.cardTitle}>MRR</div>
              <div className={s.cardValue}>{fmtDollars(data?.kpis.mrr_cents ?? 0)}</div>
            </div>
            <div className={s.card}>
              <div className={s.cardTitle}>ARR</div>
              <div className={s.cardValue}>{fmtDollars(data?.kpis.arr_cents ?? 0)}</div>
            </div>
            <div className={s.card}>
              <div className={s.cardTitle}>ARPU</div>
              <div className={s.cardValue}>{fmtDollars(data?.kpis.arpu_cents ?? 0)}</div>
            </div>
            <div className={s.card}>
              <div className={s.cardTitle}>LTV</div>
              <div className={s.cardValue}>{fmtDollars(data?.kpis.ltv_cents ?? 0)}</div>
            </div>
          </div>

          <div className={s.kpiGrid} style={{ marginBottom: 24 }}>
            <div className={s.card}>
              <div className={s.cardTitle}>Total Customers</div>
              <div className={s.cardValue}>{(data?.kpis.total_customers ?? 0).toLocaleString()}</div>
            </div>
            <div className={s.card}>
              <div className={s.cardTitle}>Paid Customers</div>
              <div className={s.cardValue}>{(data?.kpis.paid_customers ?? 0).toLocaleString()}</div>
            </div>
            <div className={s.card}>
              <div className={s.cardTitle}>Churn Rate</div>
              <div className={s.cardValue}>
                <span className={`${s.statusBadge} ${(data?.kpis.churn_rate ?? 0) <= 3 ? s.statusGreen : (data?.kpis.churn_rate ?? 0) <= 7 ? s.statusYellow : s.statusRed}`}>
                  <span className={s.statusDot} />
                  {data?.kpis.churn_rate ?? 0}%
                </span>
              </div>
            </div>
            <div className={s.card}>
              <div className={s.cardTitle}>MoM Growth</div>
              <div className={s.cardValue}>
                <span className={`${s.statusBadge} ${(data?.kpis.mom_growth ?? 0) > 0 ? s.statusGreen : (data?.kpis.mom_growth ?? 0) === 0 ? s.statusYellow : s.statusRed}`}>
                  <span className={s.statusDot} />
                  {(data?.kpis.mom_growth ?? 0) > 0 ? '+' : ''}{data?.kpis.mom_growth ?? 0}%
                </span>
              </div>
            </div>
          </div>

          <div className={s.card} style={{ marginBottom: 24 }}>
            <div className={s.sectionTitle}>Revenue by Plan</div>
            {planDist.map((p) => (
              <div key={p.plan} className={s.hBarRow}>
                <span className={s.hBarLabel}>{p.plan.charAt(0).toUpperCase() + p.plan.slice(1)}</span>
                <div className={s.hBarTrack}>
                  <div className={s.hBar} style={{ width: `${Math.round((p.count / maxPlanCount) * 100)}%` }} />
                </div>
                <span className={s.hBarValue}>{p.count.toLocaleString()} subscribers</span>
              </div>
            ))}
            {planDist.length === 0 && (
              <div className={s.chartPlaceholder}>No plan data available</div>
            )}
          </div>

          <div className={s.card} style={{ marginBottom: 24 }}>
            <div className={s.sectionTitle}>Platform Engagement</div>
            <div className={s.kpiGrid} style={{ marginTop: 16 }}>
              <div className={s.card}>
                <div className={s.cardTitle}>Projects</div>
                <div className={s.cardValue}>{engagement.projects.toLocaleString()}</div>
              </div>
              <div className={s.card}>
                <div className={s.cardTitle}>Artifacts</div>
                <div className={s.cardValue}>{engagement.artifacts.toLocaleString()}</div>
              </div>
              <div className={s.card}>
                <div className={s.cardTitle}>Exports</div>
                <div className={s.cardValue}>{engagement.exports.toLocaleString()}</div>
              </div>
              <div className={s.card}>
                <div className={s.cardTitle}>Discoveries</div>
                <div className={s.cardValue}>{engagement.discoveries.toLocaleString()}</div>
              </div>
              <div className={s.card}>
                <div className={s.cardTitle}>AI Calls</div>
                <div className={s.cardValue}>{engagement.ai_calls.toLocaleString()}</div>
              </div>
            </div>
          </div>

          <div className={s.card}>
            <div className={s.sectionTitle}>Plan Distribution</div>
            {planDist.map((p) => {
              const pct = totalPlanCount > 0 ? ((p.count / totalPlanCount) * 100).toFixed(1) : '0';
              return (
                <div key={p.plan} className={s.hBarRow}>
                  <span className={s.hBarLabel}>{p.plan.charAt(0).toUpperCase() + p.plan.slice(1)}</span>
                  <div className={s.hBarTrack}>
                    <div className={s.hBar} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={s.hBarValue}>{pct}%</span>
                </div>
              );
            })}
            {planDist.length === 0 && (
              <div className={s.chartPlaceholder}>No distribution data available</div>
            )}
          </div>
        </>
      )}
    </>
  );
}
