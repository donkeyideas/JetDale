// ============================================================
// Jetdale — Supabase Storage Service
// Background sync layer: localStorage remains the instant source,
// Supabase provides persistence across devices.
// All errors are silently caught — the app works offline.
// ============================================================

import { createSupabaseBrowserClient } from './supabase-browser';
import type { JetdaleProject, ArtifactData } from './storage';
import type { ChatMessage } from '@jetdale/shared';

// ---- Sync: push data TO Supabase ----

/** Upsert the project row (not artifacts/messages). */
export async function syncProjectToSupabase(project: JetdaleProject): Promise<boolean> {
  if (typeof window === 'undefined' || !project.userId) return false;

  try {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from('projects').upsert({
      id: project.id,
      user_id: project.userId,
      name: project.name,
      tagline: project.archetypeName,
      spark_text: JSON.stringify(project.discoveryAnswers),
      phase: project.phase,
      status: 'active',
      created_at: project.createdAt,
    }, { onConflict: 'id' });

    if (error) {
      console.warn('[sb-sync] project upsert:', error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Upsert a single artifact. Project row must already exist in Supabase. */
export async function syncArtifactToSupabase(
  projectId: string,
  userId: string,
  type: string,
  data: ArtifactData,
): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const supabase = createSupabaseBrowserClient();

    // Check for existing current version
    const { data: existing } = await supabase
      .from('artifacts')
      .select('id, version')
      .eq('project_id', projectId)
      .eq('type', type)
      .eq('is_current', true)
      .maybeSingle();

    if (existing) {
      await supabase.from('artifacts')
        .update({
          status: data.status,
          version: data.version,
          content_markdown: data.contentMarkdown,
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('artifacts').insert({
        project_id: projectId,
        user_id: userId,
        type,
        status: data.status,
        version: data.version,
        is_current: true,
        content_markdown: data.contentMarkdown,
      });
    }
  } catch {
    // Silent fail — localStorage has the data
  }
}

/** Insert a single chat message. Ignores duplicates by ID. */
export async function syncChatMessageToSupabase(
  projectId: string,
  userId: string,
  msg: ChatMessage,
): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const supabase = createSupabaseBrowserClient();
    await supabase.from('chat_messages').upsert({
      id: msg.id,
      project_id: projectId,
      user_id: userId,
      role: msg.role,
      content: msg.content,
      created_at: msg.createdAt,
    }, { onConflict: 'id', ignoreDuplicates: true });
  } catch {
    // Silent fail
  }
}

/** Full sync: push the entire project (row + all artifacts + all messages) to Supabase. */
export async function fullSyncToSupabase(project: JetdaleProject): Promise<void> {
  if (typeof window === 'undefined' || !project.userId) return;

  const ok = await syncProjectToSupabase(project);
  if (!ok) return; // Don't sync children if project row failed (FK constraint)

  // Sync all ready artifacts
  for (const [type, data] of Object.entries(project.artifacts)) {
    if (data?.status === 'ready') {
      await syncArtifactToSupabase(project.id, project.userId, type, data);
    }
  }

  // Sync all chat messages
  if (project.chatMessages.length > 0) {
    try {
      const supabase = createSupabaseBrowserClient();
      const rows = project.chatMessages.map((m) => ({
        id: m.id,
        project_id: project.id,
        user_id: project.userId!,
        role: m.role,
        content: m.content,
        created_at: m.createdAt,
      }));
      await supabase.from('chat_messages').upsert(rows, {
        onConflict: 'id',
        ignoreDuplicates: true,
      });
    } catch {
      // Silent fail
    }
  }
}

// ---- Load: pull data FROM Supabase ----

/** Load all projects for a user from Supabase with their artifacts and messages. */
export async function loadProjectsFromSupabase(userId: string): Promise<JetdaleProject[]> {
  if (typeof window === 'undefined') return [];

  try {
    const supabase = createSupabaseBrowserClient();

    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error || !projects?.length) return [];

    const projectIds = projects.map((p: { id: string }) => p.id);

    // Batch load artifacts and messages for all projects
    const [artifactsRes, messagesRes] = await Promise.all([
      supabase
        .from('artifacts')
        .select('*')
        .in('project_id', projectIds)
        .eq('is_current', true),
      supabase
        .from('chat_messages')
        .select('*')
        .in('project_id', projectIds)
        .order('created_at', { ascending: true }),
    ]);

    const allArtifacts = artifactsRes.data || [];
    const allMessages = messagesRes.data || [];

    return projects.map((p: Record<string, unknown>) => {
      const artifacts: Record<string, ArtifactData> = {};
      for (const a of allArtifacts.filter((a: Record<string, unknown>) => a.project_id === p.id)) {
        artifacts[a.type as string] = {
          type: a.type as ArtifactData['type'],
          status: a.status as ArtifactData['status'],
          contentMarkdown: (a.content_markdown as string) || '',
          generatedAt: a.created_at as string,
          version: a.version as number,
        };
      }

      const chatMessages: ChatMessage[] = allMessages
        .filter((m: Record<string, unknown>) => m.project_id === p.id)
        .map((m: Record<string, unknown>) => ({
          id: m.id as string,
          role: m.role as ChatMessage['role'],
          content: m.content as string,
          createdAt: m.created_at as string,
        }));

      let discoveryAnswers: Record<string, string> = {};
      try { discoveryAnswers = JSON.parse((p.spark_text as string) || '{}'); } catch { /* empty */ }

      return {
        id: p.id as string,
        userId: p.user_id as string,
        name: p.name as string,
        createdAt: p.created_at as string,
        archetypeName: (p.tagline as string) || 'Software product',
        discoveryAnswers,
        phase: p.phase as JetdaleProject['phase'],
        artifacts,
        chatMessages,
      };
    });
  } catch {
    return [];
  }
}
