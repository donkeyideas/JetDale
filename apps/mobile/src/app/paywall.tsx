// ============================================================
// Jetdale — Paywall Screen
// Shown when a free tier limit is hit. Displays plan comparison
// and purchase options via RevenueCat (mobile) or Stripe (web).
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { env } from '@/config/env';
import { colors, typography, spacing, radii } from '@/theme/tokens';

type Plan = 'monthly' | 'annual';

const PLANS = {
  monthly: {
    name: 'Pro Monthly',
    price: '$49',
    period: '/month',
    description: 'Unlimited projects, all export formats, voice input, reality checks',
  },
  annual: {
    name: 'Pro Annual',
    price: '$390',
    period: '/year',
    savings: 'Save 33%',
    description: 'Everything in monthly, billed annually at $32.50/month',
  },
};

const FEATURES = [
  { feature: 'Projects per month', free: '1', pro: 'Unlimited' },
  { feature: 'Artifacts per project', free: '5', pro: 'Unlimited' },
  { feature: 'Export formats', free: 'Markdown only', pro: 'All 9 formats' },
  { feature: 'Reality checks', free: '1/month', pro: 'Unlimited' },
  { feature: 'Voice input', free: '10 min/month', pro: '4 hours/month' },
  { feature: 'Chat messages', free: '10/day', pro: '200/day' },
  { feature: 'AI model', free: 'Flash', pro: 'Flash + Pro' },
];

