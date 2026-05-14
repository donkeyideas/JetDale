// ============================================================
// Jetdale — Stripe Webhook Edge Function
// Handles Stripe webhook events for web payments.
// Verifies signatures via crypto.subtle HMAC-SHA256.
// ============================================================

import { getAdminClient } from '../_shared/auth.ts';
import { jsonResponse, errorResponse, corsResponse } from '../_shared/response.ts';
import { logProductEvent } from '../_shared/log-event.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
  created: number;
  livemode: boolean;
}

// ---------------------------------------------------------------------------
// Stripe signature verification (crypto.subtle HMAC-SHA256)
// ---------------------------------------------------------------------------

/**
 * Verify Stripe webhook signature using the `v1` scheme.
 *
 * Stripe-Signature header looks like:
 *   t=<timestamp>,v1=<hex_signature>[,v0=<legacy>]
 *
 * The signed payload is: `${timestamp}.${rawBody}`
 * We compute HMAC-SHA256 with the webhook secret and compare.
 */
async function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  const parts = signatureHeader.split(',');

  let timestamp: string | undefined;
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 't') {
      timestamp = value;
    } else if (key === 'v1') {
      signatures.push(value);
    }
  }

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  // Reject timestamps older than 5 minutes to prevent replay attacks
  const TOLERANCE_SECONDS = 300;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > TOLERANCE_SECONDS) {
    return false;
  }

  // Build the signed payload: "timestamp.body"
  const signedPayload = `${timestamp}.${rawBody}`;

  // Import the secret as an HMAC key
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  // Compute the expected signature
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signedPayload),
  );

  // Convert to hex string
  const expectedHex = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time comparison: check if any v1 signature matches
  return signatures.some((sig) => timingSafeEqual(sig, expectedHex));
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ---------------------------------------------------------------------------
// Price ID to plan tier mapping
// ---------------------------------------------------------------------------

function getPlanTierFromPriceId(priceId: string): 'pro' | 'free' {
  const proMonthly = Deno.env.get('STRIPE_PRO_MONTHLY_PRICE_ID');
  const proAnnual = Deno.env.get('STRIPE_PRO_ANNUAL_PRICE_ID');

  if (priceId === proMonthly || priceId === proAnnual) {
    return 'pro';
  }

  return 'free';
}

// ---------------------------------------------------------------------------
// User resolution helpers
// ---------------------------------------------------------------------------

/**
 * Find the user_id associated with a Stripe customer ID by looking up
 * existing subscriptions or, as a fallback, matching by email.
 */
