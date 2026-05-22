'use client';

// ============================================================
// Jetdale Admin — User Detail Modal
// Opens when an admin clicks a user row. Two-column layout:
// Snapshot · Subscription · AI Activity  |  Profile · Usage · Projects
// ============================================================

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import { humanize } from '@/lib/format';
import s from '../admin.module.css';

const MONO = "'Space Mono', monospace";
const HEAD = "'Bricolage Grotesque', sans-serif";

type Detail = {
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string;
    created_at: string;
    timezone: string | null;
    email_notifications: boolean;
    marketing_opt_in: boolean;
  };
  subscription: {
    plan_tier: string;
    status: string;
    amount_cents: number | null;
    interval: string | null;
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at: string | null;
    provider: string | null;
    provider_subscription_id: string | null;
    created_at: string;
  } | null;
  projects: Array<{ id: string; name: string; phase: string; status: string; created_at: string }>;
  usage: {
    projects_created: number;
    discoveries_completed: number;
    reality_checks_completed: number;
    artifacts_generated: number;
    exports_run: number;
    voice_minutes_used: number;
    ai_cost_cents: number;
  } | null;
  ai: { event_count: number; success_count: number; total_cost_cents: number };
};

function money(cents: number | null | undefined) {
  if (!cents) return '$0';
  const d = cents / 100;
  return d >= 1 ? `$${d.toFixed(2)}` : `$${d.toFixed(4)}`;
}

function fmtDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
}

function daysSince(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

const labelStyle: React.CSSProperties = {
  fontFamily: MONO, fontSize: 10, letterSpacing: '.12em',
  textTransform: 'uppercase', color: 'var(--muted)',
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '7px 0', gap: 16 }}>
      <span style={labelStyle}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--paper)', border: '1px solid var(--rule)',
      borderRadius: 8, padding: '14px 18px',
    }}>
      <div style={{ ...labelStyle, color: 'var(--accent)', marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--paper-2)', border: '1px solid var(--rule)',
      borderRadius: 6, padding: '12px 14px',
    }}>
      <div style={{ fontFamily: HEAD, fontSize: 24, fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ ...labelStyle, marginTop: 6 }}>{label}</div>
    </div>
  );
}

