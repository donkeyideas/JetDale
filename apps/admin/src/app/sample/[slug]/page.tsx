// ============================================================
// Public /sample/[slug] — read-only view of a real Jetdale project.
// No auth required. Shows all 17 artifacts top-to-bottom so visitors
// can see exactly what the tool produces before they sign up.
// ============================================================

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { lookupSampleProjectId } from '@/lib/sample-projects';
import { markdownToHtml } from '@/lib/markdown';

// Display order — matches the workspace artifact sidebar.
const ARTIFACT_ORDER = [
  'vision', 'scope', 'personas', 'competitive_analysis', 'user_journey',
  'roadmap', 'tech_stack', 'architecture_overview', 'wireframes',
  'raci_matrix', 'success_metrics', 'budget', 'risk_register',
  'go_to_market', 'decision_log', 'pre_mortem', 'pitch_deck',
] as const;

const ARTIFACT_LABELS: Record<string, string> = {
  vision: 'Vision',
  scope: 'Scope',
  personas: 'Personas',
  competitive_analysis: 'Competitive Analysis',
  user_journey: 'User Journey',
  roadmap: 'Roadmap',
  tech_stack: 'Tech Stack',
  architecture_overview: 'Architecture',
  wireframes: 'Wireframes',
  raci_matrix: 'RACI Matrix',
  success_metrics: 'Success Metrics',
  budget: 'Budget',
  risk_register: 'Risk Register',
  go_to_market: 'Go-to-Market',
  decision_log: 'Decision Log',
  pre_mortem: 'Pre-mortem',
  pitch_deck: 'Pitch Deck',
};

export default async function SampleProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const projectId = lookupSampleProjectId(slug);
  if (!projectId) notFound();

  const db = createSupabaseAdminClient();

  const [{ data: project }, { data: artifacts }] = await Promise.all([
    db.from('projects')
      .select('id, name, tagline, archetype_id')
      .eq('id', projectId)
      .maybeSingle(),
    db.from('artifacts')
      .select('type, content_markdown')
      .eq('project_id', projectId)
      .eq('is_current', true)
      .eq('status', 'ready'),
  ]);

  if (!project) notFound();

  // Index artifacts by type for ordered rendering.
  const byType = new Map<string, string>();
  for (const a of artifacts ?? []) {
    byType.set(a.type as string, (a.content_markdown as string) ?? '');
  }
  const present = ARTIFACT_ORDER.filter((t) => byType.has(t));

  return (
    <div style={{ position: 'relative', zIndex: 2 }}>
      {/* Sticky public nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(244,241,234,.92)', backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--rule)',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '14px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
        }}>
          <Link href="/" style={{
            fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700,
            fontSize: 22, letterSpacing: '-.04em',
            color: 'var(--ink)', textDecoration: 'none',
          }}>
            Jetdale
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: "'Space Mono', monospace", fontSize: 10,
              letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--muted)',
            }}>
              Sample project — read-only
            </span>
            <Link href="/start" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'var(--accent)', color: '#fff',
              padding: '10px 18px', borderRadius: 999,
              fontSize: 13, fontWeight: 700, textDecoration: 'none',
            }}>
              Plan your own project &rarr;
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header style={{ maxWidth: 880, margin: '0 auto', padding: '64px 24px 32px' }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 11,
          letterSpacing: '.15em', textTransform: 'uppercase',
          color: 'var(--accent)', marginBottom: 14,
        }}>
          Sample Jetdale project
        </div>
        <h1 style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 600,
          letterSpacing: '-.035em', lineHeight: 1.05,
          wordBreak: 'break-word', marginBottom: 16,
        }}>
          {project.name}
        </h1>
        {project.tagline && (
          <div style={{
            fontSize: 17, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 24,
          }}>
            {project.tagline}
          </div>
        )}
        <div style={{
          fontSize: 14, color: 'var(--muted)', lineHeight: 1.55,
          padding: '14px 18px', background: 'var(--paper-2)',
          border: '1px solid var(--rule)', borderRadius: 8,
        }}>
          This is a real Jetdale-generated project, shown read-only.
          It includes {present.length} of {ARTIFACT_ORDER.length} planning documents — vision, scope, personas,
          roadmap, tech stack, architecture, budget, risk register, and more —
          all produced from a 12-question discovery interview.
        </div>
      </header>

      {/* Artifacts (vertical, all rendered) */}
      <main style={{ maxWidth: 880, margin: '0 auto', padding: '16px 24px 96px' }}>
        {present.map((type) => (
          <section
            key={type}
            id={type}
            style={{
              padding: '40px 0',
              borderTop: '1px solid var(--rule)',
            }}
          >
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 10,
              letterSpacing: '.18em', textTransform: 'uppercase',
              color: 'var(--accent)', marginBottom: 14,
            }}>
              {ARTIFACT_LABELS[type]}
            </div>
            <article
              className="artifact-content"
              style={{
                fontSize: 16, lineHeight: 1.65, color: 'var(--ink)',
              }}
              dangerouslySetInnerHTML={{ __html: markdownToHtml(byType.get(type) ?? '') }}
            />
          </section>
        ))}
      </main>

      {/* Bottom CTA */}
      <section style={{
        background: 'var(--ink)', color: 'var(--paper)',
        padding: '72px 24px',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 600,
            letterSpacing: '-.035em', lineHeight: 1.1, marginBottom: 16,
          }}>
            This was a sample. Build yours next.
          </h2>
          <p style={{ fontSize: 16, color: 'var(--paper-3)', lineHeight: 1.55, marginBottom: 32 }}>
            One-sentence idea in. 18 planning documents out, starting with an honest demand-validation gate. Reality-checked, build-ready, exportable to Claude Code, Cursor, or Lovable in one click.
          </p>
          <Link href="/start" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: 'var(--accent)', color: '#fff',
            padding: '16px 28px', borderRadius: 999,
            fontSize: 15, fontWeight: 700, textDecoration: 'none',
          }}>
            Start your project &rarr;
          </Link>
        </div>
      </section>
    </div>
  );
}
