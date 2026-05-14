// ============================================================
// Jetdale — Product Event Names
// Only emit events from this list. Typed enum prevents typos.
// ============================================================

export const PRODUCT_EVENTS = {
  // Auth
  SIGNUP: 'signup',
  SIGNIN: 'signin',
  SIGNOUT: 'signout',

  // Onboarding
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_COMPLETED: 'onboarding_completed',

  // Projects
  PROJECT_CREATED: 'project_created',
  PROJECT_RENAMED: 'project_renamed',
  PROJECT_ARCHIVED: 'project_archived',
  PROJECT_DELETED: 'project_deleted',

  // Discovery
  DISCOVERY_STARTED: 'discovery_started',
  DISCOVERY_QUESTION_ANSWERED: 'discovery_question_answered',
  DISCOVERY_COMPLETED: 'discovery_completed',
  DISCOVERY_ABANDONED: 'discovery_abandoned',

  // Voice
  VOICE_RECORDING_STARTED: 'voice_recording_started',
  VOICE_RECORDING_COMPLETED: 'voice_recording_completed',

  // Reality check
  REALITY_CHECK_RUN: 'reality_check_run',
  REALITY_CHECK_ACCEPTED: 'reality_check_accepted',
  REALITY_CHECK_REJECTED: 'reality_check_rejected',

  // Artifacts
  ARTIFACT_GENERATION_STARTED: 'artifact_generation_started',
  ARTIFACT_GENERATION_COMPLETED: 'artifact_generation_completed',
  ARTIFACT_GENERATION_FAILED: 'artifact_generation_failed',
  ARTIFACT_EDITED: 'artifact_edited',
  ARTIFACT_REGENERATED: 'artifact_regenerated',

  // Chat
  CHAT_MESSAGE_SENT: 'chat_message_sent',

  // Export
  EXPORT_INITIATED: 'export_initiated',
  EXPORT_COMPLETED: 'export_completed',
  EXPORT_DOWNLOADED: 'export_downloaded',

  // Billing
  PAYWALL_VIEWED: 'paywall_viewed',
  PLAN_SELECTED: 'plan_selected',
  CHECKOUT_STARTED: 'checkout_started',
  CHECKOUT_COMPLETED: 'checkout_completed',
  SUBSCRIPTION_CREATED: 'subscription_created',
  SUBSCRIPTION_UPGRADED: 'subscription_upgraded',
  SUBSCRIPTION_DOWNGRADED: 'subscription_downgraded',
  SUBSCRIPTION_CANCELED: 'subscription_canceled',

  // App lifecycle
  APP_OPENED: 'app_opened',
  APP_BACKGROUNDED: 'app_backgrounded',
  PUSH_TOKEN_REGISTERED: 'push_token_registered',
} as const;

export type ProductEvent =
  (typeof PRODUCT_EVENTS)[keyof typeof PRODUCT_EVENTS];

export const ALL_PRODUCT_EVENTS: ProductEvent[] = Object.values(PRODUCT_EVENTS);