async function resolveUserId(
  supabase: ReturnType<typeof getAdminClient>,
  customerId: string | undefined,
  customerEmail: string | undefined,
): Promise<string | null> {
  // First: look up by provider_customer_id in subscriptions
  if (customerId) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('provider', 'stripe')
      .eq('provider_customer_id', customerId)
      .limit(1)
      .single();

    if (sub?.user_id) {
      return sub.user_id;
    }
  }

  // Fallback: look up by email in profiles
  if (customerEmail) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', customerEmail)
      .limit(1)
      .single();

    if (profile?.id) {
      return profile.id;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

async function handleCheckoutSessionCompleted(
  supabase: ReturnType<typeof getAdminClient>,
  session: Record<string, unknown>,
): Promise<void> {
  const customerId = session.customer as string | undefined;
  const customerEmail =
    (session.customer_details as Record<string, unknown>)?.email as string ??
    (session.customer_email as string | undefined);
  const subscriptionId = session.subscription as string | undefined;

  const userId = await resolveUserId(supabase, customerId, customerEmail);
  if (!userId) {
    console.error(
      `[stripe-webhook] checkout.session.completed: could not resolve user. ` +
      `customer=${customerId}, email=${customerEmail}`,
    );
    return;
  }

  // Extract the price ID from the line items metadata or subscription
  // The checkout session may include line items with price info
  let planTier: 'pro' | 'free' = 'pro'; // default for checkout

  const lineItems = session.line_items as Record<string, unknown> | undefined;
  if (lineItems) {
    const data = lineItems.data as Array<Record<string, unknown>> | undefined;
    if (data && data.length > 0) {
      const price = data[0].price as Record<string, unknown> | undefined;
      if (price?.id) {
        planTier = getPlanTierFromPriceId(price.id as string);
      }
    }
  }

  // Also check metadata for price_id if set by the checkout creation flow
  const metadata = session.metadata as Record<string, unknown> | undefined;
  if (metadata?.price_id) {
    planTier = getPlanTierFromPriceId(metadata.price_id as string);
  }

  // Upsert subscription record
  const { error } = await supabase
    .from('subscriptions')
    .upsert(
      {
        user_id: userId,
        plan_tier: planTier,
        status: 'active',
        provider: 'stripe',
        provider_subscription_id: subscriptionId ?? null,
        provider_customer_id: customerId ?? null,
        current_period_start: new Date().toISOString(),
        metadata: { checkout_session_id: session.id },
      },
      {
        onConflict: 'user_id,provider,provider_subscription_id',
      },
    );

  if (error) {
    console.error('[stripe-webhook] checkout.session.completed upsert error:', error);
  }

  await logProductEvent({
    userId,
    event: 'subscription.checkout_completed',
    platform: 'web',
    properties: {
      provider: 'stripe',
      plan_tier: planTier,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      checkout_session_id: session.id,
    },
  });
}

async function handleSubscriptionUpdated(
  supabase: ReturnType<typeof getAdminClient>,
  subscription: Record<string, unknown>,
): Promise<void> {
  const subscriptionId = subscription.id as string;
  const customerId = subscription.customer as string;
  const status = subscription.status as string;
  const cancelAtPeriodEnd = subscription.cancel_at_period_end as boolean;
  const canceledAt = subscription.canceled_at
    ? new Date((subscription.canceled_at as number) * 1000).toISOString()
    : null;
  const currentPeriodStart = subscription.current_period_start
    ? new Date((subscription.current_period_start as number) * 1000).toISOString()
    : null;
  const currentPeriodEnd = subscription.current_period_end
    ? new Date((subscription.current_period_end as number) * 1000).toISOString()
    : null;
  const cancelAt = subscription.cancel_at
    ? new Date((subscription.cancel_at as number) * 1000).toISOString()
    : null;

  // Determine plan tier from the first item's price ID
  let planTier: 'pro' | 'free' = 'pro';
  const items = subscription.items as Record<string, unknown> | undefined;
  if (items) {
    const data = items.data as Array<Record<string, unknown>> | undefined;
    if (data && data.length > 0) {
      const price = data[0].price as Record<string, unknown> | undefined;
      if (price?.id) {
        planTier = getPlanTierFromPriceId(price.id as string);
      }
    }
  }

  // Map Stripe status to our subscription_status enum
  const statusMap: Record<string, string> = {
    active: 'active',
    trialing: 'trialing',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'past_due',
    incomplete: 'past_due',
    incomplete_expired: 'expired',
    paused: 'paused',
  };
  const mappedStatus = statusMap[status] ?? 'active';

  // Try to find existing subscription by provider_subscription_id
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('id, user_id')
    .eq('provider', 'stripe')
    .eq('provider_subscription_id', subscriptionId)
    .limit(1)
    .single();

  if (existingSub) {
    // Update existing subscription
    const { error } = await supabase
      .from('subscriptions')
      .update({
        plan_tier: planTier,
        status: mappedStatus,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        cancel_at: cancelAt,
        canceled_at: canceledAt,
        provider_customer_id: customerId,
        metadata: {
          cancel_at_period_end: cancelAtPeriodEnd,
          stripe_status: status,
        },
      })
      .eq('id', existingSub.id);

    if (error) {
      console.error('[stripe-webhook] subscription.updated update error:', error);
    }

    await logProductEvent({
      userId: existingSub.user_id,
      event: 'subscription.updated',
      platform: 'web',
      properties: {
        provider: 'stripe',
        plan_tier: planTier,
        status: mappedStatus,
        stripe_status: status,
        stripe_subscription_id: subscriptionId,
        cancel_at_period_end: cancelAtPeriodEnd,
      },
    });
  } else {
    // If we can't find the subscription, try to resolve user and create it
    const userId = await resolveUserId(supabase, customerId, undefined);
    if (userId) {
      const { error } = await supabase.from('subscriptions').upsert(
        {
          user_id: userId,
          plan_tier: planTier,
          status: mappedStatus,
          provider: 'stripe',
          provider_subscription_id: subscriptionId,
          provider_customer_id: customerId,
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
          cancel_at: cancelAt,
          canceled_at: canceledAt,
          metadata: {
            cancel_at_period_end: cancelAtPeriodEnd,
            stripe_status: status,
          },
        },
        { onConflict: 'user_id,provider,provider_subscription_id' },
      );

      if (error) {
        console.error('[stripe-webhook] subscription.updated upsert error:', error);
      }

      await logProductEvent({
        userId,
        event: 'subscription.updated',
        platform: 'web',
        properties: {
          provider: 'stripe',
          plan_tier: planTier,
          status: mappedStatus,
          stripe_subscription_id: subscriptionId,
        },
      });
    } else {
      console.error(
        `[stripe-webhook] subscription.updated: could not find subscription or user ` +
        `for subscription_id=${subscriptionId}, customer=${customerId}`,
      );
    }
  }
}

async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof getAdminClient>,
  subscription: Record<string, unknown>,
): Promise<void> {
  const subscriptionId = subscription.id as string;
  const customerId = subscription.customer as string;

  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('id, user_id')
    .eq('provider', 'stripe')
    .eq('provider_subscription_id', subscriptionId)
    .limit(1)
    .single();

  if (existingSub) {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        metadata: { stripe_status: 'canceled', deleted: true },
      })
      .eq('id', existingSub.id);

    if (error) {
      console.error('[stripe-webhook] subscription.deleted update error:', error);
    }

    await logProductEvent({
      userId: existingSub.user_id,
      event: 'subscription.canceled',
      platform: 'web',
      properties: {
        provider: 'stripe',
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
      },
    });
  } else {
    console.error(
      `[stripe-webhook] subscription.deleted: no subscription found for ` +
      `subscription_id=${subscriptionId}`,
    );
  }
}

