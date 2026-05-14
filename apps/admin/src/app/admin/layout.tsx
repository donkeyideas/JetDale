// ============================================================
// Jetdale Admin — Layout
// 2-col grid: 240px dark sidebar + fluid main area.
// Auth-guarded: verifies admin role on mount.
// ============================================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { adminFetch } from '@/lib/admin-fetch';
import type { AdminUser } from '@/lib/admin-auth';
import type { SidebarCounts } from '@/lib/admin-types';
import s from './admin.module.css';

/* ── Sidebar nav config ──────────────────────────────────────── */

type NavItem = {
  label: string;
  href: string;
  pillKey?: keyof SidebarCounts;
};

type NavSection = {
  heading: string;
  items: NavItem[];
};

const NAV: NavSection[] = [
  {
    heading: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin' },
      { label: 'Revenue', href: '/admin/revenue', pillKey: 'mrr' },
      { label: 'Subscriptions', href: '/admin/subscriptions' },
      { label: 'Cohorts', href: '/admin/cohorts' },
      { label: 'Funnel', href: '/admin/funnel' },
    ],
  },
  {
    heading: 'Users',
    items: [
      { label: 'All Users', href: '/admin/users', pillKey: 'users' },
      { label: 'Projects', href: '/admin/projects', pillKey: 'projects' },
      { label: 'Archetypes', href: '/admin/archetypes' },
    ],
  },
  {
    heading: 'Product',
    items: [
      { label: 'AI Logs', href: '/admin/ai-logs' },
      { label: 'Exports', href: '/admin/exports' },
      { label: 'Feature Flags', href: '/admin/feature-flags', pillKey: 'flags' },
    ],
  },
  {
    heading: 'Content',
    items: [
      { label: 'Blog & Guides', href: '/admin/blog' },
      { label: 'Content Manager', href: '/admin/content' },
      { label: 'Email Templates', href: '/admin/email-templates' },
      { label: 'Social Posts', href: '/admin/social-posts' },
    ],
  },
  {
    heading: 'Intelligence',
    items: [
      { label: 'AI Analytics', href: '/admin/ai-analytics' },
      { label: 'AI Intelligence', href: '/admin/ai-intelligence' },
      { label: 'Platform Analytics', href: '/admin/platform-analytics' },
      { label: 'Data Intelligence', href: '/admin/data-intelligence' },
      { label: 'API Management', href: '/admin/api-management' },
    ],
  },
  {
    heading: 'System',
    items: [
      { label: 'Audit Trail', href: '/admin/audit' },
      { label: 'System Health', href: '/admin/system' },
    ],
  },
];

/* ── Icons (inline SVG for zero-dep) ─────────────────────────── */

