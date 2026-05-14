import { describe, it, expect } from 'vitest';
import {
  BANNED_PHRASES,
  BANNED_PHRASES_SET,
  scanForBannedPhrases,
  buildBannedPhrasesInstruction,
} from '../quality/banned-phrases';

// ============================================================
// BANNED_PHRASES list
// ============================================================

describe('BANNED_PHRASES', () => {
  it('is a non-empty array', () => {
    expect(BANNED_PHRASES.length).toBeGreaterThan(0);
  });

  it('contains at least 30 phrases', () => {
    expect(BANNED_PHRASES.length).toBeGreaterThanOrEqual(30);
  });

  it('every entry is a non-empty string', () => {
    for (const phrase of BANNED_PHRASES) {
      expect(typeof phrase).toBe('string');
      expect(phrase.length).toBeGreaterThan(0);
    }
  });

  it('contains well-known AI slop phrases', () => {
    const lower = BANNED_PHRASES.map((p) => p.toLowerCase());
    expect(lower).toContain('delve');
    expect(lower).toContain('leverage');
    expect(lower).toContain('robust');
    expect(lower).toContain('seamless');
    expect(lower).toContain('synergy');
    expect(lower).toContain('game-changer');
  });

  it('has no duplicate entries', () => {
    const lower = BANNED_PHRASES.map((p) => p.toLowerCase());
    const unique = new Set(lower);
    expect(unique.size).toBe(lower.length);
  });
});

// ============================================================
// BANNED_PHRASES_SET
// ============================================================

describe('BANNED_PHRASES_SET', () => {
  it('is a Set with the same size as the array', () => {
    expect(BANNED_PHRASES_SET.size).toBe(BANNED_PHRASES.length);
  });

  it('contains lowercase versions of all phrases', () => {
    for (const phrase of BANNED_PHRASES) {
      expect(BANNED_PHRASES_SET.has(phrase.toLowerCase())).toBe(true);
    }
  });
});

// ============================================================
// scanForBannedPhrases()
// ============================================================

describe('scanForBannedPhrases', () => {
  it('returns empty array for clean text', () => {
    const result = scanForBannedPhrases('This is a perfectly normal sentence.');
    expect(result).toEqual([]);
  });

  it('detects a single banned phrase', () => {
    const result = scanForBannedPhrases('We need to delve into the details.');
    expect(result).toContain('delve');
  });

  it('detects multiple banned phrases', () => {
    const result = scanForBannedPhrases(
      'We need to leverage our robust ecosystem to create a seamless experience.',
    );
    expect(result.length).toBeGreaterThanOrEqual(3);
    expect(result).toContain('leverage');
    expect(result).toContain('robust');
    expect(result).toContain('seamless');
  });

  it('is case-insensitive', () => {
    const result = scanForBannedPhrases('DELVE into LEVERAGE and ROBUST systems.');
    expect(result).toContain('delve');
    expect(result).toContain('leverage');
    expect(result).toContain('robust');
  });

  it('detects multi-word phrases', () => {
    const result = scanForBannedPhrases(
      "In today's fast-paced world, we must think outside the box.",
    );
    expect(result).toContain("in today's fast-paced world");
    expect(result).toContain('think outside the box');
  });

  it('returns empty array for empty string', () => {
    expect(scanForBannedPhrases('')).toEqual([]);
  });
});

// ============================================================
// buildBannedPhrasesInstruction()
// ============================================================

describe('buildBannedPhrasesInstruction', () => {
  it('returns a non-empty string', () => {
    const instruction = buildBannedPhrasesInstruction();
    expect(typeof instruction).toBe('string');
    expect(instruction.length).toBeGreaterThan(0);
  });

  it('contains the BANNED PHRASES header', () => {
    const instruction = buildBannedPhrasesInstruction();
    expect(instruction).toContain('BANNED PHRASES');
  });

  it('includes every banned phrase in the output', () => {
    const instruction = buildBannedPhrasesInstruction();
    for (const phrase of BANNED_PHRASES) {
      expect(instruction).toContain(phrase);
    }
  });

  it('formats each phrase with a dash bullet', () => {
    const instruction = buildBannedPhrasesInstruction();
    for (const phrase of BANNED_PHRASES) {
      expect(instruction).toContain(`- "${phrase}"`);
    }
  });
});
