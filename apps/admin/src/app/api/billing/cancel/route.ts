// ============================================================
// POST /api/billing/cancel
// Cancels (or resumes) the user's subscription entirely in-portal.
// Body: { resume?: boolean }
//   - default: schedule cancellation at period end (keeps access)
//   - resume:  undo a pending cancellation
// No Stripe Billing Portal redirect.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyUser, isErrorResponse, getStripe } from '@/lib/stripe';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const user = await verifyUser(req);
  if (isErrorResponse(user)) return user;

  let body: { resume?: boolean };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const resume = body.resume === true;

  try {
    const admin = createSupabaseAdminClient();
    const { data: sub } = await admin
      .from('subscriptions')
      .select('id, provider_subscription_id')
      .eq('user_id', user.id)
      .eq('provider', 'stripe')
      .in('status', ['active', 'trialing', 'past_due'])
      .not('provider_subscription_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.provider_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found.' }, { status: 404 });
    }

    const stripe = getStripe();
    const updated = await stripe.subscriptions.update(
      sub.provider_subscription_id as string,
      { cancel_at_period_end: !resume },
    );

    const cancelAt = updated.cancel_at
      ? new Date(updated.cancel_at * 1000).toISOString()
      : null;

    await admin
      .from('subscriptions')
      .update({
        cancel_at: cancelAt,
        metadata: {
          stripe_status: updated.status,
          cancel_at_period_end: updated.cancel_at_period_end,
        },
      })
      .eq('id', sub.id);

    return NextResponse.json({
      cancel_at_period_end: updated.cancel_at_period_end,
      cancel_at: cancelAt,
    });
  } catch (err) {
    console.error('[billing/cancel]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update subscription.' },
      { status: 500 },
    );
  }
}
