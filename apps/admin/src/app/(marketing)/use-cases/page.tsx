// ============================================================
// Jetdale — Use Cases Page
// Shows the 5 launch archetypes with descriptions, ideal for
// SEO long-tail keywords and AEO structured answers.
// ============================================================

import Link from 'next/link';

export const metadata = {
  title: 'Use Cases',
  description: 'See how Jetdale helps indie software builders, AI app makers, mobile game developers, wedding planners, and home renovators plan their projects with AI.',
  keywords: ['Jetdale use cases', 'AI project planning for startups', 'SaaS planning tool', 'mobile app planning', 'AI app builder planning', 'project planning for indie developers'],
  openGraph: {
    title: 'Use Cases — Jetdale',
    description: 'From SaaS to mobile games. See how Jetdale plans projects across 47 industry archetypes.',
    url: '/use-cases',
  },
  alternates: { canonical: '/use-cases' },
};

const USE_CASES = [
  {
    slug: 'indie-software',
    title: 'Indie Software',
    subtitle: 'SaaS, marketplaces, developer tools',
    description: 'You have an idea for a SaaS product, a marketplace, or a developer tool. Jetdale interviews you about your target users, monetization model, competitive landscape, and technical requirements — then generates a complete build plan with vision, scope, personas, roadmap, tech stack, risk register, and AI-ready export prompts.',
    questions: '35+ tailored questions',
    artifacts: '17 documents generated',
    time: '~45 minutes',
    examples: ['Task management SaaS', 'Two-sided marketplace', 'API developer platform', 'Chrome extension with backend'],
  },
  {
    slug: 'ai-built-app',
    title: 'AI-Built App',
    subtitle: 'Lovable, Cursor, Claude Code, Bolt, Replit',
    description: 'You\'re using an AI code generation tool and want to go from idea to production without the usual chaos. Jetdale asks about your builder tool of choice, technical comfort level, design needs, backend complexity, and deployment strategy — then produces specs optimized for your specific AI builder.',
    questions: '30+ tailored questions',
    artifacts: '17 documents generated',
    time: '~35 minutes',
    examples: ['Landing page with auth', 'Internal dashboard', 'Mobile-first PWA', 'E-commerce storefront'],
  },
  {
    slug: 'mobile-game',
    title: 'Mobile Game',
    subtitle: 'Unity, Unreal, Godot, GameMaker',
    description: 'Building a mobile game is deceptively complex — art pipeline, monetization, analytics, platform compliance. Jetdale guides you through genre, engine choice, art style, multiplayer decisions, F2P vs premium economics, and launch strategy.',
    questions: '40+ tailored questions',
    artifacts: '17 documents generated',
    time: '~50 minutes',
    examples: ['Puzzle game (F2P)', 'Idle RPG with gacha', 'Premium adventure game', 'Multiplayer party game'],
  },
  {
    slug: 'wedding-event',
    title: 'Wedding & Event',
    subtitle: 'Weddings, conferences, corporate events',
    description: 'Planning a wedding or large event involves hundreds of moving pieces. Jetdale walks through your event type, guest count, venue, budget breakdown, vendor needs, theme, logistics, and contingency plans — producing a comprehensive event plan.',
    questions: '35+ tailored questions',
    artifacts: '17 documents generated',
    time: '~40 minutes',
    examples: ['200-guest wedding', 'Corporate conference', 'Non-profit gala', 'Destination wedding'],
  },
  {
    slug: 'home-renovation',
    title: 'Home Renovation',
    subtitle: 'Kitchens, bathrooms, whole-home remodels',
    description: 'Renovations go over budget and over schedule by default. Jetdale interviews you about project scope, structural changes, permits, contractor vs DIY decisions, materials, financing, and living arrangements during work.',
    questions: '35+ tailored questions',
    artifacts: '17 documents generated',
    time: '~40 minutes',
    examples: ['Kitchen remodel', 'Bathroom renovation', 'Basement finishing', 'Whole-home gut renovation'],
  },
];

export default function UseCasesPage() {
  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '80px 32px 60px' }}>
      {/* Hero */}
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 32, height: 1, background: 'var(--accent)', display: 'inline-block' }} />
        Use Cases
      </div>
      <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(40px, 5vw, 72px)', fontWeight: 600, letterSpacing: '-.045em', lineHeight: .95, marginBottom: 24 }}>
        One tool. Five archetypes.<br />Infinite projects.
      </h1>
      <p style={{ fontSize: 20, lineHeight: 1.4, color: 'var(--muted)', maxWidth: 600, marginBottom: 80 }}>
        Jetdale adapts its interview, artifacts, and recommendations to your specific project type. Here are the five archetypes we launch with.
      </p>

      {/* Use case cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--rule)', border: '1px solid var(--rule)' }}>
        {USE_CASES.map((uc) => (
          <div key={uc.slug} style={{ background: 'var(--paper)', padding: '48px 40px', display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 64, alignItems: 'start' }}>
            <div>
              <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 36, fontWeight: 600, letterSpacing: '-.035em', lineHeight: 1, marginBottom: 8 }}>{uc.title}</h2>
              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 24 }}>{uc.subtitle}</p>
              <div style={{ display: 'flex', gap: 24 }}>
                <div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>Questions</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{uc.questions}</div>
                </div>
                <div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>Output</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{uc.artifacts}</div>
                </div>
                <div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>Time</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{uc.time}</div>
                </div>
              </div>
            </div>
            <div>
              <p style={{ fontSize: 15, lineHeight: 1.65, color: '#1a1b18', marginBottom: 20 }}>{uc.description}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {uc.examples.map((ex) => (
                  <span key={ex} style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', border: '1px solid var(--rule)', padding: '4px 10px', borderRadius: 999 }}>{ex}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 600, letterSpacing: '-.03em', marginBottom: 16 }}>Ready to plan your project?</h3>
        <p style={{ fontSize: 17, color: 'var(--muted)', marginBottom: 32 }}>It takes less than an hour. You&apos;ll walk away with 12 production-ready documents.</p>
        <Link href="/start" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'var(--ink)', color: 'var(--paper)', padding: '18px 32px', borderRadius: 999, fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
          Start your project <span style={{ width: 28, height: 28, background: 'var(--accent)', borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 14, color: 'white' }}>&rarr;</span>
        </Link>
      </div>
    </div>
  );
}
