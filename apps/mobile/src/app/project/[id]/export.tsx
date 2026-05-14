// ============================================================
// Jetdale — Export Screen
// Select export target, preview contents, generate + download.
// Full implementation in Phase 6. This is the scaffolded UI.
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
  Share,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthProvider';
import { env } from '@/config/env';
import { colors, typography, spacing, radii } from '@/theme/tokens';

interface ExportTarget {
  key: string;
  name: string;
  description: string;
  freeAccess: boolean;
}

const EXPORT_TARGETS: ExportTarget[] = [
  { key: 'zip_markdown', name: 'Markdown files', description: 'All artifacts as .md files in a zip', freeAccess: true },
  { key: 'claude_code', name: 'Claude Code', description: 'CLAUDE.md + project files optimized for Claude Code', freeAccess: false },
  { key: 'cursor', name: 'Cursor', description: '.cursorrules + project files for Cursor AI', freeAccess: false },
  { key: 'lovable', name: 'Lovable', description: 'Single mega-prompt optimized for Lovable', freeAccess: false },
  { key: 'bolt', name: 'Bolt', description: 'AI builder optimized format for Bolt', freeAccess: false },
  { key: 'replit', name: 'Replit', description: 'Project spec optimized for Replit AI', freeAccess: false },
  { key: 'pdf', name: 'PDF Document', description: 'Professional PDF with all artifacts', freeAccess: false },
  { key: 'pitch_deck', name: 'Pitch Deck', description: '10-slide pitch deck as HTML/PDF', freeAccess: false },
  { key: 'rfp', name: 'RFP Document', description: 'Formal Request for Proposal template', freeAccess: false },
];

export default function ExportScreen() {
  const { id: projectId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [planTier, setPlanTier] = useState('free');

  useEffect(() => {
    async function loadTier() {
      const { data } = await supabase
        .from('subscriptions')
        .select('plan_tier')
        .eq('user_id', user?.id)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) setPlanTier(data.plan_tier);
    }
    if (user) loadTier();
  }, [user]);

  async function handleExport() {
    if (!selectedTarget || !projectId) return;

    const target = EXPORT_TARGETS.find((t) => t.key === selectedTarget);
    if (!target) return;

    // Check if free user trying to access paid feature
    if (!target.freeAccess && planTier === 'free') {
      router.push('/paywall' as any);
      return;
    }

    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/export-bundle`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            projectId,
            target: selectedTarget,
          }),
        },
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Export failed');
      }

      const result = await response.json();

      if (result.downloadUrl) {
        if (Platform.OS === 'web') {
          window.open(result.downloadUrl, '_blank');
        } else {
          await Share.share({
            url: result.downloadUrl,
            message: `${target.name} export for your project`,
          });
        }
      }

      Alert.alert('Export ready', `Your ${target.name} export has been generated.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Export failed';
      Alert.alert('Error', message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Export Project</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          Choose a format to export your planning documents.
        </Text>

        {EXPORT_TARGETS.map((target) => {
          const isLocked = !target.freeAccess && planTier === 'free';
          const isSelected = selectedTarget === target.key;

          return (
            <Pressable
              key={target.key}
              style={[
                styles.targetCard,
                isSelected && styles.targetCardSelected,
                isLocked && styles.targetCardLocked,
              ]}
              onPress={() => setSelectedTarget(target.key)}
            >
              <View style={styles.targetHeader}>
                <Text style={[styles.targetName, isSelected && styles.targetNameSelected]}>
                  {target.name}
                </Text>
                {isLocked && <Text style={styles.lockBadge}>PRO</Text>}
              </View>
              <Text style={styles.targetDescription}>{target.description}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.exportButton, (!selectedTarget || generating) && styles.exportButtonDisabled]}
          onPress={handleExport}
          disabled={!selectedTarget || generating}
        >
          {generating ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.exportButtonText}>
              Generate Export
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.paper3 },
  backText: { fontFamily: typography.families.body, fontSize: typography.sizes.bodyMd, color: colors.accent },
  headerTitle: { fontFamily: typography.families.display, fontSize: typography.sizes.bodyLg, fontWeight: typography.weights.bold, color: colors.ink },

  content: { padding: spacing[6], gap: spacing[3] },
  subtitle: { fontFamily: typography.families.body, fontSize: typography.sizes.bodyMd, color: colors.muted, marginBottom: spacing[4] },

  targetCard: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.paper3, borderRadius: radii.lg, padding: spacing[4] },
  targetCardSelected: { borderColor: colors.accent, backgroundColor: '#FFF5F0' },
  targetCardLocked: { opacity: 0.7 },
  targetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[1] },
  targetName: { fontFamily: typography.families.body, fontSize: typography.sizes.bodyLg, fontWeight: typography.weights.semibold, color: colors.ink },
  targetNameSelected: { color: colors.accent },
  lockBadge: { fontFamily: typography.families.mono, fontSize: typography.sizes.monoXs, color: colors.accent, backgroundColor: '#FFF5F0', paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radii.sm },
  targetDescription: { fontFamily: typography.families.body, fontSize: typography.sizes.bodySm, color: colors.muted },

  footer: { padding: spacing[6], borderTopWidth: 1, borderTopColor: colors.paper3 },
  exportButton: { backgroundColor: colors.accent, borderRadius: radii.md, paddingVertical: spacing[4], alignItems: 'center', minHeight: 52 },
  exportButtonDisabled: { opacity: 0.5 },
  exportButtonText: { fontFamily: typography.families.body, fontSize: typography.sizes.bodyLg, fontWeight: typography.weights.semibold, color: colors.white },
});
