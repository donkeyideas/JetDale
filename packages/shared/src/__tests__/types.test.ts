import { describe, it, expect } from 'vitest';
import {
  PLAN_TIERS,
  SUBSCRIPTION_STATUSES,
  PROJECT_PHASES,
  PROJECT_STATUSES,
  DISCOVERY_STATUSES,
  ARTIFACT_TYPES,
  ARTIFACT_STATUSES,
  EXPORT_TARGETS,
  AI_EVENT_TYPES,
  USER_ROLES,
  QUESTION_TYPES,
  ARCHETYPE_CATEGORIES,
  VOICE_PROVIDERS,
  VOICE_PREFERENCES,
  DEEPSEEK_MODELS,
} from '../types';
import type {
  PlanTier,
  SubscriptionStatus,
  ProjectPhase,
  ProjectStatus,
  DiscoveryStatus,
  ArtifactType,
  ArtifactStatus,
  ExportTarget,
  AiEventType,
  UserRole,
  QuestionType,
  ArchetypeCategory,
  VoiceProvider,
  VoicePreference,
  DeepSeekModel,
  ArchetypeQuestion,
  ArchetypeDefinition,
  DiscoverySummary,
  RealityConcern,
  ChatMessage,
  ExportBundle,
  ApiError,
  LimitExceededError,
  RateLimitError,
} from '../types';

// ============================================================
// Enum arrays — runtime checks
// ============================================================

describe('Enum arrays are non-empty and contain expected values', () => {
  it('PLAN_TIERS', () => {
    expect(PLAN_TIERS.length).toBeGreaterThanOrEqual(2);
    expect(PLAN_TIERS).toContain('free');
    expect(PLAN_TIERS).toContain('pro');
  });

  it('SUBSCRIPTION_STATUSES', () => {
    expect(SUBSCRIPTION_STATUSES.length).toBeGreaterThanOrEqual(3);
    expect(SUBSCRIPTION_STATUSES).toContain('active');
    expect(SUBSCRIPTION_STATUSES).toContain('canceled');
  });

  it('PROJECT_PHASES', () => {
    expect(PROJECT_PHASES.length).toBeGreaterThanOrEqual(4);
    expect(PROJECT_PHASES).toContain('discovery');
    expect(PROJECT_PHASES).toContain('artifacts');
    expect(PROJECT_PHASES).toContain('export');
  });

  it('PROJECT_STATUSES', () => {
    expect(PROJECT_STATUSES).toContain('active');
    expect(PROJECT_STATUSES).toContain('archived');
    expect(PROJECT_STATUSES).toContain('deleted');
  });

  it('DISCOVERY_STATUSES', () => {
    expect(DISCOVERY_STATUSES).toContain('in_progress');
    expect(DISCOVERY_STATUSES).toContain('completed');
  });

  it('ARTIFACT_TYPES has 12 entries', () => {
    expect(ARTIFACT_TYPES.length).toBe(12);
    expect(ARTIFACT_TYPES).toContain('vision');
    expect(ARTIFACT_TYPES).toContain('scope');
    expect(ARTIFACT_TYPES).toContain('roadmap');
    expect(ARTIFACT_TYPES).toContain('pitch_deck');
  });

  it('ARTIFACT_STATUSES', () => {
    expect(ARTIFACT_STATUSES).toContain('generating');
    expect(ARTIFACT_STATUSES).toContain('ready');
    expect(ARTIFACT_STATUSES).toContain('failed');
  });

  it('EXPORT_TARGETS has 9 entries', () => {
    expect(EXPORT_TARGETS.length).toBe(9);
    expect(EXPORT_TARGETS).toContain('claude_code');
    expect(EXPORT_TARGETS).toContain('cursor');
    expect(EXPORT_TARGETS).toContain('pdf');
    expect(EXPORT_TARGETS).toContain('zip_markdown');
  });

  it('AI_EVENT_TYPES', () => {
    expect(AI_EVENT_TYPES).toContain('discovery_question');
    expect(AI_EVENT_TYPES).toContain('artifact_generation');
    expect(AI_EVENT_TYPES).toContain('workspace_chat');
  });

  it('USER_ROLES', () => {
    expect(USER_ROLES).toContain('user');
    expect(USER_ROLES).toContain('admin');
  });

  it('QUESTION_TYPES', () => {
    expect(QUESTION_TYPES).toContain('open_text');
    expect(QUESTION_TYPES).toContain('single_select');
    expect(QUESTION_TYPES).toContain('multi_select');
  });

  it('ARCHETYPE_CATEGORIES', () => {
    expect(ARCHETYPE_CATEGORIES).toContain('software');
    expect(ARCHETYPE_CATEGORIES).toContain('event');
    expect(ARCHETYPE_CATEGORIES).toContain('physical');
  });

  it('VOICE_PROVIDERS', () => {
    expect(VOICE_PROVIDERS).toContain('web_speech');
    expect(VOICE_PROVIDERS).toContain('whisper');
  });

  it('VOICE_PREFERENCES', () => {
    expect(VOICE_PREFERENCES).toContain('auto');
  });

  it('DEEPSEEK_MODELS', () => {
    expect(DEEPSEEK_MODELS).toContain('deepseek-v4-flash');
    expect(DEEPSEEK_MODELS).toContain('deepseek-v4-pro');
  });
});

