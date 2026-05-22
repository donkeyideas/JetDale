'use client';

// ============================================================
// Jetdale — New Project (Portal Discovery Flow)
// Same 12 questions, but user is already authenticated.
// No signup screen. Back goes to dashboard.
// ============================================================

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { saveProject, type JetdaleProject } from '@/lib/storage';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { syncProjectToSupabase } from '@/lib/supabase-storage';
import { QUESTIONS, TOTAL, inferArchetype, type DiscoveryQuestion } from '@/lib/discovery-questions';

// --------------- Speech Recognition helpers ---------------

interface SpeechRecognitionEvent extends Event {
  results: { [i: number]: { [j: number]: { transcript: string }; isFinal?: boolean }; length: number };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function createSpeechRecognition(): any | null {
  if (typeof window === 'undefined') return null;
  const W = window as any;
  const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
  return SR ? new SR() : null;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Derive a short, sensible project name from the spark answer.
 * Voice-dictated sparks can be paragraph-length; this trims common
 * filler prefixes, keeps the first sentence, and caps to ~60 chars.
 */
function deriveProjectName(spark: string | undefined): string {
  if (!spark || !spark.trim()) return 'Untitled project';
  let s = spark.trim();
  s = s.replace(
    /^(?:so\s+|um+\s+|uh+\s+|i'?d?\s*(?:want|like|love|wanted)\s*to\s*(?:build|create|make|launch|start)\s*(?:an?\s+|the\s+)?)/i,
    '',
  );
  const first = s.split(/[.!?\n]+/)[0];
  if (first && first.trim().length > 0) s = first.trim();
  const MAX = 60;
  if (s.length > MAX) s = s.slice(0, MAX - 1).trimEnd() + '…';
  if (s.length > 0) s = s.charAt(0).toUpperCase() + s.slice(1);
  return s || 'Untitled project';
}

// --------------- Component ---------------

export default function NewProjectPage() {
  const router = useRouter();
  const [questionIdx, setQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentText, setCurrentText] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [showDone, setShowDone] = useState(false);
  const [error, setError] = useState('');
  const [quotaMsg, setQuotaMsg] = useState('');
  const [creating, setCreating] = useState(false);

  // Auth — user is already logged in (portal)
  const [userId, setUserId] = useState('');
  const supabaseRef = useRef(createSupabaseBrowserClient());

  useEffect(() => {
    supabaseRef.current.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return; }
      setUserId(data.user.id);
    });
  }, [router]);

  async function createProjectAndRedirect() {
    if (!userId || creating) return;
    setCreating(true);
    setQuotaMsg('');

    // Enforce the monthly project limit before creating. The
    // enforce_project_quota DB trigger is the hard backstop.
    try {
      const res = await fetch('/api/projects/check');
      if (res.ok) {
        const q = await res.json();
        if (!q.allowed) {
          setQuotaMsg(
            `Your ${q.tier} plan allows ${q.max} project${q.max === 1 ? '' : 's'} per month. ` +
            `Upgrade your plan to start another.`,
          );
          setCreating(false);
          return;
        }
      }
    } catch {
      // Network issue — fall through; the DB trigger still enforces the limit.
    }

    const id = crypto.randomUUID();
    const project: JetdaleProject = {
      id,
      userId,
      name: deriveProjectName(answers.spark),
      createdAt: new Date().toISOString(),
      archetypeName: inferArchetype(answers),
      discoveryAnswers: { ...answers },
      phase: 'artifacts',
      artifacts: {},
      chatMessages: [],
    };
    // Sync to Supabase first — if the project-quota trigger rejects it,
    // surface the limit instead of redirecting into a generation flow.
    const synced = await syncProjectToSupabase(project).catch(() => false);
    if (!synced) {
      const check = await fetch('/api/projects/check').then((r) => r.ok ? r.json() : null).catch(() => null);
      if (check && !check.allowed) {
        setQuotaMsg(
          `Your ${check.tier} plan allows ${check.max} project${check.max === 1 ? '' : 's'} per month. ` +
          `Upgrade your plan to start another.`,
        );
        setCreating(false);
        return;
      }
    }
    saveProject(project);
    router.push(`/generate?projectId=${id}`);
  }

