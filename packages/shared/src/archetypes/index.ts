// ============================================================
// Jetdale — Archetype Registry
// Central manifest of all discovery archetypes.
// ============================================================

import type { ArchetypeDefinition } from '../types';
import { indieSoftware } from './indie-software';
import { aiBuiltApp } from './ai-built-app';
import { mobileGame } from './mobile-game';
import { weddingEvent } from './wedding-event';
import { homeRenovation } from './home-renovation';

/**
 * All archetypes indexed by slug.
 * Slugs must match the database `archetypes` table exactly.
 */
export const ARCHETYPES: Record<string, ArchetypeDefinition> = {
  indie_software: indieSoftware,
  ai_built_app: aiBuiltApp,
  mobile_game: mobileGame,
  wedding_event: weddingEvent,
  home_renovation: homeRenovation,
};

/**
 * Ordered list of archetype slugs for display.
 */
export const ARCHETYPE_SLUGS = [
  'indie_software',
  'ai_built_app',
  'mobile_game',
  'wedding_event',
  'home_renovation',
] as const;

export type ArchetypeSlug = (typeof ARCHETYPE_SLUGS)[number];

/**
 * Get an archetype by slug. Throws if not found.
 */
export function getArchetype(slug: string): ArchetypeDefinition {
  const archetype = ARCHETYPES[slug];
  if (!archetype) {
    throw new Error(`Unknown archetype slug: "${slug}". Valid slugs: ${ARCHETYPE_SLUGS.join(', ')}`);
  }
  return archetype;
}

/**
 * Get the question at a specific step index (0-based).
 */
export function getQuestion(slug: string, stepIndex: number) {
  const archetype = getArchetype(slug);
  const question = archetype.questions[stepIndex];
  if (!question) {
    throw new Error(`Question index ${stepIndex} out of range for archetype "${slug}" (has ${archetype.questions.length} questions)`);
  }
  return question;
}

/**
 * Get the next question index based on branching logic.
 * Returns -1 if the interview is complete.
 */
export function getNextStep(
  slug: string,
  currentStep: number,
  answers: Record<string, unknown>,
): number {
  const archetype = getArchetype(slug);
  const currentQuestion = archetype.questions[currentStep];

  // If current question has branching logic, evaluate it
  if (currentQuestion?.branchOn) {
    const branchResult = currentQuestion.branchOn(answers);
    if (branchResult === 'end') return -1;

    // Branch result is a question key — find its index
    const targetIndex = archetype.questions.findIndex((q) => q.key === branchResult);
    if (targetIndex !== -1) return targetIndex;
  }

  // Default: go to the next question
  const nextStep = currentStep + 1;
  return nextStep >= archetype.questions.length ? -1 : nextStep;
}

/**
 * Get total question count for an archetype.
 */
export function getQuestionCount(slug: string): number {
  return getArchetype(slug).questions.length;
}

// Re-export individual archetypes
export { indieSoftware } from './indie-software';
export { aiBuiltApp } from './ai-built-app';
export { mobileGame } from './mobile-game';
export { weddingEvent } from './wedding-event';
export { homeRenovation } from './home-renovation';
