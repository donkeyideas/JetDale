'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import type { PlanConfig, SubscriberRow, PlanLimits } from '@/lib/admin-types';
import s from '../admin.module.css';

type KPIs = {
  mrr_cents: number;
  arr_cents: number;
  active_subs: number;
  trialing_subs: number;
  churn_rate: number;
  arpu_cents: number;
};

type UsageStats = {
  avg_projects: number;
  avg_artifacts: number;
  avg_exports: number;
  avg_ai_cost_cents: number;
};

type Recommendation = {
  tier: string;
  suggested_monthly_cents: number;
  suggested_annual_cents: number;
  rationale: string;
  confidence: number;
};

type PageData = {
  kpis: KPIs;
  plans: PlanConfig[];
  subscribers: SubscriberRow[];
  usage_stats: UsageStats;
};

const LIMIT_LABELS: Record<keyof PlanLimits, string> = {
  projects_per_month: 'Projects / month',
  artifacts_per_project: 'Artifacts / project',
  export_formats: 'Export formats',
  reality_checks: 'Reality checks',
  voice_minutes: 'Voice minutes',
  chat_messages_per_day: 'Chat msgs / day',
  ai_model: 'AI model',
};

function statusCls(st: string) {
  if (st === 'active') return s.statusGreen;
  if (st === 'trialing') return s.statusYellow;
  if (st === 'past_due') return s.statusRed;
  return s.statusGray;
}

