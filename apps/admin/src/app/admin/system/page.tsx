'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import type { SystemHealth } from '@/lib/admin-types';
import { humanize } from '@/lib/format';
import s from '../admin.module.css';

function statusCls(val: number, thresholdWarn: number, thresholdBad: number) {
  if (val >= thresholdBad) return s.statusRed;
  if (val >= thresholdWarn) return s.statusYellow;
  return s.statusGreen;
}

function overallStatus(rate: number) {
  if (rate >= 99) return { label: 'Healthy', color: '#22c55e', cls: s.statusGreen };
  if (rate >= 95) return { label: 'Warning', color: 'var(--gold)', cls: s.statusYellow };
  return { label: 'Critical', color: 'var(--error)', cls: s.statusRed };
}

export default function SystemPage() {
  const [data, setData] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch<SystemHealth>('/api/admin/system')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const ai = data?.ai;
  // If no AI events at all, show neutral status (no data ≠ failure)
  const hasAiActivity = (ai?.daily_generations ?? 0) > 0;
  const aiStatus = hasAiActivity ? overallStatus(ai?.success_rate ?? 0) : { label: 'No Activity', color: 'var(--muted)', cls: s.statusGray };

  const aiMetrics = ai ? [
    { label: 'Avg Latency', value: `${(ai.avg_latency_ms / 1000).toFixed(1)}s`, status: ai.avg_latency_ms > 10000 ? 'red' : ai.avg_latency_ms > 5000 ? 'yellow' : 'green' },
    { label: 'P95 Latency', value: `${(ai.p95_latency_ms / 1000).toFixed(1)}s`, status: ai.p95_latency_ms > 15000 ? 'red' : ai.p95_latency_ms > 8000 ? 'yellow' : 'green' },
    { label: 'P99 Latency', value: `${(ai.p99_latency_ms / 1000).toFixed(1)}s`, status: ai.p99_latency_ms > 20000 ? 'red' : ai.p99_latency_ms > 12000 ? 'yellow' : 'green' },
    { label: 'Success Rate', value: `${ai.success_rate}%`, status: ai.success_rate >= 99 ? 'green' : ai.success_rate >= 95 ? 'yellow' : 'red' },
    { label: 'Error Rate', value: `${ai.error_rate}%`, status: ai.error_rate <= 1 ? 'green' : ai.error_rate <= 5 ? 'yellow' : 'red' },
    { label: 'Daily Cost', value: `$${(ai.daily_cost_cents / 100).toFixed(0)}`, status: 'green' },
    { label: 'Daily Generations', value: ai.daily_generations.toLocaleString(), status: 'green' },
    { label: 'Avg Cost/Doc', value: `$${(ai.avg_cost_per_doc / 100).toFixed(2)}`, status: 'green' },
  ] : [];

  function metricStatusCls(st: string) {
    if (st === 'green') return s.statusGreen;
    if (st === 'yellow') return s.statusYellow;
    return s.statusRed;
  }

  return (
    <>
      <header className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>System Health</h1>
          <span className={s.liveBadge}>
            <span className={s.liveDot} />
            Live
          </span>
        </div>
      </header>

      {loading ? (
        <div className={s.card}><div className={s.chartPlaceholder}>Loading system health…</div></div>
      ) : (
        <>
          {/* Overall Status */}
          <div className={s.kpiGrid}>
            <div className={`${s.card} ${s.cardFeatured}`}>
              <div className={s.cardTitle}>AI Engine</div>
              <div className={s.cardValue} style={{ color: aiStatus.color }}>{aiStatus.label}</div>
              <span className={`${s.cardChange} ${s.changeUp}`}>{'\u2191'} {ai?.success_rate ?? 0}% success</span>
            </div>
            <div className={`${s.card} ${s.cardFeatured}`}>
              <div className={s.cardTitle}>Daily Generations</div>
              <div className={s.cardValue}>{(ai?.daily_generations ?? 0).toLocaleString()}</div>
            </div>
            <div className={`${s.card} ${s.cardFeatured}`}>
              <div className={s.cardTitle}>Daily AI Cost</div>
              <div className={s.cardValue}>${((ai?.daily_cost_cents ?? 0) / 100).toFixed(0)}</div>
            </div>
            <div className={`${s.card} ${s.cardFeatured}`}>
              <div className={s.cardTitle}>Avg Cost / Doc</div>
              <div className={s.cardValue}>${((ai?.avg_cost_per_doc ?? 0) / 100).toFixed(2)}</div>
              <span className={`${s.cardChange}`}>{data?.platform?.total_artifacts ?? 0} artifacts total</span>
            </div>
          </div>

          {/* AI Metrics Card */}
          <div className={s.healthGrid}>
            <div className={s.card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>
                  AI Generation
                </span>
                <span className={`${s.statusBadge} ${aiStatus.cls}`}>
                  <span className={s.statusDot} />
                  {aiStatus.label}
                </span>
              </div>
              {aiMetrics.map((m) => (
                <div key={m.label} className={s.healthMetric}>
                  <span className={s.healthLabel}>{m.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={s.healthValue}>{m.value}</span>
                    <span className={`${s.statusBadge} ${metricStatusCls(m.status)}`}>
                      <span className={s.statusDot} />
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Infrastructure placeholder */}
            <div className={s.card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>
                  Infrastructure
                </span>
                <span className={`${s.statusBadge} ${s.statusGray}`}>
                  <span className={s.statusDot} />
                  Connect Monitoring
                </span>
              </div>
              <div className={s.healthMetric}>
                <span className={s.healthLabel}>CPU Usage</span>
                <span className={s.healthValue} style={{ color: 'var(--muted)' }}>—</span>
              </div>
              <div className={s.healthMetric}>
                <span className={s.healthLabel}>Memory</span>
                <span className={s.healthValue} style={{ color: 'var(--muted)' }}>—</span>
              </div>
              <div className={s.healthMetric}>
                <span className={s.healthLabel}>DB Connections</span>
                <span className={s.healthValue} style={{ color: 'var(--muted)' }}>—</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 12 }}>
                Connect external monitoring (Datadog, Grafana) for infrastructure metrics
              </div>
            </div>

            {/* Platform Usage */}
            <div className={s.card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>
                  Platform Usage
                </span>
                <span className={`${s.statusBadge} ${s.statusGreen}`}>
                  <span className={s.statusDot} />
                  Live
                </span>
              </div>
              <div className={s.healthMetric}>
                <span className={s.healthLabel}>Total Users</span>
                <span className={s.healthValue}>{data?.platform?.total_users ?? 0}</span>
              </div>
              <div className={s.healthMetric}>
                <span className={s.healthLabel}>Active Projects</span>
                <span className={s.healthValue}>{data?.platform?.active_projects ?? 0}</span>
              </div>
              <div className={s.healthMetric}>
                <span className={s.healthLabel}>Artifacts Generated</span>
                <span className={s.healthValue}>{data?.platform?.total_artifacts ?? 0}</span>
              </div>
              <div className={s.healthMetric}>
                <span className={s.healthLabel}>Exports</span>
                <span className={s.healthValue}>{data?.platform?.total_exports ?? 0}</span>
              </div>
              <div className={s.healthMetric}>
                <span className={s.healthLabel}>Discoveries</span>
                <span className={s.healthValue}>{data?.platform?.total_discoveries ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Recent Errors */}
          <div className={s.card}>
            <div className={s.sectionTitle}>Recent AI Errors</div>
            {(data?.recent_errors ?? []).length === 0 ? (
              <div style={{ padding: 16, color: 'var(--muted)', fontSize: 13 }}>No recent errors</div>
            ) : (
              (data?.recent_errors ?? []).map((err, i) => (
                <div key={i} className={s.feedItem}>
                  <span className={s.feedDot} style={{ background: 'var(--error)' }} />
                  <div>
                    <div className={s.feedText}>{err.error_message}</div>
                    <div className={s.feedTime}>{humanize(err.event_type)} &middot; {new Date(err.created_at).toLocaleString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </>
  );
}
