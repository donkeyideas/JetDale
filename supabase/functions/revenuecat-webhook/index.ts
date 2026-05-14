// ============================================================
// Jetdale — RevenueCat Webhook Edge Function
// Handles mobile (iOS/Android) in-app purchase events from
// RevenueCat. Manages subscription lifecycle in the
// subscriptions table and logs all events for analytics.
// ============================================================

import { getAdminClient } from '../_shared/auth.ts';
import {
  jsonResponse,
  errorResponse,
  corsResponse,
} from '../_shared/response.ts';
import { logProductEvent } from '../_shared/log-event.ts';

// ============================================================
// Types
// ============================================================

type PlanTier = 'free' | 'pro' | 'team' | 'enterprise';
type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'past_due' | 'expired';

interface RevenueCatEvent {
  type: string;
  app_user_id: string;
  original_app_user_id: string;
  product_id: string;
  entitlement_ids: string[] | null;
  period_type: 'NORMAL' | 'TRIAL' | 'INTRO';
  purchased_at_ms: number;
  expiration_at_ms: number | null;
  store: 'APP_STORE' | 'PLAY_STORE';
  environment: 'PRODUCTION' | 'SANDBOX';
  transaction_id: string;
  transferred_from?: string[];
  transferred_to?: string[];
  new_product_id?: string;
}

interface RevenueCatWebhookPayload {
  api_version: string;
  event: RevenueCatEvent;
}

// ============================================================
// Product ID -> Plan Tier mapping
// ============================================================

const PRODUCT_TIER_MAP: Record<string, PlanTier> = {
  jetdale_pro_monthly: 'pro',
  jetdale_pro_annual: 'pro',
};

function planTierFromProductId(productId: string): PlanTier {
  return PRODUCT_TIER_MAP[productId] ?? 'free';
}

// ============================================================
// Derive platform from RevenueCat store field
// ============================================================

function platformFromStore(store: string): 'ios' | 'android' | undefined {
  if (store === 'APP_STORE') return 'ios';
  if (store === 'PLAY_STORE') return 'android';
  return undefined;
}

// ============================================================
// Derive subscription status from period_type
// ============================================================

function statusFromPeriodType(periodType: string): SubscriptionStatus {
  if (periodType === 'TRIAL') return 'trialing';
  return 'active';
}

// ============================================================
// Convert millisecond timestamp to ISO string (or null)
// ============================================================

function msToIso(ms: number | null | undefined): string | null {
  if (ms == null || ms <= 0) return null;
  return new Date(ms).toISOString();
}

// ============================================================
// Webhook authorization verification
// ============================================================

function verifyWebhookAuth(req: Request): boolean {
  const secret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  if (!secret) {
    console.error('REVENUECAT_WEBHOOK_SECRET is not configured');
    return false;
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return false;

  return authHeader === `Bearer ${secret}`;
}

// ============================================================
// Main handler
// ============================================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  // Only accept POST
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    // ----- Verify webhook authorization -----
    if (!verifyWebhookAuth(req)) {
      console.error('RevenueCat webhook: unauthorized request');
      return errorResponse('Unauthorized', 401);
    }

    // ----- Parse body -----
    let payload: RevenueCatWebhookPayload;
    try {
      payload = await req.json();
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }

    const { event } = payload;
    if (!event || !event.type) {
      return errorResponse('Missing event data', 400);
    }

    console.log(
      `RevenueCat webhook: type=${event.type} user=${event.app_user_id} product=${event.product_id} env=${event.environment}`,
    );

    // ----- Log the raw webhook event for analytics -----
    const platform = platformFromStore(event.store);
    await logProductEvent({
      userId: event.app_user_id || undefined,
      event: `revenuecat.${event.type.toLowerCase()}`,
      platform,
      properties: {
        event_type: event.type,
        product_id: event.product_id,
        store: event.store,
        environment: event.environment,
        period_type: event.period_type,
        transaction_id: event.transaction_id,
        expiration_at: msToIso(event.expiration_at_ms),
      },
    });

    // ----- Route to event handler -----
    switch (event.type) {
      case 'INITIAL_PURCHASE':
        return await handleInitialPurchase(event);
      case 'RENEWAL':
        return await handleRenewal(event);
      case 'CANCELLATION':
        return await handleCancellation(event);
      case 'UNCANCELLATION':
        return await handleUncancellation(event);
      case 'BILLING_ISSUE':
        return await handleBillingIssue(event);
      case 'EXPIRATION':
        return await handleExpiration(event);
      case 'PRODUCT_CHANGE':
        return await handleProductChange(event);
      case 'TRANSFER':
        return await handleTransfer(event);
      case 'SUBSCRIBER_ALIAS':
        // Alias events are informational only; no subscription mutation needed.
        console.log(`RevenueCat: SUBSCRIBER_ALIAS for ${event.app_user_id} — no action taken`);
        return jsonResponse({ received: true, action: 'none' });
      default:
        console.log(`RevenueCat: unhandled event type ${event.type}`);
        return jsonResponse({ received: true, action: 'none' });
    }
  } catch (err) {
    console.error('RevenueCat webhook error:', err);
    return errorResponse('Internal server error', 500);
  }
});