export default function UserDetailModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminFetch<Detail>(`/api/admin/users/${userId}`)
      .then(setDetail)
      .catch(() => setError('Could not load user details.'));
  }, [userId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const p = detail?.profile;
  const initials = p?.full_name
    ? p.full_name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : p?.email.slice(0, 2).toUpperCase() ?? '··';

  const successRate = detail && detail.ai.event_count > 0
    ? `${Math.round((detail.ai.success_count / detail.ai.event_count) * 100)}%`
    : '—';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100, display: 'flex',
        alignItems: 'flex-start', justifyContent: 'center', padding: '48px 16px',
        background: 'rgba(14,15,12,.6)', backdropFilter: 'blur(3px)', overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 880, background: 'var(--paper-2)',
          border: '1px solid var(--rule)', borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,.35)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '20px 24px',
          borderBottom: '1px solid var(--rule)', background: 'var(--paper)',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)',
            color: '#fff', display: 'grid', placeItems: 'center',
            fontFamily: MONO, fontSize: 14, fontWeight: 700, flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: HEAD, fontSize: 18, fontWeight: 600 }}>
              {p?.full_name ?? p?.email ?? 'Loading…'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p?.email}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--muted)', lineHeight: 1 }}
          >
            &times;
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {error && <div style={{ fontSize: 13, color: 'var(--accent)' }}>{error}</div>}
          {!detail && !error && (
            <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: 24 }}>
              Loading user details…
            </div>
          )}

          {detail && p && (
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {/* ── Left column ───────────────────────────── */}
              <div style={{ flex: '1 1 360px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Snapshot */}
                <SectionCard title="Snapshot">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                    <StatTile label="Projects" value={detail.projects.length} />
                    <StatTile label="AI Generations" value={detail.ai.event_count} />
                    <StatTile label="Lifetime AI Spend" value={money(detail.ai.total_cost_cents)} />
                    <StatTile label="Account Age" value={`${daysSince(p.created_at)}d`} />
                  </div>
                </SectionCard>

                {/* Subscription */}
                <SectionCard title="Subscription">
                  {detail.subscription ? (
                    <>
                      <Row
                        label="Plan"
                        value={
                          <span className={`${s.tag} ${detail.subscription.plan_tier === 'pro' ? s.tagPro : detail.subscription.plan_tier === 'team' ? s.tagTeam : s.tagFree}`}>
                            {humanize(detail.subscription.plan_tier)}
                          </span>
                        }
                      />
                      <Row label="Status" value={humanize(detail.subscription.status)} />
                      <Row
                        label="Amount"
                        value={`${money(detail.subscription.amount_cents)}${detail.subscription.interval ? ` / ${detail.subscription.interval}` : ''}`}
                      />
                      <Row label="Current period ends" value={fmtDate(detail.subscription.current_period_end)} />
                      {detail.subscription.cancel_at && (
                        <Row label="Cancels" value={<span style={{ color: 'var(--gold)' }}>{fmtDate(detail.subscription.cancel_at)}</span>} />
                      )}
                      <Row
                        label="Stripe sub"
                        value={<span style={{ fontFamily: MONO, fontSize: 11 }}>{detail.subscription.provider_subscription_id ?? '—'}</span>}
                      />
                    </>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--muted)', padding: '4px 0' }}>
                      Free plan — no paid subscription.
                    </div>
                  )}
                </SectionCard>

                {/* AI activity */}
                <SectionCard title="AI Activity (all time)">
                  <Row label="Total generations" value={detail.ai.event_count} />
                  <Row label="Success rate" value={successRate} />
                  <Row label="Total AI cost" value={money(detail.ai.total_cost_cents)} />
                </SectionCard>
              </div>

              {/* ── Right column ──────────────────────────── */}
              <div style={{ flex: '1 1 360px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Profile */}
                <SectionCard title="Profile">
                  <Row label="Role" value={humanize(p.role)} />
                  <Row label="Member since" value={fmtDate(p.created_at)} />
                  <Row label="Timezone" value={p.timezone || '—'} />
                  <Row label="Account emails" value={p.email_notifications ? 'On' : 'Off'} />
                  <Row label="Marketing emails" value={p.marketing_opt_in ? 'On' : 'Off'} />
                </SectionCard>

                {/* Usage this period */}
                <SectionCard title="Usage this period">
                  {detail.usage ? (
                    <>
                      <Row label="Projects created" value={detail.usage.projects_created} />
                      <Row label="Discoveries completed" value={detail.usage.discoveries_completed} />
                      <Row label="Reality checks" value={detail.usage.reality_checks_completed ?? 0} />
                      <Row label="Artifacts generated" value={detail.usage.artifacts_generated} />
                      <Row label="Exports run" value={detail.usage.exports_run} />
                      <Row label="Voice minutes" value={detail.usage.voice_minutes_used} />
                      <Row label="AI cost (period)" value={money(detail.usage.ai_cost_cents)} />
                    </>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--muted)', padding: '4px 0' }}>No usage recorded yet.</div>
                  )}
                </SectionCard>

                {/* Projects */}
                <SectionCard title={`Projects (${detail.projects.length})`}>
                  {detail.projects.length > 0 ? (
                    detail.projects.map((proj, i) => (
                      <div key={proj.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 0', borderTop: i > 0 ? '1px solid var(--rule)' : 'none', gap: 12,
                      }}>
                        <span style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {proj.name}
                        </span>
                        <span style={{ ...labelStyle, flexShrink: 0 }}>{humanize(proj.phase)}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--muted)', padding: '4px 0' }}>No projects yet.</div>
                  )}
                </SectionCard>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
