// ============================================================
// Jetdale — Stripe Checkout API Route
// Creates a Stripe Checkout Session for web purchases.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const plan = req.nextUrl.searchParams.get('plan') || 'monthly';

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 503 },
    );
  }

  const priceMap: Record<string, string | undefined> = {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
  };

  const priceId = priceMap[plan];
  if (!priceId) {
    return NextResponse.json(
      { error: `No price configured for plan: ${plan}. Set STRIPE_PRO_MONTHLY_PRICE_ID and STRIPE_PRO_ANNUAL_PRICE_ID in .env` },
      { status: 400 },
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    // Use Stripe API directly (no SDK needed for checkout)
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        mode: 'subscription',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/checkout/cancel`,
        allow_promotion_codes: 'true',
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Stripe error:', err);
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 },
      );
    }

    const session = await response.json();
    return NextResponse.redirect(session.url);
  } catch (err) {
    console.error('Checkout error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