// ============================================================
// Helpers: find existing subscription
// ============================================================

async function findExistingSubscription(
  admin: ReturnType<typeof getAdminClient>,
  userId: string,
) {
  const { data, error } = await admin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'revenuecat')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error finding existing subscription:', error.message);
    throw error;
  }
  return data;
}

// ============================================================
// INITIAL_PURCHASE
// Create a new subscription or reactivate an existing one.
// ============================================================

async function handleInitialPurchase(event: RevenueCatEvent): Promise<Response> {
  const admin = getAdminClient();
  const userId = event.app_user_id;
  const planTier = planTierFromProductId(event.product_id);
  const status = statusFromPeriodType(event.period_type);

  const subscriptionData = {
    user_id: userId,
    plan_tier: planTier,
    status,
    provider: 'revenuecat' as const,
    provider_subscription_id: event.transaction_id,
    provider_customer_id: event.original_app_user_id,
    current_period_start: msToIso(event.purchased_at_ms),
    current_period_end: msToIso(event.expiration_at_ms),
    cancel_at_period_end: false,
    canceled_at: null,
    trial_start: event.period_type === 'TRIAL' ? msToIso(event.purchased_at_ms) : null,
    trial_end: event.period_type === 'TRIAL' ? msToIso(event.expiration_at_ms) : null,
    updated_at: new Date().toISOString(),
  };

  // Check if a RevenueCat subscription already exists for this user
  const existing = await findExistingSubscription(admin, userId);

  if (existing) {
    // Reactivate / update the existing row
    const { error } = await admin
      .from('subscriptions')
      .update(subscriptionData)
      .eq('id', existing.id);

    if (error) {
      console.error('Error updating subscription on INITIAL_PURCHASE:', error.message);
      return errorResponse('Failed to update subscription', 500);
    }

    console.log(`RevenueCat INITIAL_PURCHASE: updated subscription ${existing.id} for user ${userId}`);
    return jsonResponse({ received: true, action: 'updated', subscription_id: existing.id });
  }

  // Create new subscription
  const { data, error } = await admin
    .from('subscriptions')
    .insert(subscriptionData)
    .select('id')
    .single();

  if (error) {
    console.error('Error creating subscription on INITIAL_PURCHASE:', error.message);
    return errorResponse('Failed to create subscription', 500);
  }

  console.log(`RevenueCat INITIAL_PURCHASE: created subscription ${data.id} for user ${userId}`);
  return jsonResponse({ received: true, action: 'created', subscription_id: data.id });
}

// ============================================================
// RENEWAL
// Update period dates and ensure status is active.
// ============================================================

