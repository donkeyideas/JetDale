'use client';

// ============================================================
// Jetdale — Account Settings
// Profile, billing, notification preferences, security.
// ============================================================

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import BillingSection from './BillingSection';

const HEAD = "'Bricolage Grotesque', sans-serif";
const MONO = "'Space Mono', monospace";

/* ---- Toggle switch ---- */
function Toggle({ on, onChange, disabled, label }: {
  on: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={on ? 'true' : 'false'}
      disabled={disabled}
      onClick={() => onChange(!on)}
      style={{
        width: 44, height: 26, borderRadius: 999, border: 'none', padding: 3,
        background: on ? 'var(--accent)' : 'var(--paper-3)',
        cursor: disabled ? 'default' : 'pointer', transition: 'background .2s',
        display: 'flex', alignItems: 'center', flexShrink: 0,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span style={{
        width: 20, height: 20, borderRadius: '50%', background: '#fff',
        transform: on ? 'translateX(18px)' : 'translateX(0)', transition: 'transform .2s',
      }} />
    </button>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const supabase = useRef(createSupabaseBrowserClient());

  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [memberSince, setMemberSince] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // Security
  const [newPassword, setNewPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    const sb = supabase.current;
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return; }
      setUserId(data.user.id);
      setEmail(data.user.email || '');
      setFullName(data.user.user_metadata?.full_name || '');

      const { data: profile } = await sb
        .from('profiles')
        .select('email_notifications, marketing_opt_in, created_at')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profile) {
        setEmailNotifications(profile.email_notifications ?? true);
        setMarketingOptIn(profile.marketing_opt_in ?? false);
        if (profile.created_at) {
          setMemberSince(new Date(profile.created_at).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
          }));
        }
      }
      setPrefsLoaded(true);
    });
  }, [router]);

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

  // Persist a preference toggle immediately to the profiles row.
  const savePref = useCallback(async (patch: Record<string, boolean>) => {
    if (!userId) return;
    await supabase.current.from('profiles').update(patch).eq('id', userId);
  }, [userId]);

  async function handlePasswordUpdate() {
    setPwMsg(null);
    if (newPassword.length < 8) {
      setPwMsg({ kind: 'err', text: 'Password must be at least 8 characters.' });
      return;
    }
    setPwSaving(true);
    const { error } = await supabase.current.auth.updateUser({ password: newPassword });
    if (error) {
      setPwMsg({ kind: 'err', text: error.message });
    } else {
      setPwMsg({ kind: 'ok', text: 'Password updated.' });
      setNewPassword('');
    }
    setPwSaving(false);
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
  const labelStyle = {
    display: 'block', fontFamily: MONO, fontSize: 10, letterSpacing: '.12em',
    textTransform: 'uppercase' as const, color: 'var(--muted)', marginBottom: 8,
  };
  const sectionTitle = {
    fontFamily: HEAD, fontSize: 22, fontWeight: 600, letterSpacing: '-.02em',
    marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12,
  };
  const focusOn = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'var(--accent)';
    e.target.style.boxShadow = '0 0 0 4px rgba(255,91,31,.12)';
  };
  const focusOff = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'var(--rule)';
    e.target.style.boxShadow = 'none';
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 32px' }}>
      {/* Header */}
      <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 24, height: 1, background: 'var(--accent)' }} />
        Account
      </div>
      <h1 style={{ fontFamily: HEAD, fontSize: 'clamp(32px, 4vw, 44px)', fontWeight: 600, letterSpacing: '-.035em', marginBottom: 8 }}>
        Settings
      </h1>
      <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 40 }}>
        Manage your profile, billing, and account preferences.
      </p>

      {/* Profile section */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={sectionTitle}>
          <span style={{ width: 20, height: 1, background: 'var(--accent)' }} />
          Profile
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          <div>
            <label style={labelStyle}>Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              style={inputStyle}
              onFocus={focusOn}
              onBlur={focusOff}
            />
          </div>

          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              disabled
              placeholder="Email"
              style={{ ...inputStyle, background: 'var(--paper-2)', color: 'var(--muted)', cursor: 'not-allowed' }}
            />
          </div>
        </div>

        {error && <p style={{ fontSize: 13, color: 'var(--accent)', marginBottom: 12 }}>{error}</p>}
        {saved && <p style={{ fontSize: 13, color: 'var(--moss)', marginBottom: 12 }}>Saved successfully.</p>}

        <button
          type="button"
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

      {/* Billing — in-portal Stripe */}
      <BillingSection />

      {/* Notifications / preferences */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={sectionTitle}>
          <span style={{ width: 20, height: 1, background: 'var(--accent)' }} />
          Notifications
        </h2>

        <div style={{ background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px' }}>
            <div style={{ paddingRight: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Account emails</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                Project updates, billing receipts, and security alerts.
              </div>
            </div>
            <Toggle
              label="Account emails"
              on={emailNotifications}
              disabled={!prefsLoaded}
              onChange={(v) => { setEmailNotifications(v); savePref({ email_notifications: v }); }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderTop: '1px solid var(--rule)' }}>
            <div style={{ paddingRight: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Product & tips</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                Occasional news, feature announcements, and planning tips.
              </div>
            </div>
            <Toggle
              label="Product and tips emails"
              on={marketingOptIn}
              disabled={!prefsLoaded}
              onChange={(v) => { setMarketingOptIn(v); savePref({ marketing_opt_in: v }); }}
            />
          </div>
        </div>
      </div>

      {/* Security */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={sectionTitle}>
          <span style={{ width: 20, height: 1, background: 'var(--accent)' }} />
          Security
        </h2>

        <label style={labelStyle}>New password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="At least 8 characters"
          style={{ ...inputStyle, marginBottom: 12 }}
          onFocus={focusOn}
          onBlur={focusOff}
        />
        {pwMsg && (
          <p style={{ fontSize: 13, marginBottom: 12, color: pwMsg.kind === 'ok' ? 'var(--moss)' : 'var(--accent)' }}>
            {pwMsg.text}
          </p>
        )}
        <button
          type="button"
          onClick={handlePasswordUpdate}
          disabled={pwSaving || !newPassword}
          style={{
            background: 'none', border: '1px solid var(--rule)', color: 'var(--ink)',
            padding: '12px 24px', borderRadius: 999, fontWeight: 600, fontSize: 14,
            cursor: pwSaving || !newPassword ? 'default' : 'pointer',
            opacity: pwSaving || !newPassword ? 0.6 : 1, transition: 'all .15s',
          }}
        >
          {pwSaving ? 'Updating...' : 'Update password'}
        </button>
      </div>

      {/* Account */}
      <div>
        <h2 style={sectionTitle}>
          <span style={{ width: 20, height: 1, background: 'var(--accent)' }} />
          Account
        </h2>

        {memberSince && (
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', marginRight: 8 }}>
              Member since
            </span>
            {memberSince}
          </div>
        )}

        <button
          type="button"
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
