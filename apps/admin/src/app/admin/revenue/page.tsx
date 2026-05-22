'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import type { RevenueData } from '@/lib/admin-types';
import { downloadReport } from '@/lib/report';
import s from '../admin.module.css';

function fmtDollars(cents: number) {
  if (cents >= 100000) return `$${(cents / 100000).toFixed(1)}k`;
  return `$${(cents / 100).toLocaleString()}`;
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch<RevenueData>('/api/admin/revenue')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const maxPlanMrr = Math.max(...(data?.by_plan ?? []).map((p) => p.mrr_cents), 1);

  return (
    <>
      <header className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Revenue</h1>
        </div>
        <div className={s.headerControls}>
          <button type="button" className={s.btnOutline} onClick={() => downloadReport('revenue', data)}>Export</button>
        </div>
      </header>

      {loading ? (
        <div className={s.card}><div className={s.chartPlaceholder}>Loading revenue…</div></div>
      ) : (
        <>
          <div className={s.kpiGrid}>
            <div className={`${s.card} ${s.cardFeatured}`}>
              <div className={s.cardTitle}>MRR</div>
              <div className={s.cardValue}>{fmtDollars(data?.mrr_cents ?? 0)}</div>
            </div>
            <div className={s.card}>
              <div className={s.cardTitle}>ARR</div>
              <div className={s.cardValue}>{fmtDollars((data?.mrr_cents ?? 0) * 12)}</div>
            </div>
            <div className={s.card}>
              <div className={s.cardTitle}>New MRR (30d)</div>
              <div className={s.cardValue}>{fmtDollars(data?.new_mrr_cents ?? 0)}</div>
            </div>
            <div className={s.card}>
              <div className={s.cardTitle}>Churned MRR (30d)</div>
              <div className={s.cardValue} style={{ color: 'var(--error)' }}>-{fmtDollars(data?.churned_mrr_cents ?? 0)}</div>
            </div>
          </div>

          <div className={s.bottomGrid}>
            <div className={s.card}>
              <div className={s.sectionTitle}>Revenue by Plan</div>
              {(data?.by_plan ?? []).map((plan) => (
                <div key={plan.plan} className={s.hBarRow}>
                  <span className={s.hBarLabel}>{plan.plan} ({plan.count})</span>
                  <div className={s.hBarTrack}>
                    <div className={s.hBar} style={{ width: `${Math.round((plan.mrr_cents / maxPlanMrr) * 100)}%` }} />
                  </div>
                  <span className={s.hBarValue}>{fmtDollars(plan.mrr_cents)}</span>
                </div>
              ))}
              {(data?.by_plan ?? []).length === 0 && (
                <div className={s.chartPlaceholder}>No subscription data</div>
              )}
            </div>
            <div className={s.card}>
              <div className={s.sectionTitle}>Subscription Summary</div>
              <div className={s.healthMetric}>
                <span className={s.healthLabel}>Total Paying</span>
                <span className={s.healthValue}>{(data?.by_plan ?? []).reduce((s, p) => s + p.count, 0)}</span>
              </div>
              <div className={s.healthMetric}>
                <span className={s.healthLabel}>Avg Revenue/Customer</span>
                <span className={s.healthValue}>
                  {(() => {
                    const totalCustomers = (data?.by_plan ?? []).reduce((s, p) => s + p.count, 0);
                    return totalCustomers > 0 ? fmtDollars(Math.round((data?.mrr_cents ?? 0) / totalCustomers)) : '-';
                  })()}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
