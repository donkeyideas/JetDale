'use client';

// ============================================================
// Jetdale — Project Workspace
// 3-column: artifact sidebar | document viewer | AI chat
// All data from localStorage. Chat via /api/chat streaming.
// ============================================================

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, Suspense } from 'react';
import { getProjectForUser, saveProject, addChatMessage, updateProjectArtifact, updateProjectMilestones, answersToPromptFormat, type JetdaleProject, type ArtifactData, type Milestone } from '@/lib/storage';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { loadProjectMerged, syncArtifactToSupabase, syncChatMessageToSupabase, syncProjectToSupabase } from '@/lib/supabase-storage';
import { markdownToHtml } from '@/lib/markdown';
import type { ChatMessage } from '@jetdale/shared';

const ARTIFACT_ORDER = [
  'vision', 'scope', 'personas', 'competitive_analysis', 'user_journey',
  'roadmap', 'tech_stack', 'architecture_overview', 'wireframes',
  'raci_matrix', 'success_metrics', 'budget', 'risk_register',
] as const;

const TOOL_ARTIFACTS = ['go_to_market', 'decision_log', 'pre_mortem', 'pitch_deck'] as const;

/** Strip markdown syntax to produce clean plain text for export */
function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')           // ## headings → plain text
    .replace(/\*\*(.+?)\*\*/g, '$1')       // **bold** → bold
    .replace(/\*(.+?)\*/g, '$1')           // *italic* → italic
    .replace(/__(.+?)__/g, '$1')           // __bold__ → bold
    .replace(/_(.+?)_/g, '$1')             // _italic_ → italic
    .replace(/~~(.+?)~~/g, '$1')           // ~~strike~~ → strike
    .replace(/`(.+?)`/g, '$1')            // `code` → code
    .replace(/^>\s+/gm, '')                // > blockquote → plain
    .replace(/^---+$/gm, '')               // --- rules → remove
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')    // [text](url) → text
    .replace(/!\[.*?\]\(.+?\)/g, '')       // images → remove
    .replace(/^\|[-:| ]+\|$/gm, '')        // table separator rows → remove
    .replace(/\|/g, '  ')                  // | cells → spaces
    .replace(/\n{3,}/g, '\n\n')            // collapse blank lines
    .trim();
}

const ARTIFACT_LABELS: Record<string, string> = {
  vision: 'Vision', scope: 'Scope', personas: 'Personas',
  competitive_analysis: 'Competitive Analysis', user_journey: 'User Journey',
  roadmap: 'Roadmap', tech_stack: 'Tech stack', architecture_overview: 'Architecture',
  wireframes: 'Wireframes', raci_matrix: 'RACI Matrix',
  success_metrics: 'Success metrics', budget: 'Budget', risk_register: 'Risk register',
  go_to_market: 'Go-to-Market', decision_log: 'Decision log',
  pre_mortem: 'Pre-mortem', pitch_deck: 'Pitch deck',
};

// Plain-language explanation of what each artifact is, shown at the top of the viewer.
const ARTIFACT_DESCRIPTIONS: Record<string, string> = {
  vision: 'The big-picture statement of what you are building, who it is for, and why it matters.',
  scope: 'What is in and out of the first version — the features you will build and the ones you will skip.',
  personas: 'Profiles of your target users — their goals, frustrations, and what would make them choose your product.',
  competitive_analysis: 'A look at existing alternatives and where your product fits among them.',
  user_journey: 'The step-by-step path a user takes through your product, from first contact to ongoing use.',
  roadmap: 'A phased timeline showing what gets built and when, broken into milestones.',
  tech_stack: 'The recommended tools, frameworks, and services to build the product.',
  architecture_overview: 'A high-level map of how the system’s pieces fit together and talk to each other.',
  wireframes: 'Low-detail sketches of the key screens and how users move between them.',
  raci_matrix: 'A responsibility chart for each task. R = Responsible (does the work), A = Accountable (owns the outcome), C = Consulted (gives input), I = Informed (kept in the loop).',
  success_metrics: 'The numbers that tell you whether the product is working — with targets and how to measure them.',
  budget: 'An estimate of what it will cost to build and run the first version.',
  risk_register: 'The things most likely to go wrong, how serious each is, and how to reduce them.',
  go_to_market: 'The plan for how you will reach users and get your first customers.',
  decision_log: 'A record of the key choices made, the options considered, and why each call was made.',
  pre_mortem: 'An exercise that imagines the project has failed, then works backward to find what caused it.',
  pitch_deck: 'A concise slide-style summary you can show investors, partners, or collaborators.',
};

