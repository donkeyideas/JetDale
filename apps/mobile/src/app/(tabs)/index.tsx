// ============================================================
// Jetdale — Home Dashboard
// Real data from Supabase. Greeting, stats, insights, projects.
// ============================================================

import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { colors, typography, spacing, radii, shadows } from '@/theme/tokens';

interface ProjectRow {
  id: string;
  name: string;
  tagline: string | null;
  phase: string;
  progress_pct: number;
  next_action: string | null;
  active_risks: number;
  last_activity_at: string;
  archetypes: { name: string; category: string } | null;
}

interface DashboardStats {
  activeProjects: number;
  avgCompletion: number;
  risksFlagged: number;
  artifactsGenerated: number;
}

export default function DashboardScreen() {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    activeProjects: 0,
    avgCompletion: 0,
    risksFlagged: 0,
    artifactsGenerated: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!profile) return;

    // Fetch projects
    const { data: projectData } = await supabase
      .from('projects')
      .select(
        '*, archetypes(name, category)',
      )
      .eq('user_id', profile.id)
      .eq('status', 'active')
      .order('last_activity_at', { ascending: false })
      .limit(10);

    const rows = (projectData ?? []) as unknown as ProjectRow[];
    setProjects(rows);

    // Compute stats
    const active = rows.length;
    const avgComp =
      active > 0
        ? Math.round(
            rows.reduce((sum, p) => sum + p.progress_pct, 0) / active,
          )
        : 0;
    const risks = rows.reduce((sum, p) => sum + p.active_risks, 0);

    // Fetch artifact count
    const { count: artifactCount } = await supabase
      .from('artifacts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('is_current', true);

    setStats({
      activeProjects: active,
      avgCompletion: avgComp,
      risksFlagged: risks,
      artifactsGenerated: artifactCount ?? 0,
    });
  }, [profile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = profile?.fullName?.split(' ')[0] ?? 'there';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {greeting()}, {firstName}.
          </Text>
          <Text style={styles.subGreeting}>
            {stats.activeProjects} active project
            {stats.activeProjects !== 1 ? 's' : ''}
          </Text>
        </View>
        <Pressable
          style={styles.newProjectButton}
          onPress={() => router.push('/discovery/start')}
        >
          <Text style={styles.newProjectButtonText}>+ New project</Text>
        </Pressable>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.activeProjects}</Text>
          <Text style={styles.statLabel}>Active Projects</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.avgCompletion}%</Text>
          <Text style={styles.statLabel}>Avg. Completion</Text>
        </View>
        <View style={styles.statCard}>
          <Text
            style={[
              styles.statValue,
              stats.risksFlagged > 0 && { color: colors.gold },
            ]}
          >
            {stats.risksFlagged}
          </Text>
          <Text style={styles.statLabel}>Risks Flagged</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.artifactsGenerated}</Text>
          <Text style={styles.statLabel}>Artifacts</Text>
        </View>
      </View>

      {/* Projects List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your projects</Text>

        {projects.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No projects yet</Text>
            <Text style={styles.emptyDescription}>
              Start your first project and let Jetdale help you plan it
              properly before you build.
            </Text>
            <Pressable
              style={styles.emptyButton}
              onPress={() => router.push('/discovery/start')}
            >
              <Text style={styles.emptyButtonText}>
                Start your first project
              </Text>
            </Pressable>
          </View>
        ) : (
          projects.map((project) => (
            <Pressable
              key={project.id}
              style={styles.projectCard}
              onPress={() => router.push(`/project/${project.id}`)}
            >
              <View style={styles.projectHeader}>
                <Text style={styles.projectName}>{project.name}</Text>
                <Text style={styles.projectPhase}>
                  {project.phase.replace('_', ' ')}
                </Text>
              </View>
              {project.archetypes && (
                <Text style={styles.projectArchetype}>
                  {project.archetypes.name}
                </Text>
              )}
              {/* Progress bar */}
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${project.progress_pct}%` },
                  ]}
                />
              </View>
              <View style={styles.projectFooter}>
                <Text style={styles.progressText}>
                  {project.progress_pct}%
                </Text>
                {project.next_action && (
                  <Text style={styles.nextAction} numberOfLines={1}>
                    {project.next_action}
                  </Text>
                )}
              </View>
            </Pressable>
          ))
        )}
      </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  greeting: {
    fontFamily: typography.families.display,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.displaySm,
    letterSpacing: typography.letterSpacing.display,
    color: colors.ink,
  },
  subGreeting: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.monoXs,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.xs,
  },
  newProjectButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  newProjectButtonText: {
    fontFamily: typography.families.body,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.bodySm,
    color: colors.white,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing['2xl'],
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.paper3,
    borderRadius: radii.md,
    padding: spacing.base,
    ...shadows.card,
  },
  statValue: {
    fontFamily: typography.families.display,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.displaySm,
    color: colors.ink,
  },
  statLabel: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.monoXs,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing['2xl'],
  },
  sectionTitle: {
    fontFamily: typography.families.display,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.bodyLg,
    color: colors.ink,
    marginBottom: spacing.base,
  },
  projectCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.paper3,
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  projectName: {
    fontFamily: typography.families.body,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.bodyMd,
    color: colors.ink,
    flex: 1,
  },
  projectPhase: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.monoXs,
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  projectArchetype: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.bodySm,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: colors.paper3,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  projectFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.monoXs,
    color: colors.muted,
  },
  nextAction: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.bodySm,
    color: colors.muted,
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },
  emptyState: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.paper3,
    borderRadius: radii.lg,
    padding: spacing['2xl'],
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: typography.families.display,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.displaySm,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.bodyMd,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  emptyButton: {
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
  },
  emptyButtonText: {
    fontFamily: typography.families.body,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.bodyMd,
    color: colors.paper,
  },
});
