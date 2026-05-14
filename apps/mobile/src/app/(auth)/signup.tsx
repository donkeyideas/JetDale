// ============================================================
// Jetdale — Sign Up Screen
// Email+password, Apple, Google, magic link. Marketing opt-in.
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
  Alert,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { colors, typography, spacing, radii } from '@/theme/tokens';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: authError } = await signUp(email, password, fullName);

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Update marketing opt-in
    if (marketingOptIn) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ marketing_opt_in: true })
          .eq('id', user.id);
      }
    }

    setLoading(false);
    router.replace('/(onboarding)/welcome');
  };

  const handleAppleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: 'jetdale://auth/callback',
      },
    });
    if (error) setError(error.message);
  };

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'jetdale://auth/callback',
      },
    });
    if (error) setError(error.message);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>
        Start planning your next project.
      </Text>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full name</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your name"
            placeholderTextColor={colors.muted}
            autoCapitalize="words"
            autoComplete="name"
          />
        </View>

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

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="8+ characters"
            placeholderTextColor={colors.muted}
            secureTextEntry
            autoComplete="new-password"
          />
        </View>

        <View style={styles.optInRow}>
          <Switch
            value={marketingOptIn}
            onValueChange={setMarketingOptIn}
            trackColor={{ false: colors.paper3, true: colors.accent }}
            thumbColor={colors.white}
          />
          <Text style={styles.optInText}>
            Send me product updates and tips (optional)
          </Text>
        </View>

        <Pressable
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? 'Creating account...' : 'Create account'}
          </Text>
        </Pressable>

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

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By creating an account, you agree to our{' '}
          <Text style={styles.link}>Terms of Service</Text> and{' '}
          <Text style={styles.link}>Privacy Policy</Text>.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  contentContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['4xl'],
    paddingBottom: spacing['3xl'],
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
  optInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  optInText: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.bodySm,
    color: colors.muted,
    flex: 1,
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
  footer: {
    marginTop: spacing['2xl'],
  },
  footerText: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.bodySm,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  link: {
    color: colors.accent,
  },
});
