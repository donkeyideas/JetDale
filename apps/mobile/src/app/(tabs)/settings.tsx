// ============================================================
// Jetdale — Settings Screen
// Profile, subscription, preferences, data management.
// ============================================================

import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { colors, typography, spacing, radii } from '@/theme/tokens';
import Constants from 'expo-constants';

export default function SettingsScreen() {
  const { profile, signOut, refreshProfile } = useAuth();
  const [emailNotifications, setEmailNotifications] = useState(
    profile?.onboardingCompleted ?? true,
  );

  const handleToggleNotifications = async (value: boolean) => {
    setEmailNotifications(value);
    if (profile) {
      await supabase
        .from('profiles')
        .update({ email_notifications: value })
        .eq('id', profile.id);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/welcome');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This will permanently delete your account and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete my account',
          style: 'destructive',
          onPress: async () => {
            Alert.alert(
              'Are you absolutely sure?',
              'All your projects, artifacts, and data will be permanently deleted.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, delete everything',
                  style: 'destructive',
                  onPress: async () => {
                    // Call server-side deletion function
                    await supabase.functions.invoke('delete-account');
                    await signOut();
                    router.replace('/(auth)/welcome');
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>Settings</Text>

      {/* Profile Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Profile</Text>
        <View style={styles.card}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(profile?.fullName ?? profile?.email ?? '?')
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </View>
            <View style={styles.avatarInfo}>
              <Text style={styles.profileName}>
                {profile?.fullName || 'No name set'}
              </Text>
              <Text style={styles.profileEmail}>
                {profile?.email ?? ''}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Subscription Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Subscription</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Current plan</Text>
            <Text style={styles.rowValue}>Free</Text>
          </View>
          <Pressable
            style={styles.upgradeButton}
            onPress={() => router.push('/paywall')}
          >
            <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
          </Pressable>
        </View>
      </View>

      {/* Preferences Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Preferences</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <Text style={styles.rowLabel}>Email notifications</Text>
            <Switch
              value={emailNotifications}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: colors.paper3, true: colors.accent }}
              thumbColor={colors.white}
            />
          </View>
        </View>
      </View>

      {/* Data Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Data</Text>
        <View style={styles.card}>
          <Pressable style={styles.textButton}>
            <Text style={styles.textButtonLabel}>Export all my data</Text>
          </Pressable>
          <View style={styles.separator} />
          <Pressable
            style={styles.textButton}
            onPress={handleDeleteAccount}
          >
            <Text style={[styles.textButtonLabel, { color: colors.error }]}>
              Delete account
            </Text>
          </Pressable>
        </View>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>About</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowValue}>
              {Constants.expoConfig?.version ?? '1.0.0'}
            </Text>
          </View>
          <View style={styles.separator} />
          <Pressable style={styles.textButton}>
            <Text style={styles.textButtonLabel}>Terms of Service</Text>
          </Pressable>
          <View style={styles.separator} />
          <Pressable style={styles.textButton}>
            <Text style={styles.textButtonLabel}>Privacy Policy</Text>
          </Pressable>
          <View style={styles.separator} />
          <Pressable style={styles.textButton}>
            <Text style={styles.textButtonLabel}>Contact support</Text>
          </Pressable>
        </View>
      </View>

      {/* Sign Out */}
      <Pressable style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['4xl'],
    paddingBottom: spacing['3xl'],
  },
  title: {
    fontFamily: typography.families.display,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.displayMd,
    letterSpacing: typography.letterSpacing.display,
    color: colors.ink,
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.monoXs,
    fontWeight: typography.weights.bold,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.paper3,
    borderRadius: radii.md,
    padding: spacing.base,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: typography.families.display,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.displaySm,
    color: colors.white,
  },
  avatarInfo: {
    flex: 1,
  },
  profileName: {
    fontFamily: typography.families.body,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.bodyMd,
    color: colors.ink,
  },
  profileEmail: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.bodySm,
    color: colors.muted,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  rowLabel: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.bodyMd,
    color: colors.ink,
  },
  rowValue: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.bodySm,
    color: colors.muted,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  upgradeButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  upgradeButtonText: {
    fontFamily: typography.families.body,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.bodySm,
    color: colors.white,
  },
  separator: {
    height: 1,
    backgroundColor: colors.paper3,
    marginVertical: spacing.sm,
  },
  textButton: {
    paddingVertical: spacing.xs,
  },
  textButtonLabel: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.bodyMd,
    color: colors.ink,
  },
  signOutButton: {
    paddingVertical: spacing.base,
    alignItems: 'center',
    marginTop: spacing.base,
  },
  signOutText: {
    fontFamily: typography.families.body,
    fontWeight: typography.weights.medium,
    fontSize: typography.sizes.bodyMd,
    color: colors.error,
  },
});
