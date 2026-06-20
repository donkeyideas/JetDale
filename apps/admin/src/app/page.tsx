'use client';

// ============================================================
// Jetdale — Marketing Landing Page
// Exact replica of the HTML mockup content and layout.
// ============================================================

import Link from 'next/link';
import Script from 'next/script';
import s from './page.module.css';

const LD_ORG = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Jetdale',
  url: 'https://jetdale.com',
  description: 'AI-powered project planning platform that turns ideas into world-class build plans.',
};

const LD_WEB = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Jetdale',
  url: 'https://jetdale.com',
  description: 'Plan before you build. AI-powered project planning.',
};

const LD_APP = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Jetdale',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: 'https://jetdale.com',
  description: 'AI-powered project planning tool that generates vision documents, scope documents, roadmaps, wireframes, risk registers, and build-ready prompts.',
  offers: [
    { '@type': 'Offer', price: '0', priceCurrency: 'USD', name: 'Free' },
    { '@type': 'Offer', price: '49', priceCurrency: 'USD', name: 'Pro' },
  ],
};

export default function HomePage() {
  return (
    <div className={s.page}>
      {/* Structured Data for SEO/AEO/GEO */}
      <Script id="ld-org" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(LD_ORG) }} />
      <Script id="ld-web" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(LD_WEB) }} />
      <Script id="ld-app" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(LD_APP) }} />
      {/* ======== NAV ======== */}
      <nav className={s.nav}>
        <div className={s.navInner}>
          <Link href="/" className={s.logo}>
            <div className={s.logoMark} />
            Jetdale
          </Link>

          <div className={s.navTabs}>
            <Link href="/how-it-works" className={s.navTab}>How It Works</Link>
            <Link href="/use-cases" className={s.navTab}>Use Cases</Link>
            <Link href="/pricing" className={s.navTab}>Pricing</Link>
            <Link href="/blog" className={s.navTab}>Blog</Link>
            <Link href="/about" className={s.navTab}>About</Link>
          </div>

          <div className={s.navActions}>
            <Link href="/login" className={s.navLogin}>Log in</Link>
            <Link href="/start" className={s.navCta}>Start a Project</Link>
          </div>
        </div>
      </nav>

      {/* ======== HERO ======== */}
      <section className={s.hero}>
        <div className={s.heroEyebrow}>The AI Project Architect / v1.0</div>
        <h1 className={s.heroTitle}>
          Anyone can <span className={s.light}>build</span> with AI.<br />
          Almost no one can <span className={s.underline}>plan</span> with it.
        </h1>

        <div className={s.heroMeta}>
          <p className={s.heroLead}>
            Jetdale turns a one-sentence idea into a world-class build plan — vision, scope, roadmap, mockups, risks, and AI-ready prompts. Ship the right thing, not the first thing.
          </p>
          <div className={s.heroStat}>
            <div className={s.heroStatNum}>5</div>
            <div className={s.heroStatLabel}>Launch Archetypes</div>
          </div>
          <div className={s.heroStat}>
            <div className={s.heroStatNum}>17</div>
            <div className={s.heroStatLabel}>Planning Documents</div>
          </div>
        </div>

        <div className={s.heroCtas}>
          <Link href="/start" className={s.btnPrimary}>
            Start your project <span className={s.arrow}>&rarr;</span>
          </Link>
          <Link href="/how-it-works" className={s.btnGhost}>See how it works</Link>
        </div>
      </section>

      {/* ======== MARQUEE ======== */}
      <div className={s.marquee}>
        <div className={s.marqueeTrack}>
          <span>Plan before you build <span className={s.dot} /> Plan before you build <span className={s.dot} /> Plan before you build <span className={s.dot} /> Plan before you build <span className={s.dot} /></span>
          <span>Plan before you build <span className={s.dot} /> Plan before you build <span className={s.dot} /> Plan before you build <span className={s.dot} /> Plan before you build <span className={s.dot} /></span>
        </div>
      </div>

      {/* ======== PROBLEM SECTION (01) ======== */}
      <section className={s.section} id="how-it-works">
        <div className={s.sectionLabel}>The Problem / 01</div>
        <div className={s.problemGrid}>
          <h2 className={s.problemTitle}>Most projects fail before a single line is written.</h2>
          <div className={s.problemList}>
            <div className={s.problemItem}>
              <div className={s.problemNum}>01</div>
              <div className={s.problemText}>AI builds whatever you ask, even when what you asked is wrong.</div>
              <div className={s.problemTag}>Scope drift</div>
            </div>
            <div className={s.problemItem}>
              <div className={s.problemNum}>02</div>
              <div className={s.problemText}>No vision document. No personas. No success metrics.</div>
              <div className={s.problemTag}>Missing foundation</div>
            </div>
            <div className={s.problemItem}>
              <div className={s.problemNum}>03</div>
              <div className={s.problemText}>Generic PM tools are empty boards. They assume you already know.</div>
              <div className={s.problemTag}>Blank canvas</div>
            </div>
            <div className={s.problemItem}>
              <div className={s.problemNum}>04</div>
              <div className={s.problemText}>No one tells you the timeline is delusional or the budget is half.</div>
              <div className={s.problemTag}>No reality check</div>
            </div>
            <div className={s.problemItem}>
              <div className={s.problemNum}>05</div>
              <div className={s.problemText}>You hire a developer. They ask the questions you never answered.</div>
              <div className={s.problemTag}>Costly handoff</div>
            </div>
          </div>
        </div>
      </section>

      {/* ======== FLOW SECTION (dark) ======== */}
      <section className={s.flow}>
        <div className={s.flowInner}>
          <div className={s.flowHeader}>
            <h2 className={s.flowTitle}>From <em>idea</em> to <em>ready-to-build</em> in under an hour.</h2>
            <p className={s.flowSub}>Seven steps. Every step produces an artifact you can show, share, or hand off. No empty templates. No blank pages. Just questions, answers, and the documents a world-class team would have written.</p>
          </div>
          <div className={s.steps}>
            <div className={s.step}>
              <div className={s.stepNum}>STEP 01</div>
              <div className={s.stepTitle}>Spark</div>
              <div className={s.stepMeta}><span>One sentence</span><span>2 min</span></div>
            </div>
            <div className={s.step}>
              <div className={s.stepNum}>STEP 02</div>
              <div className={s.stepTitle}>Discovery interview</div>
              <div className={s.stepMeta}><span>Adaptive Q&amp;A</span><span>20 min</span></div>
            </div>
            <div className={s.step}>
              <div className={s.stepNum}>STEP 03</div>
              <div className={s.stepTitle}>Reality check</div>
              <div className={s.stepMeta}><span>AI pushback</span><span>5 min</span></div>
            </div>
            <div className={s.step}>
              <div className={s.stepNum}>STEP 04</div>
              <div className={s.stepTitle}>Artifact suite</div>
              <div className={s.stepMeta}><span>18 documents</span><span>2-3 min</span></div>
            </div>
            <div className={s.step}>
              <div className={s.stepNum}>STEP 05</div>
              <div className={s.stepTitle}>Refine</div>
              <div className={s.stepMeta}><span>Edit anything</span><span>Open</span></div>
            </div>
            <div className={s.step}>
              <div className={s.stepNum}>STEP 06</div>
              <div className={s.stepTitle}>Build bridge</div>
              <div className={s.stepMeta}><span>Export to AI</span><span>1 click</span></div>
            </div>
            <div className={s.step}>
              <div className={s.stepNum}>STEP 07</div>
              <div className={s.stepTitle}>Living project</div>
              <div className={s.stepMeta}><span>Weekly sync</span><span>Ongoing</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ======== DELIVERABLES SECTION (02) ======== */}
      <section className={s.section}>
        <div className={s.sectionLabel}>What you walk away with / 02</div>
        <div className={s.problemGrid}>
          <h2 className={s.problemTitle} style={{ color: 'var(--accent)' }}>A package no $500/hr consultant would put together for under $20K.</h2>
          <div className={s.problemList}>
            <div className={s.problemItem}>
              <div className={s.problemNum}>A</div>
              <div className={s.problemText}>Vision &amp; mission document</div>
              <div className={s.problemTag}>3 pages</div>
            </div>
            <div className={s.problemItem}>
              <div className={s.problemNum}>B</div>
              <div className={s.problemText}>Detailed scope with in/out boundaries</div>
              <div className={s.problemTag}>5 pages</div>
            </div>
            <div className={s.problemItem}>
              <div className={s.problemNum}>C</div>
              <div className={s.problemText}>User personas with jobs-to-be-done</div>
              <div className={s.problemTag}>4 personas</div>
            </div>
            <div className={s.problemItem}>
              <div className={s.problemNum}>D</div>
              <div className={s.problemText}>Phased roadmap with milestones</div>
              <div className={s.problemTag}>12 months</div>
            </div>
            <div className={s.problemItem}>
              <div className={s.problemNum}>E</div>
              <div className={s.problemText}>Wireframes and interaction flows</div>
              <div className={s.problemTag}>Clickable</div>
            </div>
            <div className={s.problemItem}>
              <div className={s.problemNum}>F</div>
              <div className={s.problemText}>Tech stack recommendations</div>
              <div className={s.problemTag}>Vetted</div>
            </div>
            <div className={s.problemItem}>
              <div className={s.problemNum}>G</div>
              <div className={s.problemText}>Risk register with mitigation plans</div>
              <div className={s.problemTag}>Pre-mortem</div>
            </div>
            <div className={s.problemItem}>
              <div className={s.problemNum}>H</div>
              <div className={s.problemText}>Success metrics and KPIs</div>
              <div className={s.problemTag}>Tracked</div>
            </div>
            <div className={s.problemItem}>
              <div className={s.problemNum}>I</div>
              <div className={s.problemText}>Build-ready prompts for Claude, Cursor, Lovable</div>
              <div className={s.problemTag}>1-click export</div>
            </div>
          </div>
        </div>
      </section>

      {/* ======== FOOTER ======== */}
      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div className={s.footerBrand}>Jetdale.</div>
          <div className={s.footerTagline}>PLAN BEFORE YOU BUILD.</div>
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
