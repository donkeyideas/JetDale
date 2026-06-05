// ============================================================
// PATCH /api/admin/promo-codes/[id] — toggle a promo code active / inactive.
// Stripe doesn't allow deleting promotion codes once they have been
// redeemed, so we deactivate instead. New customers can't redeem an
// inactive code; existing discounted subscriptions keep their discount.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, isErrorResponse } from '@/lib/admin-auth';
import { getStripe } from '@/lib/stripe';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Missing promo id.' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  if (typeof body.active !== 'boolean') {
    return NextResponse.json({ error: 'active (boolean) is required.' }, { status: 400 });
  }

  const stripe = getStripe();
  try {
    const updated = await stripe.promotionCodes.update(id, { active: body.active });
    return NextResponse.json({ id: updated.id, active: updated.active });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to update promotion code.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
