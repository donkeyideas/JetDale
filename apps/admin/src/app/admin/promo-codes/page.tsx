'use client';

// ============================================================
// Admin — Promo Codes
// Stripe is the source of truth (no local table). List/create
// hits the Stripe Coupons + PromotionCodes APIs through the
// /api/admin/promo-codes routes; toggling sets active=false on
// the PromotionCode (Stripe doesn't allow deletion once redeemed).
// ============================================================

import { useEffect, useState, useCallback } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import s from '../admin.module.css';

type PromoRow = {
  id: string;
  code: string;
  active: boolean;
  internalName: string | null;
  timesRedeemed: number;
  maxRedemptions: number | null;
  expiresAt: number | null;
  firstTimeOnly: boolean;
  created: number;
  coupon: {
    id: string;
    percentOff: number | null;
    amountOff: number | null;
    currency: string | null;
    duration: 'once' | 'repeating' | 'forever';
    durationInMonths: number | null;
  };
};

function discountLabel(c: PromoRow['coupon']): string {
  const off =
    c.percentOff != null
      ? `${c.percentOff}% off`
      : `$${((c.amountOff ?? 0) / 100).toFixed(2)} off`;
  const dur =
    c.duration === 'forever'
      ? 'forever'
      : c.duration === 'once'
        ? 'once'
        : `for ${c.durationInMonths} mo`;
  return `${off} ${dur}`;
}

function expiryLabel(secs: number | null): string {
  if (!secs) return 'No expiry';
  return new Date(secs * 1000).toLocaleDateString();
}

