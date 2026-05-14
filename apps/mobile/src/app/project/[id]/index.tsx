// ============================================================
// Jetdale — Project Workspace Screen
// Main workspace view: artifact list, current artifact view,
// AI chat panel. Responsive for mobile (stack) and web (panels).
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, router, Link } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthProvider';
import { colors, typography, spacing, radii } from '@/theme/tokens';

interface Artifact {
  id: string;
  type: string;
  version: number;
  status: 'generating' | 'ready' | 'failed' | 'stale';
  content_markdown: string | null;
  is_current: boolean;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  archetype_id: string;
  phase: string;
  progress_pct: number;
  created_at: string;
}

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
  risk_register: 'Risk Register',
  success_metrics: 'Success Metrics',
  budget: 'Budget',
  go_to_market: 'Go-to-Market',
  decision_log: 'Decision Log',
  pre_mortem: 'Pre-Mortem',
  pitch_deck: 'Pitch Deck',
};

const STATUS_COLORS: Record<string, string> = {
  ready: colors.moss,
  generating: colors.gold,
  failed: colors.error,
  stale: colors.muted,
};

export default function ProjectWorkspaceScreen() {
  const { id: projectId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isWide = width > 768;

  const [project, setProject] = useState<Project | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!projectId) return;

    const [projectRes, artifactsRes] = await Promise.all([
      supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single(),
      supabase
        .from('artifacts')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_current', true)
        .order('created_at', { ascending: true }),
    ]);

    if (projectRes.data) setProject(projectRes.data as Project);
    if (artifactsRes.data) {
      const arts = artifactsRes.data as Artifact[];
      setArtifacts(arts);
      // Auto-select first ready artifact
      if (!selectedArtifact) {
        const firstReady = arts.find((a) => a.status === 'ready');
        if (firstReady) setSelectedArtifact(firstReady);
      }
    }

    setLoading(false);
    setRefreshing(false);
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Subscribe to realtime artifact updates
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`workspace-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'artifacts',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          loadData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, loadData]);

  function handleRefresh() {
    setRefreshing(true);
    loadData();
  }

  function handleArtifactSelect(artifact: Artifact) {
    setSelectedArtifact(artifact);
    if (!isWide) {
      router.push(`/project/${projectId}/artifact/${artifact.type}`);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!project) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Project not found</Text>
        <Pressable style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.headerBack}>Back</Text>
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>{project.name}</Text>
          <Text style={styles.headerPhase}>{project.phase.replace('_', ' ')}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            style={[styles.headerButton, styles.headerButtonOutline]}
            onPress={() => router.push(`/project/${projectId}/reality-check` as any)}
          >
            <Text style={[styles.headerButtonText, styles.headerButtonOutlineText]}>Reality Check</Text>
          </Pressable>
          <Pressable
            style={[styles.headerButton, styles.headerButtonOutline]}
            onPress={() => router.push(`/project/${projectId}/chat` as any)}
          >
            <Text style={[styles.headerButtonText, styles.headerButtonOutlineText]}>Chat</Text>
          </Pressable>
          <Pressable
            style={styles.headerButton}
            onPress={() => router.push(`/project/${projectId}/export` as any)}
          >
            <Text style={styles.headerButtonText}>Export</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.workspace, isWide && styles.workspaceWide]}>
        {/* Artifact sidebar */}
        <View style={[styles.sidebar, isWide && styles.sidebarWide]}>
          <Text style={styles.sidebarTitle}>ARTIFACTS</Text>
          <ScrollView>
            {artifacts.map((artifact) => (
              <Pressable
                key={artifact.id}
                style={[
                  styles.artifactItem,
                  selectedArtifact?.id === artifact.id && styles.artifactItemSelected,
                ]}
                onPress={() => handleArtifactSelect(artifact)}
              >
                <View style={styles.artifactItemRow}>
                  <Text
                    style={[
                      styles.artifactName,
                      selectedArtifact?.id === artifact.id && styles.artifactNameSelected,
                    ]}
                  >
                    {ARTIFACT_LABELS[artifact.type] || artifact.type}
                  </Text>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: STATUS_COLORS[artifact.status] || colors.muted },
                    ]}
                  />
                </View>
                {artifact.version > 1 && (
                  <Text style={styles.versionBadge}>v{artifact.version}</Text>
                )}
              </Pressable>
            ))}

            {artifacts.length === 0 && (
              <View style={styles.emptyArtifacts}>
                <Text style={styles.emptyText}>
                  Artifacts are being generated...
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Tools section */}
          <View style={styles.toolsSection}>
            <Text style={styles.sidebarTitle}>TOOLS</Text>
            <Pressable
              style={styles.toolButton}
              onPress={() => router.push(`/project/${projectId}/export` as any)}
            >
              <Text style={styles.toolButtonText}>Export project</Text>
            </Pressable>
          </View>
        </View>

        {/* Main content area */}
        {isWide && (
          <View style={styles.mainContent}>
            {selectedArtifact ? (
              <ScrollView
                contentContainerStyle={styles.artifactContent}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
              >
                <View style={styles.artifactHeader}>
                  <Text style={styles.artifactTitle}>
                    {ARTIFACT_LABELS[selectedArtifact.type]}
                  </Text>
                  {selectedArtifact.version > 1 && (
                    <Text style={styles.artifactVersion}>Version {selectedArtifact.version}</Text>
                  )}
                </View>

                {selectedArtifact.status === 'generating' && (
                  <View style={styles.generatingBanner}>
                    <ActivityIndicator size="small" color={colors.gold} />
                    <Text style={styles.generatingText}>Generating...</Text>
                  </View>
                )}

                {selectedArtifact.status === 'failed' && (
                  <View style={styles.failedBanner}>
                    <Text style={styles.failedText}>
                      Generation failed. Try regenerating this artifact.
                    </Text>
                  </View>
                )}

                {selectedArtifact.content_markdown && (
                  <Text style={styles.markdownContent}>
                    {selectedArtifact.content_markdown}
                  </Text>
                )}
              </ScrollView>
            ) : (
              <View style={styles.noSelection}>
                <Text style={styles.noSelectionText}>
                  Select an artifact to view
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Mobile: show artifact list as FlatList */}
        {!isWide && !selectedArtifact && (
          <FlatList
            data={artifacts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.mobileList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            renderItem={({ item }) => (
              <Pressable
                style={styles.mobileCard}
                onPress={() => handleArtifactSelect(item)}
              >
                <View style={styles.mobileCardHeader}>
                  <Text style={styles.mobileCardTitle}>
                    {ARTIFACT_LABELS[item.type]}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: STATUS_COLORS[item.status] || colors.muted },
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>{item.status}</Text>
                  </View>
                </View>
                {item.content_markdown && (
                  <Text style={styles.mobileCardPreview} numberOfLines={2}>
                    {item.content_markdown.slice(0, 200)}
                  </Text>
                )}
              </Pressable>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  loadingContainer: { flex: 1, backgroundColor: colors.paper, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, backgroundColor: colors.paper, justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
  errorTitle: { fontFamily: typography.families.display, fontSize: typography.sizes.displaySm, color: colors.ink, marginBottom: spacing[4] },
  backLink: { padding: spacing[3] },
  backLinkText: { fontFamily: typography.families.body, fontSize: typography.sizes.bodyMd, color: colors.accent },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.paper3 },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  headerBack: { fontFamily: typography.families.body, fontSize: typography.sizes.bodyMd, color: colors.accent },
  headerTitle: { fontFamily: typography.families.display, fontSize: typography.sizes.bodyLg, fontWeight: typography.weights.bold, color: colors.ink, flex: 1 },
  headerPhase: { fontFamily: typography.families.mono, fontSize: typography.sizes.monoXs, color: colors.muted, textTransform: 'uppercase', letterSpacing: typography.letterSpacing.wide },
  headerActions: { flexDirection: 'row', gap: spacing[2] },
  headerButton: { backgroundColor: colors.accent, borderRadius: radii.md, paddingVertical: spacing[2], paddingHorizontal: spacing[4] },
  headerButtonOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.ink },
  headerButtonText: { fontFamily: typography.families.body, fontSize: typography.sizes.bodySm, fontWeight: typography.weights.semibold, color: colors.white },
  headerButtonOutlineText: { color: colors.ink },

  // Workspace layout
  workspace: { flex: 1 },
  workspaceWide: { flexDirection: 'row' },

  // Sidebar
  sidebar: { borderBottomWidth: 1, borderBottomColor: colors.paper3, paddingBottom: spacing[4] },
  sidebarWide: { width: 240, borderBottomWidth: 0, borderRightWidth: 1, borderRightColor: colors.paper3, paddingBottom: 0 },
  sidebarTitle: { fontFamily: typography.families.mono, fontSize: typography.sizes.monoXs, color: colors.muted, letterSpacing: typography.letterSpacing.wide, textTransform: 'uppercase', padding: spacing[4], paddingBottom: spacing[2] },

  artifactItem: { paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderLeftWidth: 3, borderLeftColor: 'transparent' },
  artifactItemSelected: { backgroundColor: colors.paper2, borderLeftColor: colors.accent },
  artifactItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  artifactName: { fontFamily: typography.families.body, fontSize: typography.sizes.bodyMd, color: colors.ink },
  artifactNameSelected: { fontWeight: typography.weights.semibold, color: colors.accent },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  versionBadge: { fontFamily: typography.families.mono, fontSize: typography.sizes.monoXs, color: colors.muted, marginTop: 2 },

  emptyArtifacts: { padding: spacing[4] },
  emptyText: { fontFamily: typography.families.body, fontSize: typography.sizes.bodySm, color: colors.muted, fontStyle: 'italic' },

  toolsSection: { borderTopWidth: 1, borderTopColor: colors.paper3, marginTop: spacing[2] },
  toolButton: { paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  toolButtonText: { fontFamily: typography.families.body, fontSize: typography.sizes.bodyMd, color: colors.accent },

  // Main content
  mainContent: { flex: 1 },
  artifactContent: { padding: spacing[6] },
  artifactHeader: { flexDirection: 'row', alignItems: 'baseline', gap: spacing[3], marginBottom: spacing[4] },
  artifactTitle: { fontFamily: typography.families.display, fontSize: typography.sizes.displayMd, fontWeight: typography.weights.bold, color: colors.ink },
  artifactVersion: { fontFamily: typography.families.mono, fontSize: typography.sizes.monoXs, color: colors.muted },

  generatingBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: '#FFF8E1', padding: spacing[3], borderRadius: radii.md, marginBottom: spacing[4] },
  generatingText: { fontFamily: typography.families.body, fontSize: typography.sizes.bodySm, color: colors.gold },
  failedBanner: { backgroundColor: '#FFF0ED', padding: spacing[3], borderRadius: radii.md, marginBottom: spacing[4] },
  failedText: { fontFamily: typography.families.body, fontSize: typography.sizes.bodySm, color: colors.error },

  markdownContent: { fontFamily: typography.families.body, fontSize: typography.sizes.bodyMd, color: colors.ink, lineHeight: typography.lineHeights.bodyMd * 1.4 },

  noSelection: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noSelectionText: { fontFamily: typography.families.body, fontSize: typography.sizes.bodyMd, color: colors.muted },

  // Mobile list
  mobileList: { padding: spacing[4], gap: spacing[3] },
  mobileCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.paper3, borderRadius: radii.lg, padding: spacing[4] },
  mobileCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] },
  mobileCardTitle: { fontFamily: typography.families.display, fontSize: typography.sizes.bodyLg, fontWeight: typography.weights.semibold, color: colors.ink },
  statusBadge: { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radii.sm },
  statusBadgeText: { fontFamily: typography.families.mono, fontSize: typography.sizes.monoXs, color: colors.white, textTransform: 'uppercase' },
  mobileCardPreview: { fontFamily: typography.families.body, fontSize: typography.sizes.bodySm, color: colors.muted, lineHeight: typography.lineHeights.bodySm },
});
