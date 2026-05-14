// ============================================================
// Jetdale — Plan Limits & Pricing
// Every threshold lives here. No magic numbers elsewhere.
// ============================================================

import type { ExportTarget, PlanTier } from './types';

interface TierLimits {
  projectsPerMonth: number | 'unlimited';
  artifactsPerProject: number | 'unlimited';
  realityChecksPerMonth: number | 'unlimited';
  exportsPerMonth: number | 'unlimited';
  exportTargets: readonly ExportTarget[] | 'all';
  voiceMinutesPerMonth: number;
  workspaceChatMessagesPerDay: number | 'unlimited';
  archetypeAccess: readonly string[] | 'all';
  seatsIncluded?: number;
  seatsMax?: number;
}

export const PLAN_LIMITS: Record<PlanTier, TierLimits> = {
  free: {
    projectsPerMonth: 1,
    artifactsPerProject: 5,
    realityChecksPerMonth: 1,
    exportsPerMonth: 1,
    exportTargets: ['zip_markdown'] as const,
    voiceMinutesPerMonth: 10,
    workspaceChatMessagesPerDay: 10,
    archetypeAccess: [
      'indie_software',
      'ai_built_app',
      'wedding_event',
    ] as const,
  },
  pro: {
    projectsPerMonth: 10,
    artifactsPerProject: 'unlimited',
    realityChecksPerMonth: 'unlimited',
    exportsPerMonth: 'unlimited',
    exportTargets: 'all',
    voiceMinutesPerMonth: 240,
    workspaceChatMessagesPerDay: 200,
    archetypeAccess: 'all',
  },
  team: {
    projectsPerMonth: 'unlimited',
    artifactsPerProject: 'unlimited',
    realityChecksPerMonth: 'unlimited',
    exportsPerMonth: 'unlimited',
    exportTargets: 'all',
    voiceMinutesPerMonth: 600,
    workspaceChatMessagesPerDay: 'unlimited',
    archetypeAccess: 'all',
    seatsIncluded: 3,
    seatsMax: 25,
  },
  enterprise: {
    projectsPerMonth: 'unlimited',
    artifactsPerProject: 'unlimited',
    realityChecksPerMonth: 'unlimited',
    exportsPerMonth: 'unlimited',
    exportTargets: 'all',
    voiceMinutesPerMonth: 'unlimited' as unknown as number,
    workspaceChatMessagesPerDay: 'unlimited',
    archetypeAccess: 'all',
  },
} as const;

export const PRICING_CENTS = {
  proMonthly: 4900,
  proAnnual: 39000,
  teamMonthlyPerSeat: 4900,
  teamAnnualPerSeat: 39000,
} as const;

// Rate limits per tier (enforced in Edge Functions)
export interface RateLimits {
  aiCallsPerMinute: number;
  aiCallsPerDay: number | 'unlimited';
  voiceTranscribePerMinute: number;
  exportGenerationPerHour: number | 'unlimited';
}

export const RATE_LIMITS: Record<PlanTier, RateLimits> = {
  free: {
    aiCallsPerMinute: 5,
    aiCallsPerDay: 50,
    voiceTranscribePerMinute: 1,
    exportGenerationPerHour: 1,
  },
  pro: {
    aiCallsPerMinute: 30,
    aiCallsPerDay: 1000,
    voiceTranscribePerMinute: 5,
    exportGenerationPerHour: 10,
  },
  team: {
    aiCallsPerMinute: 60,
    aiCallsPerDay: 'unlimited',
    voiceTranscribePerMinute: 10,
    exportGenerationPerHour: 'unlimited',
  },
  enterprise: {
    aiCallsPerMinute: 120,
    aiCallsPerDay: 'unlimited',
    voiceTranscribePerMinute: 20,
    exportGenerationPerHour: 'unlimited',
  },
} as const;

// DeepSeek pricing (cents per 1M tokens)
export const DEEPSEEK_PRICING = {
  'deepseek-v4-flash': {
    inputCentsPerMillion: 14,
    outputCentsPerMillion: 28,
  },
  'deepseek-v4-pro': {
    // Promo pricing until May 31, 2026
    promoEndDate: new Date('2026-06-01T00:00:00Z'),
    promoInputCentsPerMillion: 43.5,
    promoOutputCentsPerMillion: 87,
    regularInputCentsPerMillion: 174,
    regularOutputCentsPerMillion: 348,
  },
} as const;

/**
 * Calculate AI call cost in fractional cents (not rounded up).
 */
export function costCents(
  model: 'deepseek-v4-flash' | 'deepseek-v4-pro',
  promptTokens: number,
  completionTokens: number,
): number {
  if (model === 'deepseek-v4-flash') {
    const pricing = DEEPSEEK_PRICING['deepseek-v4-flash'];
    return parseFloat(
      ((promptTokens / 1_000_000) * pricing.inputCentsPerMillion +
        (completionTokens / 1_000_000) * pricing.outputCentsPerMillion).toFixed(4),
    );
  }

  const pricing = DEEPSEEK_PRICING['deepseek-v4-pro'];
  const promoActive = new Date() < pricing.promoEndDate;
  const inputRate = promoActive
    ? pricing.promoInputCentsPerMillion
    : pricing.regularInputCentsPerMillion;
  const outputRate = promoActive
    ? pricing.promoOutputCentsPerMillion
    : pricing.regularOutputCentsPerMillion;

  return parseFloat(
    ((promptTokens / 1_000_000) * inputRate +
      (completionTokens / 1_000_000) * outputRate).toFixed(4),
  );
}

/**
 * Check if a numeric limit has been reached.
 * Returns true if the limit is exceeded.
 */
export function isLimitExceeded(
  current: number,
  limit: number | 'unlimited',
): boolean {
  if (limit === 'unlimited') return false;
  return current >= limit;
}