function dollars(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function SubscriptionsPage() {
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PlanConfig>>({});
  const [saving, setSaving] = useState(false);
  const [recs, setRecs] = useState<Recommendation[] | null>(null);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchData = useCallback(async () => {
    try {
      const res = await adminFetch<PageData>('/api/admin/subscriptions');
      setData(res);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function startEdit(plan: PlanConfig) {
    setEditingPlan(plan.id);
    setEditForm({
      name: plan.name,
      description: plan.description,
      monthly_price_cents: plan.monthly_price_cents,
      annual_price_cents: plan.annual_price_cents,
      is_active: plan.is_active,
      is_featured: plan.is_featured,
      stripe_monthly_price_id: plan.stripe_monthly_price_id,
      stripe_annual_price_id: plan.stripe_annual_price_id,
      limits: { ...plan.limits },
      cta_text: plan.cta_text,
      cta_url: plan.cta_url,
    });
  }

  async function savePlan() {
    if (!editingPlan) return;
    setSaving(true);
    try {
      await fetch('/api/admin/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: editingPlan, ...editForm }),
      });
      setEditingPlan(null);
      await fetchData();
    } catch { /* ignore */ }
    setSaving(false);
  }

  async function getRecommendations() {
    setLoadingRecs(true);
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'recommend' }),
      });
      const json = await res.json();
      setRecs(json.recommendations ?? []);
    } catch { /* ignore */ }
    setLoadingRecs(false);
  }

  function updateLimit(key: keyof PlanLimits, value: string) {
    setEditForm((prev) => ({
      ...prev,
      limits: { ...(prev.limits as PlanLimits), [key]: isNaN(Number(value)) ? value : Number(value) },
    }));
  }

  const kpis = data?.kpis;
  const plans = data?.plans ?? [];
  const subscribers = data?.subscribers ?? [];
  const usage = data?.usage_stats;

  const filteredSubs = filter === 'all' ? subscribers : subscribers.filter((sb) => sb.plan_tier === filter);
  const planTiers = [...new Set(plans.map((p) => p.tier))];

  return (
    <>
      <header className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Subscriptions</h1>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'var(--muted)', marginLeft: 8 }}>
            {subscribers.length} subscribers
          </span>
        </div>
      </header>

      {loading ? (
        <div className={s.card}><div className={s.chartPlaceholder}>Loading subscriptions…</div></div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className={s.kpiGrid}>
            <div className={`${s.card} ${s.cardFeatured}`}>
              <div className={s.cardTitle}>MRR</div>
              <div className={s.cardValue}>{dollars(kpis?.mrr_cents ?? 0)}</div>
              <span className={s.cardChange}>{dollars(kpis?.arpu_cents ?? 0)} ARPU</span>
            </div>
            <div className={s.card}>
              <div className={s.cardTitle}>ARR</div>
              <div className={s.cardValue}>{dollars(kpis?.arr_cents ?? 0)}</div>
            </div>
            <div className={s.card}>
              <div className={s.cardTitle}>Active Subscribers</div>
              <div className={s.cardValue}>{(kpis?.active_subs ?? 0) + (kpis?.trialing_subs ?? 0)}</div>
              <span className={s.cardChange}>{kpis?.trialing_subs ?? 0} trialing</span>
            </div>
            <div className={s.card}>
              <div className={s.cardTitle}>Churn Rate (30d)</div>
              <div className={s.cardValue} style={{ color: (kpis?.churn_rate ?? 0) > 5 ? 'var(--error)' : undefined }}>
                {kpis?.churn_rate ?? 0}%
              </div>
            </div>
          </div>

          {/* Plan Configuration */}
          <div className={s.sectionTitle} style={{ marginTop: 8 }}>Plan Configuration</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16, marginBottom: 24 }}>
            {plans.map((plan) => {
              const isEditing = editingPlan === plan.id;
              return (
                <div key={plan.id} className={s.card} style={{ border: plan.is_featured ? '2px solid var(--accent)' : undefined }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>
                        {plan.name}
                      </span>
                      <span className={`${s.tag} ${plan.tier === 'pro' ? s.tagPro : plan.tier === 'team' ? s.tagTeam : s.tagTrial}`} style={{ marginLeft: 8 }}>
                        {plan.tier}
                      </span>
                    </div>
                    <span className={`${s.statusBadge} ${plan.is_active ? s.statusGreen : s.statusGray}`}>
                      <span className={s.statusDot} />
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {isEditing ? (
                    /* ── Edit mode ── */
                    <div style={{ fontSize: 13 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                        <div>
                          <label style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Monthly ($)</label>
                          <input
                            type="number"
                            value={(editForm.monthly_price_cents ?? 0) / 100}
                            onChange={(e) => setEditForm((p) => ({ ...p, monthly_price_cents: Math.round(Number(e.target.value) * 100) }))}
                            style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--rule)', borderRadius: 4, fontSize: 14, fontFamily: "'Space Mono', monospace", fontWeight: 700 }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Annual ($)</label>
                          <input
                            type="number"
                            value={(editForm.annual_price_cents ?? 0) / 100}
                            onChange={(e) => setEditForm((p) => ({ ...p, annual_price_cents: Math.round(Number(e.target.value) * 100) }))}
                            style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--rule)', borderRadius: 4, fontSize: 14, fontFamily: "'Space Mono', monospace", fontWeight: 700 }}
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Description</label>
                        <input
                          type="text"
                          value={editForm.description ?? ''}
                          onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--rule)', borderRadius: 4, fontSize: 13 }}
                        />
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Limits</label>
                        {Object.entries(LIMIT_LABELS).map(([key, label]) => (
                          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</span>
                            <input
                              type="text"
                              value={String((editForm.limits as PlanLimits)?.[key as keyof PlanLimits] ?? '')}
                              onChange={(e) => updateLimit(key as keyof PlanLimits, e.target.value)}
                              style={{ width: 120, padding: '3px 6px', border: '1px solid var(--rule)', borderRadius: 4, fontSize: 12, fontFamily: "'Space Mono', monospace", textAlign: 'right' }}
                            />
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                        <div>
                          <label style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Stripe Monthly ID</label>
                          <input
                            type="text"
                            value={editForm.stripe_monthly_price_id ?? ''}
                            onChange={(e) => setEditForm((p) => ({ ...p, stripe_monthly_price_id: e.target.value || null }))}
                            placeholder="price_..."
                            style={{ width: '100%', padding: '4px 6px', border: '1px solid var(--rule)', borderRadius: 4, fontSize: 11, fontFamily: "'Space Mono', monospace" }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Stripe Annual ID</label>
                          <input
                            type="text"
                            value={editForm.stripe_annual_price_id ?? ''}
                            onChange={(e) => setEditForm((p) => ({ ...p, stripe_annual_price_id: e.target.value || null }))}
                            placeholder="price_..."
                            style={{ width: '100%', padding: '4px 6px', border: '1px solid var(--rule)', borderRadius: 4, fontSize: 11, fontFamily: "'Space Mono', monospace" }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                          <input type="checkbox" checked={editForm.is_active ?? false} onChange={(e) => setEditForm((p) => ({ ...p, is_active: e.target.checked }))} />
                          Active
                        </label>
                        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                          <input type="checkbox" checked={editForm.is_featured ?? false} onChange={(e) => setEditForm((p) => ({ ...p, is_featured: e.target.checked }))} />
                          Featured
                        </label>
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className={s.btnPrimary} onClick={savePlan} disabled={saving} style={{ fontSize: 12 }}>
                          {saving ? 'Saving…' : 'Save Changes'}
                        </button>
                        <button className={s.btnOutline} onClick={() => setEditingPlan(null)} style={{ fontSize: 12 }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    /* ── View mode ── */
                    <div style={{ fontSize: 13 }}>
                      <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: 'var(--muted)', textTransform: 'uppercase' }}>Monthly</div>
                          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Bricolage Grotesque', sans-serif", letterSpacing: '-0.02em' }}>
                            {plan.monthly_price_cents === 0 ? '$0' : dollars(plan.monthly_price_cents)}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: 'var(--muted)', textTransform: 'uppercase' }}>Annual</div>
                          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Bricolage Grotesque', sans-serif", letterSpacing: '-0.02em' }}>
                            {plan.annual_price_cents === 0 ? '$0' : dollars(plan.annual_price_cents)}
                          </div>
                        </div>
                      </div>

                      <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 12, lineHeight: 1.4 }}>{plan.description}</p>

                      <div style={{ marginBottom: 12 }}>
                        {Object.entries(LIMIT_LABELS).map(([key, label]) => {
                          const val = plan.limits?.[key as keyof PlanLimits];
                          if (val === undefined) return null;
                          const display = val === -1 ? 'Unlimited' : String(val);
                          return (
                            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--rule)' }}>
                              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</span>
                              <span style={{ fontSize: 12, fontFamily: "'Space Mono', monospace", fontWeight: 600 }}>{display}</span>
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                          <strong style={{ color: 'var(--ink)' }}>{plan.subscriber_count ?? 0}</strong> subscribers · {dollars(plan.plan_mrr_cents ?? 0)} MRR
                        </div>
                        <button className={s.btnOutline} onClick={() => startEdit(plan)} style={{ fontSize: 11, padding: '4px 12px' }}>Edit</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* AI Pricing Recommendations */}
          <div className={s.card} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div className={s.sectionTitle} style={{ margin: 0 }}>AI Pricing Recommendations</div>
              <button className={s.btnPrimary} onClick={getRecommendations} disabled={loadingRecs} style={{ fontSize: 12 }}>
                {loadingRecs ? 'Analyzing…' : 'Get AI Recommendations'}
              </button>
            </div>

            {usage && (
              <div style={{ display: 'flex', gap: 24, marginBottom: 16, fontSize: 12, color: 'var(--muted)' }}>
                <span>Avg {usage.avg_projects} projects/user</span>
                <span>Avg {usage.avg_artifacts} artifacts/user</span>
                <span>Avg {usage.avg_exports} exports/user</span>
                <span>Avg AI cost: {dollars(usage.avg_ai_cost_cents)}/user</span>
              </div>
            )}

            {recs === null && !loadingRecs && (
              <div style={{ padding: 16, color: 'var(--muted)', fontSize: 13 }}>
                Click the button above to get AI-powered pricing recommendations based on your usage data and market analysis.
              </div>
            )}

            {loadingRecs && (
              <div style={{ padding: 16, color: 'var(--muted)', fontSize: 13 }}>
                Analyzing platform metrics, usage patterns, and market data…
              </div>
            )}

            {recs && recs.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {recs.map((rec) => (
                  <div key={rec.tier} style={{ padding: 16, border: '1px solid var(--rule)', borderRadius: 8, background: 'var(--paper)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{rec.tier.charAt(0).toUpperCase() + rec.tier.slice(1)}</span>
                      <span className={`${s.statusBadge} ${rec.confidence >= 70 ? s.statusGreen : rec.confidence >= 40 ? s.statusYellow : s.statusGray}`}>
                        <span className={s.statusDot} />
                        {rec.confidence}% confidence
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', fontFamily: "'Space Mono', monospace" }}>Monthly</div>
                        <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Bricolage Grotesque', sans-serif" }}>{dollars(rec.suggested_monthly_cents)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', fontFamily: "'Space Mono', monospace" }}>Annual</div>
                        <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Bricolage Grotesque', sans-serif" }}>{dollars(rec.suggested_annual_cents)}</div>
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{rec.rationale}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subscriber Table */}
          <div className={s.sectionTitle}>Subscribers</div>
          <div style={{ marginBottom: 12 }}>
            <div className={s.filterGroup}>
              <button className={`${s.filterPill} ${filter === 'all' ? s.filterPillActive : ''}`} onClick={() => setFilter('all')}>All</button>
              {planTiers.map((t) => (
                <button key={t} className={`${s.filterPill} ${filter === t ? s.filterPillActive : ''}`} onClick={() => setFilter(t)}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div style={{ border: '1px solid var(--rule)', borderRadius: 8, overflow: 'hidden', background: 'var(--paper)' }}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>MRR</th>
                  <th>Billing</th>
                  <th>Started</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubs.map((sub) => (
                  <tr key={sub.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{sub.full_name ?? sub.email}</div>
                      {sub.full_name && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{sub.email}</div>}
                    </td>
                    <td>
                      <span className={`${s.tag} ${sub.plan_tier === 'pro' ? s.tagPro : sub.plan_tier === 'team' ? s.tagTeam : s.tagTrial}`}>
                        {sub.plan_tier}
                      </span>
                    </td>
                    <td>
                      <span className={`${s.statusBadge} ${statusCls(sub.status)}`}>
                        <span className={s.statusDot} />
                        {sub.status}
                      </span>
                    </td>
                    <td style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 600 }}>
                      {dollars(sub.amount_cents)}
                    </td>
                    <td style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'var(--muted)' }}>
                      {sub.interval ?? '—'}
                    </td>
                    <td style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'var(--muted)' }}>
                      {new Date(sub.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {filteredSubs.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>No subscribers found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
