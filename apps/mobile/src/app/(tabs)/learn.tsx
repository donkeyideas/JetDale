// ============================================================
// Jetdale — Learn / Templates Screen
// Browse archetypes and example projects. Real data from Supabase.
// ============================================================

import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors, typography, spacing, radii, shadows } from '@/theme/tokens';

interface Archetype {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string | null;
  icon_name: string | null;
  estimated_minutes: number;
  question_count: number;
  project_count: number;
  is_premium: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  software: 'Software',
  creator: 'Creator',
  physical: 'Physical',
  event: 'Event',
  service: 'Service',
};

export default function LearnScreen() {
  const [archetypes, setArchetypes] = useState<Archetype[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    null,
  );

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('archetypes')
        .select('*')
        .eq('is_active', true)
        .order('project_count', { ascending: false });
      setArchetypes((data ?? []) as Archetype[]);
    }
    fetch();
  }, []);

  const categories = [
    ...new Set(archetypes.map((a) => a.category)),
  ];

  const filtered = selectedCategory
    ? archetypes.filter((a) => a.category === selectedCategory)
    : archetypes;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>Templates</Text>
      <Text style={styles.subtitle}>
        Pick a project type to see what Jetdale generates.
      </Text>

      <View style={styles.filterRow}>
        <Pressable
          style={[
            styles.filterPill,
            !selectedCategory && styles.filterPillActive,
          ]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text
            style={[
              styles.filterPillText,
              !selectedCategory && styles.filterPillTextActive,
            ]}
          >
            All
          </Text>
        </Pressable>
        {categories.map((cat) => (
          <Pressable
            key={cat}
            style={[
              styles.filterPill,
              selectedCategory === cat && styles.filterPillActive,
            ]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text
              style={[
                styles.filterPillText,
                selectedCategory === cat && styles.filterPillTextActive,
              ]}
            >
              {CATEGORY_LABELS[cat] ?? cat}
            </Text>
          </Pressable>
        ))}
      </View>

      {filtered.map((archetype) => (
        <Pressable
          key={archetype.id}
          style={styles.card}
          onPress={() =>
            router.push({
              pathname: '/discovery/start',
              params: { archetype: archetype.slug },
            })
          }
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardName}>{archetype.name}</Text>
            <Text style={styles.cardCategory}>
              {CATEGORY_LABELS[archetype.category] ?? archetype.category}
            </Text>
          </View>
          {archetype.description && (
            <Text style={styles.cardDescription}>
              {archetype.description}
            </Text>
          )}
          <View style={styles.cardMeta}>
            <Text style={styles.metaItem}>
              {archetype.question_count} questions
            </Text>
            <Text style={styles.metaDot}> / </Text>
            <Text style={styles.metaItem}>
              ~{archetype.estimated_minutes} min
            </Text>
            {archetype.project_count > 0 && (
              <>
                <Text style={styles.metaDot}> / </Text>
                <Text style={styles.metaItem}>
                  {archetype.project_count} projects
                </Text>
              </>
            )}
          </View>
          {archetype.is_premium && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumText}>PRO</Text>
            </View>
          )}
        </Pressable>
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Have a different kind of project? We are adding new archetypes
          regularly. Contact us to suggest one.
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
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.bodyMd,
    color: colors.muted,
    marginBottom: spacing.xl,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
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
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.paper3,
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardName: {
    fontFamily: typography.families.body,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.bodyMd,
    color: colors.ink,
    flex: 1,
  },
  cardCategory: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.monoXs,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardDescription: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.bodySm,
    color: colors.muted,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.monoXs,
    color: colors.muted,
  },
  metaDot: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.monoXs,
    color: colors.paper3,
  },
  premiumBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  premiumText: {
    fontFamily: typography.families.mono,
    fontSize: 8,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 1,
  },
  footer: {
    paddingVertical: spacing.xl,
  },
  footerText: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.bodySm,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
