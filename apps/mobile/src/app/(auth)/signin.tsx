// ============================================================
// Jetdale — Sign In Screen
// ============================================================

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { colors, typography, spacing, radii } from '@/theme/tokens';

export default function SignInScreen() {
  const { signIn, signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }

    setLoading(true);
    setError(null);

    if (useMagicLink) {
      const { error: authError } = await signInWithMagicLink(email);
      if (authError) {
        setError(authError.message);
      } else {
        setMagicLinkSent(true);
      }
      setLoading(false);
      return;
    }

    if (!password.trim()) {
      setError('Password is required.');
      setLoading(false);
      return;
    }

    const { error: authError } = await signIn(email, password);
    if (authError) {
      setError(authError.message);
    } else {
      router.replace('/(tabs)/');
    }
    setLoading(false);
  };

  const handleAppleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: 'jetdale://auth/callback' },
    });
    if (error) setError(error.message);
  };

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'jetdale://auth/callback' },
    });
    if (error) setError(error.message);
  };

  if (magicLinkSent) {
    return (
      <View style={styles.container}>
        <View style={styles.centeredContent}>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We sent a sign-in link to {email}. Click the link to continue.
          </Text>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              setMagicLinkSent(false);
              setUseMagicLink(false);
            }}
          >
            <Text style={styles.secondaryButtonText}>
              Try a different method
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Sign in to continue.</Text>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </View>

        {!useMagicLink && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              placeholderTextColor={colors.muted}
              secureTextEntry
              autoComplete="current-password"
            />
          </View>
        )}

        <Pressable
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handleSignIn}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>
            {loading
              ? 'Signing in...'
              : useMagicLink
                ? 'Send magic link'
                : 'Sign in'}
          </Text>
        </Pressable>

        <View style={styles.linkRow}>
          <Pressable onPress={() => setUseMagicLink(!useMagicLink)}>
            <Text style={styles.linkText}>
              {useMagicLink
                ? 'Use password instead'
                : 'Sign in with magic link'}
            </Text>
          </Pressable>
          {!useMagicLink && (
            <Pressable
              onPress={() => router.push('/(auth)/forgot-password')}
            >
              <Text style={styles.linkText}>Forgot password?</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {Platform.OS === 'ios' && (
          <Pressable
            style={styles.socialButton}
            onPress={handleAppleSignIn}
          >
            <Text style={styles.socialButtonText}>
              Continue with Apple
            </Text>
          </Pressable>
        )}

        <Pressable
          style={styles.socialButton}
          onPress={handleGoogleSignIn}
        >
          <Text style={styles.socialButtonText}>
            Continue with Google
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  contentContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['4xl'],
    paddingBottom: spacing['3xl'],
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  backButton: {
    marginBottom: spacing['2xl'],
  },
  backText: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.bodyMd,
    color: colors.muted,
  },
  title: {
    fontFamily: typography.families.display,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.displayMd,
    letterSpacing: typography.letterSpacing.display,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.bodyLg,
    color: colors.muted,
    marginBottom: spacing['2xl'],
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  errorText: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.bodySm,
    color: colors.error,
  },
  form: {
    gap: spacing.base,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  label: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.monoXs,
    fontWeight: typography.weights.bold,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.paper3,
    borderRadius: radii.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.bodyMd,
    color: colors.ink,
  },
  primaryButton: {
    backgroundColor: colors.ink,
    paddingVertical: spacing.base,
    borderRadius: radii.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontFamily: typography.families.body,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.bodyMd,
    color: colors.paper,
  },
  secondaryButton: {
    paddingVertical: spacing.md,
    marginTop: spacing.base,
  },
  secondaryButtonText: {
    fontFamily: typography.families.body,
    fontWeight: typography.weights.medium,
    fontSize: typography.sizes.bodyMd,
    color: colors.accent,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  linkText: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.bodySm,
    color: colors.accent,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
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
  },
  socialButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.paper3,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  socialButtonText: {
    fontFamily: typography.families.body,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.bodyMd,
    color: colors.ink,
  },
});
