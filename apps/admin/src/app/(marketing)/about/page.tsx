// ============================================================
// Jetdale — About Page
// Company story, mission, and values. SEO/AEO-optimized with
// structured content for search engine answers.
// ============================================================

import Link from 'next/link';

export const metadata = {
  title: 'About',
  description: 'Jetdale is the AI project architect. We help builders plan before they build — turning rough ideas into complete, dev-ready project plans in under an hour.',
  keywords: ['about Jetdale', 'AI project architect', 'startup planning company', 'plan before you build'],
  openGraph: {
    title: 'About — Jetdale',
    description: 'The AI project architect. Turning rough ideas into dev-ready project plans in under an hour.',
    url: '/about',
  },
  alternates: { canonical: '/about' },
};

const VALUES = [
  {
    num: '01',
    title: 'Plan before you build',
    text: 'The best teams in the world don\'t start with code. They start with clarity. Jetdale makes that clarity accessible to everyone — solo founders, small teams, first-time builders.',
  },
  {
    num: '02',
    title: 'AI that pushes back',
    text: 'Most AI tools say yes to everything. Jetdale\'s reality check tells you what\'s unrealistic, what\'s missing, and what will kill your project. The hard truth is more valuable than false validation.',
  },
  {
    num: '03',
    title: 'Documents, not dashboards',
    text: 'We don\'t give you an empty board and wish you luck. Jetdale produces finished documents — vision, scope, personas, roadmap, risk register — that you can hand to a developer or an AI builder.',
  },
  {
    num: '04',
    title: 'Export-first',
    text: 'Every artifact is designed to leave Jetdale. Export to Claude Code, Cursor, Lovable, PDF, pitch deck, or RFP. We succeed when you take what we built and go build something real.',
  },
];

const STATS = [
  { num: '47', label: 'Industry archetypes', detail: 'Covering software, games, events, renovations, and more' },
  { num: '12', label: 'Artifacts per project', detail: 'Vision, scope, personas, roadmap, tech stack, wireframes, risks, metrics, budget, decisions, pre-mortem, pitch deck' },
  { num: '9', label: 'Export formats', detail: 'Claude Code, Cursor, Lovable, Bolt, Replit, Markdown, PDF, Pitch Deck, RFP' },
  { num: '<1hr', label: 'Time to plan', detail: 'From one-sentence idea to 12 production-ready documents' },
];

export default function AboutPage() {
  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '80px 32px' }}>
      {/* Hero */}
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 32, height: 1, background: 'var(--accent)', display: 'inline-block' }} />
        About Jetdale
      </div>
      <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(40px, 5vw, 72px)', fontWeight: 600, letterSpacing: '-.045em', lineHeight: .95, marginBottom: 24, maxWidth: 900 }}>
        We believe the best projects start with the best plans.
      </h1>
      <p style={{ fontSize: 20, lineHeight: 1.5, color: 'var(--ink)', maxWidth: 650, marginBottom: 32 }}>
        Jetdale is the AI project architect. We turn a rough idea into a complete, dev-ready project plan — vision, scope, roadmap, wireframes, risks, budget, and AI-ready export prompts — in under an hour.
      </p>
      <p style={{ fontSize: 17, lineHeight: 1.5, color: 'var(--muted)', maxWidth: 650 }}>
        Most projects don&apos;t fail because of bad code. They fail because of bad planning — vague requirements, missing specs, unrealistic timelines, and questions nobody thought to ask. Jetdale asks those questions for you, using AI that adapts to your specific project type.
      </p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--rule)', border: '1px solid var(--rule)', margin: '80px 0' }}>
        {STATS.map((stat) => (
          <div key={stat.label} style={{ background: 'var(--paper)', padding: 28 }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 48, fontWeight: 600, letterSpacing: '-.04em', lineHeight: 1, marginBottom: 8 }}>{stat.num}</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>{stat.label}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.4 }}>{stat.detail}</div>
          </div>
        ))}
      </div>

      {/* Values */}
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 24 }}>What we believe</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 80, marginBottom: 120 }}>
        <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(36px, 4vw, 56px)', fontWeight: 600, letterSpacing: '-.035em', lineHeight: 1 }}>
          Four principles that shape everything we build.
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--rule)', border: '1px solid var(--rule)' }}>
          {VALUES.map((v) => (
            <div key={v.num} style={{ background: 'var(--paper)', padding: '28px 32px' }}>
              <div style={{ display: 'flex', gap: 24, alignItems: 'start' }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: 'var(--accent)', minWidth: 32 }}>{v.num}</div>
                <div>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 500, letterSpacing: '-.02em', lineHeight: 1.2, marginBottom: 8 }}>{v.title}</div>
                  <p style={{ fontSize: 15, lineHeight: 1.6, color: '#1a1b18' }}>{v.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center', paddingBottom: 80 }}>
        <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 600, letterSpacing: '-.03em', marginBottom: 16 }}>Ready to plan your next project?</h3>
        <p style={{ fontSize: 17, color: 'var(--muted)', marginBottom: 32 }}>Free to start. No credit card required.</p>
        <Link href="/start" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'var(--ink)', color: 'var(--paper)', padding: '18px 32px', borderRadius: 999, fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
          Start your project <span style={{ width: 28, height: 28, background: 'var(--accent)', borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 14, color: 'white' }}>&rarr;</span>
        </Link>
      </div>
    </div>
  );
}
