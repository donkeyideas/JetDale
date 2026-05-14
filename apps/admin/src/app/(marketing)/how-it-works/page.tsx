// ============================================================
// Jetdale — How It Works Page
// Detailed breakdown of the 7-step process. SEO/AEO optimized
// with structured content for featured snippets.
// ============================================================

import Link from 'next/link';

export const metadata = {
  title: 'How It Works',
  description: 'Jetdale turns your idea into a complete project plan in 7 steps: spark, discovery interview, reality check, artifact generation, refinement, export, and ongoing sync.',
  keywords: ['how Jetdale works', 'AI project planning process', '7 step project plan', 'project discovery interview', 'build plan generator steps', 'AI reality check'],
  openGraph: {
    title: 'How It Works — Jetdale',
    description: 'From idea to ready-to-build in 7 steps. See how Jetdale\'s AI interview process creates world-class project plans.',
    url: '/how-it-works',
  },
  alternates: { canonical: '/how-it-works' },
};

const STEPS = [
  {
    num: '01',
    title: 'Spark',
    time: '2 minutes',
    description: 'Describe your idea in one sentence. That\'s it. "I want to build an app that helps dog owners find sitters in their neighborhood." Jetdale\'s AI analyzes your input and identifies which of 47 industry archetypes best matches your project.',
    output: 'Archetype classification, initial project record',
  },
  {
    num: '02',
    title: 'Discovery Interview',
    time: '20 minutes',
    description: 'An adaptive AI interview tailored to your archetype. 30-50 questions covering target users, problem validation, competitive landscape, monetization, budget, timeline, technical requirements, and risks. Voice input supported — just talk and Jetdale transcribes.',
    output: 'Complete discovery record with all your answers',
  },
  {
    num: '03',
    title: 'Reality Check',
    time: '5 minutes',
    description: 'Jetdale\'s AI plays devil\'s advocate. It finds contradictions in your plan, flags unrealistic timelines, identifies budget gaps, and surfaces the questions you forgot to ask. Each concern comes with severity, area, and a suggested action.',
    output: 'Structured concerns with severity levels and fix suggestions',
  },
  {
    num: '04',
    title: 'Artifact Suite',
    time: '2 minutes',
    description: 'AI generates 12 production-quality planning documents from your discovery answers: vision, scope, personas, roadmap, tech stack, wireframes, risk register, success metrics, budget, decision log, pre-mortem, and pitch deck.',
    output: '12 complete planning documents',
  },
  {
    num: '05',
    title: 'Refine',
    time: 'Open-ended',
    description: 'Edit any artifact. Ask the AI chat to adjust specific sections. Regenerate individual documents with new context. Run another reality check after changes. Your workspace is a living, editable plan.',
    output: 'Polished, reviewed artifacts ready for handoff',
  },
  {
    num: '06',
    title: 'Build Bridge',
    time: '1 click',
    description: 'Export your plan in the format your tools need. Claude Code gets a CLAUDE.md with full context. Cursor gets .cursorrules. Lovable gets an optimized mega-prompt. Or export as PDF, pitch deck, RFP, or plain Markdown.',
    output: 'Export bundle optimized for your target tool',
  },
  {
    num: '07',
    title: 'Living Project',
    time: 'Ongoing',
    description: 'Your project doesn\'t end at export. Come back to refine, run new reality checks as requirements change, regenerate artifacts, and keep your plan in sync with what you\'re actually building.',
    output: 'Continuously updated project plan',
  },
];

export default function HowItWorksPage() {
  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '80px 32px' }}>
      {/* Hero */}
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 32, height: 1, background: 'var(--accent)', display: 'inline-block' }} />
        How It Works
      </div>
      <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(40px, 5vw, 72px)', fontWeight: 600, letterSpacing: '-.045em', lineHeight: .95, marginBottom: 24, maxWidth: 900 }}>
        From idea to ready-to-build in under an hour.
      </h1>
      <p style={{ fontSize: 20, lineHeight: 1.4, color: 'var(--muted)', maxWidth: 600, marginBottom: 80 }}>
        Seven steps. Every step produces an artifact you can show, share, or hand off. No empty templates. No blank pages. Just questions, answers, and the documents a world-class team would have written.
      </p>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--rule)', border: '1px solid var(--rule)', marginBottom: 80 }}>
        {STEPS.map((step) => (
          <div key={step.num} style={{ background: 'var(--paper)', padding: '40px 40px', display: 'grid', gridTemplateColumns: '80px 1fr 280px', gap: 32, alignItems: 'start' }}>
            <div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: '.15em', color: 'var(--accent)', marginBottom: 8 }}>STEP {step.num}</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>{step.time}</div>
            </div>
            <div>
              <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 600, letterSpacing: '-.03em', lineHeight: 1, marginBottom: 16 }}>{step.title}</h2>
              <p style={{ fontSize: 15, lineHeight: 1.65, color: '#1a1b18' }}>{step.description}</p>
            </div>
            <div style={{ background: 'var(--paper-2)', padding: '16px 20px', borderRadius: 6 }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>Output</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{step.output}</div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center', paddingBottom: 80 }}>
        <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 600, letterSpacing: '-.03em', marginBottom: 16 }}>Ready to try it?</h3>
        <p style={{ fontSize: 17, color: 'var(--muted)', marginBottom: 32 }}>Free to start. Your first project takes about 45 minutes.</p>
        <Link href="/start" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'var(--ink)', color: 'var(--paper)', padding: '18px 32px', borderRadius: 999, fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
          Start your project <span style={{ width: 28, height: 28, background: 'var(--accent)', borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 14, color: 'white' }}>&rarr;</span>
        </Link>
      </div>
    </div>
  );
}
