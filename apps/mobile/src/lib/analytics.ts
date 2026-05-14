// ============================================================
// Jetdale — Analytics Event Logger (Mobile)
// Initializes PostHog + Sentry when keys are present.
// Sends events to PostHog and the product_events table.
// Gracefully no-ops when keys are not configured.
// ============================================================

import { env } from '@/config/env';
import { supabase } from '@/lib/supabase';

// ---- Lazy-loaded SDK references ----
let posthog: ReturnType<typeof createPostHogStub> | null = null;
let sentryInitialized = false;

// ============================================================
// PostHog stub type (avoids hard import failure when not installed)
// ============================================================

type PostHogInstance = {
  capture: (event: string, properties?: Record<string, unknown>) => void;
  identify: (userId: string, traits?: Record<string, unknown>) => void;
  reset: () => void;
};

function createPostHogStub(): PostHogInstance {
  return {
    capture: () => {},
    identify: () => {},
    reset: () => {},
  };
}

// ============================================================
// Initialization
// ============================================================

/**
 * Initialize analytics providers. Call once at app startup.
 * Safely no-ops if keys are missing.
 */
export async function initAnalytics(): Promise<void> {
  // PostHog
  if (env.EXPO_PUBLIC_POSTHOG_KEY) {
    try {
      const PostHog = await import('posthog-react-native');
      const client = await PostHog.PostHog.initAsync(
        env.EXPO_PUBLIC_POSTHOG_KEY,
        {
          host: env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
        },
      );
      posthog = client as unknown as PostHogInstance;
      console.log('PostHog initialized');
    } catch (err) {
      console.warn('PostHog init failed (SDK may not be installed):', err);
      posthog = null;
    }
  }

  // Sentry
  if (env.EXPO_PUBLIC_SENTRY_DSN) {
    try {
      const Sentry = await import('@sentry/react-native');
      Sentry.init({
        dsn: env.EXPO_PUBLIC_SENTRY_DSN,
        tracesSampleRate: 0.2,
        enableAutoSessionTracking: true,
      });
      sentryInitialized = true;
      console.log('Sentry initialized');
    } catch (err) {
      console.warn('Sentry init failed (SDK may not be installed):', err);
      sentryInitialized = false;
    }
  }
}

// ============================================================
// Track events
// ============================================================

/**
 * Track a product event. Sends to PostHog (if configured) and
 * inserts into the product_events table via Supabase.
 */
export async function trackEvent(
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  // PostHog
  if (posthog) {
    try {
      posthog.capture(event, properties);
    } catch (err) {
      console.warn('PostHog capture failed:', err);
    }
  }

  // product_events table
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from('product_events').insert({
      user_id: user?.id ?? null,
      event,
      properties: properties ?? {},
      platform: getPlatform(),
    });
  } catch (err) {
    // Don't crash the app if analytics insert fails
    console.warn('Failed to insert product_event:', err);
  }
}

// ============================================================
// Identify user
// ============================================================

/**
 * Identify the current user across analytics providers.
 * Call after sign-in and whenever profile data changes.
 */
export function identifyUser(
  userId: string,
  traits: Record<string, unknown>,
): void {
  // PostHog
  if (posthog) {
    try {
      posthog.identify(userId, traits);
    } catch (err) {
      console.warn('PostHog identify failed:', err);
    }
  }

  // Sentry
  if (sentryInitialized) {
    try {
      // Dynamic import to avoid build failure if @sentry/react-native isn't installed
      import('@sentry/react-native').then((Sentry) => {
        Sentry.setUser({ id: userId, ...traits });
      });
    } catch (err) {
      console.warn('Sentry setUser failed:', err);
    }
  }
}

// ============================================================
// Reset (on sign-out)
// ============================================================

/**
 * Reset analytics state. Call on sign-out to clear user identity.
 */
export function resetAnalytics(): void {
  // PostHog
  if (posthog) {
    try {
      posthog.reset();
    } catch (err) {
      console.warn('PostHog reset failed:', err);
    }
  }

  // Sentry
  if (sentryInitialized) {
    try {
      import('@sentry/react-native').then((Sentry) => {
        Sentry.setUser(null);
      });
    } catch (err) {
      console.warn('Sentry setUser(null) failed:', err);
    }
  }
}

// ============================================================
// Helpers
// ============================================================

function getPlatform(): 'ios' | 'android' | 'web' | null {
  try {
    const { Platform } = require('react-native');
    if (Platform.OS === 'ios') return 'ios';
    if (Platform.OS === 'android') return 'android';
    if (Platform.OS === 'web') return 'web';
  } catch {
    // not in RN context
  }
  return null;
}
