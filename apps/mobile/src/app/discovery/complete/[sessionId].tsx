// ============================================================
// Jetdale — Discovery Completion Screen
// Shows loading progress as artifacts are generated.
// Listens to Realtime for artifact status updates.
// Auto-routes to workspace when all artifacts ready.
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthProvider';
import { colors, typography, spacing, radii } from '@/theme/tokens';

interface ProgressStep {
  label: string;
  status: 'pending' | 'active' | 'done';
}

const GENERATION_STEPS: string[] = [
  'Analyzing your answers',
  'Crafting the vision',
  'Defining user personas',
  'Mapping the scope',
  'Building the roadmap',
  'Assessing risks',
  'Setting success metrics',
  'Calculating budget',
  'Stress-testing the plan',
];

export default function DiscoveryCompleteScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { user } = useAuth();
  const [steps, setSteps] = useState<ProgressStep[]>(
    GENERATION_STEPS.map((label, i) => ({
      label,
      status: i === 0 ? 'active' : 'pending',
    })),
  );
  const [projectId, setProjectId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  // Pulse animation for active step
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Get project ID from session
  useEffect(() => {
    async function fetchSession() {
      const { data, error: err } = await supabase
        .from('discovery_sessions')
        .select('project_id')
        .eq('id', sessionId)
        .single();

      if (err || !data) {
        setError('Could not find your session.');
        return;
      }
      setProjectId(data.project_id);
    }
    fetchSession();
  }, [sessionId]);

  // Subscribe to artifact generation progress via Realtime
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`artifacts-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'artifacts',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const artifact = payload.new as { artifact_type?: string; status?: string };
          if (!artifact) return;

          // Map artifact status to step progress
          updateStepProgress(artifact.artifact_type, artifact.status);
        },
      )
      .subscribe();

    // Also trigger artifact generation
    triggerArtifactGeneration();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  // Check if all artifacts are ready periodically as a fallback
  useEffect(() => {
    if (!projectId) return;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('artifacts')
        .select('status')
        .eq('project_id', projectId)
        .eq('is_current', true);

      if (data && data.length > 0) {
        const allReady = data.every((a) => a.status === 'ready');
        if (allReady) {
          clearInterval(interval);
          // Mark all steps as done and navigate
          setSteps((prev) =>
            prev.map((s) => ({ ...s, status: 'done' as const })),
          );
          setTimeout(() => {
            router.replace(`/project/${projectId}`);
          }, 1500);
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [projectId]);

  async function triggerArtifactGeneration() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-artifact-gen`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            sessionId,
            projectId,
          }),
        },
      );

      if (!response.ok) {
        const err = await response.json();
        setError(err.error || 'Failed to start artifact generation');
      }
    } catch {
      setError('Failed to connect to the server. Please check your connection.');
    }
  }

  function updateStepProgress(artifactType?: string, status?: string) {
    // Map artifact types to approximate step indices
    const artifactStepMap: Record<string, number> = {
      vision: 1,
      personas: 2,
      scope: 3,
      roadmap: 4,
      risk_register: 5,
      success_metrics: 6,
      budget: 7,
    };

    if (!artifactType) return;
    const stepIndex = artifactStepMap[artifactType];
    if (stepIndex === undefined) return;

    setSteps((prev) => {
      const updated = [...prev];

      if (status === 'generating') {
        // Mark this step as active, previous as done
        for (let i = 0; i <= stepIndex; i++) {
          if (i < stepIndex) updated[i] = { ...updated[i], status: 'done' };
          else updated[i] = { ...updated[i], status: 'active' };
        }
      } else if (status === 'ready') {
        updated[stepIndex] = { ...updated[stepIndex], status: 'done' };
        // Activate next pending step
        const nextPending = updated.findIndex((s) => s.status === 'pending');
        if (nextPending !== -1) {
          updated[nextPending] = { ...updated[nextPending], status: 'active' };
        }
      }

      return updated;
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>GENERATING YOUR PLAN</Text>
        <Text style={styles.title}>Building something great takes a moment</Text>
        <Text style={styles.subtitle}>
          We are analyzing your answers and generating personalized planning
          documents. This usually takes 30-60 seconds.
        </Text>

        <View style={styles.stepsList}>
          {steps.map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <View style={styles.stepIndicator}>
                {step.status === 'done' && (
                  <View style={styles.stepDone}>
                    <Text style={styles.checkmark}>&#10003;</Text>
                  </View>
                )}
                {step.status === 'active' && (
                  <Animated.View
                    style={[styles.stepActive, { opacity: pulseAnim }]}
                  />
                )}
                {step.status === 'pending' && (
                  <View style={styles.stepPending} />
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  step.status === 'done' && styles.stepLabelDone,
                  step.status === 'active' && styles.stepLabelActive,
                ]}
              >
                {step.label}
              </Text>
            </View>
          ))}
        </View>

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { flex: 1, padding: spacing[6], paddingTop: spacing[16], justifyContent: 'flex-start' },
  eyebrow: { fontFamily: typography.families.mono, fontSize: typography.sizes.monoXs, color: colors.muted, letterSpacing: typography.letterSpacing.wide, textTransform: 'uppercase', marginBottom: spacing[3] },
  title: { fontFamily: typography.families.display, fontSize: typography.sizes.displayMd, fontWeight: typography.weights.bold, color: colors.ink, lineHeight: typography.lineHeights.displayMd, marginBottom: spacing[2] },
  subtitle: { fontFamily: typography.families.body, fontSize: typography.sizes.bodyMd, color: colors.muted, lineHeight: typography.lineHeights.bodyMd, marginBottom: spacing[8] },

  stepsList: { gap: spacing[4] },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  stepIndicator: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  stepDone: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.moss, justifyContent: 'center', alignItems: 'center' },
  checkmark: { color: colors.white, fontSize: 14, fontWeight: typography.weights.bold },
  stepActive: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent },
  stepPending: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.paper3 },

  stepLabel: { fontFamily: typography.families.body, fontSize: typography.sizes.bodyMd, color: colors.muted },
  stepLabelDone: { color: colors.moss },
  stepLabelActive: { color: colors.ink, fontWeight: typography.weights.medium },

  errorCard: { marginTop: spacing[6], backgroundColor: '#FFF0ED', borderRadius: radii.md, padding: spacing[4] },
  errorText: { fontFamily: typography.families.body, fontSize: typography.sizes.bodySm, color: colors.error },
});
