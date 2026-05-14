import { z } from 'zod';

import { VisionSchema } from './vision';
import { ScopeSchema } from './scope';
import { PersonasSchema } from './personas';
import { RoadmapSchema } from './roadmap';
import { TechStackSchema } from './tech-stack';
import { RiskRegisterSchema } from './risk-register';
import { SuccessMetricsSchema } from './success-metrics';
import { BudgetSchema } from './budget';
import { WireframesSchema } from './wireframes';
import { DecisionLogSchema } from './decision-log';
import { PreMortemSchema } from './pre-mortem';
import { PitchDeckSchema } from './pitch-deck';
import { CompetitiveAnalysisSchema } from './competitive-analysis';
import { GoToMarketSchema } from './go-to-market';
import { UserJourneySchema } from './user-journey';
import { RaciMatrixSchema } from './raci-matrix';
import { ArchitectureOverviewSchema } from './architecture-overview';

// Re-export schemas
export {
  VisionSchema,
  ScopeSchema,
  PersonasSchema,
  RoadmapSchema,
  TechStackSchema,
  RiskRegisterSchema,
  SuccessMetricsSchema,
  BudgetSchema,
  WireframesSchema,
  DecisionLogSchema,
  PreMortemSchema,
  PitchDeckSchema,
  CompetitiveAnalysisSchema,
  GoToMarketSchema,
  UserJourneySchema,
  RaciMatrixSchema,
  ArchitectureOverviewSchema,
};

// Re-export types
export type { Vision } from './vision';
export type { Scope } from './scope';
export type { Personas } from './personas';
export type { Roadmap } from './roadmap';
export type { TechStack } from './tech-stack';
export type { RiskRegister } from './risk-register';
export type { SuccessMetrics } from './success-metrics';
export type { Budget } from './budget';
export type { Wireframes } from './wireframes';
export type { DecisionLog } from './decision-log';
export type { PreMortem } from './pre-mortem';
export type { PitchDeck } from './pitch-deck';
export type { CompetitiveAnalysis } from './competitive-analysis';
export type { GoToMarket } from './go-to-market';
export type { UserJourney } from './user-journey';
export type { RaciMatrix } from './raci-matrix';
export type { ArchitectureOverview } from './architecture-overview';

/** Map from artifact type slug to its Zod schema. */
export const ARTIFACT_SCHEMAS: Record<string, z.ZodSchema> = {
  vision: VisionSchema,
  scope: ScopeSchema,
  personas: PersonasSchema,
  roadmap: RoadmapSchema,
  'tech-stack': TechStackSchema,
  'risk-register': RiskRegisterSchema,
  'success-metrics': SuccessMetricsSchema,
  budget: BudgetSchema,
  wireframes: WireframesSchema,
  'decision-log': DecisionLogSchema,
  'pre-mortem': PreMortemSchema,
  'pitch-deck': PitchDeckSchema,
  'competitive-analysis': CompetitiveAnalysisSchema,
  'go-to-market': GoToMarketSchema,
  'user-journey': UserJourneySchema,
  'raci-matrix': RaciMatrixSchema,
  'architecture-overview': ArchitectureOverviewSchema,
};
