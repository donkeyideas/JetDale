'use client';

// ============================================================
// Jetdale — Generation Progress Screen
// Calls DeepSeek for each artifact, shows live progress.
// ============================================================

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef, Suspense } from 'react';
import { getProjectForUser, saveProject, updateProjectArtifact, updateProjectPhase, answersToPromptFormat } from '@/lib/storage';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { loadProjectMerged, syncProjectToSupabase, syncArtifactToSupabase } from '@/lib/supabase-storage';
import type { JetdaleProject, ArtifactData } from '@/lib/storage';

// Generation order — vision first so later artifacts can reference it
const GENERATION_ORDER = [
  'vision', 'personas', 'competitive_analysis', 'scope', 'user_journey',
  'tech_stack', 'architecture_overview', 'wireframes', 'roadmap', 'raci_matrix',
  'success_metrics', 'budget', 'go_to_market', 'risk_register',
  'decision_log', 'pre_mortem', 'pitch_deck',
] as const;

const ARTIFACT_LABELS: Record<string, string> = {
  vision: 'Vision', personas: 'Personas', competitive_analysis: 'Competitive Analysis',
  scope: 'Scope', user_journey: 'User Journey', tech_stack: 'Tech Stack',
  architecture_overview: 'Architecture', wireframes: 'Wireframes', roadmap: 'Roadmap',
  raci_matrix: 'RACI Matrix', success_metrics: 'Success Metrics', budget: 'Budget',
  go_to_market: 'Go-to-Market', risk_register: 'Risk Register',
  decision_log: 'Decision Log', pre_mortem: 'Pre-mortem', pitch_deck: 'Pitch Deck',
};

type ArtifactStatus = 'waiting' | 'generating' | 'ready' | 'failed';

function GenerateContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');

  const [project, setProject] = useState<JetdaleProject | null>(null);
  const [statuses, setStatuses] = useState<Record<string, ArtifactStatus>>({});
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');
  const started = useRef(false);

  // Load project (verify ownership)
  useEffect(() => {
    if (!projectId) return;
    createSupabaseBrowserClient().auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const uid = data.user.id;
      setUserId(uid);

      // Supabase merged with localStorage — recovers any content that only
      // exists locally (heading-only stubs in Supabase get filled from local).
      const p = await loadProjectMerged(projectId, uid);
      if (!p) return;
      saveProject(p); // cache merged result for offline

      setProject(p);
      const initial: Record<string, ArtifactStatus> = {};
      for (const type of GENERATION_ORDER) {
        const existing = p.artifacts[type];
        initial[type] = existing?.status === 'ready' ? 'ready' : 'waiting';
      }
      setStatuses(initial);
      // Background: ensure project row exists in Supabase
      syncProjectToSupabase(p).catch(() => {});
    });
  }, [projectId]);

  // Run generation
  useEffect(() => {
    if (!project || started.current) return;
    started.current = true;

    async function generate() {
      const discoveryAnswers = answersToPromptFormat(project!.discoveryAnswers);
      const existingArtifacts: Array<{ type: string; contentMarkdown: string }> = [];

      // Find first non-ready artifact to start from
      let startIdx = 0;
      for (let i = 0; i < GENERATION_ORDER.length; i++) {
        const existing = project!.artifacts[GENERATION_ORDER[i]];
        if (existing?.status === 'ready') {
          existingArtifacts.push({ type: GENERATION_ORDER[i], contentMarkdown: existing.contentMarkdown });
          startIdx = i + 1;
        } else {
          break;
        }
      }

      for (let i = startIdx; i < GENERATION_ORDER.length; i++) {
        const type = GENERATION_ORDER[i];
        setCurrentIdx(i);
        setStatuses((s) => ({ ...s, [type]: 'generating' }));

        try {
          const res = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              artifactType: type,
              archetypeName: project!.archetypeName,
              discoveryAnswers,
              existingArtifacts: existingArtifacts.length ? existingArtifacts : undefined,
            }),
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Unknown error' }));
            // Plan limit reached — stop generating and tell the user.
            if (res.status === 402) {
              setStatuses((s) => ({ ...s, [type]: 'failed' }));
              setError(err.error || 'You have reached your plan limit. Upgrade to generate more documents.');
              break;
            }
            console.error(`Failed to generate ${type}:`, err);
            setStatuses((s) => ({ ...s, [type]: 'failed' }));
            updateProjectArtifact(project!.id, type, {
              status: 'failed', contentMarkdown: '', generatedAt: new Date().toISOString(), version: 1,
            } as ArtifactData);
            continue;
          }

          const data = await res.json();
          const contentMarkdown = data.contentMarkdown || '';

          const artifactData: ArtifactData = {
            type: type as ArtifactData['type'],
            status: 'ready',
            contentMarkdown,
            generatedAt: new Date().toISOString(),
            version: 1,
          };
          setStatuses((s) => ({ ...s, [type]: 'ready' }));
          updateProjectArtifact(project!.id, type, artifactData);

          // Background: sync to Supabase
          if (project!.userId) {
            syncArtifactToSupabase(project!.id, project!.userId, type, artifactData).catch(() => {});
          }

          existingArtifacts.push({ type, contentMarkdown });
        } catch (err) {
          console.error(`Error generating ${type}:`, err);
          setStatuses((s) => ({ ...s, [type]: 'failed' }));
          setError(`Failed to generate ${ARTIFACT_LABELS[type]}. Check your connection.`);
        }
      }

      // All done — update phase locally AND sync to Supabase so the dashboard
      // routes future clicks to /workspace instead of back to this summary page.
      updateProjectPhase(project!.id, 'refine');
      const updated = { ...project!, phase: 'refine' as const };
      syncProjectToSupabase(updated).catch(() => {});
      setDone(true);
    }

    generate();
  }, [project]);

  if (!projectId) {
    return (
      <div style={{ maxWidth: 600, margin: '120px auto', textAlign: 'center', padding: '0 32px' }}>
        <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 600, marginBottom: 16 }}>No project found</h2>
        <Link href="/new" style={{ color: 'var(--accent)', fontWeight: 600 }}>Start a new project &rarr;</Link>
      </div>
    );
  }

  const readyCount = Object.values(statuses).filter((s) => s === 'ready').length;
  const pct = Math.min(100, Math.round((readyCount / GENERATION_ORDER.length) * 100));

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '60px 32px' }}>
      {/* Progress header */}
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: '.15em',
        textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ width: 24, height: 1, background: 'var(--accent)' }} />
        {done ? 'Generation complete' : 'Generating your plan'}
      </div>

      <h1 style={{
        fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(28px, 4vw, 44px)',
        fontWeight: 600, letterSpacing: '-.035em', lineHeight: 1.1, marginBottom: 8,
      }}>
        {project?.name || 'Your project'}
      </h1>
      <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 32 }}>
        {done
          ? 'All 17 planning documents have been generated. Head to your workspace to review and refine.'
          : 'Jetdale is generating 17 planning documents from your discovery answers. This takes 2-3 minutes.'}
      </p>

      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
        <div style={{ flex: 1, height: 4, background: 'var(--paper-3)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${pct}%`, background: 'var(--accent)',
            borderRadius: 999, transition: 'width .6s ease',
          }} />
        </div>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700,
          color: 'var(--accent)', minWidth: 44, textAlign: 'right',
        }}>{pct}%</div>
      </div>

      {/* Artifact list */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--rule)',
        border: '1px solid var(--rule)', borderRadius: 8, overflow: 'hidden', marginBottom: 32,
      }}>
        {GENERATION_ORDER.map((type, i) => {
          const status = statuses[type] || 'waiting';
          const label = ARTIFACT_LABELS[type];
          return (
            <div key={type} style={{
              background: 'var(--paper)', padding: '14px 20px',
              display: 'flex', alignItems: 'center', gap: 14,
              opacity: status === 'waiting' ? 0.5 : 1,
              transition: 'opacity .3s',
            }}>
              {/* Status indicator */}
              <div style={{ width: 28, minWidth: 28 }}>
                {status === 'ready' && (
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', background: 'var(--moss)',
                    display: 'grid', placeItems: 'center',
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                )}
                {status === 'generating' && (
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--accent)',
                    borderTopColor: 'transparent', animation: 'spin 1s linear infinite',
                  }} />
                )}
                {status === 'failed' && (
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', background: 'var(--accent-2)',
                    display: 'grid', placeItems: 'center', color: 'white', fontSize: 12, fontWeight: 700,
                  }}>!</div>
                )}
                {status === 'waiting' && (
                  <div style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--paper-3)' }} />
                )}
              </div>

              {/* Label */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{label}</div>
                {status === 'generating' && (
                  <div style={{
                    fontFamily: "'Space Mono', monospace", fontSize: 10, color: 'var(--accent)',
                    letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 2,
                  }}>Generating...</div>
                )}
                {status === 'failed' && (
                  <div style={{
                    fontFamily: "'Space Mono', monospace", fontSize: 10, color: 'var(--accent-2)',
                    letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 2,
                  }}>Failed</div>
                )}
              </div>

              {/* Number */}
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'var(--muted)',
              }}>{i + 1}/{GENERATION_ORDER.length}</div>
            </div>
          );
        })}
      </div>

      {error && (
        <p style={{ fontSize: 13, color: 'var(--accent-2)', marginBottom: 16 }}>{error}</p>
      )}

      {/* Actions */}
      {done && (
        <div style={{ display: 'flex', gap: 12 }}>
          <Link
            href={`/workspace?projectId=${projectId}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10, background: 'var(--ink)',
              color: 'var(--paper)', padding: '14px 24px', borderRadius: 999, fontWeight: 600,
              fontSize: 14, textDecoration: 'none', transition: 'all .2s',
            }}
          >
            View workspace <span style={{
              width: 22, height: 22, background: 'var(--accent)', color: 'white', borderRadius: '50%',
              display: 'grid', placeItems: 'center', fontSize: 11,
            }}>&rarr;</span>
          </Link>
          <Link
            href="/dashboard"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontSize: 14, fontWeight: 600, color: 'var(--ink)', padding: '14px 24px',
              border: '1px solid var(--ink)', borderRadius: 999, textDecoration: 'none',
              transition: 'all .2s',
            }}
          >
            Go to dashboard
          </Link>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function GeneratePage() {
  return (
    <Suspense fallback={
      <div style={{ maxWidth: 700, margin: '120px auto', textAlign: 'center', padding: '0 32px' }}>
        <p style={{ color: 'var(--muted)' }}>Loading...</p>
      </div>
    }>
      <GenerateContent />
    </Suspense>
  );
}
