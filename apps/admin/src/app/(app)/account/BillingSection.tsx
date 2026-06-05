'use client';

// ============================================================
// Jetdale — Billing Section (in-portal Stripe)
// Embedded Payment Element modal, in-portal invoices, and
// in-portal cancel/resume. No external Stripe redirects.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

// ---- Stripe.js singleton ----
let stripePromise: Promise<Stripe | null> | null = null;
function getStripePromise() {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    stripePromise = key ? loadStripe(key) : Promise.resolve(null);
  }
  return stripePromise;
}

type SubRow = {
  plan_tier: string;
  status: string;
  amount_cents: number | null;
  interval: string | null;
  current_period_end: string | null;
  cancel_at: string | null;
  metadata: Record<string, unknown> | null;
};

type Invoice = {
  id: string;
  number: string | null;
  created: number;
  amount_paid: number;
  currency: string;
  status: string | null;
  pdf_url: string | null;
};

type PaidPlan = {
  tier: string;
  name: string;
  description: string | null;
  monthly_price_cents: number;
  annual_price_cents: number;
};

const MONO = "'Space Mono', monospace";
const HEAD = "'Bricolage Grotesque', sans-serif";

// Stripe Elements appearance — matches Jetdale's cream/dark/orange theme.
const STRIPE_APPEARANCE = {
  theme: 'flat' as const,
  variables: {
    colorPrimary: '#ff5b1f',
    colorBackground: '#ffffff',
    colorText: '#0e0f0c',
    colorDanger: '#ff5b1f',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontSizeBase: '14px',
    borderRadius: '8px',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': { border: '1px solid #ddd8ce', boxShadow: 'none', padding: '10px 12px' },
    '.Input:focus': { border: '1px solid #ff5b1f', boxShadow: '0 0 0 3px rgba(255,91,31,.12)' },
    '.Tab': { border: '1px solid #ddd8ce', boxShadow: 'none' },
    '.Tab--selected': { border: '1px solid #0e0f0c', backgroundColor: '#0e0f0c', color: '#eae7e0' },
    '.Label': {
      fontSize: '10px', fontWeight: '700', textTransform: 'uppercase',
      letterSpacing: '.12em', color: '#8c8a82',
    },
  },
};

function fmtMoney(cents: number, currency = 'usd') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() })
    .format(cents / 100);
}

/* ---------------- Payment form (inside <Elements>) ---------------- */

function PaymentForm({
  planLabel, priceLabel, onSuccess, onCancel,
}: {
  planLabel: string;
  priceLabel: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setErr(null);

    const { error } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (error) {
      setErr(error.message ?? 'Payment failed. Please try again.');
      setProcessing(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ borderBottom: '1px solid var(--rule)', padding: '20px 24px' }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Subscribe to
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
          <span style={{ fontFamily: HEAD, fontSize: 18, fontWeight: 600 }}>{planLabel}</span>
          <span style={{ fontFamily: HEAD, fontSize: 18, fontWeight: 600 }}>{priceLabel}</span>
        </div>
      </div>

      <div style={{ padding: '20px 24px' }}>
        <PaymentElement options={{ layout: 'tabs' }} />
        {err && (
          <div style={{
            marginTop: 14, padding: '8px 12px', fontSize: 13,
            background: 'rgba(255,91,31,.06)', border: '1px solid rgba(255,91,31,.3)',
            borderRadius: 6, color: 'var(--accent)',
          }}>
            {err}
          </div>
        )}
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderTop: '1px solid var(--rule)', padding: '16px 24px',
      }}>
        <button type="button" onClick={onCancel} disabled={processing} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 14, color: 'var(--muted)', fontFamily: 'inherit',
        }}>
          Cancel
        </button>
        <button type="submit" disabled={!stripe || processing} style={{
          background: 'var(--accent)', color: '#fff', border: 'none',
          padding: '12px 24px', borderRadius: 999, fontWeight: 600, fontSize: 14,
          cursor: processing ? 'default' : 'pointer', opacity: processing ? 0.6 : 1,
          fontFamily: 'inherit',
        }}>
          {processing ? 'Processing…' : `Pay ${priceLabel}`}
        </button>
      </div>
      <div style={{
        textAlign: 'center', padding: '0 24px 16px',
        fontSize: 10, color: 'var(--muted)', fontFamily: MONO,
      }}>
        Secured by Stripe
      </div>
    </form>
  );
}

/* ---------------- Billing section ---------------- */

