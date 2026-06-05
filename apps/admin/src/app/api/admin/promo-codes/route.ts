// ============================================================
// GET  /api/admin/promo-codes — list all promo codes (active + inactive)
// POST /api/admin/promo-codes — create a Stripe Coupon + PromotionCode pair
//
// Stripe is the source of truth: no local DB table for codes.
// Tracking (times_redeemed) comes straight from the PromotionCode object.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { verifyAdmin, isErrorResponse } from '@/lib/admin-auth';
import { getStripe } from '@/lib/stripe';

interface PromoRow {
  id: string;
  code: string;
  active: boolean;
  internalName: string | null;
  timesRedeemed: number;
  maxRedemptions: number | null;
  expiresAt: number | null;
  firstTimeOnly: boolean;
  created: number;
  coupon: {
    id: string;
    percentOff: number | null;
    amountOff: number | null;
    currency: string | null;
    duration: Stripe.Coupon.Duration;
    durationInMonths: number | null;
  };
}

function format(p: Stripe.PromotionCode): PromoRow {
  const c = p.coupon;
  return {
    id: p.id,
    code: p.code,
    active: p.active,
    internalName: (p.metadata?.internal_name as string) ?? null,
    timesRedeemed: p.times_redeemed,
    maxRedemptions: p.max_redemptions,
    expiresAt: p.expires_at,
    firstTimeOnly: p.restrictions?.first_time_transaction ?? false,
    created: p.created,
    coupon: {
      id: c.id,
      percentOff: c.percent_off,
      amountOff: c.amount_off,
      currency: c.currency,
      duration: c.duration,
      durationInMonths: c.duration_in_months,
    },
  };
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const stripe = getStripe();

  try {
    const [active, inactive] = await Promise.all([
      stripe.promotionCodes.list({ active: true, limit: 100, expand: ['data.coupon'] }),
      stripe.promotionCodes.list({ active: false, limit: 100, expand: ['data.coupon'] }),
    ]);

    const rows = [...active.data, ...inactive.data]
      .sort((a, b) => b.created - a.created)
      .map(format);

    return NextResponse.json({ rows });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to list promo codes.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

interface CreatePayload {
  code: string;
  internalName?: string;
  discountType: 'percent' | 'fixed';
  percentOff?: number;
  amountOff?: number; // in cents
  currency?: string;
  duration: 'once' | 'repeating' | 'forever';
  durationInMonths?: number;
  expiresAt?: string | null;
  maxRedemptions?: number | null;
  firstTimeOnly?: boolean;
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const body = (await req.json().catch(() => ({}))) as Partial<CreatePayload>;

  const code = (body.code ?? '').trim().toUpperCase();
  if (!code || !/^[A-Z0-9-]+$/.test(code)) {
    return NextResponse.json(
      { error: 'Code must be uppercase letters, numbers, and dashes only.' },
      { status: 400 },
    );
  }

  if (body.discountType !== 'percent' && body.discountType !== 'fixed') {
    return NextResponse.json({ error: 'discountType must be percent or fixed.' }, { status: 400 });
  }

  if (body.discountType === 'percent') {
    if (!body.percentOff || body.percentOff < 1 || body.percentOff > 100) {
      return NextResponse.json({ error: 'percentOff must be between 1 and 100.' }, { status: 400 });
    }
  } else {
    if (!body.amountOff || body.amountOff < 1) {
      return NextResponse.json({ error: 'amountOff must be a positive integer (in cents).' }, { status: 400 });
    }
  }

  if (!body.duration || !['once', 'repeating', 'forever'].includes(body.duration)) {
    return NextResponse.json({ error: 'duration must be once, repeating, or forever.' }, { status: 400 });
  }
  if (body.duration === 'repeating' && (!body.durationInMonths || body.durationInMonths < 1)) {
    return NextResponse.json({ error: 'durationInMonths is required when duration is repeating.' }, { status: 400 });
  }

  const stripe = getStripe();

  const couponParams: Stripe.CouponCreateParams = {
    duration: body.duration,
    name: body.internalName || code,
  };
  if (body.discountType === 'percent') {
    couponParams.percent_off = body.percentOff;
  } else {
    couponParams.amount_off = body.amountOff;
    couponParams.currency = (body.currency || 'usd').toLowerCase();
  }
  if (body.duration === 'repeating') {
    couponParams.duration_in_months = body.durationInMonths;
  }
  if (body.maxRedemptions) couponParams.max_redemptions = body.maxRedemptions;
  if (body.expiresAt) couponParams.redeem_by = Math.floor(new Date(body.expiresAt).getTime() / 1000);

  let coupon: Stripe.Coupon;
  try {
    coupon = await stripe.coupons.create(couponParams);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create coupon.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const promoParams: Stripe.PromotionCodeCreateParams = {
    coupon: coupon.id,
    code,
    active: true,
    metadata: {
      created_by_admin_id: auth.id,
      ...(body.internalName ? { internal_name: body.internalName } : {}),
    },
  };
  if (body.maxRedemptions) promoParams.max_redemptions = body.maxRedemptions;
  if (body.expiresAt) promoParams.expires_at = Math.floor(new Date(body.expiresAt).getTime() / 1000);
  if (body.firstTimeOnly) promoParams.restrictions = { first_time_transaction: true };

  try {
    const promo = await stripe.promotionCodes.create(promoParams);
    return NextResponse.json({ id: promo.id, code: promo.code, active: promo.active });
  } catch (err) {
    // Roll back the orphan coupon so we don't leave dead objects in Stripe.
    await stripe.coupons.del(coupon.id).catch(() => {});
    const msg = err instanceof Error ? err.message : 'Failed to create promotion code.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
