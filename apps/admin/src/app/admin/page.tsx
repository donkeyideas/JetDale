'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import type { DashboardKPIs, FunnelTotals, CohortRow, ActivityItem } from '@/lib/admin-types';
import { humanize } from '@/lib/format';
import s from './admin.module.css';
import d from './dashboard.module.css';

interface DashboardData {
  kpis: DashboardKPIs;
  funnel: FunnelTotals | null;
  cohorts: CohortRow[];
  ai: {
    avg_latency_ms: number;
    success_rate: number;
    daily_cost_cents: number;
    daily_generations: number;
  };
  top_archetypes: { name: string; count: number; pct: number }[];
  activities: ActivityItem[];
}

/* ── Helpers ─────────────────────────────────────────────────── */

function fmtDollars(cents: number) {
  if (cents >= 10000000) return `$${(cents / 100000).toFixed(0)}k`;
  if (cents >= 100000) return `$${(cents / 100000).toFixed(1)}k`;
  return `$${(cents / 100).toLocaleString()}`;
}

function fmtK(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function cohortBg(val: number | null): string {
  if (val === null) return 'transparent';
  const alpha = Math.min(val / 100, 1) * 0.6 + 0.05;
  return `rgba(255, 91, 31, ${alpha.toFixed(2)})`;
}

function cohortFg(val: number | null): string {
  if (val === null) return 'transparent';
  return val >= 70 ? 'var(--white)' : 'var(--ink)';
}

function statusClass(status: string) {
  if (status === 'green') return s.statusGreen;
  if (status === 'yellow') return s.statusYellow;
  return s.statusRed;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ── Cohort Matrix Builder ──────────────────────────────────── */

function buildCohortMatrix(data: CohortRow[]) {
  const grouped: Record<string, CohortRow[]> = {};
  for (const row of data) {
    if (!grouped[row.cohort_month]) grouped[row.cohort_month] = [];
    grouped[row.cohort_month].push(row);
  }
  const months = Object.keys(grouped).sort().slice(-6);
  const maxPeriods = Math.max(...months.map((m) => grouped[m].length), 0);
  const headers = Array.from({ length: maxPeriods }, (_, i) => `M${i}`);

  const rows = months.map((month) => {
    const entries = grouped[month].sort(
      (a, b) => (a.activity_month ?? '').localeCompare(b.activity_month ?? ''),
    );
    const size = entries[0]?.cohort_size ?? 0;
    const values = Array.from({ length: maxPeriods }, (_, i): number | null => {
      const e = entries[i];
      if (!e || size <= 0 || e.active_users == null) return null;
      return Math.round((e.active_users / size) * 100);
    });
    const dt = new Date(month);
    const label = Number.isNaN(dt.getTime())
      ? 'Unknown'
      : dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return { label, values };
  });
  return { headers, rows };
}

/* ── Page Component ──────────────────────────────────────────── */

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch<DashboardData>('/api/admin/dashboard')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={s.card} style={{ padding: 40, textAlign: 'center' }}>
        <div className={s.chartPlaceholder}>Loading dashboard…</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={s.card} style={{ padding: 40, textAlign: 'center' }}>
        <div className={s.chartPlaceholder}>Failed to load dashboard data</div>
      </div>
    );
  }

  const { kpis, funnel, cohorts, ai, top_archetypes, activities } = data;

  const kpiCards = [
    { label: 'MRR', value: fmtDollars(kpis.mrr_cents), featured: true },
    { label: 'ARR', value: fmtDollars(kpis.arr_cents) },
    { label: 'Paid Customers', value: fmtK(kpis.paying_customers) },
    { label: 'Active Subs', value: fmtK(kpis.active_subs) },
    { label: 'Active Projects', value: fmtK(kpis.active_projects) },
    { label: 'Discovery Completion', value: `${kpis.discovery_completion_pct}%` },
    { label: 'ARPU', value: fmtDollars(kpis.arpu_cents) },
    { label: 'Total Users', value: fmtK(kpis.total_users) },
  ];

  // Funnel stages — always show (API now always returns funnel data)
  const funnelSignups = funnel?.signups ?? 0;
  const funnelPct = (count: number) =>
    funnelSignups > 0
      ? Math.min(100, parseFloat(((count / funnelSignups) * 100).toFixed(1)))
      : 0;
  const funnelStages = [
    { label: 'Signed Up', count: funnel?.signups ?? 0, pct: funnelSignups > 0 ? 100 : 0 },
    { label: 'Started Project', count: funnel?.discovery_started ?? 0, pct: funnelPct(funnel?.discovery_started ?? 0) },
    { label: 'Discovery Done', count: funnel?.discovery_completed ?? 0, pct: funnelPct(funnel?.discovery_completed ?? 0) },
    { label: 'Doc Generated', count: funnel?.artifacts_generated ?? 0, pct: funnelPct(funnel?.artifacts_generated ?? 0) },
    { label: 'Exported', count: funnel?.exported ?? 0, pct: funnelPct(funnel?.exported ?? 0) },
    { label: 'Subscribed', count: funnel?.paid ?? 0, pct: funnelPct(funnel?.paid ?? 0) },
  ];

  // Cohort matrix
  const cohortMatrix = buildCohortMatrix(cohorts);

  // System health cards
  const hasAiActivity = ai.daily_generations > 0;
  const aiStatus = hasAiActivity
    ? (ai.success_rate >= 99 ? 'green' : ai.success_rate >= 95 ? 'yellow' : 'red')
    : 'green';
  const systemCards = [
    {
      title: 'AI Generation',
      status: aiStatus as 'green' | 'yellow' | 'red',
      statusLabel: hasAiActivity ? undefined : 'No Activity',
      metrics: [
        { label: 'Avg Latency', value: hasAiActivity ? `${(ai.avg_latency_ms / 1000).toFixed(1)}s` : '-' },
        { label: 'Success Rate', value: hasAiActivity ? `${ai.success_rate}%` : '-' },
        { label: 'Daily Cost', value: `$${(ai.daily_cost_cents / 100).toFixed(0)}` },
        { label: 'Daily Gens', value: ai.daily_generations.toLocaleString() },
      ],
    },
  ];

  return (
    <>
      {/* ── Header ──────────────────────────────────────────── */}
      <header className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Investor Snapshot</h1>
          <span className={s.liveBadge}>
            <span className={s.liveDot} />
            Live
          </span>
        </div>
      </header>

      {/* ── KPI Grid Row 1 ──────────────────────────────────── */}
      <div className={s.kpiGrid}>
        {kpiCards.slice(0, 4).map((kpi) => (
          <div key={kpi.label} className={`${s.card} ${kpi.featured ? s.cardFeatured : ''}`}>
            <div className={s.cardTitle}>{kpi.label}</div>
            <div className={s.cardValue}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* ── KPI Grid Row 2 ──────────────────────────────────── */}
      <div className={s.kpiGrid}>
        {kpiCards.slice(4).map((kpi) => (
          <div key={kpi.label} className={s.card}>
            <div className={s.cardTitle}>{kpi.label}</div>
            <div className={s.cardValue}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* ── Chart Row: Funnel ─────────────────────────────────── */}
      <div className={s.card} style={{ marginBottom: 24 }}>
        <div className={d.funnelHeader}>
          <span className={d.funnelTitle}>Activation Funnel</span>
          <span className={d.funnelTotal}>{funnelSignups.toLocaleString()} users</span>
        </div>
        {funnelStages.map((stage) => (
          <div key={stage.label} className={s.funnelStage}>
            <span className={s.funnelStageLabel}>{stage.label}</span>
            <div className={s.funnelStageTrack}>
              <div className={s.funnelBar} style={{ width: `${stage.pct}%`, height: '100%' }} />
            </div>
            <span className={s.funnelStagePercent}>{stage.pct}%</span>
          </div>
        ))}
      </div>

      {/* ── Cohort Retention Heatmap ────────────────────────── */}
      <div className={s.card} style={{ marginBottom: 24 }}>
        <div className={s.sectionTitle}>Cohort Retention</div>
        {cohortMatrix.rows.length > 0 ? (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table className={d.cohortTable}>
            <thead>
              <tr>
                <th>Cohort</th>
                {cohortMatrix.headers.map((h) => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {cohortMatrix.rows.map((row) => (
                <tr key={row.label}>
                  <td className={d.cohortRowLabel}>{row.label}</td>
                  {row.values.map((val, j) => (
                    <td key={j} style={{ background: cohortBg(val), color: cohortFg(val) }}>
                      {val !== null ? `${val}%` : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        ) : (
          <div className={s.chartPlaceholder}>No cohort data yet — retention tracking begins after users return</div>
        )}
      </div>

      {/* ── System Health Grid ──────────────────────────────── */}
      <div className={s.healthGrid}>
        {systemCards.map((card) => (
          <div key={card.title} className={s.card}>
            <div className={d.healthHeader}>
              <span className={d.healthTitle}>{card.title}</span>
              <span className={`${s.statusBadge} ${statusClass(card.status)}`}>
                <span className={s.statusDot} />
                {card.statusLabel ?? (card.status === 'green' ? 'Healthy' : card.status === 'yellow' ? 'Warning' : 'Critical')}
              </span>
            </div>
            {card.metrics.map((m) => (
              <div key={m.label} className={s.healthMetric}>
                <span className={s.healthLabel}>{m.label}</span>
                <span className={s.healthValue}>{m.value}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ── Bottom Grid: Archetypes + Activity Feed ─────────── */}
      <div className={s.bottomGrid}>
        {/* Top Archetypes */}
        <div className={s.card}>
          <div className={s.sectionTitle}>Top Archetypes</div>
          {top_archetypes.map((arch) => (
            <div key={arch.name} className={s.hBarRow}>
              <span className={s.hBarLabel}>{arch.name}</span>
              <div className={s.hBarTrack}>
                <div className={s.hBar} style={{ width: `${arch.pct}%` }} />
              </div>
              <span className={s.hBarValue}>{arch.count.toLocaleString()}</span>
            </div>
          ))}
          {top_archetypes.length === 0 && (
            <div className={s.chartPlaceholder}>No archetype data</div>
          )}
        </div>

        {/* Recent Activity Feed */}
        <div className={s.card}>
          <div className={s.sectionTitle}>Recent Activity</div>
          {activities.map((a) => (
            <div key={a.id} className={s.feedItem}>
              <span className={s.feedDot} style={{ background: 'var(--accent)' }} />
              <div>
                <div className={s.feedText}>
                  {a.actor ?? 'System'}: {humanize(a.action)}{a.target ? ` → ${a.target}` : ''}
                </div>
                <div className={s.feedTime}>{timeAgo(a.created_at)}</div>
              </div>
            </div>
          ))}
          {activities.length === 0 && (
            <div style={{ padding: 16, color: 'var(--muted)', fontSize: 13 }}>No recent activity</div>
          )}
        </div>
      </div>
    </>
  );
}
