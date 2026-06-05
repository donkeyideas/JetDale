// ============================================================
// POST /api/billing/validate-promo
// User-facing: takes a code string, returns the discount info if valid
// so the UI can show "50% off forever" before the user pays.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { verifyUser, isErrorResponse, getStripe } from '@/lib/stripe';

function formatLabel(coupon: Stripe.Coupon): string {
  const discount = coupon.percent_off != null
    ? `${coupon.percent_off}% off`
    : `$${((coupon.amount_off ?? 0) / 100).toFixed(2)} off`;
  const duration =
    coupon.duration === 'forever'
      ? 'forever'
      : coupon.duration === 'once'
        ? 'once'
        : `for ${coupon.duration_in_months} month${coupon.duration_in_months === 1 ? '' : 's'}`;
  return `${discount} ${duration}`;
}

export async function POST(req: NextRequest) {
  const user = await verifyUser(req);
  if (isErrorResponse(user)) return user;

  const body = await req.json().catch(() => ({}));
  const code = String(body?.code ?? '').trim().toUpperCase();
  if (!code) return NextResponse.json({ error: 'Promo code is required.' }, { status: 400 });

  const stripe = getStripe();
  const list = await stripe.promotionCodes.list({
    code,
    active: true,
    limit: 1,
    expand: ['data.coupon'],
  });
  const promo = list.data[0];
  if (!promo) {
    return NextResponse.json({ error: 'Invalid or expired promo code.' }, { status: 404 });
  }

  if (promo.expires_at && promo.expires_at * 1000 < Date.now()) {
    return NextResponse.json({ error: 'This promo code has expired.' }, { status: 400 });
  }
  if (promo.max_redemptions != null && promo.times_redeemed >= promo.max_redemptions) {
    return NextResponse.json(
      { error: 'This promo code has reached its redemption limit.' },
      { status: 400 },
    );
  }
  if (
    promo.coupon.max_redemptions != null &&
    promo.coupon.times_redeemed >= promo.coupon.max_redemptions
  ) {
    return NextResponse.json(
      { error: 'This promo code has reached its redemption limit.' },
      { status: 400 },
    );
  }

  return NextResponse.json({
    promotionCodeId: promo.id,
    code: promo.code,
    label: formatLabel(promo.coupon),
    percentOff: promo.coupon.percent_off,
    amountOff: promo.coupon.amount_off,
    currency: promo.coupon.currency,
    duration: promo.coupon.duration,
    durationInMonths: promo.coupon.duration_in_months,
  });
}
