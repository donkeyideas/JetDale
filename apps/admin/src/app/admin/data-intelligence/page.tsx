'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import s from '../admin.module.css';

interface DataIntelligenceData {
  health_score: number;
  metrics: {
    ai_success_rate: number;
    ai_total_calls: number;
    discovery_completion_rate: number;
    discovery_total: number;
    discovery_completed: number;
    subscription_health: number;
    paid_subscriptions: number;
    trialing_subscriptions: number;
    total_subscriptions: number;
    projects_per_user: number;
    active_projects: number;
    total_projects: number;
  };
  platform_stats: {
    total_users: number;
    total_projects: number;
    active_projects: number;
    total_subscriptions: number;
    paid_subscriptions: number;
    trialing_subscriptions: number;
    total_ai_calls: number;
    ai_success_count: number;
    total_discoveries: number;
    completed_discoveries: number;
    total_exports: number;
  };
}

function scoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return 'var(--gold)';
  return 'var(--error)';
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Healthy';
  if (score >= 60) return 'Needs Attention';
  return 'Critical';
}

function scoreStatusClass(score: number): string {
  if (score >= 80) return s.statusGreen;
  if (score >= 60) return s.statusYellow;
  return s.statusRed;
}

export default function DataIntelligencePage() {
  const [data, setData] = useState<DataIntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch<DataIntelligenceData>('/api/admin/data-intelligence')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const score = data?.health_score ?? 0;
  const metrics = data?.metrics;
  const stats = data?.platform_stats;

  return (
    <>
      <header className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Data Intelligence</h1>
        </div>
        <div className={s.headerControls}>
          <button
            className={s.btnOutline}
            disabled
            title="Coming Soon"
            style={{ opacity: 0.5, cursor: 'not-allowed' }}
          >
            Generate Insights
          </button>
        </div>
      </header>

      {loading ? (
        <div className={s.card}><div className={s.chartPlaceholder}>Loading intelligence data...</div></div>
      ) : (
        <>
          {/* Hero Card: Platform Health Score */}
          <div className={s.kpiGrid} style={{ gridTemplateColumns: '1fr' }}>
            <div className={`${s.card} ${s.cardFeatured}`} style={{ textAlign: 'center', padding: '40px 24px' }}>
              <div className={s.cardTitle}>Platform Health</div>
              <div className={s.cardValue} style={{
                fontSize: 'clamp(48px, 12vw, 72px)',
                color: scoreColor(score),
                marginBottom: 12,
              }}>
                {score}
              </div>
              <span className={`${s.statusBadge} ${scoreStatusClass(score)}`}>
                <span className={s.statusDot} />
                {scoreLabel(score)}
              </span>
              <div style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                color: 'rgba(244, 241, 234, 0.4)',
                marginTop: 16,
              }}>
                Composite score based on AI health (30%), engagement (25%), revenue health (25%), and growth (20%)
              </div>
            </div>
          </div>

          {/* Metric Breakdown Cards */}
          <div className={s.kpiGrid}>
            <div className={`${s.card} ${s.cardFeatured}`}>
              <div className={s.cardTitle}>AI Health</div>
              <div className={s.cardValue} style={{
                color: (metrics?.ai_success_rate ?? 0) >= 95 ? '#22c55e' : (metrics?.ai_success_rate ?? 0) >= 80 ? 'var(--gold)' : 'var(--error)',
              }}>
                {metrics?.ai_success_rate ?? 0}%
              </div>
              <span className={s.cardChange} style={{ color: 'rgba(244, 241, 234, 0.5)' }}>
                {(metrics?.ai_total_calls ?? 0).toLocaleString()} total calls
              </span>
            </div>

            <div className={`${s.card} ${s.cardFeatured}`}>
              <div className={s.cardTitle}>Engagement</div>
              <div className={s.cardValue} style={{
                color: (metrics?.discovery_completion_rate ?? 0) >= 70 ? '#22c55e' : (metrics?.discovery_completion_rate ?? 0) >= 40 ? 'var(--gold)' : 'var(--error)',
              }}>
                {metrics?.discovery_completion_rate ?? 0}%
              </div>
              <span className={s.cardChange} style={{ color: 'rgba(244, 241, 234, 0.5)' }}>
                {metrics?.discovery_completed ?? 0}/{metrics?.discovery_total ?? 0} discoveries completed
              </span>
            </div>

            <div className={`${s.card} ${s.cardFeatured}`}>
              <div className={s.cardTitle}>Revenue Health</div>
              <div className={s.cardValue} style={{
                color: (metrics?.subscription_health ?? 0) >= 70 ? '#22c55e' : (metrics?.subscription_health ?? 0) >= 40 ? 'var(--gold)' : 'var(--error)',
              }}>
                {metrics?.subscription_health ?? 0}%
              </div>
              <span className={s.cardChange} style={{ color: 'rgba(244, 241, 234, 0.5)' }}>
                {metrics?.paid_subscriptions ?? 0} paid / {metrics?.total_subscriptions ?? 0} total
              </span>
            </div>

            <div className={`${s.card} ${s.cardFeatured}`}>
              <div className={s.cardTitle}>Growth</div>
              <div className={s.cardValue}>
                {metrics?.projects_per_user ?? 0}
              </div>
              <span className={s.cardChange} style={{ color: 'rgba(244, 241, 234, 0.5)' }}>
                projects per user
              </span>
            </div>
          </div>

          {/* Platform Metrics Summary */}
          <div className={s.healthGrid} style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className={s.card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>
                  Users &amp; Projects
                </span>
                <span className={`${s.statusBadge} ${s.statusGreen}`}>
                  <span className={s.statusDot} />
                  Live
                </span>
              </div>
              <div className={s.healthMetric}>
                <span className={s.healthLabel}>Total Users</span>
                <span className={s.healthValue}>{(stats?.total_users ?? 0).toLocaleString()}</span>
              </div>
              <div className={s.healthMetric}>
                <span className={s.healthLabel}>Total Projects</span>
                <span className={s.healthValue}>{(stats?.total_projects ?? 0).toLocaleString()}</span>
              </div>
              <div className={s.healthMetric}>
                <span className={s.healthLabel}>Active Projects</span>
                <span className={s.healthValue}>{(stats?.active_projects ?? 0).toLocaleString()}</span>
              </div>
              <div className={s.healthMetric}>
                <span className={s.healthLabel}>Projects per User</span>
                <span className={s.healthValue}>{metrics?.projects_per_user ?? 0}</span>
              </div>
              <div className={s.healthMetric}>
                <span className={s.healthLabel}>Total Exports</span>
                <span className={s.healthValue}>{(stats?.total_exports ?? 0).toLocaleString()}</span>
              </div>
            </div>

            <div className={s.card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>
                  Subscriptions &amp; AI
                </span>
                <span className={`${s.statusBadge} ${s.statusGreen}`}>
                  <span className={s.statusDot} />
                  Live
                </span>
              </div>
              <div className={s.healthMetric}>
                <span className={s.healthLabel}>Total Subscriptions</span>
                <span className={s.healthValue}>{(stats?.total_subscriptions ?? 0).toLocaleString()}</span>
              </div>
              <div className={s.healthMetric}>
                <span className={s.healthLabel}>Paid Subscriptions</span>
                <span className={s.healthValue}>{(stats?.paid_subscriptions ?? 0).toLocaleString()}</span>
              </div>
              <div className={s.healthMetric}>
                <span className={s.healthLabel}>Trialing Subscriptions</span>
                <span className={s.healthValue}>{(stats?.trialing_subscriptions ?? 0).toLocaleString()}</span>
              </div>
              <div className={s.healthMetric}>
                <span className={s.healthLabel}>Total AI Calls</span>
                <span className={s.healthValue}>{(stats?.total_ai_calls ?? 0).toLocaleString()}</span>
              </div>
              <div className={s.healthMetric}>
                <span className={s.healthLabel}>AI Success Rate</span>
                <span className={s.healthValue} style={{
                  color: (metrics?.ai_success_rate ?? 0) >= 95 ? '#22c55e' : (metrics?.ai_success_rate ?? 0) >= 80 ? 'var(--gold)' : 'var(--error)',
                }}>
                  {metrics?.ai_success_rate ?? 0}%
                </span>
              </div>
              <div className={s.healthMetric}>
                <span className={s.healthLabel}>Discovery Sessions</span>
                <span className={s.healthValue}>{(stats?.total_discoveries ?? 0).toLocaleString()}</span>
              </div>
              <div className={s.healthMetric}>
                <span className={s.healthLabel}>Discoveries Completed</span>
                <span className={s.healthValue}>{(stats?.completed_discoveries ?? 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
