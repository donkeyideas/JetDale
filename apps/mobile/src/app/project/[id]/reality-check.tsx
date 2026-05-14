// ============================================================
// Jetdale — Reality Check Screen
// Shows AI-generated concerns, proposed changes, with
// accept/reject toggles per item.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthProvider';
import { env } from '@/config/env';
import { colors, typography, spacing, radii } from '@/theme/tokens';

interface Concern {
  severity: 'high' | 'medium' | 'low';
  area: string;
  title: string;
  message: string;
  suggested_action: string;
}

interface ProposedChange {
  artifact_type: string;
  change_description: string;
}

interface RealityCheck {
  id: string;
  summary: string;
  concerns: Concern[];
  proposed_changes: ProposedChange[];
  user_responses: Record<string, boolean>;
  created_at: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  high: colors.error,
  medium: colors.gold,
  low: colors.moss,
};

const AREA_LABELS: Record<string, string> = {
  budget: 'Budget',
  timeline: 'Timeline',
  scope: 'Scope',
  market: 'Market',
  technical: 'Technical',
  team: 'Team',
  legal: 'Legal',
};

export default function RealityCheckScreen() {
  const { id: projectId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [check, setCheck] = useState<RealityCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [responses, setResponses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadLatestCheck();
  }, [projectId]);

  async function loadLatestCheck() {
    if (!projectId) return;

    const { data } = await supabase
      .from('reality_checks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setCheck(data as RealityCheck);
      setResponses(data.user_responses || {});
    }
    setLoading(false);
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-reality-check`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ projectId }),
        },
      );

      if (!response.ok) {
        const err = await response.json();
        if (err.reason === 'limit_exceeded') {
          router.push('/paywall' as any);
          return;
        }
        Alert.alert('Error', err.error || 'Failed to generate reality check');
        return;
      }

      const result = await response.json();
      setCheck(result.realityCheck);
      setResponses({});
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      Alert.alert('Error', message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleToggleResponse(key: string, accepted: boolean) {
    const updated = { ...responses, [key]: accepted };
    setResponses(updated);

    if (check) {
      await supabase
        .from('reality_checks')
        .update({ user_responses: updated })
        .eq('id', check.id);
    }
  }

  async function handleApplyChanges() {
    if (!check) return;

    const acceptedChanges = check.proposed_changes.filter(
      (_, i) => responses[`change_${i}`] === true,
    );

    if (acceptedChanges.length === 0) {
      Alert.alert('No changes selected', 'Accept at least one proposed change to apply.');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

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
        return;
      }

      const artifactTypes = acceptedChanges.map((c) => c.artifact_type);

      await fetch(
        `${env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-artifact-gen`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            sessionId: discoverySession.id,
            projectId,
            artifactTypes,
          }),
        },
      );

      Alert.alert('Regenerating', `${artifactTypes.length} artifact(s) are being regenerated.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      Alert.alert('Error', message);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Reality Check</Text>
        <Pressable
          style={[styles.generateButton, generating && styles.generateButtonDisabled]}
          onPress={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.generateButtonText}>
              {check ? 'Run again' : 'Run check'}
            </Text>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!check && !generating && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No reality check yet</Text>
            <Text style={styles.emptyText}>
              Run a reality check to have AI analyze your project for contradictions,
              unrealistic expectations, and missing considerations.
            </Text>
            <Pressable style={styles.emptyButton} onPress={handleGenerate}>
              <Text style={styles.emptyButtonText}>Run reality check</Text>
            </Pressable>
          </View>
        )}

        {generating && !check && (
          <View style={styles.generatingState}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.generatingText}>
              Analyzing your project...
            </Text>
            <Text style={styles.generatingSubtext}>
              This may take 30-60 seconds. The AI is reviewing all your artifacts and discovery answers.
            </Text>
          </View>
        )}

        {check && (
          <>
            {/* Summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>SUMMARY</Text>
              <Text style={styles.summaryText}>{check.summary}</Text>
              <Text style={styles.summaryMeta}>
                {check.concerns.length} concern{check.concerns.length !== 1 ? 's' : ''} found
              </Text>
            </View>

            {/* Concerns */}
            <Text style={styles.sectionTitle}>CONCERNS</Text>
            {check.concerns.map((concern, i) => (
              <View key={i} style={styles.concernCard}>
                <View style={styles.concernHeader}>
                  <View
                    style={[
                      styles.severityBadge,
                      { backgroundColor: SEVERITY_COLORS[concern.severity] || colors.muted },
                    ]}
                  >
                    <Text style={styles.severityText}>{concern.severity}</Text>
                  </View>
                  <View style={styles.areaBadge}>
                    <Text style={styles.areaText}>
                      {AREA_LABELS[concern.area] || concern.area}
                    </Text>
                  </View>
                </View>
                <Text style={styles.concernTitle}>{concern.title}</Text>
                <Text style={styles.concernMessage}>{concern.message}</Text>
                <View style={styles.actionBox}>
                  <Text style={styles.actionLabel}>Suggested action:</Text>
                  <Text style={styles.actionText}>{concern.suggested_action}</Text>
                </View>
              </View>
            ))}

            {/* Proposed changes */}
            {check.proposed_changes.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>PROPOSED CHANGES</Text>
                {check.proposed_changes.map((change, i) => {
                  const key = `change_${i}`;
                  const accepted = responses[key];
                  return (
                    <View key={i} style={styles.changeCard}>
                      <View style={styles.changeHeader}>
                        <View style={styles.artifactBadge}>
                          <Text style={styles.artifactBadgeText}>
                            {change.artifact_type.replace('_', ' ')}
                          </Text>
                        </View>
                        <View style={styles.toggleRow}>
                          <Pressable
                            style={[styles.toggleButton, accepted === true && styles.toggleAccept]}
                            onPress={() => handleToggleResponse(key, true)}
                          >
                            <Text style={[styles.toggleText, accepted === true && styles.toggleTextActive]}>
                              Accept
                            </Text>
                          </Pressable>
                          <Pressable
                            style={[styles.toggleButton, accepted === false && styles.toggleReject]}
                            onPress={() => handleToggleResponse(key, false)}
                          >
                            <Text style={[styles.toggleText, accepted === false && styles.toggleTextActive]}>
                              Reject
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                      <Text style={styles.changeDescription}>{change.change_description}</Text>
                    </View>
                  );
                })}

                <Pressable style={styles.applyButton} onPress={handleApplyChanges}>
                  <Text style={styles.applyButtonText}>Apply accepted changes</Text>
                </Pressable>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  loadingContainer: { flex: 1, backgroundColor: colors.paper, justifyContent: 'center', alignItems: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.paper3 },
  backText: { fontFamily: typography.families.body, fontSize: typography.sizes.bodyMd, color: colors.accent },
  headerTitle: { fontFamily: typography.families.display, fontSize: typography.sizes.bodyLg, fontWeight: typography.weights.bold, color: colors.ink },
  generateButton: { backgroundColor: colors.accent, borderRadius: radii.md, paddingVertical: spacing[2], paddingHorizontal: spacing[3], minWidth: 100, alignItems: 'center' },
  generateButtonDisabled: { opacity: 0.5 },
  generateButtonText: { fontFamily: typography.families.body, fontSize: typography.sizes.bodySm, fontWeight: typography.weights.semibold, color: colors.white },

  content: { padding: spacing[4], paddingBottom: spacing[16] },

  emptyState: { alignItems: 'center', paddingTop: spacing[12] },
  emptyTitle: { fontFamily: typography.families.display, fontSize: typography.sizes.displaySm, fontWeight: typography.weights.semibold, color: colors.ink, marginBottom: spacing[2] },
  emptyText: { fontFamily: typography.families.body, fontSize: typography.sizes.bodyMd, color: colors.muted, textAlign: 'center', marginBottom: spacing[6], maxWidth: 400 },
  emptyButton: { backgroundColor: colors.accent, borderRadius: radii.md, paddingVertical: spacing[3], paddingHorizontal: spacing[6] },
  emptyButtonText: { fontFamily: typography.families.body, fontSize: typography.sizes.bodyMd, fontWeight: typography.weights.semibold, color: colors.white },

  generatingState: { alignItems: 'center', paddingTop: spacing[12], gap: spacing[4] },
  generatingText: { fontFamily: typography.families.display, fontSize: typography.sizes.bodyLg, fontWeight: typography.weights.semibold, color: colors.ink },
  generatingSubtext: { fontFamily: typography.families.body, fontSize: typography.sizes.bodySm, color: colors.muted, textAlign: 'center', maxWidth: 300 },

  summaryCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.paper3, borderRadius: radii.lg, padding: spacing[4], marginBottom: spacing[4] },
  summaryLabel: { fontFamily: typography.families.mono, fontSize: typography.sizes.monoXs, color: colors.muted, letterSpacing: 1, marginBottom: spacing[2] },
  summaryText: { fontFamily: typography.families.body, fontSize: typography.sizes.bodyMd, color: colors.ink, lineHeight: 22 },
  summaryMeta: { fontFamily: typography.families.mono, fontSize: typography.sizes.monoXs, color: colors.muted, marginTop: spacing[3] },

  sectionTitle: { fontFamily: typography.families.mono, fontSize: typography.sizes.monoXs, color: colors.muted, letterSpacing: 1, marginTop: spacing[4], marginBottom: spacing[3] },

  concernCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.paper3, borderRadius: radii.lg, padding: spacing[4], marginBottom: spacing[3] },
  concernHeader: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[2] },
  severityBadge: { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radii.sm },
  severityText: { fontFamily: typography.families.mono, fontSize: typography.sizes.monoXs, color: colors.white, textTransform: 'uppercase' },
  areaBadge: { backgroundColor: colors.paper2, paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radii.sm },
  areaText: { fontFamily: typography.families.mono, fontSize: typography.sizes.monoXs, color: colors.ink },
  concernTitle: { fontFamily: typography.families.display, fontSize: typography.sizes.bodyMd, fontWeight: typography.weights.semibold, color: colors.ink, marginBottom: spacing[2] },
  concernMessage: { fontFamily: typography.families.body, fontSize: typography.sizes.bodySm, color: colors.ink, lineHeight: 20, marginBottom: spacing[3] },
  actionBox: { backgroundColor: colors.paper2, padding: spacing[3], borderRadius: radii.md },
  actionLabel: { fontFamily: typography.families.body, fontSize: typography.sizes.monoXs, fontWeight: typography.weights.semibold, color: colors.muted, marginBottom: 4 },
  actionText: { fontFamily: typography.families.body, fontSize: typography.sizes.bodySm, color: colors.ink },

  changeCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.paper3, borderRadius: radii.lg, padding: spacing[4], marginBottom: spacing[3] },
  changeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] },
  artifactBadge: { backgroundColor: colors.ink, paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radii.sm },
  artifactBadgeText: { fontFamily: typography.families.mono, fontSize: typography.sizes.monoXs, color: colors.white, textTransform: 'uppercase' },
  toggleRow: { flexDirection: 'row', gap: spacing[1] },
  toggleButton: { paddingHorizontal: spacing[3], paddingVertical: spacing[1], borderRadius: radii.sm, borderWidth: 1, borderColor: colors.paper3 },
  toggleAccept: { backgroundColor: colors.moss, borderColor: colors.moss },
  toggleReject: { backgroundColor: colors.error, borderColor: colors.error },
  toggleText: { fontFamily: typography.families.body, fontSize: typography.sizes.monoXs, color: colors.ink },
  toggleTextActive: { color: colors.white },
  changeDescription: { fontFamily: typography.families.body, fontSize: typography.sizes.bodySm, color: colors.ink, lineHeight: 20 },

  applyButton: { backgroundColor: colors.accent, borderRadius: radii.md, paddingVertical: spacing[3], alignItems: 'center', marginTop: spacing[4] },
  applyButtonText: { fontFamily: typography.families.body, fontSize: typography.sizes.bodyMd, fontWeight: typography.weights.semibold, color: colors.white },
});
