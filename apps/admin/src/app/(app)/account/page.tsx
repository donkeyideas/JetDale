'use client';

// ============================================================
// Jetdale — Account Settings
// User profile, subscription, and account management.
// ============================================================

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

type SubInfo = {
  plan_tier: string;
  status: string;
  amount_cents: number;
  interval: string | null;
  current_period_end: string | null;
};

type PlanInfo = {
  tier: string;
  name: string;
  monthly_price_cents: number;
  annual_price_cents: number;
};

export default function AccountPage() {
  const router = useRouter();
  const supabase = useRef(createSupabaseBrowserClient());

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [sub, setSub] = useState<SubInfo | null>(null);
  const [planName, setPlanName] = useState('Free');
  const [planPrice, setPlanPrice] = useState('$0/month');

  useEffect(() => {
    const sb = supabase.current;
    sb.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return; }
      setEmail(data.user.email || '');
      setFullName(data.user.user_metadata?.full_name || '');

      // Fetch subscription
      sb.from('subscriptions')
        .select('plan_tier, status, amount_cents, interval, current_period_end')
        .eq('user_id', data.user.id)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data: subData }) => {
          if (subData) setSub(subData as SubInfo);
        });
    });

    // Fetch plan configs for display names
    fetch('/api/pricing')
      .then((r) => r.json())
      .then((data) => {
        if (data.plans) {
          const plans = data.plans as PlanInfo[];
          // Will be matched when sub loads
          setPlanConfigs(plans);
        }
      })
      .catch(() => {});
  }, [router]);

  const [planConfigs, setPlanConfigs] = useState<PlanInfo[]>([]);

  // Derive display values when sub or configs change
  useEffect(() => {
    if (sub && planConfigs.length > 0) {
      const config = planConfigs.find((p) => p.tier === sub.plan_tier);
      setPlanName(config?.name ?? sub.plan_tier.charAt(0).toUpperCase() + sub.plan_tier.slice(1));
      const price = sub.interval === 'year'
        ? `$${Math.round((config?.annual_price_cents ?? sub.amount_cents) / 100)}/year`
        : `$${Math.round((config?.monthly_price_cents ?? sub.amount_cents) / 100)}/month`;
      setPlanPrice(price);
    } else if (!sub) {
      setPlanName('Free');
      setPlanPrice('$0/month');
    }
  }, [sub, planConfigs]);

  async function handleSave() {
    setError('');
    setSaving(true);
    setSaved(false);

    const { error } = await supabase.current.auth.updateUser({
      data: { full_name: fullName },
    });

    if (error) {
      setError(error.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  async function handleLogout() {
    await supabase.current.auth.signOut();
    router.push('/');
  }

  const inputStyle = {
    width: '100%', background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 10,
    padding: '14px 18px', fontSize: 15, outline: 'none', fontFamily: 'inherit',
    transition: 'border-color .2s, box-shadow .2s',
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 32px' }}>
      {/* Header */}
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 24, height: 1, background: 'var(--accent)' }} />
        Account
      </div>
      <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(32px, 4vw, 44px)', fontWeight: 600, letterSpacing: '-.035em', marginBottom: 8 }}>
        Settings
      </h1>
      <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 40 }}>
        Manage your profile and account preferences.
      </p>

      {/* Profile section */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 600, letterSpacing: '-.02em', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 20, height: 1, background: 'var(--accent)' }} />
          Profile
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          <div>
            <label style={{ display: 'block', fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
              Full name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 4px rgba(255,91,31,.12)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--rule)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              disabled
              style={{ ...inputStyle, background: 'var(--paper-2)', color: 'var(--muted)', cursor: 'not-allowed' }}
            />
          </div>
        </div>

        {error && <p style={{ fontSize: 13, color: 'var(--accent)', marginBottom: 12 }}>{error}</p>}
        {saved && <p style={{ fontSize: 13, color: 'var(--moss)', marginBottom: 12 }}>Saved successfully.</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: saving ? 'var(--paper-3)' : 'var(--ink)',
            color: saving ? 'var(--muted)' : 'var(--paper)',
            padding: '12px 24px', borderRadius: 999, fontWeight: 600, fontSize: 14,
            border: 'none', cursor: saving ? 'default' : 'pointer', transition: 'all .2s',
          }}
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>

      {/* Subscription section */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 600, letterSpacing: '-.02em', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 20, height: 1, background: 'var(--accent)' }} />
          Subscription
        </h2>

        <div style={{
          background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 10,
          padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 16,
        }}>
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
              Current plan
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              {planName}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
              {sub ? (
                <>
                  {planPrice}
                  {sub.status === 'trialing' && <span style={{ marginLeft: 8, color: 'var(--gold)' }}>(Trial)</span>}
                  {sub.current_period_end && (
                    <span style={{ marginLeft: 8 }}>
                      · Renews {new Date(sub.current_period_end).toLocaleDateString()}
                    </span>
                  )}
                </>
              ) : (
                'Unlimited projects during beta.'
              )}
            </div>
          </div>
          {sub && sub.plan_tier !== 'free' ? (
            <button
              onClick={() => router.push('/pricing')}
              style={{
                background: 'none', color: 'var(--ink)', padding: '12px 24px',
                borderRadius: 999, fontWeight: 600, fontSize: 14, border: '1px solid var(--rule)',
                cursor: 'pointer', transition: 'transform .15s',
              }}
            >
              Manage Plan
            </button>
          ) : (
            <button
              onClick={() => router.push('/pricing')}
              style={{
                background: 'var(--accent)', color: 'white', padding: '12px 24px',
                borderRadius: 999, fontWeight: 600, fontSize: 14, border: 'none',
                cursor: 'pointer', transition: 'transform .15s',
              }}
            >
              Upgrade
            </button>
          )}
        </div>
      </div>

      {/* Danger zone */}
      <div>
        <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 600, letterSpacing: '-.02em', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 20, height: 1, background: 'var(--accent)' }} />
          Account
        </h2>

        <button
          onClick={handleLogout}
          style={{
            background: 'none', border: '1px solid var(--rule)', color: 'var(--ink)',
            padding: '12px 24px', borderRadius: 999, fontWeight: 600, fontSize: 14,
            cursor: 'pointer', transition: 'all .15s',
          }}
        >
          Log out
        </button>
      </div>
    </div>
  );
}