/** Extract milestones from a roadmap markdown (looks for "Milestone:" lines or phase headers) */
function extractMilestones(roadmapMd: string): Milestone[] {
  const milestones: Milestone[] = [];
  const lines = roadmapMd.split('\n');
  for (const line of lines) {
    // Match "Milestone: ..." or "**Milestone:** ..."
    const milestoneMatch = line.match(/\*?\*?Milestone\*?\*?[:\s]+(.+)/i);
    if (milestoneMatch) {
      const label = milestoneMatch[1].replace(/\*\*/g, '').replace(/^\s*[-–]\s*/, '').trim();
      if (label) {
        milestones.push({ id: crypto.randomUUID(), label, done: false });
      }
      continue;
    }
    // Match phase headers like "## Phase 1: MVP Launch" or "### Phase 1 — Core Platform"
    const phaseMatch = line.match(/^#{2,3}\s+(?:Phase\s+\d+[:\s—–-]+)(.+)/i);
    if (phaseMatch) {
      const label = phaseMatch[1].replace(/\*\*/g, '').trim();
      if (label) {
        milestones.push({ id: crypto.randomUUID(), label, done: false });
      }
    }
  }
  return milestones;
}

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get('projectId');

  const [project, setProject] = useState<JetdaleProject | null>(null);
  const [activeArtifact, setActiveArtifact] = useState('vision');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [shareLabel, setShareLabel] = useState('Share');
  const [exportLabel, setExportLabel] = useState('Export to Claude Code');
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [userId, setUserId] = useState('');
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [newMilestone, setNewMilestone] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const docViewerRef = useRef<HTMLElement>(null);

  // Scroll the document viewer back to the top when switching artifacts
  useEffect(() => {
    docViewerRef.current?.scrollTo({ top: 0 });
  }, [activeArtifact]);

  // Load project (verify ownership)
  useEffect(() => {
    if (!projectId) { router.push('/dashboard'); return; }
    createSupabaseBrowserClient().auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/dashboard'); return; }
      const uid = data.user.id;
      setUserId(uid);

      // Supabase merged with localStorage — recovers any content that only
      // exists locally (heading-only stubs in Supabase get filled from local).
      const p = await loadProjectMerged(projectId, uid);
      if (!p) { router.push('/dashboard'); return; }
      saveProject(p); // cache merged result for offline

      setProject(p);
      setMessages(p.chatMessages || []);
      const firstReady = [...ARTIFACT_ORDER, ...TOOL_ARTIFACTS].find((t) => p.artifacts[t]?.status === 'ready');
      if (firstReady) setActiveArtifact(firstReady);
      // Load milestones: use saved ones, or extract from roadmap
      if (p.milestones?.length) {
        setMilestones(p.milestones);
      } else if (p.artifacts.roadmap?.status === 'ready') {
        const extracted = extractMilestones(p.artifacts.roadmap.contentMarkdown);
        if (extracted.length) {
          setMilestones(extracted);
          updateProjectMilestones(p.id, extracted);
        }
      }
    });
  }, [projectId, router]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-send reality check prompt when set
  useEffect(() => {
    if (realityCheckPending.current && chatInput) {
      const prompt = chatInput;
      realityCheckPending.current = false;
      sendMessage(prompt);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatInput]);

  async function sendMessage(overrideMessage?: string) {
    const msg = overrideMessage || chatInput;
    if (!msg.trim() || !project || streaming) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: msg,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    addChatMessage(project.id, userMsg);
    if (userId) syncChatMessageToSupabase(project.id, userId, userMsg).catch(() => {});
    setChatInput('');
    setStreaming(true);

    const discoverySummary = Object.entries(project.discoveryAnswers)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    const activeData = project.artifacts[activeArtifact];
    const assistantId = crypto.randomUUID();
    let assistantContent = '';

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archetypeName: project.archetypeName,
          projectName: project.name,
          activeArtifact: activeData?.status === 'ready'
            ? { type: activeArtifact, contentMarkdown: activeData.contentMarkdown }
            : undefined,
          recentMessages: messages.slice(-10).map((m) => ({
            role: m.role === 'user' ? 'user' as const : 'assistant' as const,
            content: m.content,
          })),
          discoverySummary,
          userMessage: msg,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error('Chat request failed');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const json = JSON.parse(line.slice(6));
              const delta = json.choices?.[0]?.delta?.content || '';
              assistantContent += delta;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.id === assistantId) {
                  return [...prev.slice(0, -1), { ...last, content: assistantContent }];
                }
                return [...prev, { id: assistantId, role: 'assistant', content: assistantContent, createdAt: new Date().toISOString() }];
              });
            } catch { /* skip malformed */ }
          }
        }
      }

      const assistantMsg: ChatMessage = {
        id: assistantId, role: 'assistant', content: assistantContent, createdAt: new Date().toISOString(),
      };
      addChatMessage(project.id, assistantMsg);
      if (userId) syncChatMessageToSupabase(project.id, userId, assistantMsg).catch(() => {});
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [...prev, {
        id: assistantId, role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        createdAt: new Date().toISOString(),
      }]);
    }
    setStreaming(false);
  }

  // ---- Share: copy project summary to clipboard ----
  function handleShare() {
    if (!project) return;
    const readyArtifacts = [...ARTIFACT_ORDER, ...TOOL_ARTIFACTS]
      .filter((t) => project.artifacts[t]?.status === 'ready')
      .map((t) => `${ARTIFACT_LABELS[t]}: Ready (v${project.artifacts[t].version})`)
      .join('\n');
    const summary = [
      `# ${project.name}`,
      `Type: ${project.archetypeName}`,
      `Created: ${new Date(project.createdAt).toLocaleDateString()}`,
      '',
      '## Discovery Answers',
      ...Object.entries(project.discoveryAnswers).map(([k, v]) => `- ${k}: ${v}`),
      '',
      '## Artifacts',
      readyArtifacts || 'No artifacts generated yet.',
    ].join('\n');
    navigator.clipboard.writeText(summary);
    setShareLabel('Copied!');
    setTimeout(() => setShareLabel('Share'), 2000);
  }

  // ---- Reality Check: send analysis prompt to AI chat ----
  const realityCheckPending = useRef(false);

  function handleRealityCheck() {
    if (!project || streaming) return;
    const prompt = `Give me a brutally honest reality check on this project. Analyze the discovery answers and all generated artifacts. Identify the top 3 risks, the biggest blind spots, what's missing from the plan, and whether the budget/timeline is realistic. Be direct — I want the hard truth, not encouragement.`;
    setChatInput(prompt);
    realityCheckPending.current = true;
  }

  // ---- Export to Claude Code: compile all artifacts into clean plain text ----
  function handleExport() {
    if (!project) return;
    const sections = [...ARTIFACT_ORDER, ...TOOL_ARTIFACTS]
      .filter((t) => project.artifacts[t]?.status === 'ready')
      .map((t) => {
        const label = ARTIFACT_LABELS[t].toUpperCase();
        const content = stripMarkdown(project.artifacts[t].contentMarkdown);
        return `${label}\n\n${content}`;
      });

    const discoveryBlock = Object.entries(project.discoveryAnswers)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    const exportDoc = [
      project.name.toUpperCase(),
      project.archetypeName,
      '',
      'DISCOVERY SUMMARY',
      '',
      discoveryBlock,
      '',
      '',
      sections.join('\n\n\n'),
      '',
      '',
      'Use the above planning documents to build this project. Follow the roadmap, respect the budget and timeline constraints, implement the tech stack recommendations, and address the risks identified in the risk register.',
    ].join('\n');

    navigator.clipboard.writeText(exportDoc);
    setExportLabel('Copied!');
    setTimeout(() => setExportLabel('Export to Claude Code'), 2000);
  }

  // ---- Regenerate: re-generate the active artifact via API ----
  async function handleRegenerate() {
    if (!project || regenerating || !activeArtifact) return;
    setRegenerating(true);

    try {
      const discoveryAnswers = answersToPromptFormat(project.discoveryAnswers);
      const existingArtifacts = [...ARTIFACT_ORDER, ...TOOL_ARTIFACTS]
        .filter((t) => t !== activeArtifact && project.artifacts[t]?.status === 'ready')
        .map((t) => ({ type: t, contentMarkdown: project.artifacts[t].contentMarkdown }));

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artifactType: activeArtifact,
          archetypeName: project.archetypeName,
          discoveryAnswers,
          existingArtifacts: existingArtifacts.length ? existingArtifacts : undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to regenerate');

      const data = await res.json();
      const newVersion = (project.artifacts[activeArtifact]?.version || 0) + 1;

      const artifactUpdate = {
        status: 'ready' as const,
        contentMarkdown: data.contentMarkdown,
        generatedAt: new Date().toISOString(),
        version: newVersion,
      };
      updateProjectArtifact(project.id, activeArtifact, artifactUpdate);

      // Refresh project state from storage
      const updated = getProjectForUser(project.id, userId);
      if (updated) setProject(updated);

      // Background: sync to Supabase
      if (userId) {
        syncArtifactToSupabase(project.id, userId, activeArtifact, {
          type: activeArtifact as ArtifactData['type'], ...artifactUpdate,
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Regenerate error:', err);
    }
    setRegenerating(false);
  }

  // ---- Edit mode: let users modify artifact content directly ----
  function handleStartEdit() {
    const data = project?.artifacts[activeArtifact];
    if (!data || data.status !== 'ready') return;
    setEditContent(data.contentMarkdown);
    setEditing(true);
  }

  function handleSaveEdit() {
    if (!project) return;
    updateProjectArtifact(project.id, activeArtifact, { contentMarkdown: editContent });
    const updated = getProjectForUser(project.id, userId);
    if (updated) setProject(updated);
    setEditing(false);
    setEditContent('');

    // Background: sync edited artifact to Supabase
    const artifactData = updated?.artifacts[activeArtifact];
    if (userId && artifactData) {
      syncArtifactToSupabase(project.id, userId, activeArtifact, artifactData).catch(() => {});
    }
  }

  function handleCancelEdit() {
    setEditing(false);
    setEditContent('');
  }

  // ---- Milestone toggle + add ----
  function toggleMilestone(id: string) {
    if (!project) return;
    const updated = milestones.map((m) => m.id === id ? { ...m, done: !m.done } : m);
    setMilestones(updated);
    updateProjectMilestones(project.id, updated);
  }

  function addMilestone() {
    if (!project || !newMilestone.trim()) return;
    const updated = [...milestones, { id: crypto.randomUUID(), label: newMilestone.trim(), done: false }];
    setMilestones(updated);
    updateProjectMilestones(project.id, updated);
    setNewMilestone('');
  }

  function removeMilestone(id: string) {
    if (!project) return;
    const updated = milestones.filter((m) => m.id !== id);
    setMilestones(updated);
    updateProjectMilestones(project.id, updated);
  }

  if (!project) return null;

  const activeData = project.artifacts[activeArtifact];
  const artifactHtml = activeData?.status === 'ready' ? markdownToHtml(activeData.contentMarkdown) : '';

  // Voice-dictated answers can be very long. Truncate for display so the
  // workspace stays usable; the full text is preserved in storage and the
  // tooltip / Rename action.
  const displayName = project.name.length > 70
    ? project.name.slice(0, 69).trimEnd() + '…'
    : project.name;
  const audienceRaw = (project.discoveryAnswers.audience || '').trim();
  const displaySub = audienceRaw.length > 60
    ? audienceRaw.slice(0, 59).trimEnd() + '…'
    : audienceRaw;

  async function handleRename() {
    if (!project) return;
    const next = window.prompt('Project name:', project.name);
    if (next == null) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed === project.name) return;
    const updated = { ...project, name: trimmed };
    setProject(updated);
    saveProject(updated);
    if (userId) syncProjectToSupabase(updated).catch(() => {});
  }

  return (
    <div className="ws-root" style={{ height: 'calc(100vh - 65px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', maxWidth: 1500, margin: '0 auto', padding: '24px 32px 0' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        paddingBottom: 20, borderBottom: '1px solid var(--rule)',
        gap: 20, flexWrap: 'wrap', flexShrink: 0,
      }}>
        <div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>
            <Link href="/dashboard" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Dashboard</Link>
            {' / Projects / '}
            <span
              style={{
                color: 'var(--ink)',
                display: 'inline-block',
                maxWidth: 'min(40ch, 60vw)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                verticalAlign: 'bottom',
              }}
              title={project.name}
            >
              {project.name}
            </span>
          </div>
          <h1
            title={project.name}
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: 'clamp(28px, 4vw, 48px)',
              fontWeight: 600,
              letterSpacing: '-.035em',
              wordBreak: 'break-word',
              lineHeight: 1.05,
            }}
          >
            {displayName}
            {displaySub && (
              <span style={{ color: 'var(--muted)', fontWeight: 300 }}> — {displaySub.toLowerCase()}</span>
            )}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={handleRename}
            style={{ padding: '10px 18px', border: '1px solid var(--rule)', borderRadius: 999, fontSize: 13, fontWeight: 600, background: 'var(--paper)', cursor: 'pointer', transition: 'all .15s' }}
          >
            Rename
          </button>
          <button
            onClick={handleShare}
            style={{ padding: '10px 18px', border: '1px solid var(--rule)', borderRadius: 999, fontSize: 13, fontWeight: 600, background: 'var(--paper)', cursor: 'pointer', transition: 'all .15s' }}
          >
            {shareLabel}
          </button>
          <button
            onClick={handleRealityCheck}
            disabled={streaming}
            style={{ padding: '10px 18px', border: '1px solid var(--rule)', borderRadius: 999, fontSize: 13, fontWeight: 600, background: 'var(--paper)', cursor: streaming ? 'default' : 'pointer', opacity: streaming ? 0.5 : 1, transition: 'all .15s' }}
          >
            Reality check
          </button>
          <button
            onClick={handleExport}
            style={{ padding: '10px 18px', border: '1px solid var(--accent)', borderRadius: 999, fontSize: 13, fontWeight: 600, background: 'var(--accent)', color: 'white', cursor: 'pointer', transition: 'all .15s' }}
          >
            {exportLabel} {exportLabel === 'Export to Claude Code' && <>&rarr;</>}
          </button>
        </div>
      </div>

      {/* 3-column grid */}
      <div className="ws-grid" style={{ display: 'grid', gridTemplateColumns: '220px 1fr 360px', gap: 24, flex: 1, overflow: 'hidden', paddingTop: 20 }}>

        {/* LEFT: Artifact sidebar */}
        <aside className="ws-pane ws-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--muted)', padding: '12px 12px 8px' }}>Artifacts</div>
          {ARTIFACT_ORDER.map((type) => {
            const data = project.artifacts[type];
            const isActive = activeArtifact === type;
            const isReady = data?.status === 'ready';
            return (
              <button
                key={type}
                onClick={() => { setActiveArtifact(type); setEditing(false); }}
                style={{
                  padding: '12px 14px', borderRadius: 8, fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer', fontWeight: 600, border: 'none', width: '100%', textAlign: 'left',
                  background: isActive ? 'var(--ink)' : 'transparent',
                  color: isActive ? 'var(--paper)' : isReady ? 'var(--ink)' : 'var(--muted)',
                  transition: 'background .15s',
                }}
              >
                {ARTIFACT_LABELS[type]}
                {isReady && (
                  <span style={{
                    fontFamily: "'Space Mono', monospace", fontSize: 10,
                    background: isActive ? 'var(--accent)' : 'var(--paper-3)',
                    padding: '2px 8px', borderRadius: 999,
                    color: isActive ? 'white' : 'var(--muted)', fontWeight: 400,
                  }}>v{data.version}</span>
                )}
                {data?.status === 'failed' && (
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-2)' }} />
                )}
              </button>
            );
          })}

          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--muted)', padding: '20px 12px 8px' }}>Tools</div>
          {TOOL_ARTIFACTS.map((type) => {
            const data = project.artifacts[type];
            const isActive = activeArtifact === type;
            const isReady = data?.status === 'ready';
            return (
              <button
                key={type}
                onClick={() => { setActiveArtifact(type); setEditing(false); }}
                style={{
                  padding: '12px 14px', borderRadius: 8, fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer', fontWeight: 600, border: 'none', width: '100%', textAlign: 'left',
                  background: isActive ? 'var(--ink)' : 'transparent',
                  color: isActive ? 'var(--paper)' : isReady ? 'var(--ink)' : 'var(--muted)',
                  transition: 'background .15s',
                }}
              >
                {ARTIFACT_LABELS[type]}
              </button>
            );
          })}

          {/* Milestones */}
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--muted)', padding: '20px 12px 8px' }}>
            Milestones {milestones.length > 0 && `(${milestones.filter((m) => m.done).length}/${milestones.length})`}
          </div>
          {milestones.map((m) => (
            <div
              key={m.id}
              style={{
                padding: '8px 14px', borderRadius: 8, fontSize: 13, lineHeight: 1.3,
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}
            >
              <button
                onClick={() => toggleMilestone(m.id)}
                style={{
                  width: 18, height: 18, minWidth: 18, borderRadius: 4, marginTop: 1,
                  border: m.done ? 'none' : '1.5px solid var(--rule)',
                  background: m.done ? 'var(--moss)' : 'transparent',
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                  cursor: 'pointer', padding: 0,
                }}
              >
                {m.done && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                )}
              </button>
              <span style={{
                flex: 1, color: m.done ? 'var(--muted)' : 'var(--ink)',
                textDecoration: m.done ? 'line-through' : 'none',
              }}>{m.label}</span>
              <button
                onClick={() => removeMilestone(m.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  color: 'var(--muted)', fontSize: 14, lineHeight: 1, flexShrink: 0,
                  opacity: 0.5, transition: 'opacity .15s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.5'; }}
                title="Remove milestone"
              >&times;</button>
            </div>
          ))}
          {/* Add milestone input */}
          <div style={{ padding: '6px 12px', display: 'flex', gap: 6 }}>
            <input
              type="text"
              value={newMilestone}
              onChange={(e) => setNewMilestone(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMilestone(); } }}
              placeholder="Add milestone..."
              style={{
                flex: 1, background: 'var(--paper-2)', border: '1px solid var(--rule)',
                borderRadius: 6, padding: '8px 10px', fontSize: 12, outline: 'none',
                color: 'var(--ink)',
              }}
            />
            <button
              onClick={addMilestone}
              disabled={!newMilestone.trim()}
              style={{
                width: 30, height: 30, borderRadius: 6, border: '1px solid var(--rule)',
                background: newMilestone.trim() ? 'var(--ink)' : 'var(--paper-2)',
                color: newMilestone.trim() ? 'var(--paper)' : 'var(--muted)',
                cursor: newMilestone.trim() ? 'pointer' : 'default',
                fontSize: 16, display: 'grid', placeItems: 'center', flexShrink: 0,
              }}
            >+</button>
          </div>
        </aside>

        {/* CENTER: Document viewer */}
        <main ref={docViewerRef} className="ws-pane ws-doc" style={{
          background: 'var(--paper)', border: '1px solid var(--rule)',
          borderRadius: 6, padding: '40px 48px', overflowY: 'auto', minHeight: 0,
          display: 'flex', flexDirection: 'column',
        }}>
          {activeData?.status === 'ready' ? (
            editing ? (
              /* ---- EDIT MODE ---- */
              <>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  paddingBottom: 20, borderBottom: '1px solid var(--paper-3)', marginBottom: 20, flexShrink: 0,
                }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700 }}>
                    Editing: {ARTIFACT_LABELS[activeArtifact]}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleCancelEdit} style={{
                      padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                      border: '1px solid var(--rule)', background: 'var(--paper)', cursor: 'pointer',
                    }}>Cancel</button>
                    <button onClick={handleSaveEdit} style={{
                      padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                      border: '1px solid var(--moss)', background: 'var(--moss)', color: 'white', cursor: 'pointer',
                    }}>Save changes</button>
                  </div>
                </div>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  style={{
                    flex: 1, width: '100%', border: '1px solid var(--rule)', borderRadius: 6,
                    padding: 20, fontSize: 14, lineHeight: 1.7, fontFamily: "'Space Mono', monospace",
                    resize: 'none', outline: 'none', background: 'var(--paper-2)', minHeight: 0,
                  }}
                />
              </>
            ) : (
              /* ---- VIEW MODE ---- */
              <>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  paddingBottom: 20, borderBottom: '1px solid var(--paper-3)', marginBottom: 32, flexShrink: 0,
                }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700 }}>
                    {ARTIFACT_LABELS[activeArtifact]} / v{activeData.version}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleStartEdit} style={{
                      padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                      border: '1px solid var(--rule)', background: 'var(--paper)', cursor: 'pointer', transition: 'all .15s',
                    }}>Edit</button>
                    <button onClick={handleRegenerate} disabled={regenerating} style={{
                      padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                      border: '1px solid var(--rule)', background: 'var(--paper)', cursor: regenerating ? 'default' : 'pointer',
                      opacity: regenerating ? 0.5 : 1, transition: 'all .15s',
                    }}>{regenerating ? 'Regenerating...' : 'Regenerate'}</button>
                  </div>
                </div>
                {ARTIFACT_DESCRIPTIONS[activeArtifact] && (
                  <div style={{
                    background: 'var(--paper-2)', border: '1px solid var(--paper-3)',
                    borderRadius: 6, padding: '12px 16px', marginBottom: 28, flexShrink: 0,
                    fontSize: 13, lineHeight: 1.6, color: 'var(--muted)',
                  }}>
                    <span style={{
                      fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.12em',
                      textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700,
                      marginRight: 8,
                    }}>
                      What this is
                    </span>
                    {ARTIFACT_DESCRIPTIONS[activeArtifact]}
                  </div>
                )}
                <div
                  className="artifact-content"
                  dangerouslySetInnerHTML={{ __html: artifactHtml }}
                  style={{ fontSize: 15, lineHeight: 1.65 }}
                />
              </>
            )
          ) : activeData?.status === 'failed' ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)' }}>
              <p style={{ fontSize: 16, marginBottom: 8 }}>This artifact failed to generate.</p>
              <button onClick={handleRegenerate} disabled={regenerating} style={{
                padding: '10px 20px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                border: '1px solid var(--accent)', background: 'var(--accent)', color: 'white',
                cursor: regenerating ? 'default' : 'pointer', opacity: regenerating ? 0.5 : 1,
              }}>{regenerating ? 'Regenerating...' : 'Regenerate'}</button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)' }}>
              <p style={{ fontSize: 16, marginBottom: 8 }}>This artifact hasn&apos;t been generated yet.</p>
              <Link href={`/generate?projectId=${project.id}`} style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 14 }}>
                Generate artifacts &rarr;
              </Link>
            </div>
          )}
        </main>

        {/* RIGHT: AI Chat */}
        <aside className="ws-pane ws-chat" style={{
          background: 'var(--ink)', color: 'var(--paper)', borderRadius: 6,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Chat header */}
          <div style={{ padding: 20, borderBottom: '1px solid rgba(244,241,234,.1)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, background: 'var(--accent)', borderRadius: '50%', display: 'grid', placeItems: 'center', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 18, color: 'white' }}>J</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Jetdale Chat</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: 'var(--paper-3)', letterSpacing: '.1em', textTransform: 'uppercase' }}>Project advisor</div>
            </div>
          </div>

          {/* Chat body */}
          <div style={{ flex: 1, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto', fontSize: 13, minHeight: 0 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--paper-3)', fontSize: 13 }}>
                Ask me anything about your project. I can help refine artifacts, identify risks, or suggest improvements.
              </div>
            )}
            {messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div key={m.id} style={{
                  maxWidth: '88%', lineHeight: 1.5,
                  ...(isUser
                    ? { background: 'var(--accent)', color: 'white', padding: '12px 16px', borderRadius: '14px 14px 4px 14px', marginLeft: 'auto' }
                    : { background: 'rgba(244,241,234,.06)', padding: '14px 16px', borderRadius: '14px 14px 14px 4px', borderLeft: '2px solid var(--accent)' }),
                }}>
                  <span style={{
                    fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: '.15em',
                    textTransform: 'uppercase', marginBottom: 6, display: 'block', fontWeight: 700,
                    color: isUser ? 'rgba(255,255,255,.7)' : 'var(--paper-3)',
                  }}>{isUser ? 'You' : 'Jetdale'}</span>
                  {isUser ? (
                    m.content
                  ) : (
                    <div
                      className="chat-md"
                      dangerouslySetInnerHTML={{ __html: markdownToHtml(m.content) }}
                    />
                  )}
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(244,241,234,.1)', display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask, refine, or dictate..."
              style={{
                flex: 1, background: 'rgba(244,241,234,.08)', border: '1px solid rgba(244,241,234,.15)',
                color: 'var(--paper)', padding: '11px 14px', borderRadius: 999, fontSize: 13, outline: 'none',
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={streaming || !chatInput.trim()}
              style={{
                width: 38, height: 38, borderRadius: '50%', display: 'grid', placeItems: 'center',
                background: streaming ? 'var(--muted)' : 'var(--accent)', color: 'white', fontSize: 14,
                border: 'none', cursor: streaming ? 'default' : 'pointer', flexShrink: 0,
              }}
            >&rarr;</button>
          </div>
        </aside>
      </div>

      {/* Artifact content styles (keep outside grid so it doesn't affect layout) */}
      <style>{`
        .artifact-content h1 { font-family: 'Bricolage Grotesque', sans-serif; font-size: 36px; font-weight: 600; letter-spacing: -.035em; margin: 32px 0 12px; line-height: 1.1; }
        .artifact-content h2 { font-family: 'Bricolage Grotesque', sans-serif; font-size: 24px; font-weight: 600; letter-spacing: -.025em; margin: 36px 0 14px; display: flex; align-items: center; gap: 12px; }
        .artifact-content h2::before { content: ''; width: 24px; height: 1px; background: var(--accent); }
        .artifact-content h3 { font-family: 'Bricolage Grotesque', sans-serif; font-size: 18px; font-weight: 600; letter-spacing: -.02em; margin: 24px 0 10px; }
        .artifact-content p { margin-bottom: 14px; color: #1a1b18; }
        .artifact-content ul { list-style: none; margin-bottom: 16px; }
        .artifact-content li { padding-left: 24px; position: relative; margin-bottom: 8px; }
        .artifact-content li::before { content: ''; position: absolute; left: 0; top: 10px; width: 12px; height: 1px; background: var(--accent); }
        .artifact-content blockquote { font-family: 'Bricolage Grotesque', sans-serif; font-size: 22px; font-weight: 500; line-height: 1.2; padding: 24px; background: var(--paper-2); border-left: 3px solid var(--accent); margin: 24px 0; letter-spacing: -.02em; }
        .artifact-content strong { font-weight: 700; }
        .artifact-content code { background: var(--paper-2); padding: 2px 6px; border-radius: 3px; font-family: 'Space Mono', monospace; font-size: 13px; }
        .artifact-content table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
        .artifact-content thead { border-bottom: 2px solid var(--ink); }
        .artifact-content th { text-align: left; padding: 10px 14px; font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); font-weight: 600; }
        .artifact-content td { padding: 10px 14px; border-bottom: 1px solid var(--paper-3); }
        .artifact-content tbody tr:last-child td { border-bottom: none; }

        .chat-md h1, .chat-md h2, .chat-md h3 { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 600; margin: 10px 0 6px; line-height: 1.2; color: var(--paper); }
        .chat-md h1 { font-size: 16px; }
        .chat-md h2 { font-size: 15px; }
        .chat-md h3 { font-size: 14px; }
        .chat-md p { margin-bottom: 8px; color: rgba(244,241,234,.85); }
        .chat-md p:last-child { margin-bottom: 0; }
        .chat-md strong { font-weight: 700; color: var(--paper); }
        .chat-md em { font-style: italic; }
        .chat-md ul { list-style: none; margin: 6px 0; padding: 0; }
        .chat-md li { padding-left: 16px; position: relative; margin-bottom: 4px; color: rgba(244,241,234,.85); }
        .chat-md li::before { content: ''; position: absolute; left: 0; top: 8px; width: 8px; height: 1px; background: var(--accent); }
        .chat-md blockquote { padding: 8px 12px; border-left: 2px solid var(--accent); margin: 8px 0; font-style: italic; color: rgba(244,241,234,.7); }
        .chat-md code { background: rgba(244,241,234,.1); padding: 1px 5px; border-radius: 3px; font-family: 'Space Mono', monospace; font-size: 12px; }
        .chat-md table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 12px; }
        .chat-md th { text-align: left; padding: 4px 8px; font-size: 10px; text-transform: uppercase; color: rgba(244,241,234,.5); border-bottom: 1px solid rgba(244,241,234,.15); }
        .chat-md td { padding: 4px 8px; border-bottom: 1px solid rgba(244,241,234,.08); color: rgba(244,241,234,.85); }

        /* ---- Mobile: stack the editor panes into one scrollable column ---- */
        @media (max-width: 700px) {
          .ws-root { height: auto !important; overflow: visible !important; padding: 16px 16px 0 !important; }
          .ws-grid { display: flex !important; flex-direction: column; gap: 16px !important; overflow: visible !important; }
          .ws-pane { overflow: visible !important; }
          .ws-sidebar { overflow-y: visible !important; }
          .ws-doc { padding: 24px 20px !important; overflow-y: visible !important; }
          .ws-chat { height: 70vh; overflow: hidden !important; }
          .artifact-content h1 { font-size: 26px; }
          .artifact-content h2 { font-size: 20px; }
          .artifact-content blockquote { font-size: 18px; padding: 16px; }
          .artifact-content table { display: block; overflow-x: auto; }
        }
      `}</style>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={
      <div style={{ maxWidth: 700, margin: '120px auto', textAlign: 'center' }}>
        <p style={{ color: 'var(--muted)' }}>Loading workspace...</p>
      </div>
    }>
      <WorkspaceContent />
    </Suspense>
  );
}
