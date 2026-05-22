'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import type { AiIntelligenceData } from '@/lib/admin-types';
import { humanize } from '@/lib/format';
import { downloadReport } from '@/lib/report';
import s from '../admin.module.css';

function fmtDollars(cents: number) {
  if (cents >= 100000) return `$${(cents / 100000).toFixed(1)}k`;
  return `$${(cents / 100).toLocaleString()}`;
}

function fmtTokens(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

const TABS = ['By Feature', 'By Provider', 'Cost Trend', 'Recent Events'] as const;
type Tab = (typeof TABS)[number];

export default function AiIntelligencePage() {
  const [data, setData] = useState<AiIntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('By Feature');

  useEffect(() => {
    adminFetch<AiIntelligenceData>('/api/admin/ai-intelligence')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const byFeature = data?.by_feature ?? [];
  const byProvider = data?.by_provider ?? [];
  const costTrend = data?.cost_trend ?? [];
  const recent = data?.recent ?? [];
  const maxFeatureCalls = byFeature[0]?.calls ?? 1;
  const maxTrendCost = costTrend.reduce((m, d) => Math.max(m, d.cost_cents), 0);

  return (
    <>
      <header className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>AI Intelligence</h1>
        </div>
        <div className={s.headerControls}>
          <button type="button" className={s.btnOutline} onClick={() => downloadReport('ai-intelligence', data)}>Download Report</button>
        </div>
      </header>

      {loading ? (
        <div className={s.card}><div className={s.chartPlaceholder}>Loading AI intelligence...</div></div>
      ) : (
        <>
          <div className={s.kpiGrid}>
            <div className={`${s.card} ${s.cardFeatured}`}>
              <div className={s.cardTitle}>Total Interactions</div>
              <div className={s.cardValue}>{(data?.kpis.total_interactions ?? 0).toLocaleString()}</div>
            </div>
            <div className={s.card}>
              <div className={s.cardTitle}>Total Cost (30d)</div>
              <div className={s.cardValue}>{fmtDollars(data?.kpis.total_cost_30d ?? 0)}</div>
            </div>
            <div className={s.card}>
              <div className={s.cardTitle}>Total Tokens (30d)</div>
              <div className={s.cardValue}>{fmtTokens(data?.kpis.total_tokens_30d ?? 0)}</div>
            </div>
            <div className={s.card}>
              <div className={s.cardTitle}>Avg Response</div>
              <div className={s.cardValue}>{(data?.kpis.avg_response_ms ?? 0).toLocaleString()}ms</div>
            </div>
          </div>

          <div className={s.filterGroup}>
            {TABS.map((t) => (
              <button
                key={t}
                className={`${s.filterPill} ${tab === t ? s.filterPillActive : ''}`}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'By Feature' && (
            <div className={s.card}>
              <div className={s.sectionTitle}>Usage by Feature</div>
              {byFeature.map((f) => (
                <div key={f.feature} className={s.hBarRow}>
                  <span className={s.hBarLabel}>{humanize(f.feature)}</span>
                  <div className={s.hBarTrack}>
                    <div className={s.hBar} style={{ width: `${Math.round((f.calls / maxFeatureCalls) * 100)}%` }} />
                  </div>
                  <span className={s.hBarValue}>{f.calls.toLocaleString()}</span>
                </div>
              ))}
              {byFeature.length === 0 && (
                <div className={s.chartPlaceholder}>No feature data available</div>
              )}
              {byFeature.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  {byFeature.map((f) => (
                    <div key={f.feature} className={s.healthMetric}>
                      <span className={s.healthLabel}>{humanize(f.feature)}</span>
                      <span className={s.healthValue}>
                        {fmtTokens(f.tokens)} tokens &middot; {fmtDollars(f.cost_cents)} &middot; {f.avg_latency_ms}ms &middot; {f.success_rate}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'By Provider' && (
            <div className={s.card}>
              <div className={s.sectionTitle}>Provider Comparison</div>
              {byProvider.length > 0 ? (
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>Provider</th>
                      <th>Calls</th>
                      <th>Cost</th>
                      <th>Avg Latency</th>
                      <th>Success Rate</th>
                      <th>Tokens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byProvider.map((p) => (
                      <tr key={p.provider}>
                        <td>{p.provider}</td>
                        <td>{p.calls.toLocaleString()}</td>
                        <td>{fmtDollars(p.cost_cents)}</td>
                        <td>{p.avg_latency_ms.toLocaleString()}ms</td>
                        <td>
                          <span className={`${s.statusBadge} ${p.success_rate >= 95 ? s.statusGreen : p.success_rate >= 80 ? s.statusYellow : s.statusRed}`}>
                            <span className={s.statusDot} />
                            {p.success_rate}%
                          </span>
                        </td>
                        <td>{fmtTokens(p.total_tokens)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              ) : (
                <div className={s.chartPlaceholder}>No provider data available</div>
              )}
            </div>
          )}

          {tab === 'Cost Trend' && (
            <div className={s.card}>
              <div className={s.sectionTitle}>Cost Trend (Last 30 Days)</div>
              {costTrend.length > 0 ? (
                <svg width="100%" height={160} viewBox={`0 0 ${costTrend.length * 20} 160`}>
                  {costTrend.map((d, i) => {
                    const h = maxTrendCost > 0 ? (d.cost_cents / maxTrendCost) * 140 : 0;
                    return <rect key={i} x={i * 20 + 2} y={160 - h} width={16} height={h} rx={3} fill="var(--accent)" opacity={0.8} />;
                  })}
                </svg>
              ) : (
                <div className={s.chartPlaceholder}>No cost data available</div>
              )}
              {costTrend.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  {costTrend.slice(-7).map((d) => (
                    <div key={d.date} className={s.healthMetric}>
                      <span className={s.healthLabel}>{d.date}</span>
                      <span className={s.healthValue}>{fmtDollars(d.cost_cents)} &middot; {d.calls} calls</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'Recent Events' && (
            <div className={s.card}>
              <div className={s.sectionTitle}>Recent Events</div>
              {recent.length > 0 ? (
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Type</th>
                      <th>Model</th>
                      <th>Tokens</th>
                      <th>Cost</th>
                      <th>Latency</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((e) => (
                      <tr key={e.id}>
                        <td>{new Date(e.created_at).toLocaleString()}</td>
                        <td>{humanize(e.event_type)}</td>
                        <td>{humanize(e.model)}</td>
                        <td>{(e.prompt_tokens + e.completion_tokens).toLocaleString()}</td>
                        <td>{fmtDollars(e.cost_cents)}</td>
                        <td>{e.latency_ms != null ? `${e.latency_ms}ms` : '—'}</td>
                        <td>
                          <span className={`${s.statusBadge} ${e.success ? s.statusGreen : s.statusRed}`}>
                            <span className={s.statusDot} />
                            {e.success ? 'OK' : 'Error'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              ) : (
                <div className={s.chartPlaceholder}>No recent events</div>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
