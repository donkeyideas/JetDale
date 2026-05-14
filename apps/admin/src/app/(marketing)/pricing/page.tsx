'use client';

// ============================================================
// Jetdale — Pricing Page (Dynamic)
// Fetches plan configs from /api/pricing, falls back to defaults.
// ============================================================

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Plan = 'monthly' | 'annual';

type PlanData = {
  tier: string;
  name: string;
  description: string | null;
  monthly_price_cents: number;
  annual_price_cents: number;
  is_featured: boolean;
  features: Array<{ feature: string; value: string }>;
  cta_text: string;
  cta_url: string;
};

const DEFAULT_FEATURES = [
  { feature: 'Projects per month', free: '1', pro: 'Unlimited' },
  { feature: 'Artifacts per project', free: '5', pro: 'Unlimited' },
  { feature: 'Export formats', free: 'Markdown only', pro: 'All 9 formats' },
  { feature: 'Reality checks', free: '1/month', pro: 'Unlimited' },
  { feature: 'Voice input', free: '10 min/month', pro: '4 hours/month' },
  { feature: 'Chat messages', free: '10/day', pro: '200/day' },
  { feature: 'AI model', free: 'Flash', pro: 'Flash + Pro' },
];

function dollars(cents: number) {
  return `$${Math.round(cents / 100)}`;
}