// ============================================================
// Compile-time type checks
// These tests pass if the file compiles without errors.
// They verify that the types are correctly defined and usable.
// ============================================================

describe('Type-level compile checks (these verify TS types exist)', () => {
  it('PlanTier assignability', () => {
    const tier: PlanTier = 'free';
    expect(tier).toBe('free');
  });

  it('SubscriptionStatus assignability', () => {
    const status: SubscriptionStatus = 'active';
    expect(status).toBe('active');
  });

  it('ProjectPhase assignability', () => {
    const phase: ProjectPhase = 'discovery';
    expect(phase).toBe('discovery');
  });

  it('ProjectStatus assignability', () => {
    const status: ProjectStatus = 'active';
    expect(status).toBe('active');
  });

  it('DiscoveryStatus assignability', () => {
    const status: DiscoveryStatus = 'in_progress';
    expect(status).toBe('in_progress');
  });

  it('ArtifactType assignability', () => {
    const type: ArtifactType = 'vision';
    expect(type).toBe('vision');
  });

  it('ArtifactStatus assignability', () => {
    const status: ArtifactStatus = 'ready';
    expect(status).toBe('ready');
  });

  it('ExportTarget assignability', () => {
    const target: ExportTarget = 'claude_code';
    expect(target).toBe('claude_code');
  });

  it('AiEventType assignability', () => {
    const event: AiEventType = 'workspace_chat';
    expect(event).toBe('workspace_chat');
  });

  it('UserRole assignability', () => {
    const role: UserRole = 'admin';
    expect(role).toBe('admin');
  });

  it('QuestionType assignability', () => {
    const qt: QuestionType = 'open_text';
    expect(qt).toBe('open_text');
  });

  it('ArchetypeCategory assignability', () => {
    const cat: ArchetypeCategory = 'software';
    expect(cat).toBe('software');
  });

  it('VoiceProvider assignability', () => {
    const vp: VoiceProvider = 'whisper';
    expect(vp).toBe('whisper');
  });

  it('VoicePreference assignability', () => {
    const vp: VoicePreference = 'auto';
    expect(vp).toBe('auto');
  });

  it('DeepSeekModel assignability', () => {
    const m: DeepSeekModel = 'deepseek-v4-flash';
    expect(m).toBe('deepseek-v4-flash');
  });

  it('ArchetypeQuestion interface is structurally valid', () => {
    const q: ArchetypeQuestion = {
      key: 'test',
      type: 'open_text',
      question: 'What?',
      voiceEnabled: true,
      stage: { number: 1, label: 'Test' },
      required: true,
    };
    expect(q.key).toBe('test');
  });

  it('ArchetypeDefinition interface is structurally valid', () => {
    const def: ArchetypeDefinition = {
      slug: 'test',
      name: 'Test',
      category: 'software',
      scriptVersion: 1,
      expertPersona: 'You are a test.',
      estimatedMinutes: 10,
      iconName: 'test',
      description: 'A test archetype.',
      questions: [],
      artifactTypes: [],
      artifactGenerationOrder: [],
    };
    expect(def.slug).toBe('test');
  });

  it('DiscoverySummary interface is structurally valid', () => {
    const summary: DiscoverySummary = {
      projectName: 'Test',
      tagline: 'A test',
      sparkText: 'Spark',
      archetypeSlug: 'test',
      keyInsights: {},
      answersDigest: [],
    };
    expect(summary.projectName).toBe('Test');
  });

  it('RealityConcern interface is structurally valid', () => {
    const concern: RealityConcern = {
      severity: 'high',
      area: 'scope',
      message: 'Too big',
      suggestedAction: 'Cut scope',
    };
    expect(concern.severity).toBe('high');
  });

  it('ChatMessage interface is structurally valid', () => {
    const msg: ChatMessage = {
      id: '1',
      role: 'user',
      content: 'Hello',
      createdAt: new Date().toISOString(),
    };
    expect(msg.role).toBe('user');
  });

  it('ExportBundle interface is structurally valid', () => {
    const bundle: ExportBundle = {
      target: 'zip_markdown',
      files: [{ path: '/test.md', content: '# Test' }],
    };
    expect(bundle.target).toBe('zip_markdown');
  });

  it('ApiError interface is structurally valid', () => {
    const err: ApiError = { error: 'Something went wrong' };
    expect(err.error).toBeTruthy();
  });

  it('LimitExceededError interface is structurally valid', () => {
    const err: LimitExceededError = {
      error: 'Limit exceeded',
      reason: 'limit_exceeded',
      limit: 'projectsPerMonth',
      current: 5,
      max: 1,
    };
    expect(err.reason).toBe('limit_exceeded');
  });

  it('RateLimitError interface is structurally valid', () => {
    const err: RateLimitError = {
      error: 'Too many requests',
      reason: 'rate_limited',
      retryAfter: 60,
    };
    expect(err.reason).toBe('rate_limited');
  });
});
