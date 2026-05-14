// ============================================================
// Jetdale — Shared Types
// All enums mirror Postgres enums exactly.
// ============================================================

// --- Enums ---

export const PLAN_TIERS = ['free', 'pro', 'team', 'enterprise'] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

export const SUBSCRIPTION_STATUSES = [
  'active',
  'trialing',
  'past_due',
  'canceled',
  'paused',
  'expired',
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const PROJECT_PHASES = [
  'discovery',
  'reality_check',
  'artifacts',
  'refine',
  'export',
  'live',
] as const;
export type ProjectPhase = (typeof PROJECT_PHASES)[number];

export const PROJECT_STATUSES = ['active', 'archived', 'deleted'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const DISCOVERY_STATUSES = [
  'in_progress',
  'completed',
  'abandoned',
] as const;
export type DiscoveryStatus = (typeof DISCOVERY_STATUSES)[number];

export const ARTIFACT_TYPES = [
  'vision',
  'scope',
  'personas',
  'roadmap',
  'tech_stack',
  'wireframes',
  'risk_register',
  'success_metrics',
  'budget',
  'decision_log',
  'pre_mortem',
  'pitch_deck',
  'competitive_analysis',
  'go_to_market',
  'user_journey',
  'raci_matrix',
  'architecture_overview',
] as const;
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export const ARTIFACT_STATUSES = [
  'generating',
  'ready',
  'failed',
  'stale',
] as const;
export type ArtifactStatus = (typeof ARTIFACT_STATUSES)[number];

export const EXPORT_TARGETS = [
  'claude_code',
  'cursor',
  'lovable',
  'bolt',
  'replit',
  'zip_markdown',
  'pdf',
  'pitch_deck',
  'rfp',
] as const;
export type ExportTarget = (typeof EXPORT_TARGETS)[number];

export const AI_EVENT_TYPES = [
  'discovery_question',
  'discovery_answer',
  'reality_check',
  'artifact_generation',
  'workspace_chat',
  'export_prep',
] as const;
export type AiEventType = (typeof AI_EVENT_TYPES)[number];

export const USER_ROLES = [
  'user',
  'admin',
  'support',
  'investor_readonly',
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const QUESTION_TYPES = [
  'open_text',
  'single_select',
  'multi_select',
  'numeric',
  'range',
  'archetype_confirm',
  'reality_check_response',
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const ARCHETYPE_CATEGORIES = [
  'software',
  'creator',
  'physical',
  'event',
  'service',
] as const;
export type ArchetypeCategory = (typeof ARCHETYPE_CATEGORIES)[number];

export const VOICE_PROVIDERS = ['web_speech', 'whisper'] as const;
export type VoiceProvider = (typeof VOICE_PROVIDERS)[number];

export const VOICE_PREFERENCES = ['auto', 'web_speech', 'whisper'] as const;
export type VoicePreference = (typeof VOICE_PREFERENCES)[number];

export const DEEPSEEK_MODELS = [
  'deepseek-v4-flash',
  'deepseek-v4-pro',
] as const;
export type DeepSeekModel = (typeof DEEPSEEK_MODELS)[number];

// --- Archetype definition ---

export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
}

export interface QuestionStage {
  number: number;
  label: string;
}

export interface ArchetypeQuestion {
  key: string;
  type: QuestionType;
  question: string;
  helper?: string;
  voiceEnabled: boolean;
  options?: QuestionOption[];
  followUpPrompt?: string;
  branchOn?: (answers: Record<string, unknown>) => string | 'end';
  stage: QuestionStage;
  required: boolean;
}

export interface ArchetypeDefinition {
  slug: string;
  name: string;
  category: ArchetypeCategory;
  scriptVersion: number;
  expertPersona: string;
  estimatedMinutes: number;
  iconName: string;
  description: string;
  questions: ArchetypeQuestion[];
  artifactTypes: ArtifactType[];
  artifactGenerationOrder: ArtifactType[];
}

// --- Discovery ---

export interface DiscoveryAnswer {
  type: QuestionType;
  value: unknown;
  text?: string;
}

export interface DiscoverySummary {
  projectName: string;
  tagline: string;
  sparkText: string;
  archetypeSlug: string;
  keyInsights: Record<string, string>;
  answersDigest: Array<{
    questionKey: string;
    questionText: string;
    answerText: string;
  }>;
}

// --- Reality check ---

export interface RealityConcern {
  severity: 'critical' | 'high' | 'medium' | 'low';
  area: string;
  message: string;
  suggestedAction: string;
}

export interface ProposedChange {
  artifactType: ArtifactType;
  changeDescription: string;
}

export interface RealityCheckResult {
  summary: string;
  concerns: RealityConcern[];
  proposedChanges: ProposedChange[];
}

// --- Chat ---

export type ChatRole = 'user' | 'assistant' | 'system' | 'reality_check';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  referencesArtifactIds?: string[];
  createdAt: string;
}

// --- Export ---

export interface ExportFile {
  path: string;
  content: string;
}

export interface ExportBundle {
  target: ExportTarget;
  files: ExportFile[];
}

// --- Subscription ---

export type PaymentProvider =
  | 'stripe'
  | 'revenuecat_ios'
  | 'revenuecat_android'
  | 'manual';

export type BillingInterval = 'month' | 'year';

// --- API responses ---

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

export interface LimitExceededError extends ApiError {
  reason: 'limit_exceeded';
  limit: string;
  current: number;
  max: number;
}

export interface RateLimitError extends ApiError {
  reason: 'rate_limited';
  retryAfter: number;
}