export default function BillingSection() {
  const supabase = useRef(createSupabaseBrowserClient());
  const [sub, setSub] = useState<SubRow | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [plans, setPlans] = useState<PaidPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [interval, setInterval] = useState<'monthly' | 'annual'>('monthly');
  const [checkout, setCheckout] = useState<{
    clientSecret: string; subscriptionId: string; planLabel: string; priceLabel: string;
  } | null>(null);

  // Promo code state — validated client-side before the subscription is created.
  const [promoInput, setPromoInput] = useState('');
  const [promoValidated, setPromoValidated] = useState<{ id: string; code: string; label: string } | null>(null);
  const [promoErr, setPromoErr] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.current.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: subData } = await supabase.current
      .from('subscriptions')
      .select('plan_tier, status, amount_cents, interval, current_period_end, cancel_at, metadata')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setSub((subData as SubRow) ?? null);

    try {
      const res = await fetch('/api/billing/invoices', { credentials: 'include' });
      const json = await res.json();
      if (res.ok) setInvoices(json.invoices ?? []);
    } catch { /* ignore */ }

    try {
      const res = await fetch('/api/pricing');
      const json = await res.json();
      // Paid, purchasable plans only (exclude free + custom-priced enterprise).
      const paid = (json.plans ?? []).filter(
        (p: PaidPlan) => p.monthly_price_cents > 0 && p.tier !== 'enterprise',
      );
      setPlans(paid);
    } catch { /* ignore */ }

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const isPaid = (sub?.plan_tier === 'pro' || sub?.plan_tier === 'team')
    && (sub?.status === 'active' || sub?.status === 'trialing');
  const cancelPending = Boolean(sub?.metadata?.cancel_at_period_end) || Boolean(sub?.cancel_at);
  const currentPlanName = sub?.plan_tier === 'team'
    ? 'Jetdale Team'
    : sub?.plan_tier === 'pro' ? 'Jetdale Pro' : 'Free';

  async function handleSubscribe(plan: PaidPlan) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tier: plan.tier,
          interval,
          ...(promoValidated ? { promotionCodeId: promoValidated.id } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not start checkout.');
      const cents = interval === 'annual' ? plan.annual_price_cents : plan.monthly_price_cents;
      setCheckout({
        clientSecret: json.clientSecret,
        subscriptionId: json.subscriptionId,
        planLabel: `Jetdale ${plan.name} — ${interval === 'annual' ? 'Annual' : 'Monthly'}`,
        priceLabel: `${fmtMoney(cents)}/${interval === 'annual' ? 'yr' : 'mo'}`,
      });
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Something went wrong.' });
    }
    setBusy(false);
  }

  async function handleApplyPromo() {
    const code = promoInput.trim();
    if (!code) return;
    setPromoLoading(true);
    setPromoErr(null);
    try {
      const res = await fetch('/api/billing/validate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Invalid promo code.');
      setPromoValidated({ id: json.promotionCodeId, code: json.code, label: json.label });
      setPromoInput('');
    } catch (e) {
      setPromoErr(e instanceof Error ? e.message : 'Could not validate code.');
    }
    setPromoLoading(false);
  }

  function handleClearPromo() {
    setPromoValidated(null);
    setPromoErr(null);
    setPromoInput('');
  }

  async function handlePaymentSuccess() {
    const subId = checkout?.subscriptionId;
    // planLabel is e.g. "Jetdale Pro — Monthly"; take the plan name part.
    const planName = checkout?.planLabel.split(' — ')[0] ?? 'your new plan';
    setCheckout(null);
    setMsg({ kind: 'ok', text: 'Payment received — activating your plan…' });
    if (subId) {
      try {
        await fetch('/api/billing/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ subscriptionId: subId }),
        });
      } catch { /* webhook will reconcile */ }
    }
    await load();
    setMsg({ kind: 'ok', text: `You’re on ${planName}. Welcome aboard.` });
  }

  async function handleCancelToggle(resume: boolean) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ resume }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not update subscription.');
      setMsg({
        kind: 'ok',
        text: resume
          ? 'Your subscription will continue.'
          : 'Subscription set to cancel at the end of the period.',
      });
      await load();
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Something went wrong.' });
    }
    setBusy(false);
  }

  const labelStyle = {
    fontFamily: MONO, fontSize: 10, letterSpacing: '.12em',
    textTransform: 'uppercase' as const, color: 'var(--muted)',
  };

  return (
    <div style={{ marginBottom: 48 }}>
      <h2 style={{
        fontFamily: HEAD, fontSize: 22, fontWeight: 600, letterSpacing: '-.02em',
        marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ width: 20, height: 1, background: 'var(--accent)' }} />
        Billing
      </h2>

      {msg && (
        <div style={{
          marginBottom: 16, padding: '10px 14px', fontSize: 13, borderRadius: 8,
          background: msg.kind === 'ok' ? 'rgba(122,138,84,.08)' : 'rgba(255,91,31,.06)',
          border: `1px solid ${msg.kind === 'ok' ? 'rgba(122,138,84,.3)' : 'rgba(255,91,31,.3)'}`,
          color: msg.kind === 'ok' ? 'var(--moss)' : 'var(--accent)',
        }}>
          {msg.text}
        </div>
      )}

      {/* Current plan */}
      <div style={{
        background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 10,
        padding: 24, marginBottom: 16,
      }}>
        <div style={labelStyle}>Current plan</div>
        <div style={{ fontSize: 20, fontWeight: 600, fontFamily: HEAD, marginTop: 6 }}>
          {currentPlanName}
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
          {loading ? 'Loading…' : isPaid ? (
            <>
              {sub?.amount_cents ? fmtMoney(sub.amount_cents) : '—'}
              {sub?.interval ? `/${sub.interval}` : ''}
              {sub?.status === 'trialing' && <span style={{ marginLeft: 8, color: 'var(--gold)' }}>(Trial)</span>}
              {sub?.current_period_end && (
                <span style={{ marginLeft: 8 }}>
                  · {cancelPending ? 'Ends' : 'Renews'} {new Date(sub.current_period_end).toLocaleDateString()}
                </span>
              )}
            </>
          ) : 'Free plan — upgrade for unlimited projects and all export formats.'}
        </div>

        {cancelPending && isPaid && (
          <div style={{
            marginTop: 12, padding: '8px 12px', fontSize: 12, borderRadius: 6,
            background: 'rgba(212,160,23,.08)', border: '1px solid rgba(212,160,23,.3)',
            color: 'var(--gold)',
          }}>
            Your subscription is scheduled to cancel. You keep full access until the period ends.
          </div>
        )}

        {/* Actions */}
        {!loading && (
          <div style={{ marginTop: 18 }}>
            {!isPaid ? (
              <>
                {/* Interval toggle */}
                <div style={{
                  display: 'inline-flex', gap: 4, background: 'var(--paper-2)',
                  borderRadius: 999, padding: 4, marginBottom: 16,
                }}>
                  {(['monthly', 'annual'] as const).map((opt) => (
                    <button key={opt} type="button" onClick={() => setInterval(opt)} style={{
                      padding: '8px 18px', borderRadius: 999, border: 'none', cursor: 'pointer',
                      fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                      background: interval === opt ? 'var(--ink)' : 'transparent',
                      color: interval === opt ? 'var(--paper)' : 'var(--muted)',
                    }}>
                      {opt === 'monthly' ? 'Monthly' : 'Annual'}
                    </button>
                  ))}
                </div>
                {/* Promo code */}
                <div style={{ marginBottom: 16 }}>
                  {promoValidated ? (
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      gap: 12, padding: '10px 14px', borderRadius: 8,
                      background: 'rgba(122,138,84,.08)', border: '1px solid rgba(122,138,84,.3)',
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.12em',
                          textTransform: 'uppercase', color: 'var(--moss)',
                        }}>
                          {promoValidated.code} applied
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--ink)', marginTop: 2 }}>
                          {promoValidated.label}
                        </div>
                      </div>
                      <button type="button" onClick={handleClearPromo} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.12em',
                        textTransform: 'uppercase', color: 'var(--muted)',
                      }}>
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ ...labelStyle, marginBottom: 6 }}>Have a promo code?</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          type="text"
                          value={promoInput}
                          onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoErr(null); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleApplyPromo(); } }}
                          placeholder="ENTER CODE"
                          disabled={promoLoading}
                          style={{
                            flex: 1, padding: '10px 12px', borderRadius: 8,
                            border: '1px solid var(--rule)', background: 'var(--paper-2)',
                            fontSize: 13, fontFamily: MONO, letterSpacing: '.08em',
                            color: 'var(--ink)', textTransform: 'uppercase',
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleApplyPromo}
                          disabled={promoLoading || !promoInput.trim()}
                          style={{
                            background: 'var(--ink)', color: 'var(--paper)', border: 'none',
                            padding: '10px 18px', borderRadius: 8, fontWeight: 600, fontSize: 13,
                            cursor: promoLoading ? 'default' : 'pointer',
                            opacity: promoLoading || !promoInput.trim() ? 0.5 : 1,
                            fontFamily: 'inherit', whiteSpace: 'nowrap',
                          }}
                        >
                          {promoLoading ? 'Checking…' : 'Apply'}
                        </button>
                      </div>
                      {promoErr && (
                        <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 6 }}>
                          {promoErr}
                        </div>
                      )}
                    </>
                  )}
                </div>
                {/* Plan options */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {plans.map((plan) => {
                    const cents = interval === 'annual' ? plan.annual_price_cents : plan.monthly_price_cents;
                    return (
                      <div key={plan.tier} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        gap: 16, padding: '14px 16px', borderRadius: 8,
                        border: '1px solid var(--rule)', background: 'var(--paper-2)',
                      }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600, fontFamily: HEAD }}>
                            Jetdale {plan.name}
                            <span style={{ marginLeft: 8, fontFamily: HEAD, color: 'var(--muted)' }}>
                              {fmtMoney(cents)}/{interval === 'annual' ? 'yr' : 'mo'}
                            </span>
                          </div>
                          {plan.description && (
                            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                              {plan.description}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSubscribe(plan)}
                          disabled={busy}
                          style={{
                            background: 'var(--accent)', color: '#fff', border: 'none',
                            padding: '10px 20px', borderRadius: 999, fontWeight: 600, fontSize: 13,
                            cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
                            fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
                          }}
                        >
                          {busy ? 'Please wait…' : `Choose ${plan.name}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : cancelPending ? (
              <button onClick={() => handleCancelToggle(true)} disabled={busy} style={{
                background: 'var(--accent)', color: '#fff', border: 'none',
                padding: '12px 24px', borderRadius: 999, fontWeight: 600, fontSize: 14,
                cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1, fontFamily: 'inherit',
              }}>
                {busy ? 'Please wait…' : 'Resume subscription'}
              </button>
            ) : (
              <button onClick={() => handleCancelToggle(false)} disabled={busy} style={{
                background: 'none', color: 'var(--ink)', border: '1px solid var(--rule)',
                padding: '12px 24px', borderRadius: 999, fontWeight: 600, fontSize: 14,
                cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1, fontFamily: 'inherit',
              }}>
                {busy ? 'Please wait…' : 'Cancel subscription'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Invoices */}
      <div style={{
        background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 10,
        padding: 24,
      }}>
        <div style={labelStyle}>Invoices</div>
        {invoices.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 12 }}>
            No invoices yet.
          </div>
        ) : (
          <div style={{ marginTop: 12 }}>
            {invoices.map((inv, i) => (
              <div key={inv.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 0', borderTop: i > 0 ? '1px solid var(--rule)' : 'none',
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                    {inv.number ?? inv.id}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                    {new Date(inv.created * 1000).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>
                    {fmtMoney(inv.amount_paid, inv.currency)}
                  </span>
                  <span style={{
                    fontSize: 9, fontFamily: MONO, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '.12em', padding: '4px 9px', borderRadius: 999,
                    background: inv.status === 'paid' ? 'rgba(122,138,84,.12)' : 'rgba(140,138,130,.12)',
                    color: inv.status === 'paid' ? 'var(--moss)' : 'var(--muted)',
                  }}>
                    {inv.status ?? 'unknown'}
                  </span>
                  {inv.pdf_url && (
                    <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer" style={{
                      fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '.08em',
                      color: 'var(--accent)', textDecoration: 'none', textTransform: 'uppercase',
                    }}>
                      PDF
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment modal */}
      {checkout && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: 16,
          background: 'rgba(14,15,12,.6)', backdropFilter: 'blur(3px)',
        }}>
          <div style={{
            width: '100%', maxWidth: 460, background: 'var(--paper)',
            border: '1px solid var(--rule)', borderRadius: 12, overflow: 'hidden',
            boxShadow: '0 24px 60px rgba(0,0,0,.3)',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: '1px solid var(--rule)', padding: '16px 24px',
            }}>
              <span style={{ fontFamily: HEAD, fontSize: 16, fontWeight: 600 }}>
                Complete your upgrade
              </span>
              <button onClick={() => setCheckout(null)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 20, color: 'var(--muted)', lineHeight: 1,
              }}>
                &times;
              </button>
            </div>
            <Elements
              stripe={getStripePromise()}
              options={{ clientSecret: checkout.clientSecret, appearance: STRIPE_APPEARANCE }}
            >
              <PaymentForm
                planLabel={checkout.planLabel}
                priceLabel={checkout.priceLabel}
                onSuccess={handlePaymentSuccess}
                onCancel={() => setCheckout(null)}
              />
            </Elements>
          </div>
        </div>
      )}
    </div>
  );
}
