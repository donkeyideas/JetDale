// ============================================================
// Jetdale — Artifact Detail View
// Full artifact render with version history and regeneration.
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthProvider';
import { colors, typography, spacing, radii } from '@/theme/tokens';

interface ArtifactVersion {
  id: string;
  version: number;
  status: string;
  content_markdown: string | null;
  is_current: boolean;
  generation_model: string | null;
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

export default function ArtifactDetailScreen() {
  const { id: projectId, slug: artifactType } = useLocalSearchParams<{ id: string; slug: string }>();
  const { user } = useAuth();

  const [artifact, setArtifact] = useState<ArtifactVersion | null>(null);
  const [versions, setVersions] = useState<ArtifactVersion[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadArtifact = useCallback(async () => {
    if (!projectId || !artifactType) return;

    const { data, error } = await supabase
      .from('artifacts')
      .select('*')
      .eq('project_id', projectId)
      .eq('type', artifactType)
      .order('version', { ascending: false });

    if (data && data.length > 0) {
      const currentVersion = data.find((a: any) => a.is_current) || data[0];
      setArtifact(currentVersion as ArtifactVersion);
      setVersions(data as ArtifactVersion[]);
    }

    setLoading(false);
    setRefreshing(false);
  }, [projectId, artifactType]);

  useEffect(() => {
    loadArtifact();
  }, [loadArtifact]);

  // Realtime updates
  useEffect(() => {
    if (!projectId || !artifactType) return;

    const channel = supabase
      .channel(`artifact-${projectId}-${artifactType}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'artifacts',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const updated = payload.new as any;
          if (updated?.type === artifactType) {
            loadArtifact();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, artifactType, loadArtifact]);

  async function handleRegenerate() {
    if (regenerating) return;

    setRegenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Get the discovery session for this project
      const { data: discoverySession } = await supabase
        .from('discovery_sessions')
        .select('id')
        .eq('project_id', projectId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      if (!discoverySession) {
        Alert.alert('Error', 'No completed discovery session found.');
        setRegenerating(false);
        return;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-artifact-gen`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            sessionId: discoverySession.id,
            projectId,
            regenerateType: artifactType,
          }),
        },
      );

      if (!response.ok) {
        const err = await response.json();
        Alert.alert('Error', err.error || 'Failed to regenerate artifact');
      }
      // Realtime will update the UI
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      Alert.alert('Error', message);
    } finally {
      setRegenerating(false);
    }
  }

  async function handleRestoreVersion(versionId: string) {
    // Set all versions to not current, then set the selected one
    const admin = supabase;
    await admin
      .from('artifacts')
      .update({ is_current: false })
      .eq('project_id', projectId)
      .eq('type', artifactType);

    await admin
      .from('artifacts')
      .update({ is_current: true })
      .eq('id', versionId);

    loadArtifact();
    setShowVersions(false);
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const label = ARTIFACT_LABELS[artifactType || ''] || artifactType;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{label}</Text>
          {artifact && artifact.version > 1 && (
            <Pressable onPress={() => setShowVersions(!showVersions)}>
              <Text style={styles.versionText}>v{artifact.version}</Text>
            </Pressable>
          )}
        </View>
        <Pressable
          style={[styles.regenButton, regenerating && styles.regenButtonDisabled]}
          onPress={handleRegenerate}
          disabled={regenerating}
        >
          {regenerating ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.regenButtonText}>Regenerate</Text>
          )}
        </Pressable>
      </View>

      {/* Version history dropdown */}
      {showVersions && (
        <View style={styles.versionDropdown}>
          {versions.map((v) => (
            <Pressable
              key={v.id}
              style={[styles.versionItem, v.is_current && styles.versionItemActive]}
              onPress={() => handleRestoreVersion(v.id)}
            >
              <Text style={styles.versionItemText}>
                Version {v.version} {v.is_current ? '(current)' : ''}
              </Text>
              <Text style={styles.versionItemDate}>
                {new Date(v.created_at).toLocaleDateString()}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadArtifact(); }} />
        }
      >
        {artifact?.status === 'generating' && (
          <View style={styles.generatingBanner}>
            <ActivityIndicator size="small" color={colors.gold} />
            <Text style={styles.generatingText}>Generating new version...</Text>
          </View>
        )}

        {artifact?.status === 'failed' && (
          <View style={styles.failedBanner}>
            <Text style={styles.failedText}>
              Generation failed. Tap "Regenerate" to try again.
            </Text>
          </View>
        )}

        {artifact?.content_markdown ? (
          <Text style={styles.markdownText}>{artifact.content_markdown}</Text>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No content yet</Text>
            <Text style={styles.emptyText}>
              This artifact is still being generated or has not been created.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  loadingContainer: { flex: 1, backgroundColor: colors.paper, justifyContent: 'center', alignItems: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.paper3 },
  backButton: { padding: spacing[2] },
  backText: { fontFamily: typography.families.body, fontSize: typography.sizes.bodyMd, color: colors.accent },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontFamily: typography.families.display, fontSize: typography.sizes.bodyLg, fontWeight: typography.weights.bold, color: colors.ink },
  versionText: { fontFamily: typography.families.mono, fontSize: typography.sizes.monoXs, color: colors.accent, marginTop: 2 },
  regenButton: { backgroundColor: colors.ink, borderRadius: radii.md, paddingVertical: spacing[2], paddingHorizontal: spacing[3], minWidth: 100, alignItems: 'center' },
  regenButtonDisabled: { opacity: 0.5 },
  regenButtonText: { fontFamily: typography.families.body, fontSize: typography.sizes.bodySm, fontWeight: typography.weights.medium, color: colors.white },

  versionDropdown: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.paper3, paddingHorizontal: spacing[4] },
  versionItem: { paddingVertical: spacing[3], flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.paper2 },
  versionItemActive: { backgroundColor: colors.paper2 },
  versionItemText: { fontFamily: typography.families.body, fontSize: typography.sizes.bodyMd, color: colors.ink },
  versionItemDate: { fontFamily: typography.families.mono, fontSize: typography.sizes.monoXs, color: colors.muted },

  content: { padding: spacing[6], paddingBottom: spacing[16] },

  generatingBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: '#FFF8E1', padding: spacing[3], borderRadius: radii.md, marginBottom: spacing[4] },
  generatingText: { fontFamily: typography.families.body, fontSize: typography.sizes.bodySm, color: colors.gold },
  failedBanner: { backgroundColor: '#FFF0ED', padding: spacing[3], borderRadius: radii.md, marginBottom: spacing[4] },
  failedText: { fontFamily: typography.families.body, fontSize: typography.sizes.bodySm, color: colors.error },

  markdownText: { fontFamily: typography.families.body, fontSize: typography.sizes.bodyMd, color: colors.ink, lineHeight: typography.lineHeights.bodyMd * 1.4 },

  emptyState: { alignItems: 'center', paddingTop: spacing[12] },
  emptyTitle: { fontFamily: typography.families.display, fontSize: typography.sizes.displaySm, fontWeight: typography.weights.semibold, color: colors.ink, marginBottom: spacing[2] },
  emptyText: { fontFamily: typography.families.body, fontSize: typography.sizes.bodyMd, color: colors.muted, textAlign: 'center' },
});
