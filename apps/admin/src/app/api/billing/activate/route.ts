// ============================================================
// POST /api/billing/activate
// Called by the browser immediately after the Payment Element
// confirms payment. Syncs the subscription into our DB right away
// so the UI updates without waiting for the Stripe webhook.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyUser, isErrorResponse, getStripe, getTierFromPriceId } from '@/lib/stripe';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

const STATUS_MAP: Record<string, string> = {
  active: 'active',
  trialing: 'trialing',
  past_due: 'past_due',
  canceled: 'canceled',
  unpaid: 'past_due',
  incomplete: 'incomplete',
  incomplete_expired: 'expired',
  paused: 'paused',
};

export async function POST(req: NextRequest) {
  const user = await verifyUser(req);
  if (isErrorResponse(user)) return user;

  let body: { subscriptionId?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  if (!body.subscriptionId) {
    return NextResponse.json({ error: 'subscriptionId is required' }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(body.subscriptionId);

    // Ownership check — the subscription must be tagged with this user.
    if (subscription.metadata?.user_id !== user.id) {
      return NextResponse.json({ error: 'Subscription does not belong to you.' }, { status: 403 });
    }

    const item = subscription.items.data[0];
    const price = item?.price;
    const amountCents = price?.unit_amount ?? null;
    const recurringInterval = price?.recurring?.interval ?? 'month';
    const mappedStatus = STATUS_MAP[subscription.status] ?? 'active';
    const isActive = subscription.status === 'active' || subscription.status === 'trialing';

    // Resolve the real plan tier from the subscription's price.
    const resolvedTier = price?.id ? await getTierFromPriceId(price.id) : 'pro';

    // Period dates live on the subscription in current API versions, on the
    // item in newer ones — read whichever is present.
    const subAny = subscription as unknown as { current_period_start?: number; current_period_end?: number };
    const itemAny = item as unknown as { current_period_start?: number; current_period_end?: number };
    const periodStart = subAny.current_period_start ?? itemAny?.current_period_start ?? null;
    const periodEnd = subAny.current_period_end ?? itemAny?.current_period_end ?? null;

    const admin = createSupabaseAdminClient();
    await admin.from('subscriptions').upsert(
      {
        user_id: user.id,
        plan_tier: isActive ? resolvedTier : 'free',
        status: mappedStatus,
        provider: 'stripe',
        provider_subscription_id: subscription.id,
        provider_customer_id: subscription.customer as string,
        amount_cents: amountCents,
        interval: recurringInterval,
        current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        metadata: { stripe_status: subscription.status },
      },
      { onConflict: 'user_id,provider,provider_subscription_id' },
    );

    return NextResponse.json({ status: mappedStatus, active: isActive });
  } catch (err) {
    console.error('[billing/activate]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to activate subscription.' },
      { status: 500 },
    );
  }
}
