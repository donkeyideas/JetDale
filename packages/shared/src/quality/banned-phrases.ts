// ============================================================
// Jetdale — Banned AI Phrases
// Every piece of generated content is scanned against this list.
// If detected, the section is regenerated with the phrase added
// to the prompt's "do not use" section.
// ============================================================

export const BANNED_PHRASES = [
  'delve',
  'leverage',
  'robust',
  'cutting-edge',
  'seamless',
  'navigate', // when used as metaphor for non-physical things
  "in today's fast-paced world",
  'harness the power',
  'unlock the potential',
  'furthermore',
  'moreover',
  'additionally', // as sentence starters
  "it's important to note that",
  'let me know if',
  'i hope this helps',
  'feel free to',
  "please don't hesitate",
  'game-changer',
  'paradigm shift',
  'synergy',
  'thought leader',
  'disrupt',
  'revolutionize',
  'empower',
  'world-class',
  'best-in-class',
  'next-generation',
  'innovative solution',
  'holistic approach',
  'deep dive',
  'move the needle',
  'circle back',
  'low-hanging fruit',
  'at the end of the day',
  'take it to the next level',
  'think outside the box',
  'pain point', // overused in AI output
  'streamline',
  'optimize', // overused as filler
  'ecosystem',
  'landscape', // when used as business jargon
  'stakeholder alignment',
  'value proposition', // unless specifically asked about
  'mission-critical',
  'scalable solution',
  'end-to-end',
  'turnkey',
  'best practices', // too generic
] as const;

export const BANNED_PHRASES_SET = new Set(
  BANNED_PHRASES.map((p) => p.toLowerCase()),
);

/**
 * Check if text contains any banned phrases.
 * Returns array of found banned phrases, or empty array if clean.
 */
export function scanForBannedPhrases(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase.toLowerCase())) {
      found.push(phrase);
    }
  }
  return found;
}

/**
 * Build a "do not use" instruction string for AI prompts.
 */
export function buildBannedPhrasesInstruction(): string {
  return `BANNED PHRASES — Never use any of these words or phrases in your output. If you catch yourself about to write one, rephrase:\n${BANNED_PHRASES.map((p) => `- "${p}"`).join('\n')}`;
}
