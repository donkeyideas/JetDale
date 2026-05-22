'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import type { FeatureFlagRow } from '@/lib/admin-types';
import { humanize } from '@/lib/format';
import NewFlagModal from './NewFlagModal';
import s from '../admin.module.css';

function flagStatusClass(enabled: boolean, rollout: number) {
  if (!enabled) return s.statusGray;
  if (rollout === 100) return s.statusGreen;
  return s.statusYellow;
}

function flagStatusLabel(enabled: boolean, rollout: number) {
  if (!enabled) return 'Disabled';
  if (rollout === 100) return 'Enabled';
  return 'Partial';
}

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewFlag, setShowNewFlag] = useState(false);

  const fetchFlags = useCallback(async () => {
    try {
      const res = await adminFetch<{ data: FeatureFlagRow[] }>('/api/admin/feature-flags');
      setFlags(res.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchFlags(); }, [fetchFlags]);

  async function toggleFlag(key: string, enabled: boolean) {
    setFlags((prev) => prev.map((f) => f.key === key ? { ...f, enabled } : f));
    try {
      await fetch('/api/admin/feature-flags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ key, enabled }),
      });
    } catch {
      fetchFlags();
    }
  }

  async function updateRollout(key: string, rollout_percentage: number) {
    setFlags((prev) => prev.map((f) => f.key === key ? { ...f, rollout_percentage } : f));
    try {
      await fetch('/api/admin/feature-flags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ key, rollout_percentage }),
      });
    } catch {
      fetchFlags();
    }
  }

  return (
    <>
      <header className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Feature Flags</h1>
          <span style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            color: 'var(--muted)',
            marginLeft: 8,
          }}>
            {flags.length} flags
          </span>
        </div>
        <div className={s.headerControls}>
          <button type="button" className={s.btnPrimary} onClick={() => setShowNewFlag(true)}>
            + New Flag
          </button>
        </div>
      </header>

      {loading ? (
        <div className={s.card}><div className={s.chartPlaceholder}>Loading flags…</div></div>
      ) : (
        <div style={{ border: '1px solid var(--rule)', borderRadius: 8, overflowX: 'auto', WebkitOverflowScrolling: 'touch', background: 'var(--paper)' }}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Flag</th>
                <th>Key</th>
                <th>Status</th>
                <th>Rollout</th>
                <th>Toggle</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {flags.map((flag) => (
                <tr key={flag.key}>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>{humanize(flag.key)}</td>
                  <td style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'var(--muted)' }}>
                    {flag.key}
                  </td>
                  <td>
                    <span className={`${s.statusBadge} ${flagStatusClass(flag.enabled, flag.rollout_percentage)}`}>
                      <span className={s.statusDot} />
                      {flagStatusLabel(flag.enabled, flag.rollout_percentage)}
                    </span>
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={flag.rollout_percentage}
                      onChange={(e) => updateRollout(flag.key, Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 12,
                        fontWeight: 700,
                        width: 60,
                        border: '1px solid var(--rule)',
                        borderRadius: 4,
                        padding: '2px 6px',
                        textAlign: 'right',
                      }}
                    />
                    <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 2 }}>%</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      aria-label={`${flag.enabled ? 'Disable' : 'Enable'} ${humanize(flag.key)}`}
                      title={`${flag.enabled ? 'Disable' : 'Enable'} ${humanize(flag.key)}`}
                      onClick={() => toggleFlag(flag.key, !flag.enabled)}
                      style={{
                        width: 40,
                        height: 22,
                        borderRadius: 11,
                        border: 'none',
                        cursor: 'pointer',
                        background: flag.enabled ? '#22c55e' : 'var(--rule)',
                        position: 'relative',
                        transition: 'background 0.2s',
                      }}
                    >
                      <span style={{
                        display: 'block',
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: '#fff',
                        position: 'absolute',
                        top: 3,
                        left: flag.enabled ? 21 : 3,
                        transition: 'left 0.2s',
                      }} />
                    </button>
                  </td>
                  <td style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'var(--muted)' }}>
                    {new Date(flag.updated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNewFlag && (
        <NewFlagModal
          onClose={() => setShowNewFlag(false)}
          onCreated={fetchFlags}
        />
      )}
    </>
  );
}
