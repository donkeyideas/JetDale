// ============================================================
// Jetdale — Projects List Screen
// Search, filter, sort, pagination. Real data from Supabase.
// ============================================================

import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { colors, typography, spacing, radii, shadows } from '@/theme/tokens';

type FilterType = 'all' | 'active' | 'archived';
type SortType = 'recent' | 'name' | 'progress';

interface ProjectRow {
  id: string;
  name: string;
  tagline: string | null;
  phase: string;
  status: string;
  progress_pct: number;
  next_action: string | null;
  last_activity_at: string;
  created_at: string;
  archetypes: { name: string; category: string } | null;
}

export default function ProjectsScreen() {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('recent');
  const [refreshing, setRefreshing] = useState(false);

  const fetchProjects = useCallback(async () => {
    if (!profile) return;

    let query = supabase
      .from('projects')
      .select('*, archetypes(name, category)')
      .eq('user_id', profile.id);

    if (filter === 'active') {
      query = query.eq('status', 'active');
    } else if (filter === 'archived') {
      query = query.eq('status', 'archived');
    }

    if (search.trim()) {
      query = query.ilike('name', `%${search.trim()}%`);
    }

    if (sort === 'recent') {
      query = query.order('last_activity_at', { ascending: false });
    } else if (sort === 'name') {
      query = query.order('name', { ascending: true });
    } else if (sort === 'progress') {
      query = query.order('progress_pct', { ascending: false });
    }

    const { data } = await query.limit(50);
    setProjects((data ?? []) as unknown as ProjectRow[]);
  }, [profile, filter, sort, search]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProjects();
    setRefreshing(false);
  }, [fetchProjects]);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'archived', label: 'Archived' },
  ];

  const sorts: { key: SortType; label: string }[] = [
    { key: 'recent', label: 'Recent' },
    { key: 'name', label: 'Name' },
    { key: 'progress', label: 'Progress' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Projects</Text>
        <Pressable
          style={styles.newButton}
          onPress={() => router.push('/discovery/start')}
        >
          <Text style={styles.newButtonText}>+ New</Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.searchInput}
        value={search}
        onChangeText={setSearch}
        placeholder="Search projects..."
        placeholderTextColor={colors.muted}
      />

      <View style={styles.filterRow}>
        {filters.map((f) => (
          <Pressable
            key={f.key}
            style={[
              styles.filterPill,
              filter === f.key && styles.filterPillActive,
            ]}
            onPress={() => setFilter(f.key)}
          >
            <Text
              style={[
                styles.filterPillText,
                filter === f.key && styles.filterPillTextActive,
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
        <View style={styles.filterSpacer} />
        {sorts.map((s) => (
          <Pressable
            key={s.key}
            style={[
              styles.sortPill,
              sort === s.key && styles.sortPillActive,
            ]}
            onPress={() => setSort(s.key)}
          >
            <Text
              style={[
                styles.sortPillText,
                sort === s.key && styles.sortPillTextActive,
              ]}
            >
              {s.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            style={styles.projectCard}
            onPress={() => router.push(`/project/${item.id}`)}
          >
            <View style={styles.projectRow}>
              <View style={styles.projectInfo}>
                <Text style={styles.projectName}>{item.name}</Text>
                {item.archetypes && (
                  <Text style={styles.projectMeta}>
                    {item.archetypes.name}
                  </Text>
                )}
              </View>
              <View style={styles.projectRight}>
                <Text style={styles.phaseBadge}>
                  {item.phase.replace('_', ' ')}
                </Text>
                <Text style={styles.progressText}>
                  {item.progress_pct}%
                </Text>
              </View>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${item.progress_pct}%` },
                ]}
              />
            </View>
            {item.next_action && (
              <Text style={styles.nextAction} numberOfLines={1}>
                Next: {item.next_action}
              </Text>
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No projects found. Start your first one.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
    paddingTop: spacing['4xl'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.base,
  },
  title: {
    fontFamily: typography.families.display,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.displayMd,
    letterSpacing: typography.letterSpacing.display,
    color: colors.ink,
  },
  newButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  newButtonText: {
    fontFamily: typography.families.body,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.bodySm,
    color: colors.white,
  },
  searchInput: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.paper3,
    borderRadius: radii.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.bodyMd,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.base,
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.paper2,
  },
  filterPillActive: {
    backgroundColor: colors.ink,
  },
  filterPillText: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.bodySm,
    color: colors.muted,
  },
  filterPillTextActive: {
    color: colors.paper,
  },
  filterSpacer: {
    flex: 1,
  },
  sortPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  sortPillActive: {
    backgroundColor: colors.paper3,
  },
  sortPillText: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.monoXs,
    color: colors.muted,
    textTransform: 'uppercase',
  },
  sortPillTextActive: {
    color: colors.ink,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['3xl'],
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
  projectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontFamily: typography.families.body,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.bodyMd,
    color: colors.ink,
  },
  projectMeta: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.bodySm,
    color: colors.muted,
    marginTop: 2,
  },
  projectRight: {
    alignItems: 'flex-end',
  },
  phaseBadge: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.monoXs,
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressText: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.monoXs,
    color: colors.muted,
    marginTop: 2,
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
  nextAction: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.bodySm,
    color: colors.muted,
  },
  emptyState: {
    padding: spacing['2xl'],
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.bodyMd,
    color: colors.muted,
    textAlign: 'center',
  },
});