export default function PromoCodesPage() {
  const [rows, setRows] = useState<PromoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [applyTarget, setApplyTarget] = useState<PromoRow | null>(null);
  const [toggleBusy, setToggleBusy] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<{ title: string; body: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await adminFetch<{ rows: PromoRow[] }>('/api/admin/promo-codes');
      setRows(res.rows);
    } catch {
      /* surface via empty table */
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggle(row: PromoRow) {
    setToggleBusy(row.id);
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, active: !r.active } : r)));
    try {
      const res = await fetch(`/api/admin/promo-codes/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ active: !row.active }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Toggle failed');
      }
    } catch (err) {
      // revert optimistic update
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, active: row.active } : r)));
      setErrorModal({
        title: 'Could not update code',
        body: err instanceof Error ? err.message : 'Try again.',
      });
    }
    setToggleBusy(null);
  }

  const activeCount = rows.filter((r) => r.active).length;
  const totalRedemptions = rows.reduce((sum, r) => sum + r.timesRedeemed, 0);
  const redeemedToday = rows.length; // simple count for now

  return (
    <>
      <header className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Promo Codes</h1>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 11,
            color: 'var(--muted)', marginLeft: 8,
          }}>
            {rows.length} total · Stripe
          </span>
        </div>
        <div className={s.headerControls}>
          <button type="button" className={s.btnPrimary} onClick={() => setShowCreate(true)}>
            + New code
          </button>
        </div>
      </header>

      {/* KPI grid */}
      <div className={s.kpiGrid}>
        <div className={s.card}>
          <div className={s.cardTitle}>Active codes</div>
          <div className={s.cardValue}>{activeCount}</div>
          <div className={s.cardChange}>{rows.length - activeCount} inactive</div>
        </div>
        <div className={s.card}>
          <div className={s.cardTitle}>Total codes</div>
          <div className={s.cardValue}>{rows.length}</div>
          <div className={s.cardChange}>across the workspace</div>
        </div>
        <div className={s.card}>
          <div className={s.cardTitle}>Total redemptions</div>
          <div className={s.cardValue}>{totalRedemptions}</div>
          <div className={s.cardChange}>across all codes</div>
        </div>
        <div className={s.card}>
          <div className={s.cardTitle}>Codes with caps</div>
          <div className={s.cardValue}>{rows.filter((r) => r.maxRedemptions != null).length}</div>
          <div className={s.cardChange}>of {redeemedToday}</div>
        </div>
      </div>

      {loading ? (
        <div className={s.card}><div className={s.chartPlaceholder}>Loading promo codes…</div></div>
      ) : rows.length === 0 ? (
        <div className={s.card}>
          <div className={s.chartPlaceholder}>
            No promo codes yet. Click <strong style={{ margin: '0 4px' }}>+ New code</strong> to create one.
          </div>
        </div>
      ) : (
        <div style={{ border: '1px solid var(--rule)', borderRadius: 8, overflowX: 'auto', background: 'var(--paper)' }}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Redemptions</th>
                <th>Expires</th>
                <th>Restrictions</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>
                    {r.code}
                    {r.internalName && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400, marginTop: 2 }}>
                        {r.internalName}
                      </div>
                    )}
                  </td>
                  <td style={{ fontFamily: "'Space Mono', monospace", fontSize: 12 }}>
                    {discountLabel(r.coupon)}
                  </td>
                  <td style={{ fontFamily: "'Space Mono', monospace", fontSize: 12 }}>
                    {r.timesRedeemed}{r.maxRedemptions ? ` / ${r.maxRedemptions}` : ''}
                  </td>
                  <td style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: 'var(--muted)' }}>
                    {expiryLabel(r.expiresAt)}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {r.firstTimeOnly ? 'First-time only' : 'All customers'}
                  </td>
                  <td>
                    <span className={`${s.statusBadge} ${r.active ? s.statusGreen : s.statusGray}`}>
                      <span className={s.statusDot} />
                      {r.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => toggle(r)}
                      disabled={toggleBusy === r.id}
                      className={s.btnOutline}
                      style={{ marginRight: 6 }}
                    >
                      {r.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setApplyTarget(r)}
                      className={s.btnOutline}
                    >
                      Apply to user
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
          onError={(e) => setErrorModal(e)}
        />
      )}

      {applyTarget && (
        <ApplyModal
          row={applyTarget}
          onClose={() => setApplyTarget(null)}
          onError={(e) => setErrorModal(e)}
        />
      )}

      {errorModal && (
        <ModalScrim onClose={() => setErrorModal(null)}>
          <ModalCard>
            <ModalTitle>{errorModal.title}</ModalTitle>
            <ModalBody>{errorModal.body}</ModalBody>
            <ModalActions>
              <button type="button" className={s.btnPrimary} onClick={() => setErrorModal(null)}>
                OK
              </button>
            </ModalActions>
          </ModalCard>
        </ModalScrim>
      )}
    </>
  );
}

// ============================================================
// Create modal
// ============================================================

function CreateModal({
  onClose,
  onCreated,
  onError,
}: {
  onClose: () => void;
  onCreated: () => void;
  onError: (e: { title: string; body: string }) => void;
}) {
  const [code, setCode] = useState('');
  const [internalName, setInternalName] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [percentOff, setPercentOff] = useState<number>(50);
  const [amountOff, setAmountOff] = useState<number>(1000); // cents
  const [duration, setDuration] = useState<'once' | 'repeating' | 'forever'>('once');
  const [durationInMonths, setDurationInMonths] = useState<number>(3);
  const [expiresAt, setExpiresAt] = useState('');
  const [maxRedemptions, setMaxRedemptions] = useState<number | ''>('');
  const [firstTimeOnly, setFirstTimeOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    const clean = code.trim().toUpperCase();
    if (!/^[A-Z0-9-]+$/.test(clean)) {
      setErr('Code: uppercase letters, numbers, dashes only.');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        code: clean,
        discountType,
        duration,
      };
      if (internalName.trim()) payload.internalName = internalName.trim();
      if (discountType === 'percent') payload.percentOff = percentOff;
      else payload.amountOff = amountOff;
      if (duration === 'repeating') payload.durationInMonths = durationInMonths;
      if (expiresAt) payload.expiresAt = expiresAt;
      if (maxRedemptions !== '' && Number(maxRedemptions) > 0) payload.maxRedemptions = Number(maxRedemptions);
      if (firstTimeOnly) payload.firstTimeOnly = true;

      const res = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error || `Create failed (${res.status})`);
        setSaving(false);
        return;
      }
      onCreated();
    } catch (e) {
      onError({ title: 'Network error', body: e instanceof Error ? e.message : 'Try again.' });
      setSaving(false);
    }
  }

  return (
    <ModalScrim onClose={() => !saving && onClose()}>
      <ModalCard wide>
        <ModalTitle>Create promo code</ModalTitle>

        <Field label="Code (user-facing)">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="PRODUCTHUNT"
            style={inputStyle}
          />
          <Hint>Letters, numbers, dashes. Uppercase. e.g. PRODUCTHUNT</Hint>
        </Field>

        <Field label="Internal name (optional)">
          <input
            value={internalName}
            onChange={(e) => setInternalName(e.target.value)}
            placeholder="Product Hunt launch"
            style={inputStyle}
          />
          <Hint>Shown only here, not to customers</Hint>
        </Field>

        <Field label="Discount type">
          <Segmented
            value={discountType}
            onChange={(v) => setDiscountType(v as 'percent' | 'fixed')}
            options={[
              { value: 'percent', label: 'Percent' },
              { value: 'fixed', label: 'Fixed amount' },
            ]}
          />
        </Field>

        {discountType === 'percent' ? (
          <Field label="Percent off">
            <input
              type="number"
              min={1}
              max={100}
              value={percentOff}
              onChange={(e) => setPercentOff(Math.max(1, Math.min(100, parseInt(e.target.value) || 0)))}
              style={inputStyle}
            />
            <Hint>1–100</Hint>
          </Field>
        ) : (
          <Field label="Amount off (USD)">
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={(amountOff / 100).toFixed(2)}
              onChange={(e) => setAmountOff(Math.max(1, Math.round((parseFloat(e.target.value) || 0) * 100)))}
              style={inputStyle}
            />
            <Hint>In whole dollars (will be stored in cents)</Hint>
          </Field>
        )}

        <Field label="Duration">
          <Segmented
            value={duration}
            onChange={(v) => setDuration(v as 'once' | 'repeating' | 'forever')}
            options={[
              { value: 'once', label: 'Once' },
              { value: 'repeating', label: 'Repeating' },
              { value: 'forever', label: 'Forever' },
            ]}
          />
        </Field>

        {duration === 'repeating' && (
          <Field label="Apply for (months)">
            <input
              type="number"
              min={1}
              value={durationInMonths}
              onChange={(e) => setDurationInMonths(Math.max(1, parseInt(e.target.value) || 1))}
              style={inputStyle}
            />
          </Field>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Expires on (optional)">
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="Max redemptions (optional)">
            <input
              type="number"
              min={1}
              value={maxRedemptions}
              placeholder="∞"
              onChange={(e) => setMaxRedemptions(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))}
              style={inputStyle}
            />
          </Field>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={firstTimeOnly}
            onChange={(e) => setFirstTimeOnly(e.target.checked)}
          />
          <span style={{ fontSize: 13 }}>First-time customers only (no prior successful charges)</span>
        </label>

        {err && <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 12 }}>{err}</div>}

        <ModalActions>
          <button type="button" className={s.btnOutline} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className={s.btnPrimary} onClick={submit} disabled={saving}>
            {saving ? 'Creating…' : 'Create code'}
          </button>
        </ModalActions>
      </ModalCard>
    </ModalScrim>
  );
}

// ============================================================
// Apply-to-user modal — paste an email, applies to next invoice
// ============================================================

function ApplyModal({
  row,
  onClose,
  onError,
}: {
  row: PromoRow;
  onClose: () => void;
  onError: (e: { title: string; body: string }) => void;
}) {
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit() {
    setErr(null);
    const clean = email.trim().toLowerCase();
    if (!clean) {
      setErr('Enter the user\'s email.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/promo-codes/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ promotionCodeId: row.id, email: clean }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error || `Apply failed (${res.status})`);
        setSaving(false);
        return;
      }
      setOk(true);
      setSaving(false);
    } catch (e) {
      onError({ title: 'Network error', body: e instanceof Error ? e.message : 'Try again.' });
      setSaving(false);
    }
  }

  return (
    <ModalScrim onClose={() => !saving && onClose()}>
      <ModalCard>
        <ModalTitle>Apply <span style={{ color: 'var(--accent)' }}>{row.code}</span> to a user</ModalTitle>
        <ModalBody>
          Discount: {discountLabel(row.coupon)}. Applies to the user&apos;s next invoice (not retroactively).
        </ModalBody>

        {!ok ? (
          <>
            <Field label="User email">
              <input
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                placeholder="customer@example.com"
                style={inputStyle}
              />
            </Field>
            {err && <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 8 }}>{err}</div>}
            <ModalActions>
              <button type="button" className={s.btnOutline} onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button type="button" className={s.btnPrimary} onClick={submit} disabled={saving}>
                {saving ? 'Applying…' : 'Apply'}
              </button>
            </ModalActions>
          </>
        ) : (
          <>
            <div style={{ fontSize: 14, color: 'var(--moss)', marginTop: 8 }}>
              Applied. The discount will appear on their next invoice.
            </div>
            <ModalActions>
              <button type="button" className={s.btnPrimary} onClick={onClose}>
                Done
              </button>
            </ModalActions>
          </>
        )}
      </ModalCard>
    </ModalScrim>
  );
}

// ============================================================
// Reusable modal primitives
// ============================================================

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', fontSize: 14,
  background: 'var(--paper)', border: '1px solid var(--rule)',
  borderRadius: 6, color: 'var(--ink)', fontFamily: 'inherit',
};

function ModalScrim({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(14,15,12,.6)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '48px 16px', overflowY: 'auto',
      }}
    >
      {children}
    </div>
  );
}

function ModalCard({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        width: '100%', maxWidth: wide ? 560 : 460,
        background: 'var(--paper-2)', border: '1px solid var(--rule)',
        borderRadius: 12, padding: '24px 28px',
        boxShadow: '0 24px 60px rgba(0,0,0,.35)',
      }}
    >
      {children}
    </div>
  );
}

function ModalTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontSize: 18, fontWeight: 600, marginBottom: 14, color: 'var(--ink)',
    }}>
      {children}
    </div>
  );
}

function ModalBody({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55, marginBottom: 16 }}>
      {children}
    </div>
  );
}

function ModalActions({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 10,
        letterSpacing: '.12em', textTransform: 'uppercase',
        color: 'var(--muted)', marginBottom: 6,
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{children}</div>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className={s.segmented} style={{ display: 'inline-flex' }}>
      {options.map((opt) => (
        <button
          type="button"
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={value === opt.value ? `${s.segBtn} ${s.segBtnActive}` : s.segBtn}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
