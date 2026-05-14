// ============================================================
// Jetdale — Discovery Question Screen
// The core interview UI. Renders each question based on type,
// streams AI response, handles voice input, auto-saves drafts.
// ============================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthProvider';
import { colors, typography, spacing, radii } from '@/theme/tokens';

type QuestionType = 'open_text' | 'single_select' | 'multi_select' | 'numeric' | 'range' | 'archetype_confirm';

interface QuestionData {
  key: string;
  type: QuestionType;
  question: string;
  helper?: string;
  voiceEnabled: boolean;
  options?: Array<{ value: string; label: string; description?: string }>;
  stage: { number: number; label: string };
  required: boolean;
}

interface SessionData {
  id: string;
  projectId: string;
  archetypeSlug: string;
  totalQuestions: number;
  currentQuestion: QuestionData;
}

export default function DiscoveryQuestionScreen() {
  const { sessionId, step } = useLocalSearchParams<{ sessionId: string; step: string }>();
  const { user } = useAuth();
  const stepNum = parseInt(step || '0', 10);

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [answer, setAnswer] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [numericValue, setNumericValue] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Load question data
  useEffect(() => {
    loadQuestion();
  }, [sessionId, stepNum]);

  // Auto-save draft for open_text every 5 seconds
  useEffect(() => {
    if (sessionData?.currentQuestion.type !== 'open_text') return;
    if (!answer.trim()) return;

    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      saveDraft(answer);
    }, 5000);

    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [answer]);

  async function loadQuestion() {
    setLoading(true);
    setError(null);
    setAnswer('');
    setSelectedOptions([]);
    setNumericValue('');
    setAiResponse('');

    try {
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
          action: 'get_question',
          sessionId,
          step: stepNum,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to load question');
      }

      const data = await response.json();
      setSessionData(data);

      // Load existing AI hint if any
      if (data.aiHint) {
        setAiResponse(data.aiHint);
      }

      // Load draft answer if any
      if (data.draftAnswer) {
        if (data.currentQuestion.type === 'open_text') {
          setAnswer(data.draftAnswer.text || '');
        } else if (data.currentQuestion.type === 'single_select' || data.currentQuestion.type === 'archetype_confirm') {
          setSelectedOptions(data.draftAnswer.value ? [data.draftAnswer.value] : []);
        } else if (data.currentQuestion.type === 'multi_select') {
          setSelectedOptions(data.draftAnswer.value || []);
        } else if (data.currentQuestion.type === 'numeric') {
          setNumericValue(String(data.draftAnswer.value || ''));
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load question';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function saveDraft(text: string) {
    if (!sessionId) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-discovery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'save_draft',
          sessionId,
          step: stepNum,
          answer: { text },
        }),
      });
    } catch {
      // Draft save is best-effort
    }
  }

  function getCurrentAnswer(): { type: QuestionType; value: unknown; text: string } {
    const q = sessionData?.currentQuestion;
    if (!q) return { type: 'open_text', value: '', text: '' };

    switch (q.type) {
      case 'open_text':
        return { type: q.type, value: answer, text: answer };
      case 'single_select':
      case 'archetype_confirm':
        return { type: q.type, value: selectedOptions[0] || '', text: selectedOptions[0] || '' };
      case 'multi_select':
        return { type: q.type, value: selectedOptions, text: selectedOptions.join(', ') };
      case 'numeric':
      case 'range':
        return { type: q.type, value: Number(numericValue), text: numericValue };
      default:
        return { type: q.type, value: answer, text: answer };
    }
  }

  function isAnswerValid(): boolean {
    const q = sessionData?.currentQuestion;
    if (!q) return false;
    if (!q.required) return true;

    switch (q.type) {
      case 'open_text': return answer.trim().length >= 3;
      case 'single_select':
      case 'archetype_confirm': return selectedOptions.length === 1;
      case 'multi_select': return selectedOptions.length >= 1;
      case 'numeric':
      case 'range': return numericValue.trim().length > 0;
      default: return false;
    }
  }

  async function handleContinue() {
    if (!isAnswerValid() || !sessionData) return;
    setSubmitting(true);
    setStreaming(true);
    setError(null);
    setAiResponse('');

    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const currentAnswer = getCurrentAnswer();

      const response = await fetch(`${supabaseUrl}/functions/v1/ai-discovery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'answer',
          sessionId,
          step: stepNum,
          answer: currentAnswer,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to submit answer');
      }

      // Handle SSE streaming
      if (response.headers.get('content-type')?.includes('text/event-stream')) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.token) {
                    accumulated += parsed.token;
                    setAiResponse(accumulated);
                  }
                  if (parsed.nextStep !== undefined) {
                    setStreaming(false);
                    setSubmitting(false);
                    // Navigate to next question or completion
                    if (parsed.nextStep === -1) {
                      router.replace(`/discovery/complete/${sessionId}`);
                    } else {
                      router.push(`/discovery/${sessionId}/q/${parsed.nextStep}`);
                    }
                    return;
                  }
                } catch {
                  // Skip malformed SSE data
                }
              }
            }
          }
        }
      } else {
        // Non-streaming fallback
        const result = await response.json();
        setAiResponse(result.aiResponse || '');

        if (result.nextStep === -1) {
          router.replace(`/discovery/complete/${sessionId}`);
        } else {
          router.push(`/discovery/${sessionId}/q/${result.nextStep}`);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
    } finally {
      setStreaming(false);
      setSubmitting(false);
    }
  }

  function handleBack() {
    if (stepNum > 0) {
      router.back();
    } else {
      router.replace('/discovery/start');
    }
  }

  function toggleOption(value: string) {
    const q = sessionData?.currentQuestion;
    if (!q) return;

    if (q.type === 'single_select' || q.type === 'archetype_confirm') {
      setSelectedOptions([value]);
    } else {
      setSelectedOptions((prev) =>
        prev.includes(value)
          ? prev.filter((v) => v !== value)
          : [...prev, value],
      );
    }
  }

  // Render different input types
  function renderInput() {
    const q = sessionData?.currentQuestion;
    if (!q) return null;

    switch (q.type) {
      case 'open_text':
        return (
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Type your answer..."
              placeholderTextColor={colors.muted}
              value={answer}
              onChangeText={setAnswer}
              multiline
              maxLength={2000}
              textAlignVertical="top"
              editable={!submitting}
            />
            <Text style={styles.charCount}>{answer.length}/2000</Text>
          </View>
        );

      case 'single_select':
      case 'archetype_confirm':
      case 'multi_select':
        return (
          <View style={styles.optionsGrid}>
            {(q.options || []).map((option) => {
              const isSelected = selectedOptions.includes(option.value);
              return (
                <Pressable
                  key={option.value}
                  style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                  onPress={() => toggleOption(option.value)}
                  disabled={submitting}
                >
                  <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                    {option.label}
                  </Text>
                  {option.description && (
                    <Text style={[styles.optionDescription, isSelected && styles.optionDescriptionSelected]}>
                      {option.description}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        );

      case 'numeric':
      case 'range':
        return (
          <TextInput
            style={styles.numericInput}
            placeholder="Enter a number"
            placeholderTextColor={colors.muted}
            value={numericValue}
            onChangeText={setNumericValue}
            keyboardType="numeric"
            editable={!submitting}
          />
        );

      default:
        return null;
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error && !sessionData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={loadQuestion}>
          <Text style={styles.retryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (!sessionData) return null;

  const { currentQuestion, totalQuestions } = sessionData;
  const progress = (stepNum + 1) / totalQuestions;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>
          Question {stepNum + 1} of {totalQuestions}
        </Text>
        <Text style={styles.stageLabel}>{currentQuestion.stage.label}</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Question */}
        <Text style={styles.questionText}>{currentQuestion.question}</Text>
        {currentQuestion.helper && (
          <Text style={styles.helperText}>{currentQuestion.helper}</Text>
        )}

        {/* AI Response Card */}
        {aiResponse.length > 0 && (
          <View style={styles.aiCard}>
            <Text style={styles.aiCardLabel}>Jetdale AI</Text>
            <Text style={styles.aiCardText}>{aiResponse}</Text>
            {streaming && (
              <View style={styles.streamingDot} />
            )}
          </View>
        )}

        {/* Input */}
        {renderInput()}

        {/* Error */}
        {error && (
          <Text style={styles.inlineError}>{error}</Text>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable style={styles.backButton} onPress={handleBack} disabled={submitting}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <Pressable
          style={[styles.continueButton, (!isAnswerValid() || submitting) && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!isAnswerValid() || submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.continueButtonText}>Continue</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  loadingContainer: { flex: 1, backgroundColor: colors.paper, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, backgroundColor: colors.paper, justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
  errorTitle: { fontFamily: typography.families.display, fontSize: typography.sizes.displaySm, fontWeight: typography.weights.bold, color: colors.ink, marginBottom: spacing[2] },
  errorMessage: { fontFamily: typography.families.body, fontSize: typography.sizes.bodyMd, color: colors.muted, textAlign: 'center', marginBottom: spacing[4] },
  retryButton: { backgroundColor: colors.accent, borderRadius: radii.md, paddingVertical: spacing[3], paddingHorizontal: spacing[6] },
  retryButtonText: { fontFamily: typography.families.body, fontSize: typography.sizes.bodyMd, fontWeight: typography.weights.semibold, color: colors.white },

  // Progress
  progressContainer: { paddingHorizontal: spacing[6], paddingTop: spacing[4], paddingBottom: spacing[2] },
  progressBar: { height: 4, backgroundColor: colors.paper3, borderRadius: 2, overflow: 'hidden', marginBottom: spacing[2] },
  progressFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 2 },
  progressText: { fontFamily: typography.families.mono, fontSize: typography.sizes.monoXs, color: colors.muted, letterSpacing: typography.letterSpacing.wide, textTransform: 'uppercase' },
  stageLabel: { fontFamily: typography.families.body, fontSize: typography.sizes.bodySm, color: colors.accent, marginTop: spacing[1] },

  // Content
  scrollContent: { padding: spacing[6], paddingBottom: spacing[24] },
  questionText: { fontFamily: typography.families.display, fontSize: typography.sizes.displayMd, fontWeight: typography.weights.bold, color: colors.ink, lineHeight: typography.lineHeights.displayMd, marginBottom: spacing[2] },
  helperText: { fontFamily: typography.families.body, fontSize: typography.sizes.bodyMd, color: colors.muted, lineHeight: typography.lineHeights.bodyMd, marginBottom: spacing[6] },

  // AI card
  aiCard: { backgroundColor: colors.white, borderLeftWidth: 3, borderLeftColor: colors.accent, borderRadius: radii.md, padding: spacing[4], marginBottom: spacing[6] },
  aiCardLabel: { fontFamily: typography.families.mono, fontSize: typography.sizes.monoXs, color: colors.muted, letterSpacing: typography.letterSpacing.wide, textTransform: 'uppercase', marginBottom: spacing[2] },
  aiCardText: { fontFamily: typography.families.body, fontSize: typography.sizes.bodyMd, color: colors.ink, lineHeight: typography.lineHeights.bodyMd },
  streamingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, marginTop: spacing[2] },

  // Inputs
  inputWrapper: { position: 'relative', marginBottom: spacing[4] },
  textInput: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.paper3, borderRadius: radii.lg, padding: spacing[4], fontFamily: typography.families.body, fontSize: typography.sizes.bodyLg, color: colors.ink, minHeight: 120, lineHeight: typography.lineHeights.bodyLg, textAlignVertical: 'top' },
  charCount: { position: 'absolute', bottom: spacing[2], right: spacing[3], fontFamily: typography.families.mono, fontSize: typography.sizes.monoXs, color: colors.muted },
  numericInput: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.paper3, borderRadius: radii.lg, padding: spacing[4], fontFamily: typography.families.body, fontSize: typography.sizes.displaySm, color: colors.ink, textAlign: 'center' },

  // Options grid
  optionsGrid: { gap: spacing[3] },
  optionCard: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.paper3, borderRadius: radii.lg, padding: spacing[4] },
  optionCardSelected: { borderColor: colors.accent, backgroundColor: '#FFF5F0' },
  optionLabel: { fontFamily: typography.families.body, fontSize: typography.sizes.bodyLg, fontWeight: typography.weights.semibold, color: colors.ink },
  optionLabelSelected: { color: colors.accent },
  optionDescription: { fontFamily: typography.families.body, fontSize: typography.sizes.bodySm, color: colors.muted, marginTop: spacing[1] },
  optionDescriptionSelected: { color: colors.accent },

  // Error
  inlineError: { fontFamily: typography.families.body, fontSize: typography.sizes.bodySm, color: colors.error, marginTop: spacing[2] },

  // Footer
  footer: { flexDirection: 'row', paddingHorizontal: spacing[6], paddingVertical: spacing[4], borderTopWidth: 1, borderTopColor: colors.paper3, gap: spacing[3] },
  backButton: { flex: 1, borderWidth: 1, borderColor: colors.paper3, borderRadius: radii.md, paddingVertical: spacing[3], alignItems: 'center' },
  backButtonText: { fontFamily: typography.families.body, fontSize: typography.sizes.bodyMd, fontWeight: typography.weights.medium, color: colors.ink },
  continueButton: { flex: 2, backgroundColor: colors.accent, borderRadius: radii.md, paddingVertical: spacing[3], alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  continueButtonDisabled: { opacity: 0.5 },
  continueButtonText: { fontFamily: typography.families.body, fontSize: typography.sizes.bodyMd, fontWeight: typography.weights.semibold, color: colors.white },
});
