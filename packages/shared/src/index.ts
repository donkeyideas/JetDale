// ============================================================
// Jetdale — Shared Package Entry Point
// ============================================================

// Core types and enums
export * from './types';
export * from './events';
export * from './limits';

// Quality
export { BANNED_PHRASES, scanForBannedPhrases, buildBannedPhrasesInstruction } from './quality/banned-phrases';

// Archetypes
export {
  ARCHETYPES,
  ARCHETYPE_SLUGS,
  getArchetype,
  getQuestion,
  getNextStep,
  getQuestionCount,
} from './archetypes';
export type { ArchetypeSlug } from './archetypes';

// Prompts
export {
  buildDiscoverySpinePrompt,
  DISCOVERY_OVERLAYS,
  buildRealityCheckPrompt,
  buildWorkspaceChatPrompt,
  buildDemandAnalysisPrompt,
  buildVisionPrompt,
  buildScopePrompt,
  buildPersonasPrompt,
  buildRoadmapPrompt,
  buildTechStackPrompt,
  buildRiskRegisterPrompt,
  buildSuccessMetricsPrompt,
  buildBudgetPrompt,
  buildWireframesPrompt,
  buildDecisionLogPrompt,
  buildPreMortemPrompt,
  buildPitchDeckPrompt,
  buildCompetitiveAnalysisPrompt,
  buildGoToMarketPrompt,
  buildUserJourneyPrompt,
  buildRaciMatrixPrompt,
  buildArchitectureOverviewPrompt,
} from './prompts';

// Artifact schemas
export { ARTIFACT_SCHEMAS } from './artifact-schemas';
