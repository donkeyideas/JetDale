// ============================================================
// POST /api/billing/subscribe
// Creates a Stripe subscription in `default_incomplete` state and
// returns the PaymentIntent client_secret so the browser can
// collect payment with the embedded Stripe Payment Element.
// No redirect — payment is completed inside the Jetdale modal.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { verifyUser, isErrorResponse, getStripe, getPriceId, getOrCreateCustomer } from '@/lib/stripe';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const user = await verifyUser(req);
  if (isErrorResponse(user)) return user;

  let body: { interval?: string; tier?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const interval: 'monthly' | 'annual' = body.interval === 'annual' ? 'annual' : 'monthly';
  const tier = body.tier === 'team' ? 'team' : 'pro';

  const priceId = await getPriceId(tier, interval);
  if (!priceId) {
    return NextResponse.json(
      { error: `No Stripe price configured for ${tier} ${interval}.` },
      { status: 400 },
    );
  }

  try {
    const stripe = getStripe();
    const customerId = await getOrCreateCustomer(user);

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: { user_id: user.id, interval, tier },
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice | null;
    // `payment_intent` is expanded above; the SDK types omit it on Invoice.
    const paymentIntent = (invoice as unknown as { payment_intent?: Stripe.PaymentIntent })
      ?.payment_intent;

    const clientSecret = paymentIntent?.client_secret;
    if (!clientSecret) {
      return NextResponse.json(
        { error: 'Could not initialize payment. Please try again.' },
        { status: 500 },
      );
    }

    // Cache the customer ID so getOrCreateCustomer reuses it next time.
    const admin = createSupabaseAdminClient();
    await admin.from('subscriptions').upsert(
      {
        user_id: user.id,
        plan_tier: 'free',
        status: 'incomplete',
        provider: 'stripe',
        provider_subscription_id: subscription.id,
        provider_customer_id: customerId,
        interval: interval === 'annual' ? 'year' : 'month',
        metadata: { stripe_status: subscription.status },
      },
      { onConflict: 'user_id,provider,provider_subscription_id' },
    );

    return NextResponse.json({
      clientSecret,
      subscriptionId: subscription.id,
    });
  } catch (err) {
    console.error('[billing/subscribe]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to start subscription.' },
      { status: 500 },
    );
  }
}
