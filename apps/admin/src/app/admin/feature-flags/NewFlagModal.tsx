'use client';

// ============================================================
// Jetdale Admin — New Feature Flag Modal
// Form to create a feature flag: key, initial state, rollout %.
// ============================================================

import { useEffect, useState } from 'react';
import s from '../admin.module.css';

const MONO = "'Space Mono', monospace";
const HEAD = "'Bricolage Grotesque', sans-serif";

const labelStyle: React.CSSProperties = {
  fontFamily: MONO, fontSize: 10, letterSpacing: '.12em',
  textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%', fontSize: 13, padding: '8px 10px',
  border: '1px solid var(--rule)', borderRadius: 6, background: 'var(--paper)',
};

export default function NewFlagModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [key, setKey] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [rollout, setRollout] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit() {
    setError('');
    const cleanKey = key.trim().toLowerCase();
    if (!cleanKey) {
      setError('A flag key is required.');
      return;
    }
    if (!/^[a-z0-9][a-z0-9_.]*$/.test(cleanKey)) {
      setError('Key may only contain lowercase letters, numbers, dots and underscores.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ key: cleanKey, enabled, rollout_percentage: rollout }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? 'Could not create flag.');
        setSaving(false);
        return;
      }
      onCreated();
      onClose();
    } catch {
      setError('Network error — could not create flag.');
      setSaving(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100, display: 'flex',
        alignItems: 'flex-start', justifyContent: 'center', padding: '64px 16px',
        background: 'rgba(14,15,12,.6)', backdropFilter: 'blur(3px)', overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 460, background: 'var(--paper-2)',
          border: '1px solid var(--rule)', borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,.35)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: '1px solid var(--rule)', background: 'var(--paper)',
        }}>
          <div style={{ fontFamily: HEAD, fontSize: 18, fontWeight: 600 }}>New Feature Flag</div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--muted)', lineHeight: 1 }}
          >
            &times;
          </button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Key */}
          <div>
            <label style={labelStyle}>Flag Key</label>
            <input
              autoFocus
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              placeholder="e.g. voice_input_v2"
              style={{ ...inputStyle, fontFamily: MONO }}
            />
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              Lowercase letters, numbers, dots and underscores. Cannot be changed later.
            </div>
          </div>

          {/* Rollout */}
          <div>
            <label style={labelStyle}>Rollout Percentage</label>
            <input
              type="number"
              min={0}
              max={100}
              value={rollout}
              onChange={(e) => setRollout(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
              style={{ ...inputStyle, fontFamily: MONO, width: 100 }}
            />
            <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 6 }}>%</span>
          </div>

          {/* Enabled */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            <span style={{ fontSize: 13, fontWeight: 500 }}>Enable this flag immediately</span>
          </label>

          {error && (
            <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>{error}</div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 10,
          padding: '14px 24px', borderTop: '1px solid var(--rule)', background: 'var(--paper)',
        }}>
          <button type="button" className={s.btnOutline} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className={s.btnPrimary} onClick={submit} disabled={saving}>
            {saving ? 'Creating…' : 'Create Flag'}
          </button>
        </div>
      </div>
    </div>
  );
}
