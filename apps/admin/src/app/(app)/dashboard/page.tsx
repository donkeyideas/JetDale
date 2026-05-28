'use client';

// ============================================================
// Jetdale — User Dashboard
// Supabase is the source of truth; localStorage is an offline cache.
// ============================================================

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { getProjectsForUser, deleteProject, saveProject, type JetdaleProject } from '@/lib/storage';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { loadProjectSummaries, syncProjectToSupabase } from '@/lib/supabase-storage';

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
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<JetdaleProject | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<JetdaleProject | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorModal, setErrorModal] = useState<{ title: string; body: string } | null>(null);
  const supabase = useRef(createSupabaseBrowserClient());

  // Close the kebab menu on any click outside it.
  useEffect(() => {
    if (!openMenuId) return;
    function handler(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest(`[data-card-id="${openMenuId}"]`)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenuId]);

  function openRename(p: JetdaleProject, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenuId(null);
    setRenameTarget(p);
    setRenameValue(p.name);
  }

  function openDelete(p: JetdaleProject, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenuId(null);
    setDeleteTarget(p);
  }

  async function confirmRename() {
    if (!renameTarget) return;
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === renameTarget.name) {
      setRenameTarget(null);
      return;
    }
    setBusy(true);
    const updated = { ...renameTarget, name: trimmed };
    setProjects((prev) => prev.map((p) => p.id === updated.id ? updated : p));
    saveProject(updated);
    await syncProjectToSupabase(updated).catch(() => {});
    setBusy(false);
    setRenameTarget(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const target = deleteTarget;
    try {
      const res = await fetch(`/api/projects/${target.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j.error as string) || `Delete failed with status ${res.status}`);
      }
      // Server confirmed the row is gone — now mirror that in local state.
      setProjects((prev) => prev.filter((p) => p.id !== target.id));
      deleteProject(target.id);
      setDeleteTarget(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not delete project.';
      setErrorModal({ title: 'Delete failed', body: msg });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    supabase.current.auth.getUser().then(({ data }) => {
      if (!data.user) { setLoading(false); return; }
      const uid = data.user.id;
      setUserId(uid);
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
              data-card-id={p.id}
              style={{
                background: 'var(--paper)', padding: '28px 32px',
                display: 'grid', gridTemplateColumns: '1.8fr 1fr 1fr 1.2fr 36px 36px',
                alignItems: 'center', gap: 24, textDecoration: 'none', color: 'var(--ink)',
                transition: 'background .2s', position: 'relative',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--paper-2)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--paper)'; }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  title={p.name}
                  style={{
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontSize: 26, fontWeight: 600, letterSpacing: '-.03em',
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    wordBreak: 'break-word',
                  }}
                >
                  {p.name}
                </div>
                <div
                  title={p.archetypeName}
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 10, letterSpacing: '.12em',
                    textTransform: 'uppercase', color: 'var(--muted)',
                    marginTop: 6,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
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

              {/* Kebab menu — actions outside the navigation click target */}
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                <button
                  type="button"
                  aria-label="Project actions"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpenMenuId((cur) => cur === p.id ? null : p.id);
                  }}
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    border: 'none', background: 'transparent',
                    cursor: 'pointer', color: 'var(--muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, lineHeight: 1,
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--paper-3)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  ⋮
                </button>
                {openMenuId === p.id && (
                  <div
                    style={{
                      position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                      minWidth: 160, background: 'var(--paper)',
                      border: '1px solid var(--rule)', borderRadius: 10,
                      boxShadow: '0 8px 24px rgba(14,15,12,.12)',
                      overflow: 'hidden', zIndex: 60,
                    }}
                  >
                    <button
                      type="button"
                      onClick={(e) => openRename(p, e)}
                      style={{
                        display: 'block', width: '100%', padding: '11px 16px',
                        fontSize: 13, fontWeight: 500, color: 'var(--ink)',
                        background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--paper-2)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={(e) => openDelete(p, e)}
                      style={{
                        display: 'block', width: '100%', padding: '11px 16px',
                        fontSize: 13, fontWeight: 500, color: 'var(--accent)',
                        background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer',
                        borderTop: '1px solid var(--rule)',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--paper-2)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              <div style={{ fontSize: 24, textAlign: 'right', color: 'var(--muted)' }}>&rarr;</div>
            </Link>
          );
        })}
      </div>

      {/* Rename modal */}
      {renameTarget && (
        <div
          onClick={() => !busy && setRenameTarget(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(14,15,12,.6)', backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 480, width: '100%',
              background: 'var(--paper-2)',
              border: '1px solid var(--rule)',
              borderRadius: 12, padding: '24px 28px',
              boxShadow: '0 24px 60px rgba(0,0,0,.35)',
            }}
          >
            <div style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: 18, fontWeight: 600, marginBottom: 14, color: 'var(--ink)',
            }}>
              Rename project
            </div>
            <input
              autoFocus
              aria-label="Project name"
              placeholder="Project name"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmRename();
                if (e.key === 'Escape') setRenameTarget(null);
              }}
              style={{
                width: '100%', padding: '11px 14px', fontSize: 14,
                background: 'var(--paper)', border: '1px solid var(--rule)',
                borderRadius: 8, color: 'var(--ink)', marginBottom: 22,
                fontFamily: 'inherit',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                disabled={busy}
                style={{
                  padding: '10px 18px', background: 'transparent',
                  color: 'var(--ink)', border: '1px solid var(--rule)',
                  borderRadius: 999, fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRename}
                disabled={busy}
                style={{
                  padding: '10px 22px', background: 'var(--ink)',
                  color: 'var(--paper)', border: 'none',
                  borderRadius: 999, fontWeight: 600, fontSize: 13,
                  cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.5 : 1,
                }}
              >
                {busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error modal */}
      {errorModal && (
        <div
          onClick={() => setErrorModal(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 210,
            background: 'rgba(14,15,12,.6)', backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 480, width: '100%',
              background: 'var(--paper-2)',
              border: '1px solid var(--rule)',
              borderRadius: 12, padding: '24px 28px',
              boxShadow: '0 24px 60px rgba(0,0,0,.35)',
            }}
          >
            <div style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: 18, fontWeight: 600, marginBottom: 10, color: 'var(--ink)',
            }}>{errorModal.title}</div>
            <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--ink)', marginBottom: 22 }}>
              {errorModal.body}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setErrorModal(null)}
                style={{
                  padding: '10px 22px', background: 'var(--ink)', color: 'var(--paper)',
                  border: 'none', borderRadius: 999, fontWeight: 600, fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div
          onClick={() => !busy && setDeleteTarget(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(14,15,12,.6)', backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 480, width: '100%',
              background: 'var(--paper-2)',
              border: '1px solid var(--rule)',
              borderRadius: 12, padding: '24px 28px',
              boxShadow: '0 24px 60px rgba(0,0,0,.35)',
            }}
          >
            <div style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: 18, fontWeight: 600, marginBottom: 10, color: 'var(--ink)',
            }}>
              Delete project?
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--ink)', marginBottom: 22 }}>
              This will permanently remove <strong title={deleteTarget.name}>{deleteTarget.name.length > 60 ? deleteTarget.name.slice(0, 57).trim() + '…' : deleteTarget.name}</strong> along with all its artifacts, chat, and reality checks. This cannot be undone.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={busy}
                style={{
                  padding: '10px 18px', background: 'transparent',
                  color: 'var(--ink)', border: '1px solid var(--rule)',
                  borderRadius: 999, fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={busy}
                style={{
                  padding: '10px 22px', background: 'var(--accent)',
                  color: '#fff', border: 'none',
                  borderRadius: 999, fontWeight: 600, fontSize: 13,
                  cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.5 : 1,
                }}
              >
                {busy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
