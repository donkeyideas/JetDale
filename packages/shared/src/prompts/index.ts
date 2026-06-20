// ============================================================
// Jetdale — Prompts Index
// Central export for all prompt builders and overlays.
// ============================================================

// Discovery spine
export { buildDiscoverySpinePrompt } from './discovery-spine';

// Discovery overlays (per archetype)
import { indieSoftwareOverlay } from './discovery/indie-software';
import { aiBuiltAppOverlay } from './discovery/ai-built-app';
import { mobileGameOverlay } from './discovery/mobile-game';
import { weddingEventOverlay } from './discovery/wedding-event';
import { homeRenovationOverlay } from './discovery/home-renovation';

export {
  indieSoftwareOverlay,
  aiBuiltAppOverlay,
  mobileGameOverlay,
  weddingEventOverlay,
  homeRenovationOverlay,
};

// Reality check
export { buildRealityCheckPrompt } from './reality-check';

// Workspace chat
export { buildWorkspaceChatPrompt } from './chat-workspace';

// Artifact generation prompts
export { buildDemandAnalysisPrompt } from './artifact/demand-analysis';
export { buildVisionPrompt } from './artifact/vision';
export { buildScopePrompt } from './artifact/scope';
export { buildPersonasPrompt } from './artifact/personas';
export { buildRoadmapPrompt } from './artifact/roadmap';
export { buildTechStackPrompt } from './artifact/tech-stack';
export { buildRiskRegisterPrompt } from './artifact/risk-register';
export { buildSuccessMetricsPrompt } from './artifact/success-metrics';
export { buildBudgetPrompt } from './artifact/budget';
export { buildWireframesPrompt } from './artifact/wireframes';
export { buildDecisionLogPrompt } from './artifact/decision-log';
export { buildPreMortemPrompt } from './artifact/pre-mortem';
export { buildPitchDeckPrompt } from './artifact/pitch-deck';
export { buildCompetitiveAnalysisPrompt } from './artifact/competitive-analysis';
export { buildGoToMarketPrompt } from './artifact/go-to-market';
export { buildUserJourneyPrompt } from './artifact/user-journey';
export { buildRaciMatrixPrompt } from './artifact/raci-matrix';
export { buildArchitectureOverviewPrompt } from './artifact/architecture-overview';

// Overlay lookup by archetype slug
export const DISCOVERY_OVERLAYS: Record<string, string> = {
  indie_software: indieSoftwareOverlay,
  ai_built_app: aiBuiltAppOverlay,
  mobile_game: mobileGameOverlay,
  wedding_event: weddingEventOverlay,
  home_renovation: homeRenovationOverlay,
};
