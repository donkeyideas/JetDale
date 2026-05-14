'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import type { FunnelTotals } from '@/lib/admin-types';
import s from '../admin.module.css';

const PERIODS = ['7d', '30d', '90d', 'all'] as const;

const STAGE_LABELS: { key: keyof FunnelTotals; label: string }[] = [
  { key: 'signups', label: 'Signed Up' },
  { key: 'discovery_started', label: 'Started Project' },
  { key: 'discovery_completed', label: 'Completed Discovery' },
  { key: 'artifacts_generated', label: 'Generated Document' },
  { key: 'exported', label: 'Exported' },
  { key: 'paid', label: 'Upgraded to Paid' },
];

export default function FunnelPage() {
  const [period, setPeriod] = useState<string>('30d');
  const [data, setData] = useState<FunnelTotals | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch<FunnelTotals>('/api/admin/funnel', { period });
      setData(res);
    } catch { /* ignore */ }
    setLoading(false);
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const signups = data?.signups ?? 0;

  const stages = STAGE_LABELS.map(({ key, label }) => {
    const count = data?.[key] ?? 0;
    const pct = signups > 0 ? parseFloat(((count / signups) * 100).toFixed(1)) : 0;
    return { label, count, pct };
  });

  const activationRate = signups > 0 ? ((data?.discovery_completed ?? 0) / signups * 100).toFixed(1) : '0';
  const conversionRate = signups > 0 ? ((data?.paid ?? 0) / signups * 100).toFixed(1) : '0';

  return (
    <>
      <header className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Activation Funnel</h1>
        </div>
        <div className={s.headerControls}>
          <div className={s.segmented}>
            {PERIODS.map((p) => (
              <button
                key={p}
                className={`${s.segBtn} ${p === period ? s.segBtnActive : ''}`}
                onClick={() => setPeriod(p)}
              >
                {p === 'all' ? 'All' : p}
              </button>
            ))}
          </div>
          <button className={s.btnOutline}>Export</button>
        </div>
      </header>

      <div className={s.kpiGrid}>
        <div className={s.card}>
          <div className={s.cardTitle}>Total Signups</div>
          <div className={s.cardValue}>{signups.toLocaleString()}</div>
        </div>
        <div className={s.card}>
          <div className={s.cardTitle}>Activation Rate</div>
          <div className={s.cardValue}>{activationRate}%</div>
        </div>
        <div className={s.card}>
          <div className={s.cardTitle}>Conversion Rate</div>
          <div className={s.cardValue}>{conversionRate}%</div>
        </div>
        <div className={s.card}>
          <div className={s.cardTitle}>Paid Users</div>
          <div className={s.cardValue}>{(data?.paid ?? 0).toLocaleString()}</div>
        </div>
      </div>

      {loading ? (
        <div className={s.card}><div className={s.chartPlaceholder}>Loading funnel…</div></div>
      ) : (
        <div className={s.card} style={{ marginBottom: 24 }}>
          <div className={s.sectionTitle}>Full Funnel Breakdown</div>
          {stages.map((stage) => (
            <div key={stage.label} className={s.funnelStage}>
              <span className={s.funnelStageLabel}>{stage.label}</span>
              <div className={s.funnelStageTrack}>
                <div
                  className={s.funnelBar}
                  style={{ width: `${stage.pct}%`, height: '100%' }}
                />
              </div>
              <span className={s.funnelStagePercent}>
                {stage.count.toLocaleString()} ({stage.pct}%)
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