  // Voice
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef<ReturnType<typeof createSpeechRecognition> | null>(null);

  const q = QUESTIONS[questionIdx];
  const pct = Math.round(((questionIdx + 1) / TOTAL) * 100);

  // --------------- Answer helpers ---------------

  function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function getLabels(question: DiscoveryQuestion, values: string[]): string {
    if (!question.options) return values.join(', ');
    return values
      .map((v) => question.options!.find((o) => o.value === v)?.label || v)
      .join(', ');
  }

  function saveCurrentAnswer() {
    if (!q) return;
    if (q.type === 'open_text') {
      if (currentText.trim()) setAnswers((a) => ({ ...a, [q.key]: capitalize(currentText.trim()) }));
    } else if (q.type === 'single_select' || q.type === 'multi_select') {
      if (selectedOptions.length) {
        setAnswers((a) => ({ ...a, [q.key]: getLabels(q, selectedOptions) }));
      }
    }
  }

  function loadAnswer(idx: number) {
    const next = QUESTIONS[idx];
    if (!next) return;
    const saved = answers[next.key] || '';
    if (next.type === 'open_text') {
      setCurrentText(saved);
      setSelectedOptions([]);
    } else {
      setCurrentText('');
      if (saved && next.options) {
        const labels = saved.split(', ');
        const values = labels.map((l) => next.options!.find((o) => o.label === l)?.value || l);
        setSelectedOptions(values);
      } else {
        setSelectedOptions([]);
      }
    }
  }

  function canContinue(): boolean {
    if (!q) return false;
    if (q.type === 'open_text') return currentText.trim().length >= 3;
    return selectedOptions.length > 0;
  }

  function handleNext() {
    if (!canContinue()) return;
    saveCurrentAnswer();
    if (questionIdx < TOTAL - 1) {
      const next = questionIdx + 1;
      setQuestionIdx(next);
      loadAnswer(next);
    } else {
      setShowDone(true);
    }
    setError('');
  }

  function handleBack() {
    if (questionIdx > 0) {
      saveCurrentAnswer();
      const prev = questionIdx - 1;
      setQuestionIdx(prev);
      loadAnswer(prev);
      setError('');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleNext();
    }
  }

  function toggleOption(value: string) {
    if (!q) return;
    if (q.type === 'single_select') {
      setSelectedOptions([value]);
    } else {
      setSelectedOptions((prev) =>
        prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
      );
    }
  }

  // --------------- Voice ---------------

