// ============================================================
// POST /api/admin/promo-codes/apply — apply a promo code to a user's
// existing Stripe subscription. The discount applies to the next invoice
// (Stripe behavior — not retroactive on the current period).
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, isErrorResponse } from '@/lib/admin-auth';
import { getStripe } from '@/lib/stripe';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  const { promotionCodeId, userId, email } = body as {
    promotionCodeId?: string;
    userId?: string;
    email?: string;
  };

  if (!promotionCodeId) {
    return NextResponse.json({ error: 'promotionCodeId is required.' }, { status: 400 });
  }
  if (!userId && !email) {
    return NextResponse.json({ error: 'Provide userId or email.' }, { status: 400 });
  }

  const db = createSupabaseAdminClient();

  // Resolve user_id from email if not provided directly.
  let resolvedUserId = userId;
  if (!resolvedUserId && email) {
    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();
    if (!profile) {
      return NextResponse.json({ error: 'No user found with that email.' }, { status: 404 });
    }
    resolvedUserId = profile.id as string;
  }

  const { data: sub } = await db
    .from('subscriptions')
    .select('provider_subscription_id')
    .eq('user_id', resolvedUserId!)
    .eq('provider', 'stripe')
    .in('status', ['active', 'trialing', 'past_due'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub?.provider_subscription_id) {
    return NextResponse.json(
      { error: 'This user has no active Stripe subscription.' },
      { status: 404 },
    );
  }

  const stripe = getStripe();
  try {
    await stripe.subscriptions.update(sub.provider_subscription_id as string, {
      discounts: [{ promotion_code: promotionCodeId }],
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to apply promo code to subscription.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
