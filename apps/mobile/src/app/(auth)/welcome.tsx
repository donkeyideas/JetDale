// ============================================================
// Jetdale — Welcome Screen
// First screen for unauthenticated users.
// ============================================================

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors, typography, spacing, radii } from '@/theme/tokens';

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logoMark}>
            <View style={styles.logoAccent} />
          </View>
          <Text style={styles.logoText}>Jetdale</Text>
        </View>

        <Text style={styles.tagline}>Plan before you build.</Text>

        <Text style={styles.description}>
          The AI project architect that asks the right questions, generates
          real planning documents, and exports directly to your favorite AI
          coding tools.
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push('/(auth)/signup')}
        >
          <Text style={styles.primaryButtonText}>Get started</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push('/(auth)/signin')}
        >
          <Text style={styles.secondaryButtonText}>
            I already have an account
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['5xl'],
    paddingBottom: spacing['3xl'],
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing['2xl'],
  },
  logoMark: {
    width: 40,
    height: 40,
    backgroundColor: colors.ink,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'flex-end',
    padding: 6,
  },
  logoAccent: {
    width: 10,
    height: 10,
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  logoText: {
    fontFamily: typography.families.display,
    fontWeight: typography.weights.bold,
    fontSize: 32,
    letterSpacing: -1.2,
    color: colors.ink,
  },
  tagline: {
    fontFamily: typography.families.display,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.displayMd,
    letterSpacing: typography.letterSpacing.display,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  description: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.bodyLg,
    lineHeight: typography.lineHeights.bodyLg,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 340,
  },
  actions: {
    gap: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.ink,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontFamily: typography.families.body,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.bodyMd,
    color: colors.paper,
  },
  secondaryButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontFamily: typography.families.body,
    fontWeight: typography.weights.medium,
    fontSize: typography.sizes.bodyMd,
    color: colors.muted,
  },
});