export default function PricingPage() {
  const [billing, setBilling] = useState<Plan>('annual');
  const [plans, setPlans] = useState<PlanData[]>([]);

  useEffect(() => {
    fetch('/api/pricing')
      .then((r) => r.json())
      .then((data) => { if (data.plans?.length) setPlans(data.plans); })
      .catch(() => {});
  }, []);

  const freePlan = plans.find((p) => p.tier === 'free');
  const proPlan = plans.find((p) => p.is_featured || p.tier === 'pro');

  // Dynamic prices (fallback to original hardcoded values)
  const freeDesc = freePlan?.description ?? 'Perfect for trying Jetdale on a single project. No credit card required.';
  const proDesc = proPlan?.description ?? 'Unlimited projects, all export formats, voice input, reality checks.';
  const proMonthly = proPlan?.monthly_price_cents ?? 4900;
  const proAnnual = proPlan?.annual_price_cents ?? 39000;
  const monthlyEquiv = proAnnual > 0 ? Math.round(proAnnual / 12 / 100 * 100) / 100 : 0;
  const savePct = proMonthly > 0 ? Math.round((1 - proAnnual / 12 / proMonthly) * 100) : 0;
  const freeCta = freePlan?.cta_text ?? 'Get started free';
  const proCta = proPlan?.cta_text ?? 'Subscribe to Pro';
  const freeUrl = freePlan?.cta_url ?? '/start';
  const proUrl = proPlan?.cta_url ?? '/start';

  // Feature comparison
  const FEATURES = (freePlan && proPlan)
    ? freePlan.features.map((f) => {
        const proF = proPlan.features.find((pf) => pf.feature === f.feature);
        return { feature: f.feature, free: f.value, pro: proF?.value ?? '—' };
      })
    : DEFAULT_FEATURES;

  return (
    <div>
      {/* Hero */}
      <section
        style={{
          maxWidth: 1400,
          margin: '0 auto',
          padding: '80px 32px 40px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 32,
          }}
        >
          <span style={{ width: 32, height: 1, background: 'var(--accent)', display: 'inline-block' }} />
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.15em',
              color: 'var(--accent)',
            }}
          >
            Pricing
          </span>
          <span style={{ width: 32, height: 1, background: 'var(--accent)', display: 'inline-block' }} />
        </div>

        <h1
          style={{
            fontFamily: "'Bricolage Grotesque', -apple-system, sans-serif",
            fontSize: 'clamp(36px, 5vw, 64px)',
            fontWeight: 600,
            letterSpacing: '-0.035em',
            lineHeight: 1.05,
            marginBottom: 16,
          }}
        >
          Simple, transparent pricing
        </h1>

        <p
          style={{
            fontSize: 18,
            color: 'var(--muted)',
            maxWidth: 500,
            margin: '0 auto 48px',
            lineHeight: 1.6,
          }}
        >
          Start free. Upgrade when you need unlimited projects, all export formats, and advanced AI.
        </p>

        {/* Billing toggle */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: 'var(--paper-2)',
            borderRadius: 100,
            padding: 4,
            marginBottom: 64,
          }}
        >
          <button
            onClick={() => setBilling('monthly')}
            style={{
              fontFamily: "'Manrope', -apple-system, sans-serif",
              fontSize: 14,
              fontWeight: 500,
              padding: '10px 24px',
              borderRadius: 100,
              border: 'none',
              cursor: 'pointer',
              background: billing === 'monthly' ? 'var(--ink)' : 'transparent',
              color: billing === 'monthly' ? 'var(--paper)' : 'var(--muted)',
              transition: 'all 0.2s ease',
            }}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling('annual')}
            style={{
              fontFamily: "'Manrope', -apple-system, sans-serif",
              fontSize: 14,
              fontWeight: 500,
              padding: '10px 24px',
              borderRadius: 100,
              border: 'none',
              cursor: 'pointer',
              background: billing === 'annual' ? 'var(--ink)' : 'transparent',
              color: billing === 'annual' ? 'var(--paper)' : 'var(--muted)',
              transition: 'all 0.2s ease',
            }}
          >
            Annual
            <span
              style={{
                display: 'inline-block',
                marginLeft: 8,
                fontFamily: "'Space Mono', monospace",
                fontSize: 10,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.1em',
                color: 'var(--accent)',
                fontWeight: 700,
              }}
            >
              {savePct > 0 ? `Save ${savePct}%` : 'Save'}
            </span>
          </button>
        </div>
      </section>

      {/* Plan cards */}
      <section
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '0 32px 80px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 24,
        }}
      >
        {/* Free */}
        <div
          style={{
            background: 'var(--paper-2)',
            border: '1px solid var(--paper-3)',
            borderRadius: 16,
            padding: 36,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.15em',
              color: 'var(--muted)',
              marginBottom: 12,
            }}
          >
            Free
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
            <span
              style={{
                fontFamily: "'Bricolage Grotesque', -apple-system, sans-serif",
                fontSize: 48,
                fontWeight: 700,
                letterSpacing: '-0.035em',
                lineHeight: 1,
              }}
            >
              $0
            </span>
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>/month</span>
          </div>
          <p
            style={{
              fontSize: 14,
              color: 'var(--muted)',
              lineHeight: 1.5,
              marginBottom: 28,
              flex: 1,
            }}
          >
            {freeDesc}
          </p>
          <Link
            href={freeUrl}
            style={{
              display: 'block',
              textAlign: 'center',
              fontFamily: "'Manrope', -apple-system, sans-serif",
              fontSize: 14,
              fontWeight: 600,
              padding: '14px 24px',
              borderRadius: 100,
              border: '1px solid var(--paper-3)',
              color: 'var(--ink)',
              textDecoration: 'none',
              transition: 'border-color 0.2s ease',
            }}
          >
            {freeCta}
          </Link>
        </div>

        {/* Pro */}
        <div
          style={{
            background: 'var(--ink)',
            color: 'var(--paper)',
            borderRadius: 16,
            padding: 36,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -12,
              right: 24,
              background: 'var(--accent)',
              color: 'var(--white)',
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.1em',
              padding: '4px 12px',
              borderRadius: 100,
            }}
          >
            {billing === 'annual' && savePct > 0 ? `Save ${savePct}%` : 'Most popular'}
          </div>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.15em',
              color: 'var(--muted)',
              marginBottom: 12,
            }}
          >
            {billing === 'annual' ? `${proPlan?.name ?? 'Pro'} Annual` : `${proPlan?.name ?? 'Pro'} Monthly`}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
            <span
              style={{
                fontFamily: "'Bricolage Grotesque', -apple-system, sans-serif",
                fontSize: 48,
                fontWeight: 700,
                letterSpacing: '-0.035em',
                lineHeight: 1,
              }}
            >
              {billing === 'annual' ? dollars(proAnnual) : dollars(proMonthly)}
            </span>
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>
              {billing === 'annual' ? '/year' : '/month'}
            </span>
          </div>
          <p
            style={{
              fontSize: 14,
              color: 'var(--muted)',
              lineHeight: 1.5,
              marginBottom: 28,
              flex: 1,
            }}
          >
            {billing === 'annual'
              ? `Everything in monthly, billed annually at $${monthlyEquiv.toFixed(2)}/month.`
              : proDesc}
          </p>
          <Link
            href={proUrl}
            style={{
              display: 'block',
              textAlign: 'center',
              fontFamily: "'Manrope', -apple-system, sans-serif",
              fontSize: 14,
              fontWeight: 600,
              padding: '14px 24px',
              borderRadius: 100,
              background: 'var(--accent)',
              color: 'var(--white)',
              textDecoration: 'none',
              transition: 'background 0.2s ease, transform 0.15s ease',
            }}
          >
            {proCta}
          </Link>
        </div>
      </section>

      {/* Feature comparison table */}
      <section
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: '0 32px 100px',
        }}
      >
        <h2
          style={{
            fontFamily: "'Bricolage Grotesque', -apple-system, sans-serif",
            fontSize: 32,
            fontWeight: 600,
            letterSpacing: '-0.035em',
            lineHeight: 1.1,
            marginBottom: 40,
            textAlign: 'center',
          }}
        >
          Compare plans
        </h2>

        <div
          style={{
            borderRadius: 12,
            border: '1px solid var(--paper-3)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr',
              background: 'var(--ink)',
              padding: '16px 24px',
            }}
          >
            <span
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.15em',
                color: 'var(--paper)',
                fontWeight: 700,
              }}
            >
              Feature
            </span>
            <span
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.15em',
                color: 'var(--paper)',
                fontWeight: 700,
              }}
            >
              {freePlan?.name ?? 'Free'}
            </span>
            <span
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.15em',
                color: 'var(--accent)',
                fontWeight: 700,
              }}
            >
              {proPlan?.name ?? 'Pro'}
            </span>
          </div>

          {/* Rows */}
          {FEATURES.map((row, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr',
                padding: '16px 24px',
                borderBottom: i < FEATURES.length - 1 ? '1px solid var(--paper-3)' : 'none',
                background: i % 2 === 0 ? 'var(--paper)' : 'var(--paper-2)',
              }}
            >
              <span
                style={{
                  fontFamily: "'Manrope', -apple-system, sans-serif",
                  fontSize: 14,
                  color: 'var(--ink)',
                  fontWeight: 500,
                }}
              >
                {row.feature}
              </span>
              <span
                style={{
                  fontFamily: "'Manrope', -apple-system, sans-serif",
                  fontSize: 14,
                  color: 'var(--muted)',
                }}
              >
                {row.free}
              </span>
              <span
                style={{
                  fontFamily: "'Manrope', -apple-system, sans-serif",
                  fontSize: 14,
                  color: 'var(--ink)',
                  fontWeight: 600,
                }}
              >
                {row.pro}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
