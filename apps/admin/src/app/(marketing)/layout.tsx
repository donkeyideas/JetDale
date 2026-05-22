'use client';

// ============================================================
// Jetdale — Marketing Layout
// Shared nav (pill tabs) + footer for all marketing pages.
// Matches the homepage nav/footer exactly.
// ============================================================

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import s from './layout.module.css';

const NAV_TABS = [
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/use-cases', label: 'Use Cases' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/blog', label: 'Blog' },
  { href: '/about', label: 'About' },
];

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={s.page}>
      {/* ======== NAV ======== */}
      <nav className={s.nav}>
        <div className={s.navInner}>
          <Link href="/" className={s.logo}>
            <div className={s.logoMark} />
            Jetdale
          </Link>

          <div className={s.navTabs}>
            {NAV_TABS.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={pathname === tab.href ? s.navTabActive : s.navTab}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          <div className={s.navActions}>
            <Link href="/login" className={s.navLogin}>Log in</Link>
            <Link href="/start" className={s.navCta}>Start a Project</Link>
          </div>

          <button
            type="button"
            className={s.hamburger}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span /><span /><span />
          </button>
        </div>

        {menuOpen && (
          <div className={s.mobileMenu}>
            {NAV_TABS.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={s.mobileMenuItem}
                onClick={() => setMenuOpen(false)}
              >
                {tab.label}
              </Link>
            ))}
            <Link href="/login" className={s.mobileMenuItem} onClick={() => setMenuOpen(false)}>
              Log in
            </Link>
            <Link href="/start" className={s.mobileMenuCta} onClick={() => setMenuOpen(false)}>
              Start a Project
            </Link>
          </div>
        )}
      </nav>

      {/* ======== CONTENT ======== */}
      {children}

      {/* ======== FOOTER ======== */}
      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div>
            <div className={s.footerBrand}>Jetdale.</div>
            <div className={s.footerTagline}>PLAN BEFORE YOU BUILD.</div>
          </div>
        </div>
        <div className={s.footerMeta}>
          <Link href="/pricing">Pricing</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <span>&copy; 2026 Jetdale</span>
        </div>
      </footer>
    </div>
  );
}
