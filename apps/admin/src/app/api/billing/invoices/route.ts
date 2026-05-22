// ============================================================
// GET /api/billing/invoices
// Returns the user's Stripe invoices as plain JSON so they can be
// rendered inside the Jetdale portal — no Stripe-hosted invoice page.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyUser, isErrorResponse, getStripe } from '@/lib/stripe';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const user = await verifyUser(req);
  if (isErrorResponse(user)) return user;

  try {
    const admin = createSupabaseAdminClient();
    const { data: sub } = await admin
      .from('subscriptions')
      .select('provider_customer_id')
      .eq('user_id', user.id)
      .eq('provider', 'stripe')
      .not('provider_customer_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const customerId = sub?.provider_customer_id as string | undefined;
    if (!customerId) {
      return NextResponse.json({ invoices: [] });
    }

    const stripe = getStripe();
    let list;
    try {
      list = await stripe.invoices.list({ customer: customerId, limit: 24 });
    } catch (stripeErr) {
      // Stale/invalid customer ID — treat as no invoices rather than erroring.
      console.warn('[billing/invoices] Stripe list failed:', stripeErr);
      return NextResponse.json({ invoices: [] });
    }

    const invoices = list.data.map((inv) => ({
      id: inv.id,
      number: inv.number,
      created: inv.created,
      amount_paid: inv.amount_paid,
      amount_due: inv.amount_due,
      currency: inv.currency,
      status: inv.status,
      // PDF is a direct file download (not a Stripe-hosted page).
      pdf_url: inv.invoice_pdf ?? null,
    }));

    return NextResponse.json({ invoices });
  } catch (err) {
    console.error('[billing/invoices]', err);
    return NextResponse.json({ invoices: [] });
  }
}