export default function PaywallScreen() {
  const [selectedPlan, setSelectedPlan] = useState<Plan>('annual');
  const [purchasing, setPurchasing] = useState(false);

  async function handlePurchase() {
    setPurchasing(true);

    try {
      if (Platform.OS === 'web') {
        // Redirect to Stripe checkout (handled by the admin/web app)
        const checkoutUrl = `${env.EXPO_PUBLIC_APP_URL || ''}/api/checkout?plan=${selectedPlan}`;
        await Linking.openURL(checkoutUrl);
      } else {
        // Mobile: RevenueCat purchase
        // In a real implementation, this would use react-native-purchases
        // For now, show a placeholder
        try {
          const Purchases = require('react-native-purchases').default;
          const offerings = await Purchases.getOfferings();
          const currentOffering = offerings.current;

          if (!currentOffering) {
            throw new Error('No offerings available');
          }

          const pkg = selectedPlan === 'annual'
            ? currentOffering.annual
            : currentOffering.monthly;

          if (!pkg) {
            throw new Error(`No ${selectedPlan} package available`);
          }

          const { customerInfo } = await Purchases.purchasePackage(pkg);
          if (customerInfo.entitlements.active['pro']) {
            // Purchase successful — go back
            router.back();
          }
        } catch (purchaseErr: any) {
          if (purchaseErr.userCancelled) {
            // User cancelled — do nothing
          } else {
            throw purchaseErr;
          }
        }
      }
    } catch (err) {
      console.error('Purchase error:', err);
    } finally {
      setPurchasing(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.closeText}>Maybe later</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Go Pro</Text>
          <Text style={styles.heroSubtitle}>
            Unlimited projects, all export formats, advanced AI, and more.
          </Text>
        </View>

        {/* Plan cards */}
        <View style={styles.planCards}>
          <Pressable
            style={[
              styles.planCard,
              selectedPlan === 'annual' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('annual')}
          >
            {PLANS.annual.savings && (
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsText}>{PLANS.annual.savings}</Text>
              </View>
            )}
            <Text style={styles.planName}>{PLANS.annual.name}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.planPrice}>{PLANS.annual.price}</Text>
              <Text style={styles.planPeriod}>{PLANS.annual.period}</Text>
            </View>
            <Text style={styles.planDescription}>{PLANS.annual.description}</Text>
          </Pressable>

          <Pressable
            style={[
              styles.planCard,
              selectedPlan === 'monthly' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <Text style={styles.planName}>{PLANS.monthly.name}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.planPrice}>{PLANS.monthly.price}</Text>
              <Text style={styles.planPeriod}>{PLANS.monthly.period}</Text>
            </View>
            <Text style={styles.planDescription}>{PLANS.monthly.description}</Text>
          </Pressable>
        </View>

        {/* Feature comparison */}
        <View style={styles.comparisonTable}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.featureCell]}>Feature</Text>
            <Text style={styles.tableHeaderCell}>Free</Text>
            <Text style={[styles.tableHeaderCell, styles.proCell]}>Pro</Text>
          </View>
          {FEATURES.map((row, i) => (
            <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowEven]}>
              <Text style={[styles.tableCell, styles.featureCell]}>{row.feature}</Text>
              <Text style={[styles.tableCell, styles.freeValue]}>{row.free}</Text>
              <Text style={[styles.tableCell, styles.proValue]}>{row.pro}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Purchase button */}
      <View style={styles.purchaseBar}>
        <Pressable
          style={[styles.purchaseButton, purchasing && styles.purchaseButtonDisabled]}
          onPress={handlePurchase}
          disabled={purchasing}
        >
          {purchasing ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.purchaseButtonText}>
              Subscribe to {PLANS[selectedPlan].name} — {PLANS[selectedPlan].price}{PLANS[selectedPlan].period}
            </Text>
          )}
        </Pressable>
        <Text style={styles.legalText}>
          Cancel anytime. {Platform.OS === 'ios' ? 'Payment charged to your Apple ID.' : Platform.OS === 'android' ? 'Payment charged to your Google Play account.' : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },

  header: { flexDirection: 'row', justifyContent: 'flex-end', padding: spacing[4] },
  closeText: { fontFamily: typography.families.body, fontSize: typography.sizes.bodyMd, color: colors.muted },

  content: { padding: spacing[4], paddingBottom: spacing[8] },

  hero: { alignItems: 'center', marginBottom: spacing[6] },
  heroTitle: { fontFamily: typography.families.display, fontSize: 36, fontWeight: typography.weights.bold, color: colors.ink, marginBottom: spacing[2] },
  heroSubtitle: { fontFamily: typography.families.body, fontSize: typography.sizes.bodyLg, color: colors.muted, textAlign: 'center', maxWidth: 350 },

  planCards: { gap: spacing[3], marginBottom: spacing[6] },
  planCard: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.paper3, borderRadius: radii.lg, padding: spacing[4] },
  planCardSelected: { borderColor: colors.accent, backgroundColor: '#FFF8F5' },
  savingsBadge: { position: 'absolute', top: -10, right: spacing[4], backgroundColor: colors.accent, paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radii.sm },
  savingsText: { fontFamily: typography.families.mono, fontSize: typography.sizes.monoXs, color: colors.white, fontWeight: typography.weights.bold },
  planName: { fontFamily: typography.families.display, fontSize: typography.sizes.bodyLg, fontWeight: typography.weights.semibold, color: colors.ink, marginBottom: spacing[1] },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: spacing[2] },
  planPrice: { fontFamily: typography.families.display, fontSize: 28, fontWeight: typography.weights.bold, color: colors.ink },
  planPeriod: { fontFamily: typography.families.body, fontSize: typography.sizes.bodySm, color: colors.muted },
  planDescription: { fontFamily: typography.families.body, fontSize: typography.sizes.bodySm, color: colors.muted },

  comparisonTable: { backgroundColor: colors.white, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.paper3, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: colors.ink, paddingVertical: spacing[3], paddingHorizontal: spacing[3] },
  tableHeaderCell: { flex: 1, fontFamily: typography.families.mono, fontSize: typography.sizes.monoXs, color: colors.white, fontWeight: typography.weights.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  featureCell: { flex: 2 },
  proCell: { color: colors.accent },
  tableRow: { flexDirection: 'row', paddingVertical: spacing[3], paddingHorizontal: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.paper2 },
  tableRowEven: { backgroundColor: colors.paper },
  tableCell: { flex: 1, fontFamily: typography.families.body, fontSize: typography.sizes.bodySm, color: colors.ink },
  freeValue: { color: colors.muted },
  proValue: { color: colors.ink, fontWeight: typography.weights.medium },

  purchaseBar: { padding: spacing[4], borderTopWidth: 1, borderTopColor: colors.paper3, backgroundColor: colors.white },
  purchaseButton: { backgroundColor: colors.accent, borderRadius: radii.md, paddingVertical: spacing[4], alignItems: 'center' },
  purchaseButtonDisabled: { opacity: 0.5 },
  purchaseButtonText: { fontFamily: typography.families.body, fontSize: typography.sizes.bodyMd, fontWeight: typography.weights.bold, color: colors.white },
  legalText: { fontFamily: typography.families.body, fontSize: 11, color: colors.muted, textAlign: 'center', marginTop: spacing[2] },
});