async function handleInvoicePaymentFailed(
  supabase: ReturnType<typeof getAdminClient>,
  invoice: Record<string, unknown>,
): Promise<void> {
  const subscriptionId = invoice.subscription as string | undefined;
  const customerId = invoice.customer as string;

  if (!subscriptionId) {
    // One-off invoice, not tied to a subscription
    console.warn('[stripe-webhook] invoice.payment_failed: no subscription_id on invoice');
    return;
  }

  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('id, user_id')
    .eq('provider', 'stripe')
    .eq('provider_subscription_id', subscriptionId)
    .limit(1)
    .single();

  if (existingSub) {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'past_due',
        metadata: { last_payment_failed_at: new Date().toISOString() },
      })
      .eq('id', existingSub.id);

    if (error) {
      console.error('[stripe-webhook] invoice.payment_failed update error:', error);
    }

    await logProductEvent({
      userId: existingSub.user_id,
      event: 'subscription.payment_failed',
      platform: 'web',
      properties: {
        provider: 'stripe',
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        invoice_id: invoice.id,
      },
    });
  } else {
    console.error(
      `[stripe-webhook] invoice.payment_failed: no subscription found for ` +
      `subscription_id=${subscriptionId}`,
    );
  }
}

async function handleInvoicePaymentSucceeded(
  supabase: ReturnType<typeof getAdminClient>,
  invoice: Record<string, unknown>,
): Promise<void> {
  const subscriptionId = invoice.subscription as string | undefined;
  const customerId = invoice.customer as string;

  if (!subscriptionId) {
    // One-off invoice, not tied to a subscription
    return;
  }

  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('id, user_id, status')
    .eq('provider', 'stripe')
    .eq('provider_subscription_id', subscriptionId)
    .limit(1)
    .single();

  if (existingSub) {
    // Only update if the subscription is not already active
    // This ensures we reactivate past_due subscriptions after successful payment
    if (existingSub.status !== 'active') {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          metadata: { last_payment_succeeded_at: new Date().toISOString() },
        })
        .eq('id', existingSub.id);

      if (error) {
        console.error('[stripe-webhook] invoice.payment_succeeded update error:', error);
      }
    }

    await logProductEvent({
      userId: existingSub.user_id,
      event: 'subscription.payment_succeeded',
      platform: 'web',
      properties: {
        provider: 'stripe',
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        invoice_id: invoice.id,
        amount_paid: invoice.amount_paid,
      },
    });
  } else {
    console.error(
      `[stripe-webhook] invoice.payment_succeeded: no subscription found for ` +
      `subscription_id=${subscriptionId}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return corsResponse();
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    // -----------------------------------------------------------------------
    // 1. Read env vars
    // -----------------------------------------------------------------------
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!stripeWebhookSecret) {
      console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set');
      return errorResponse('Server misconfiguration', 500);
    }

    // -----------------------------------------------------------------------
    // 2. Read raw body and verify signature
    // -----------------------------------------------------------------------
    const signatureHeader = req.headers.get('stripe-signature');
    if (!signatureHeader) {
      return errorResponse('Missing Stripe-Signature header', 400);
    }

    const rawBody = await req.text();

    const isValid = await verifyStripeSignature(
      rawBody,
      signatureHeader,
      stripeWebhookSecret,
    );

    if (!isValid) {
      console.error('[stripe-webhook] Invalid webhook signature');
      return errorResponse('Invalid signature', 401);
    }

    // -----------------------------------------------------------------------
    // 3. Parse the event
    // -----------------------------------------------------------------------
    let event: StripeEvent;
    try {
      event = JSON.parse(rawBody) as StripeEvent;
    } catch {
      return errorResponse('Invalid JSON payload', 400);
    }

    console.log(
      `[stripe-webhook] Received event: ${event.type} (${event.id}), ` +
      `livemode=${event.livemode}`,
    );

    // -----------------------------------------------------------------------
    // 4. Log the raw webhook event
    // -----------------------------------------------------------------------
    await logProductEvent({
      event: `stripe.webhook.${event.type}`,
      platform: 'web',
      properties: {
        stripe_event_id: event.id,
        stripe_event_type: event.type,
        livemode: event.livemode,
        created: event.created,
      },
    });

    // -----------------------------------------------------------------------
    // 5. Get admin Supabase client
    // -----------------------------------------------------------------------
    const supabase = getAdminClient();

    // -----------------------------------------------------------------------
    // 6. Route to the appropriate handler
    // -----------------------------------------------------------------------
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(supabase, event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(supabase, event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(supabase, event.data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(supabase, event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(supabase, event.data.object);
        break;

      default:
        console.warn(`[stripe-webhook] Unhandled event type: ${event.type}`);
        return jsonResponse({
          received: true,
          handled: false,
          event_type: event.type,
        }, 200);
    }

    // -----------------------------------------------------------------------
    // 7. Return success
    // -----------------------------------------------------------------------
    return jsonResponse({
      received: true,
      handled: true,
      event_type: event.type,
    });
  } catch (err) {
    console.error('[stripe-webhook] Unexpected error:', err);
    return errorResponse(
      'Internal server error',
      500,
      err instanceof Error ? err.message : 'Unknown error',
    );
  }
});
