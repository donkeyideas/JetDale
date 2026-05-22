'use client';

// ============================================================
// Jetdale — User Dashboard
// Supabase is the source of truth; localStorage is an offline cache.
// ============================================================

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { getProjectsForUser, type JetdaleProject } from '@/lib/storage';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { loadProjectSummaries } from '@/lib/supabase-storage';

const PHASE_LABELS: Record<string, string> = {
  discovery: 'Discovery', reality_check: 'Reality Check', artifacts: 'Generating...',
  refine: 'Workspace', export: 'Export Ready', live: 'Live',
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getDateString() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function calcProgress(project: JetdaleProject): number {
  const ready = Object.values(project.artifacts).filter((a) => a.status === 'ready').length;
  return Math.min(100, Math.round((ready / 17) * 100));
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<JetdaleProject[]>([]);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const supabase = useRef(createSupabaseBrowserClient());

  useEffect(() => {
    supabase.current.auth.getUser().then(({ data }) => {
      if (!data.user) { setLoading(false); return; }
      const uid = data.user.id;
      const name = data.user.user_metadata?.full_name
        || data.user.email?.split('@')[0] || '';
      setUserName(name);

      // Lightweight load — project metadata + artifact counts only.
      // Full artifact content is loaded lazily when a project is opened.
      loadProjectSummaries(uid).then((summaries) => {
        setProjects(summaries);
        setLoading(false);
      }).catch(() => {
        setProjects(getProjectsForUser(uid));
        setLoading(false);
      });
    });
  }, []);

  const totalProjects = projects.length;
  const totalArtifacts = projects.reduce(
    (sum, p) => sum + Object.values(p.artifacts).filter((a) => a.status === 'ready').length, 0,
  );
  const avgCompletion = totalProjects
    ? Math.round(projects.reduce((sum, p) => sum + calcProgress(p), 0) / totalProjects)
    : 0;

  // ============== LOADING STATE ==============
  if (loading) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '120px 32px', textAlign: 'center' }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Loading your projects&hellip;
        </div>
      </div>
    );
  }

  // ============== EMPTY STATE ==============
  if (totalProjects === 0) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '120px 32px', textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, background: 'var(--ink)', borderRadius: '50%',
          display: 'grid', placeItems: 'center', margin: '0 auto 24px',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
        <h2 style={{
          fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 600,
          letterSpacing: '-.03em', marginBottom: 12,
        }}>No projects yet</h2>
        <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 32 }}>
          Start your first project and Jetdale will generate 17 planning documents from your answers.
        </p>
        <Link href="/new" style={{
          display: 'inline-flex', alignItems: 'center', gap: 10, background: 'var(--ink)',
          color: 'var(--paper)', padding: '14px 24px', borderRadius: 999, fontWeight: 600,
          fontSize: 14, textDecoration: 'none',
        }}>
          <span style={{ width: 22, height: 22, background: 'var(--accent)', borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 14, color: 'white' }}>+</span>
          Start a project
        </Link>
      </div>
    );
  }

  // ============== DASHBOARD ==============
  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '48px 32px' }}>

      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        paddingBottom: 32, borderBottom: '1px solid var(--rule)', marginBottom: 40,
        flexWrap: 'wrap', gap: 20,
      }}>
        <div>
          <h1 style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: 'clamp(36px, 5vw, 56px)', lineHeight: 1, fontWeight: 600, letterSpacing: '-.035em',
          }}>
            {getGreeting()}, <span style={{ fontWeight: 300, color: 'var(--accent)' }}>{userName || 'there'}.</span>
          </h1>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: '.15em',
            textTransform: 'uppercase', color: 'var(--muted)', marginTop: 12,
          }}>
            {getDateString()} / {totalProjects} active project{totalProjects !== 1 ? 's' : ''}
          </div>
        </div>
        <Link href="/new" style={{
          background: 'var(--ink)', color: 'var(--paper)', padding: '14px 24px',
          borderRadius: 999, fontWeight: 600, fontSize: 14, display: 'inline-flex',
          alignItems: 'center', gap: 10, textDecoration: 'none',
        }}>
          <span style={{ width: 22, height: 22, background: 'var(--accent)', borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 14, color: 'white' }}>+</span>
          New project
        </Link>
      </div>

      {/* Stats grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1,
        background: 'var(--rule)', border: '1px solid var(--rule)', marginBottom: 48,
      }}>
        {[
          { label: 'Active Projects', num: String(totalProjects), change: `${totalProjects} total` },
          { label: 'Avg. Completion', num: `${avgCompletion}%`, change: 'across projects' },
          { label: 'Artifacts Generated', num: String(totalArtifacts), change: 'across all projects' },
          { label: 'Export Ready', num: String(projects.filter((p) => p.phase === 'refine' || p.phase === 'export').length), change: 'projects with artifacts' },
        ].map((stat) => (
          <div key={stat.label} style={{ background: 'var(--paper)', padding: 28, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--muted)' }}>{stat.label}</div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 48, fontWeight: 600, letterSpacing: '-.04em', lineHeight: 1 }}>{stat.num}</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'var(--moss)' }}>{stat.change}</div>
          </div>
        ))}
      </div>

      {/* Projects list */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 600, letterSpacing: '-.03em' }}>Your projects</h2>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          {totalProjects} project{totalProjects !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--rule)', border: '1px solid var(--rule)', marginBottom: 48 }}>
        {projects.map((p) => {
          const progress = calcProgress(p);
          const href = p.phase === 'artifacts'
            ? `/generate?projectId=${p.id}`
            : `/workspace?projectId=${p.id}`;

          return (
            <Link
              key={p.id}
              href={href}
              style={{
                background: 'var(--paper)', padding: '28px 32px',
                display: 'grid', gridTemplateColumns: '1.8fr 1fr 1fr 1.2fr 80px',
                alignItems: 'center', gap: 24, textDecoration: 'none', color: 'var(--ink)',
                transition: 'background .2s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--paper-2)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--paper)'; }}
            >
              <div>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 600, letterSpacing: '-.03em' }}>
                  {p.name}
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 6 }}>
                  {p.archetypeName}
                </div>
              </div>

              <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 400 }}>Phase</span>
                <span>{PHASE_LABELS[p.phase] || p.phase}</span>
              </div>

              <div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>
                  Progress {progress}%
                </div>
                <div style={{ height: 4, background: 'var(--paper-3)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--accent)', borderRadius: 999, width: `${progress}%` }} />
                </div>
              </div>

              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                <strong style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ink)', display: 'block', marginBottom: 4, fontWeight: 500 }}>Artifacts</strong>
                {Object.values(p.artifacts).filter((a) => a.status === 'ready').length} of 17 ready
              </div>

              <div style={{ fontSize: 24, textAlign: 'right', color: 'var(--muted)' }}>&rarr;</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