  const toggleVoice = useCallback(() => {
    if (recording && recognitionRef.current) {
      recognitionRef.current.stop();
      setRecording(false);
      return;
    }
    const recognition = createSpeechRecognition();
    if (!recognition) {
      setError('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    let base = currentText;

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r[0]) {
          if ((r as unknown as { isFinal: boolean }).isFinal) final += r[0].transcript;
          else interim += r[0].transcript;
        }
      }
      const sep = base && !base.endsWith(' ') ? ' ' : '';
      setCurrentText(base + sep + final + interim);
    };
    recognition.onerror = () => { setRecording(false); recognitionRef.current = null; };
    recognition.onend = () => { setRecording(false); recognitionRef.current = null; };
    recognition.start();
    recognitionRef.current = recognition;
    setRecording(true);
    setError('');
  }, [recording, currentText]);

  // --------------- Shared styles ---------------

  const progressBar = (
    <div style={{ borderBottom: '1px solid var(--rule)', padding: '16px 32px', background: 'var(--paper)' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
          Discovery / Question <span style={{ color: 'var(--ink)', fontWeight: 700 }}>{questionIdx + 1}</span> of {TOTAL}
        </div>
        <div style={{ flex: 1, height: 3, background: 'var(--paper-3)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 999, transition: 'width .4s ease' }} />
        </div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: 'var(--accent)' }}>{pct}%</div>
      </div>
    </div>
  );

  const continueBtn = (
    <button
      onClick={handleNext}
      disabled={!canContinue()}
      style={{
        background: canContinue() ? 'var(--ink)' : 'var(--paper-3)',
        color: canContinue() ? 'var(--paper)' : 'var(--muted)',
        padding: '16px 28px',
        borderRadius: 999,
        fontWeight: 600,
        fontSize: 14,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        transition: 'all .2s',
        border: 'none',
        cursor: canContinue() ? 'pointer' : 'default',
      }}
    >
      {questionIdx === TOTAL - 1 ? 'Finish' : 'Continue'} <span style={{
        width: 24, height: 24,
        background: canContinue() ? 'var(--accent)' : 'var(--muted)',
        color: 'white', borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 12,
        transition: 'background .2s',
      }}>&rarr;</span>
    </button>
  );

  // ================================================================
  // DONE SCREEN — no signup, straight to generate
  // ================================================================
  if (showDone) {
    return (
      <div style={{ minHeight: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
        {/* Progress — 100% */}
        <div style={{ borderBottom: '1px solid var(--rule)', padding: '16px 32px', background: 'var(--paper)' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--accent)', whiteSpace: 'nowrap', fontWeight: 700 }}>
              Discovery complete
            </div>
            <div style={{ flex: 1, height: 3, background: 'var(--paper-3)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '100%', background: 'var(--accent)', borderRadius: 999 }} />
            </div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: 'var(--accent)' }}>100%</div>
          </div>
        </div>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 32px', width: '100%' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
            <div style={{ width: 48, height: 48, background: 'var(--ink)', borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <div>
              <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 600, letterSpacing: '-.035em', lineHeight: 1.1 }}>
                Discovery complete
              </h2>
            </div>
          </div>
          <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 36 }}>
            Here&apos;s a summary of your project. Next step: Jetdale generates 17 planning documents &mdash; vision, scope, personas, competitive analysis, roadmap, tech stack, architecture, and more.
          </p>

          {/* Answer summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--rule)', border: '1px solid var(--rule)', borderRadius: 8, overflow: 'hidden', marginBottom: 40 }}>
            {QUESTIONS.map((question) => {
              const answer = answers[question.key];
              if (!answer) return null;
              return (
                <div key={question.key} style={{ background: 'var(--paper)', padding: '16px 24px', display: 'grid', gridTemplateColumns: '140px 1fr', gap: 20, alignItems: 'start' }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--accent)', paddingTop: 2 }}>
                    {question.stage}
                  </div>
                  <div style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--ink)' }}>
                    {answer}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Plan limit notice */}
          {quotaMsg && (
            <p style={{
              fontSize: 14, color: 'var(--accent)', fontWeight: 500, lineHeight: 1.5,
              marginBottom: 20, padding: '12px 16px', background: 'rgba(255,91,31,.08)',
              border: '1px solid rgba(255,91,31,.25)', borderRadius: 8,
            }}>
              {quotaMsg} <a href="/account" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'underline' }}>Manage plan →</a>
            </p>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={() => { setShowDone(false); setQuestionIdx(TOTAL - 1); loadAnswer(TOTAL - 1); }}
              style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted)', background: 'none', border: '1px solid var(--rule)', borderRadius: 999, padding: '14px 24px', cursor: 'pointer', transition: 'all .15s' }}
            >
              &larr; Edit answers
            </button>
            <button
              onClick={createProjectAndRedirect}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'var(--ink)', color: 'var(--paper)', padding: '14px 24px', borderRadius: 999, fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer', transition: 'all .2s' }}
            >
              Generate project plan <span style={{ width: 22, height: 22, background: 'var(--accent)', color: 'white', borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 11 }}>&rarr;</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ================================================================
  // DISCOVERY QUESTIONS
  // ================================================================
  return (
    <div style={{ minHeight: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
      {progressBar}

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 32px' }}>
        <div style={{ maxWidth: 780, width: '100%' }}>
          {/* Stage label */}
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 24, height: 1, background: 'var(--accent)' }} />
            Stage {q.stageNum} / {q.stage}
          </div>

          {/* Question */}
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 600, letterSpacing: '-.035em', lineHeight: 1.1, marginBottom: 16 }}>
            {q.title}
          </h2>
          <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 32, maxWidth: 580 }}>
            {q.helper}
          </p>

          {/* Input area */}
          {q.type === 'open_text' && (
            <div style={{ position: 'relative', marginBottom: 28 }}>
              <textarea
                value={currentText}
                onChange={(e) => setCurrentText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={q.placeholder}
                autoFocus
                style={{
                  width: '100%', background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 12,
                  padding: '24px 80px 24px 24px', fontSize: 17, lineHeight: 1.5, minHeight: 120, resize: 'vertical',
                  outline: 'none', fontWeight: 400, fontFamily: 'inherit', transition: 'border-color .2s, box-shadow .2s',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 4px rgba(255,91,31,.12)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--rule)'; e.target.style.boxShadow = 'none'; }}
              />
              <button onClick={toggleVoice} style={{
                position: 'absolute', right: 16, top: 16, width: 48, height: 48, borderRadius: '50%',
                background: recording ? 'var(--accent)' : 'var(--ink)', color: 'var(--paper)',
                display: 'grid', placeItems: 'center', border: 'none', cursor: 'pointer', transition: 'all .2s',
                animation: recording ? 'mic-pulse 1.5s ease-in-out infinite' : 'none',
              }} title={recording ? 'Click to stop recording' : 'Click to dictate'}>
                {recording ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="2" width="6" height="11" rx="3" /><path d="M5 10a7 7 0 0 0 14 0" /><line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                )}
              </button>
            </div>
          )}

          {(q.type === 'single_select' || q.type === 'multi_select') && q.options && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 28 }}>
              {q.options.map((opt) => {
                const selected = selectedOptions.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => toggleOption(opt.value)}
                    style={{
                      background: selected ? 'var(--ink)' : 'var(--paper)',
                      color: selected ? 'var(--paper)' : 'var(--ink)',
                      border: `1px solid ${selected ? 'var(--ink)' : 'var(--rule)'}`,
                      borderRadius: 10,
                      padding: '16px 20px',
                      fontSize: 15,
                      fontWeight: 500,
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all .15s ease',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            {questionIdx > 0 ? (
              <button onClick={handleBack} style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                &larr; Back
              </button>
            ) : (
              <Link href="/dashboard" style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted)', textDecoration: 'none' }}>
                &larr; Back to dashboard
              </Link>
            )}
            {continueBtn}
          </div>

          {/* Keyboard hint */}
          {q.type === 'open_text' && (
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: '.1em', color: 'var(--muted)',
              textTransform: 'uppercase', textAlign: 'center', marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--paper-3)',
            }}>
              Press <kbd style={{ background: 'var(--paper-2)', border: '1px solid var(--paper-3)', borderRadius: 4, padding: '2px 8px', fontFamily: 'inherit', fontSize: 10, color: 'var(--ink)', margin: '0 4px' }}>Enter</kbd> to continue, <kbd style={{ background: 'var(--paper-2)', border: '1px solid var(--paper-3)', borderRadius: 4, padding: '2px 8px', fontFamily: 'inherit', fontSize: 10, color: 'var(--ink)', margin: '0 4px' }}>Shift+Enter</kbd> for new line
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes mic-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,91,31,.5); }
          50% { box-shadow: 0 0 0 12px rgba(255,91,31,0); }
        }
      `}</style>
    </div>
  );
}