function SideIcon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    Dashboard: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="1" width="6" height="6" rx="1" />
        <rect x="9" y="1" width="6" height="6" rx="1" />
        <rect x="1" y="9" width="6" height="6" rx="1" />
        <rect x="9" y="9" width="6" height="6" rx="1" />
      </svg>
    ),
    Revenue: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 14L5 8L8 11L15 2" />
      </svg>
    ),
    Cohorts: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="1" width="4" height="4" rx="0.5" /><rect x="6" y="1" width="4" height="4" rx="0.5" /><rect x="11" y="1" width="4" height="4" rx="0.5" />
        <rect x="1" y="6" width="4" height="4" rx="0.5" /><rect x="6" y="6" width="4" height="4" rx="0.5" />
        <rect x="1" y="11" width="4" height="4" rx="0.5" />
      </svg>
    ),
    Funnel: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 2h14L10 8v5l-4 2V8L1 2z" />
      </svg>
    ),
    'All Users': (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="5" r="3" /><path d="M2 15c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      </svg>
    ),
    Projects: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 4l7-3 7 3v8l-7 3-7-3V4z" /><path d="M1 4l7 3 7-3" /><path d="M8 7v8" />
      </svg>
    ),
    Archetypes: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="6" /><circle cx="8" cy="8" r="2" /><path d="M8 2v4" /><path d="M8 10v4" /><path d="M2 8h4" /><path d="M10 8h4" />
      </svg>
    ),
    'AI Logs': (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="12" height="12" rx="2" /><path d="M5 6h6" /><path d="M5 8.5h4" /><path d="M5 11h2" />
      </svg>
    ),
    Exports: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 2v8" /><path d="M5 7l3 3 3-3" /><path d="M2 12v2h12v-2" />
      </svg>
    ),
    'Feature Flags': (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 2v12" /><path d="M2 2h10l-3 4 3 4H2" />
      </svg>
    ),
    'Audit Trail': (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="6" /><path d="M8 4v4l3 3" />
      </svg>
    ),
    'System Health': (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 8h3l2-5 2 10 2-5h5" />
      </svg>
    ),
    Subscriptions: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="14" height="10" rx="2" /><path d="M1 7h14" /><path d="M4 10h3" />
      </svg>
    ),
    'Blog & Guides': (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 1h8l4 4v10H2V1z" /><path d="M10 1v4h4" /><path d="M5 8h6" /><path d="M5 11h4" />
      </svg>
    ),
    'Content Manager': (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="12" height="12" rx="2" /><path d="M2 6h12" /><path d="M6 6v8" />
      </svg>
    ),
    'Email Templates': (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="14" height="10" rx="1.5" /><path d="M1 4l7 5 7-5" />
      </svg>
    ),
    'Social Posts': (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 1l-7 7" /><path d="M15 1l-5 14-2-6-6-2z" />
      </svg>
    ),
    'AI Analytics': (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="10" width="3" height="5" rx="0.5" /><rect x="6" y="6" width="3" height="9" rx="0.5" /><rect x="11" y="2" width="3" height="13" rx="0.5" />
      </svg>
    ),
    'AI Intelligence': (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="3" /><path d="M8 1v2" /><path d="M8 13v2" /><path d="M1 8h2" /><path d="M13 8h2" /><path d="M3 3l1.5 1.5" /><path d="M11.5 11.5L13 13" /><path d="M3 13l1.5-1.5" /><path d="M11.5 4.5L13 3" />
      </svg>
    ),
    'Platform Analytics': (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="6" /><path d="M8 2v6l4 4" />
      </svg>
    ),
    'Data Intelligence': (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="8" cy="4" rx="6" ry="2.5" /><path d="M2 4v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V4" /><path d="M2 8v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V8" />
      </svg>
    ),
    'API Management': (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h8v8H4z" /><path d="M6 1v3" /><path d="M10 1v3" /><path d="M6 12v3" /><path d="M10 12v3" /><path d="M1 6h3" /><path d="M1 10h3" /><path d="M12 6h3" /><path d="M12 10h3" />
      </svg>
    ),
  };

  return <span className={s.sideItemIcon}>{icons[name] ?? null}</span>;
}

/* ── Layout Component ────────────────────────────────────────── */

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [counts, setCounts] = useState<SidebarCounts | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'denied'>('loading');

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setStatus('denied'); return; }

        const me = await adminFetch<AdminUser>('/api/admin/me');
        if (cancelled) return;
        setAdmin(me);
        setStatus('ok');

        const sc = await adminFetch<SidebarCounts>('/api/admin/sidebar-counts');
        if (!cancelled) setCounts(sc);
      } catch {
        if (!cancelled) setStatus('denied');
      }
    }
    check();
    return () => { cancelled = true; };
  }, []);

  if (status === 'loading') {
    return (
      <div className={s.adminGrid}>
        <aside className={s.sidebar}>
          <div className={s.brand}>Jetdale Admin</div>
          <div style={{ padding: '1rem', opacity: 0.5, fontSize: '0.85rem' }}>Loading…</div>
        </aside>
        <main className={s.main} />
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'var(--font-body, sans-serif)' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Access Denied</h1>
          <p style={{ opacity: 0.6 }}>You must be an admin to view this page.</p>
          <a href="/" style={{ color: '#FF5B1F', marginTop: '1rem', display: 'inline-block' }}>← Back to Jetdale</a>
        </div>
      </div>
    );
  }

  const initials = admin?.full_name
    ? admin.full_name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : admin?.email?.slice(0, 2).toUpperCase() ?? '??';

  return (
    <div className={s.adminGrid}>
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className={s.sidebar}>
        <div className={s.brand}>Jetdale Admin</div>

        <nav className={s.sideNav}>
          {NAV.map((section) => (
            <div key={section.heading}>
              <div className={s.sideSection}>{section.heading}</div>
              {section.items.map((item) => {
                const isActive =
                  item.href === '/admin'
                    ? pathname === '/admin' || pathname === '/admin/'
                    : pathname.startsWith(item.href);
                const pill = item.pillKey && counts
                  ? String(counts[item.pillKey])
                  : undefined;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${s.sideItem} ${isActive ? s.sideItemActive : ''}`}
                  >
                    <span className={s.sideItemLabel}>
                      <SideIcon name={item.label} />
                      {item.label}
                    </span>
                    {pill && <span className={s.pill}>{pill}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* ── User Card ───────────────────────────────────────── */}
        <div className={s.userCard}>
          <div className={s.userAvatar}>{initials}</div>
          <div className={s.userInfo}>
            <span className={s.userName}>{admin?.full_name ?? admin?.email ?? 'Admin'}</span>
            <span className={s.userRole}>Super Admin</span>
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <main className={s.main}>{children}</main>
    </div>
  );
}