async function handleRenewal(event: RevenueCatEvent): Promise<Response> {
  const admin = getAdminClient();
  const userId = event.app_user_id;

  const existing = await findExistingSubscription(admin, userId);
  if (!existing) {
    console.warn(`RevenueCat RENEWAL: no subscription found for user ${userId}, creating one`);
    return await handleInitialPurchase(event);
  }

  const { error } = await admin
    .from('subscriptions')
    .update({
      status: 'active',
      current_period_start: msToIso(event.purchased_at_ms),
      current_period_end: msToIso(event.expiration_at_ms),
      cancel_at_period_end: false,
      canceled_at: null,
      // Clear trial fields on renewal — the trial period is over
      trial_start: null,
      trial_end: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id);

  if (error) {
    console.error('Error updating subscription on RENEWAL:', error.message);
    return errorResponse('Failed to update subscription', 500);
  }

  console.log(`RevenueCat RENEWAL: updated subscription ${existing.id} for user ${userId}`);
  return jsonResponse({ received: true, action: 'renewed', subscription_id: existing.id });
}

// ============================================================
// CANCELLATION
// Mark the subscription as set to cancel at period end.
// The user retains access until expiration_at_ms.
// ============================================================

async function handleCancellation(event: RevenueCatEvent): Promise<Response> {
  const admin = getAdminClient();
  const userId = event.app_user_id;

  const existing = await findExistingSubscription(admin, userId);
  if (!existing) {
    console.warn(`RevenueCat CANCELLATION: no subscription found for user ${userId}`);
    return jsonResponse({ received: true, action: 'no_subscription' });
  }

  const { error } = await admin
    .from('subscriptions')
    .update({
      cancel_at_period_end: true,
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id);

  if (error) {
    console.error('Error updating subscription on CANCELLATION:', error.message);
    return errorResponse('Failed to update subscription', 500);
  }

  console.log(`RevenueCat CANCELLATION: subscription ${existing.id} set to cancel for user ${userId}`);
  return jsonResponse({ received: true, action: 'canceled', subscription_id: existing.id });
}

// ============================================================
// UNCANCELLATION
// User reactivated before the period ended. Clear cancel flags.
// ============================================================

async function handleUncancellation(event: RevenueCatEvent): Promise<Response> {
  const admin = getAdminClient();
  const userId = event.app_user_id;

  const existing = await findExistingSubscription(admin, userId);
  if (!existing) {
    console.warn(`RevenueCat UNCANCELLATION: no subscription found for user ${userId}`);
    return jsonResponse({ received: true, action: 'no_subscription' });
  }

  const { error } = await admin
    .from('subscriptions')
    .update({
      cancel_at_period_end: false,
      canceled_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id);

  if (error) {
    console.error('Error updating subscription on UNCANCELLATION:', error.message);
    return errorResponse('Failed to update subscription', 500);
  }

  console.log(`RevenueCat UNCANCELLATION: subscription ${existing.id} reactivated for user ${userId}`);
  return jsonResponse({ received: true, action: 'uncanceled', subscription_id: existing.id });
}

// ============================================================
// BILLING_ISSUE
// Payment failed. Mark as past_due so the app can show a
// grace-period notice prompting the user to update payment.
// ============================================================

async function handleBillingIssue(event: RevenueCatEvent): Promise<Response> {
  const admin = getAdminClient();
  const userId = event.app_user_id;

  const existing = await findExistingSubscription(admin, userId);
  if (!existing) {
    console.warn(`RevenueCat BILLING_ISSUE: no subscription found for user ${userId}`);
    return jsonResponse({ received: true, action: 'no_subscription' });
  }

  const { error } = await admin
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id);

  if (error) {
    console.error('Error updating subscription on BILLING_ISSUE:', error.message);
    return errorResponse('Failed to update subscription', 500);
  }

  console.log(`RevenueCat BILLING_ISSUE: subscription ${existing.id} marked past_due for user ${userId}`);
  return jsonResponse({ received: true, action: 'past_due', subscription_id: existing.id });
}

// ============================================================
// EXPIRATION
// The subscription has fully expired. Downgrade access.
// ============================================================

async function handleExpiration(event: RevenueCatEvent): Promise<Response> {
  const admin = getAdminClient();
  const userId = event.app_user_id;

  const existing = await findExistingSubscription(admin, userId);
  if (!existing) {
    console.warn(`RevenueCat EXPIRATION: no subscription found for user ${userId}`);
    return jsonResponse({ received: true, action: 'no_subscription' });
  }

  const { error } = await admin
    .from('subscriptions')
    .update({
      status: 'expired',
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id);

  if (error) {
    console.error('Error updating subscription on EXPIRATION:', error.message);
    return errorResponse('Failed to update subscription', 500);
  }

  console.log(`RevenueCat EXPIRATION: subscription ${existing.id} expired for user ${userId}`);
  return jsonResponse({ received: true, action: 'expired', subscription_id: existing.id });
}

// ============================================================
// PRODUCT_CHANGE
// User switched plans (e.g., monthly -> annual or tier upgrade).
// Update the plan_tier based on the new product_id.
// ============================================================

async function handleProductChange(event: RevenueCatEvent): Promise<Response> {
  const admin = getAdminClient();
  const userId = event.app_user_id;

  const existing = await findExistingSubscription(admin, userId);
  if (!existing) {
    console.warn(`RevenueCat PRODUCT_CHANGE: no subscription found for user ${userId}, creating one`);
    return await handleInitialPurchase(event);
  }

  // new_product_id is sent on PRODUCT_CHANGE events; fall back to product_id
  const newProductId = event.new_product_id ?? event.product_id;
  const newTier = planTierFromProductId(newProductId);

  const { error } = await admin
    .from('subscriptions')
    .update({
      plan_tier: newTier,
      provider_subscription_id: event.transaction_id,
      current_period_start: msToIso(event.purchased_at_ms),
      current_period_end: msToIso(event.expiration_at_ms),
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id);

  if (error) {
    console.error('Error updating subscription on PRODUCT_CHANGE:', error.message);
    return errorResponse('Failed to update subscription', 500);
  }

  console.log(
    `RevenueCat PRODUCT_CHANGE: subscription ${existing.id} updated to ${newTier} (${newProductId}) for user ${userId}`,
  );
  return jsonResponse({ received: true, action: 'product_changed', subscription_id: existing.id, plan_tier: newTier });
}

// ============================================================
// TRANSFER
// Subscription ownership transferred to a different user.
// Update the user_id on the subscription row.
// ============================================================

async function handleTransfer(event: RevenueCatEvent): Promise<Response> {
  const admin = getAdminClient();

  // For TRANSFER events, transferred_from contains the old user IDs and
  // transferred_to contains the new user IDs. The app_user_id is the new owner.
  const newUserId = event.app_user_id;

  // Find the subscription using the original_app_user_id (the previous owner)
  // or via transferred_from if available.
  const previousOwnerId = event.transferred_from?.[0] ?? event.original_app_user_id;

  const { data: existing, error: findError } = await admin
    .from('subscriptions')
    .select('*')
    .eq('provider', 'revenuecat')
    .eq('user_id', previousOwnerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) {
    console.error('Error finding subscription for TRANSFER:', findError.message);
    return errorResponse('Failed to find subscription', 500);
  }

  if (!existing) {
    console.warn(
      `RevenueCat TRANSFER: no subscription found for previous owner ${previousOwnerId}`,
    );
    return jsonResponse({ received: true, action: 'no_subscription' });
  }

  const { error } = await admin
    .from('subscriptions')
    .update({
      user_id: newUserId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id);

  if (error) {
    console.error('Error updating subscription on TRANSFER:', error.message);
    return errorResponse('Failed to transfer subscription', 500);
  }

  console.log(
    `RevenueCat TRANSFER: subscription ${existing.id} transferred from ${previousOwnerId} to ${newUserId}`,
  );
  return jsonResponse({
    received: true,
    action: 'transferred',
    subscription_id: existing.id,
    from_user: previousOwnerId,
    to_user: newUserId,
  });
}
