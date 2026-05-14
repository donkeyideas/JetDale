// ============================================================
// Jetdale — Discovery Start Screen
// "In one sentence, what are you building?"
// Detects archetype via AI, creates project + session, routes
// to the first question.
// ============================================================

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthProvider';
import { colors, typography, spacing, radii } from '@/theme/tokens';

const ARCHETYPE_CARDS = [
  { slug: 'indie_software', name: 'Indie software product', icon: 'code', description: 'SaaS, mobile app, developer tool, marketplace' },
  { slug: 'ai_built_app', name: 'AI-built app', icon: 'cpu', description: 'Build with Lovable, Cursor, Claude Code, Bolt' },
  { slug: 'mobile_game', name: 'Indie game', icon: 'gamepad', description: 'Mobile, PC, or console game' },
  { slug: 'wedding_event', name: 'Wedding or event', icon: 'calendar', description: 'Wedding, corporate event, milestone celebration' },
  { slug: 'home_renovation', name: 'Home renovation', icon: 'hammer', description: 'Kitchen, bathroom, addition, full remodel' },
];

export default function DiscoveryStartScreen() {
  const { user } = useAuth();
  const [ideaText, setIdeaText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const inputRef = useRef<TextInput>(null);

  async function startDiscovery(input: string, archetypeSlug?: string) {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // Call ai-discovery edge function to detect archetype if not provided
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${supabaseUrl}/functions/v1/ai-discovery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'start',
          ideaText: input,
          archetypeSlug,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to start discovery');
      }

      const result = await response.json();
      // Navigate to the first question
      router.replace(`/discovery/${result.sessionId}/q/0`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit() {
    const trimmed = ideaText.trim();
    if (trimmed.length < 5) {
      setError('Tell us a bit more about your idea.');
      return;
    }
    startDiscovery(trimmed);
  }

  function handleTemplateSelect(slug: string) {
    startDiscovery('', slug);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>NEW PROJECT</Text>
          <Text style={styles.title}>What are you building?</Text>
          <Text style={styles.subtitle}>
            Describe your idea in one sentence. We will figure out the right
            questions to ask.
          </Text>
        </View>

        {/* Main input */}
        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="I want to build a..."
            placeholderTextColor={colors.muted}
            value={ideaText}
            onChangeText={setIdeaText}
            multiline
            maxLength={500}
            textAlignVertical="top"
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={handleSubmit}
            editable={!loading}
          />
          <Text style={styles.charCount}>
            {ideaText.length}/500
          </Text>
        </View>

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {/* Submit button */}
        <Pressable
          style={[
            styles.submitButton,
            (loading || ideaText.trim().length < 5) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={loading || ideaText.trim().length < 5}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Start Planning</Text>
          )}
        </Pressable>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or pick a template</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Template cards */}
        <Pressable
          style={styles.templatesToggle}
          onPress={() => setShowTemplates(!showTemplates)}
        >
          <Text style={styles.templatesToggleText}>
            {showTemplates ? 'Hide templates' : 'Browse templates'}
          </Text>
        </Pressable>

        {showTemplates && (
          <View style={styles.templateGrid}>
            {ARCHETYPE_CARDS.map((archetype) => (
              <Pressable
                key={archetype.slug}
                style={styles.templateCard}
                onPress={() => handleTemplateSelect(archetype.slug)}
                disabled={loading}
              >
                <Text style={styles.templateName}>{archetype.name}</Text>
                <Text style={styles.templateDescription}>
                  {archetype.description}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  scroll: {
    padding: spacing[6],
    paddingTop: spacing[12],
  },
  header: {
    marginBottom: spacing[8],
  },
  eyebrow: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.monoXs,
    color: colors.muted,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase',
    marginBottom: spacing[3],
  },
  title: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.displayLg,
    fontWeight: typography.weights.bold,
    color: colors.ink,
    lineHeight: typography.lineHeights.displayLg,
    marginBottom: spacing[3],
  },
  subtitle: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.bodyLg,
    color: colors.muted,
    lineHeight: typography.lineHeights.bodyLg,
  },
  inputContainer: {
    marginBottom: spacing[4],
    position: 'relative',
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.paper3,
    borderRadius: radii.lg,
    padding: spacing[4],
    paddingTop: spacing[4],
    fontFamily: typography.families.body,
    fontSize: typography.sizes.bodyLg,
    color: colors.ink,
    minHeight: 120,
    lineHeight: typography.lineHeights.bodyLg,
  },
  charCount: {
    position: 'absolute',
    bottom: spacing[2],
    right: spacing[3],
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.monoXs,
    color: colors.muted,
  },
  errorText: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.bodySm,
    color: colors.error,
    marginBottom: spacing[3],
  },
  submitButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.bodyLg,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing[6],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.paper3,
  },
  dividerText: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.bodySm,
    color: colors.muted,
    paddingHorizontal: spacing[3],
  },
  templatesToggle: {
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  templatesToggleText: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.bodyMd,
    color: colors.accent,
    fontWeight: typography.weights.medium,
  },
  templateGrid: {
    gap: spacing[3],
  },
  templateCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.paper3,
    borderRadius: radii.lg,
    padding: spacing[4],
  },
  templateName: {
    fontFamily: typography.families.display,
    fontSize: typography.sizes.bodyLg,
    fontWeight: typography.weights.semibold,
    color: colors.ink,
    marginBottom: spacing[1],
  },
  templateDescription: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.bodySm,
    color: colors.muted,
  },
});
