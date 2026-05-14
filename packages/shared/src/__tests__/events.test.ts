import { describe, it, expect } from 'vitest';
import { PRODUCT_EVENTS, ALL_PRODUCT_EVENTS } from '../events';
import type { ProductEvent } from '../events';

// ============================================================
// PRODUCT_EVENTS object
// ============================================================

describe('PRODUCT_EVENTS', () => {
  it('is a non-empty object', () => {
    const keys = Object.keys(PRODUCT_EVENTS);
    expect(keys.length).toBeGreaterThan(0);
  });

  it('contains auth events', () => {
    expect(PRODUCT_EVENTS.SIGNUP).toBe('signup');
    expect(PRODUCT_EVENTS.SIGNIN).toBe('signin');
    expect(PRODUCT_EVENTS.SIGNOUT).toBe('signout');
  });

  it('contains onboarding events', () => {
    expect(PRODUCT_EVENTS.ONBOARDING_STARTED).toBe('onboarding_started');
    expect(PRODUCT_EVENTS.ONBOARDING_COMPLETED).toBe('onboarding_completed');
  });

  it('contains project lifecycle events', () => {
    expect(PRODUCT_EVENTS.PROJECT_CREATED).toBe('project_created');
    expect(PRODUCT_EVENTS.PROJECT_RENAMED).toBe('project_renamed');
    expect(PRODUCT_EVENTS.PROJECT_ARCHIVED).toBe('project_archived');
    expect(PRODUCT_EVENTS.PROJECT_DELETED).toBe('project_deleted');
  });

  it('contains discovery events', () => {
    expect(PRODUCT_EVENTS.DISCOVERY_STARTED).toBe('discovery_started');
    expect(PRODUCT_EVENTS.DISCOVERY_QUESTION_ANSWERED).toBe('discovery_question_answered');
    expect(PRODUCT_EVENTS.DISCOVERY_COMPLETED).toBe('discovery_completed');
    expect(PRODUCT_EVENTS.DISCOVERY_ABANDONED).toBe('discovery_abandoned');
  });

  it('contains voice events', () => {
    expect(PRODUCT_EVENTS.VOICE_RECORDING_STARTED).toBe('voice_recording_started');
    expect(PRODUCT_EVENTS.VOICE_RECORDING_COMPLETED).toBe('voice_recording_completed');
  });

  it('contains reality check events', () => {
    expect(PRODUCT_EVENTS.REALITY_CHECK_RUN).toBe('reality_check_run');
    expect(PRODUCT_EVENTS.REALITY_CHECK_ACCEPTED).toBe('reality_check_accepted');
    expect(PRODUCT_EVENTS.REALITY_CHECK_REJECTED).toBe('reality_check_rejected');
  });

  it('contains artifact events', () => {
    expect(PRODUCT_EVENTS.ARTIFACT_GENERATION_STARTED).toBe('artifact_generation_started');
    expect(PRODUCT_EVENTS.ARTIFACT_GENERATION_COMPLETED).toBe('artifact_generation_completed');
    expect(PRODUCT_EVENTS.ARTIFACT_GENERATION_FAILED).toBe('artifact_generation_failed');
    expect(PRODUCT_EVENTS.ARTIFACT_EDITED).toBe('artifact_edited');
    expect(PRODUCT_EVENTS.ARTIFACT_REGENERATED).toBe('artifact_regenerated');
  });

  it('contains chat events', () => {
    expect(PRODUCT_EVENTS.CHAT_MESSAGE_SENT).toBe('chat_message_sent');
  });

  it('contains export events', () => {
    expect(PRODUCT_EVENTS.EXPORT_INITIATED).toBe('export_initiated');
    expect(PRODUCT_EVENTS.EXPORT_COMPLETED).toBe('export_completed');
    expect(PRODUCT_EVENTS.EXPORT_DOWNLOADED).toBe('export_downloaded');
  });

  it('contains billing events', () => {
    expect(PRODUCT_EVENTS.PAYWALL_VIEWED).toBe('paywall_viewed');
    expect(PRODUCT_EVENTS.PLAN_SELECTED).toBe('plan_selected');
    expect(PRODUCT_EVENTS.CHECKOUT_STARTED).toBe('checkout_started');
    expect(PRODUCT_EVENTS.CHECKOUT_COMPLETED).toBe('checkout_completed');
    expect(PRODUCT_EVENTS.SUBSCRIPTION_CREATED).toBe('subscription_created');
    expect(PRODUCT_EVENTS.SUBSCRIPTION_UPGRADED).toBe('subscription_upgraded');
    expect(PRODUCT_EVENTS.SUBSCRIPTION_DOWNGRADED).toBe('subscription_downgraded');
    expect(PRODUCT_EVENTS.SUBSCRIPTION_CANCELED).toBe('subscription_canceled');
  });

  it('contains app lifecycle events', () => {
    expect(PRODUCT_EVENTS.APP_OPENED).toBe('app_opened');
    expect(PRODUCT_EVENTS.APP_BACKGROUNDED).toBe('app_backgrounded');
    expect(PRODUCT_EVENTS.PUSH_TOKEN_REGISTERED).toBe('push_token_registered');
  });

  it('all event values are unique', () => {
    const values = Object.values(PRODUCT_EVENTS);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it('all event values are lowercase snake_case strings', () => {
    const values = Object.values(PRODUCT_EVENTS);
    for (const value of values) {
      expect(typeof value).toBe('string');
      expect(value).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });
});

// ============================================================
// ALL_PRODUCT_EVENTS array
// ============================================================

describe('ALL_PRODUCT_EVENTS', () => {
  it('is an array containing all event values', () => {
    const values = Object.values(PRODUCT_EVENTS);
    expect(ALL_PRODUCT_EVENTS.length).toBe(values.length);
    for (const value of values) {
      expect(ALL_PRODUCT_EVENTS).toContain(value);
    }
  });

  it('ProductEvent type is assignable from event values', () => {
    const event: ProductEvent = PRODUCT_EVENTS.SIGNUP;
    expect(event).toBe('signup');
  });
});
