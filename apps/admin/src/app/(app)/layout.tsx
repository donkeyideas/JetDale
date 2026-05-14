'use client';

// ============================================================
// Jetdale — App Layout (Dashboard / Workspace)
// Nav: logo, app tabs, + New project CTA, user avatar
// ============================================================

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import s from './layout.module.css';

const NAV_TABS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/new', label: 'New project' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const supabase = useRef(createSupabaseBrowserClient());

  useEffect(() => {
    supabase.current.auth.getUser().then(({ data }) => {
      if (data.user?.email) setUserEmail(data.user.email);
    });
  }, []);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const initials = userEmail
    ? userEmail.charAt(0).toUpperCase()
    : '?';

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/new') return pathname === '/new';
    return pathname.startsWith(href);
  }

  async function handleLogout() {
    await supabase.current.auth.signOut();
    router.push('/');
  }

  return (
    <div className={s.page}>
      <nav className={s.nav}>
        <div className={s.navInner}>
          <Link href="/dashboard" className={s.logo}>
            <div className={s.logoMark} />
            Jetdale
          </Link>

          <div className={s.navTabs}>
            {NAV_TABS.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={isActive(tab.href) ? s.navTabActive : s.navTab}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          {/* Right side: user avatar */}
          <div className={s.navRight}>
            <div ref={menuRef} className={s.userMenu}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={s.avatar}
                title={userEmail || 'Account'}
              >
                {initials}
              </button>
              {menuOpen && (
                <div className={s.dropdown}>
                  {userEmail && (
                    <div className={s.dropdownEmail}>{userEmail}</div>
                  )}
                  <Link href="/account" className={s.dropdownItem} onClick={() => setMenuOpen(false)}>
                    Account settings
                  </Link>
                  <Link href="/dashboard" className={s.dropdownItem} onClick={() => setMenuOpen(false)}>
                    Dashboard
                  </Link>
                  <button onClick={handleLogout} className={s.dropdownItem} style={{ color: 'var(--accent)' }}>
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {children}
    </div>
  );
}
