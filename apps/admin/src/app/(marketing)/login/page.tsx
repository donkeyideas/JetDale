'use client';

// ============================================================
// Jetdale — Login Page
// Simple email + password login. Redirects to /dashboard.
// ============================================================

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const supabase = useRef(createSupabaseBrowserClient());

  async function handleSubmit() {
    setError('');
    if (!email.trim() || !password.trim()) { setError('Email and password are required.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);

    try {
      if (isSignup) {
        const { error } = await supabase.current.auth.signUp({ email, password });
        if (error) { setError(error.message); setLoading(false); return; }
      } else {
        const { error } = await supabase.current.auth.signInWithPassword({ email, password });
        if (error) { setError(error.message); setLoading(false); return; }
      }
      router.push('/dashboard');
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 200px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 32px' }}>
      <div style={{ maxWidth: 420, width: '100%' }}>
        {/* Header */}
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 24, height: 1, background: 'var(--accent)' }} />
          {isSignup ? 'Get started' : 'Welcome back'}
        </div>

        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 600, letterSpacing: '-.035em', lineHeight: 1.1, marginBottom: 12 }}>
          {isSignup ? 'Create your account' : 'Log in to Jetdale'}
        </h1>
        <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 36 }}>
          {isSignup
            ? 'Sign up to start planning your next project.'
            : 'Access your projects, workspace, and planning documents.'}
        </p>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            style={{
              width: '100%', background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 10,
              padding: '16px 20px', fontSize: 15, outline: 'none', fontFamily: 'inherit',
              transition: 'border-color .2s, box-shadow .2s',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 4px rgba(255,91,31,.12)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--rule)'; e.target.style.boxShadow = 'none'; }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            style={{
              width: '100%', background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 10,
              padding: '16px 20px', fontSize: 15, outline: 'none', fontFamily: 'inherit',
              transition: 'border-color .2s, box-shadow .2s',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 4px rgba(255,91,31,.12)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--rule)'; e.target.style.boxShadow = 'none'; }}
          />
        </div>

        {/* Error */}
        {error && (
          <p style={{ fontSize: 13, color: 'var(--accent)', marginBottom: 16 }}>{error}</p>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: loading ? 'var(--paper-3)' : 'var(--ink)',
            color: loading ? 'var(--muted)' : 'var(--paper)',
            padding: '16px 24px', borderRadius: 999, fontWeight: 600, fontSize: 15, border: 'none',
            cursor: loading ? 'default' : 'pointer', transition: 'all .2s',
          }}
        >
          {loading
            ? (isSignup ? 'Creating account...' : 'Logging in...')
            : (isSignup ? 'Create account' : 'Log in')}
          {!loading && (
            <span style={{ width: 22, height: 22, background: 'var(--accent)', color: 'white', borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 11 }}>&rarr;</span>
          )}
        </button>

        {/* Toggle */}
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: 24 }}>
          {isSignup ? 'Already have an account? ' : "Don\u2019t have an account? "}
          <button
            onClick={() => { setIsSignup(!isSignup); setError(''); }}
            style={{ color: 'var(--accent)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, textDecoration: 'underline', textUnderlineOffset: 3 }}
          >
            {isSignup ? 'Log in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  );
}
