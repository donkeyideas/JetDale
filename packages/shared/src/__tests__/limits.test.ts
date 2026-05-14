import { describe, it, expect } from 'vitest';
import {
  PLAN_LIMITS,
  PRICING_CENTS,
  RATE_LIMITS,
  costCents,
  isLimitExceeded,
} from '../limits';
import { PLAN_TIERS } from '../types';

// ============================================================
// PLAN_LIMITS structure
// ============================================================

describe('PLAN_LIMITS', () => {
  it('has an entry for every PlanTier', () => {
    for (const tier of PLAN_TIERS) {
      expect(PLAN_LIMITS).toHaveProperty(tier);
    }
  });

  it('free tier has correct numeric limits', () => {
    const free = PLAN_LIMITS.free;
    expect(free.projectsPerMonth).toBe(1);
    expect(free.artifactsPerProject).toBe(5);
    expect(free.realityChecksPerMonth).toBe(1);
    expect(free.exportsPerMonth).toBe(1);
    expect(free.voiceMinutesPerMonth).toBe(10);
    expect(free.workspaceChatMessagesPerDay).toBe(10);
  });

  it('free tier restricts export targets to zip_markdown only', () => {
    expect(PLAN_LIMITS.free.exportTargets).toEqual(['zip_markdown']);
  });

  it('free tier restricts archetype access to 3 archetypes', () => {
    const access = PLAN_LIMITS.free.archetypeAccess;
    expect(Array.isArray(access)).toBe(true);
    expect((access as readonly string[]).length).toBe(3);
    expect(access).toContain('indie_software');
    expect(access).toContain('ai_built_app');
    expect(access).toContain('wedding_event');
  });

  it('pro tier unlocks unlimited artifacts and exports', () => {
    const pro = PLAN_LIMITS.pro;
    expect(pro.projectsPerMonth).toBe(10);
    expect(pro.artifactsPerProject).toBe('unlimited');
    expect(pro.realityChecksPerMonth).toBe('unlimited');
    expect(pro.exportsPerMonth).toBe('unlimited');
    expect(pro.exportTargets).toBe('all');
    expect(pro.archetypeAccess).toBe('all');
  });

  it('pro tier has higher voice and chat limits than free', () => {
    const pro = PLAN_LIMITS.pro;
    const free = PLAN_LIMITS.free;
    expect(pro.voiceMinutesPerMonth).toBeGreaterThan(free.voiceMinutesPerMonth);
    expect(pro.workspaceChatMessagesPerDay).toBeGreaterThan(
      free.workspaceChatMessagesPerDay as number,
    );
  });

  it('team tier includes seat configuration', () => {
    const team = PLAN_LIMITS.team;
    expect(team.seatsIncluded).toBe(3);
    expect(team.seatsMax).toBe(25);
  });

  it('every tier has all required limit fields', () => {
    const requiredFields = [
      'projectsPerMonth',
      'artifactsPerProject',
      'realityChecksPerMonth',
      'exportsPerMonth',
      'exportTargets',
      'voiceMinutesPerMonth',
      'workspaceChatMessagesPerDay',
      'archetypeAccess',
    ] as const;

    for (const tier of PLAN_TIERS) {
      for (const field of requiredFields) {
        expect(PLAN_LIMITS[tier]).toHaveProperty(field);
      }
    }
  });

  it('all numeric limit values are numbers or "unlimited"', () => {
    const numericFields = [
      'projectsPerMonth',
      'artifactsPerProject',
      'realityChecksPerMonth',
      'exportsPerMonth',
      'workspaceChatMessagesPerDay',
    ] as const;

    for (const tier of PLAN_TIERS) {
      for (const field of numericFields) {
        const value = PLAN_LIMITS[tier][field];
        expect(
          typeof value === 'number' || value === 'unlimited',
          `${tier}.${field} should be a number or "unlimited", got ${typeof value}: ${value}`,
        ).toBe(true);
      }
    }
  });
});

// ============================================================
// PRICING_CENTS
// ============================================================

describe('PRICING_CENTS', () => {
  it('has monthly and annual pricing', () => {
    expect(PRICING_CENTS.proMonthly).toBeGreaterThan(0);
    expect(PRICING_CENTS.proAnnual).toBeGreaterThan(0);
  });

  it('annual pricing is cheaper than 12x monthly', () => {
    expect(PRICING_CENTS.proAnnual).toBeLessThan(PRICING_CENTS.proMonthly * 12);
  });

  it('all prices are positive integers (cents)', () => {
    for (const value of Object.values(PRICING_CENTS)) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThan(0);
    }
  });
});

// ============================================================
// RATE_LIMITS
// ============================================================

describe('RATE_LIMITS', () => {
  it('has an entry for every PlanTier', () => {
    for (const tier of PLAN_TIERS) {
      expect(RATE_LIMITS).toHaveProperty(tier);
    }
  });

  it('higher tiers have equal or higher rate limits', () => {
    expect(RATE_LIMITS.pro.aiCallsPerMinute).toBeGreaterThanOrEqual(
      RATE_LIMITS.free.aiCallsPerMinute,
    );
    expect(RATE_LIMITS.team.aiCallsPerMinute).toBeGreaterThanOrEqual(
      RATE_LIMITS.pro.aiCallsPerMinute,
    );
    expect(RATE_LIMITS.enterprise.aiCallsPerMinute).toBeGreaterThanOrEqual(
      RATE_LIMITS.team.aiCallsPerMinute,
    );
  });

  it('every tier has all required rate limit fields', () => {
    const requiredFields = [
      'aiCallsPerMinute',
      'aiCallsPerDay',
      'voiceTranscribePerMinute',
      'exportGenerationPerHour',
    ] as const;

    for (const tier of PLAN_TIERS) {
      for (const field of requiredFields) {
        expect(RATE_LIMITS[tier]).toHaveProperty(field);
      }
    }
  });
});

// ============================================================
// costCents()
// ============================================================

describe('costCents', () => {
  it('returns 0 or more for zero tokens', () => {
    expect(costCents('deepseek-v4-flash', 0, 0)).toBe(0);
  });

  it('calculates flash model cost correctly', () => {
    // 1M input tokens at 14 cents + 1M output tokens at 28 cents = 42 cents
    const result = costCents('deepseek-v4-flash', 1_000_000, 1_000_000);
    expect(result).toBe(42);
  });

  it('rounds up to the nearest cent', () => {
    // Small number of tokens should round up, not down
    const result = costCents('deepseek-v4-flash', 1, 1);
    expect(result).toBe(1); // ceil of a tiny fraction
  });

  it('pro model returns a positive number for non-zero tokens', () => {
    const result = costCents('deepseek-v4-pro', 1_000_000, 1_000_000);
    expect(result).toBeGreaterThan(0);
  });
});

// ============================================================
// isLimitExceeded()
// ============================================================

describe('isLimitExceeded', () => {
  it('returns false when current is below limit', () => {
    expect(isLimitExceeded(3, 10)).toBe(false);
  });

  it('returns true when current equals limit', () => {
    expect(isLimitExceeded(10, 10)).toBe(true);
  });

  it('returns true when current exceeds limit', () => {
    expect(isLimitExceeded(15, 10)).toBe(true);
  });

  it('returns false for unlimited', () => {
    expect(isLimitExceeded(999999, 'unlimited')).toBe(false);
  });
});
