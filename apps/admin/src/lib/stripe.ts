// ============================================================
// Jetdale — Stripe Server Helpers
// Server-side Stripe SDK instance + authenticated-user resolver
// for the in-portal billing routes (/api/billing/*).
// ============================================================

import Stripe from 'stripe';
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from './supabase-server';

let stripeInstance: Stripe | null = null;

/** Lazily-constructed singleton Stripe instance. */
export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
    stripeInstance = new Stripe(key);
  }
  return stripeInstance;
}

/**
 * Resolve the Stripe price ID for a plan tier + billing interval.
 * The admin's `plan_configs` table is the source of truth; for the Pro
 * tier, env vars (STRIPE_PRO_*_PRICE_ID) act as a fallback.
 */
export async function getPriceId(
  tier: string,
  interval: 'monthly' | 'annual',
): Promise<string | null> {
  const envFallback = tier === 'pro'
    ? (interval === 'annual'
        ? process.env.STRIPE_PRO_ANNUAL_PRICE_ID ?? null
        : process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? null)
    : null;

  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from('plan_configs')
      .select('stripe_monthly_price_id, stripe_annual_price_id')
      .eq('tier', tier)
      .maybeSingle();

    const dbId = interval === 'annual'
      ? data?.stripe_annual_price_id
      : data?.stripe_monthly_price_id;

    return (dbId as string | null) || envFallback;
  } catch {
    return envFallback;
  }
}

/**
 * Resolve a plan tier from a Stripe price ID by matching against
 * `plan_configs`. Returns 'free' if no plan owns the price.
 */
export async function getTierFromPriceId(priceId: string): Promise<string> {
  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from('plan_configs')
      .select('tier')
      .or(`stripe_monthly_price_id.eq.${priceId},stripe_annual_price_id.eq.${priceId}`)
      .maybeSingle();
    return (data?.tier as string) ?? 'free';
  } catch {
    return 'free';
  }
}

export interface BillingUser {
  id: string;
  email: string;
  full_name: string | null;
}

/**
 * Verify the request comes from an authenticated user (any role).
 * Returns the user's profile or a 401 NextResponse.
 */
export async function verifyUser(
  req: NextRequest,
): Promise<BillingUser | NextResponse> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll().map((c) => ({ name: c.name, value: c.value }));
        },
        setAll() {},
      },
    },
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('id, email, full_name')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  return profile as BillingUser;
}

export function isErrorResponse(result: unknown): result is NextResponse {
  return result instanceof NextResponse;
}

/**
 * Find — or create — the Stripe customer for a user. The customer ID is
 * cached on the user's most recent subscription row (provider_customer_id).
 */
export async function getOrCreateCustomer(
  user: BillingUser,
): Promise<string> {
  const admin = createSupabaseAdminClient();
  const stripe = getStripe();

  // Reuse an existing Stripe customer if we have one on file
  const { data: existing } = await admin
    .from('subscriptions')
    .select('provider_customer_id')
    .eq('user_id', user.id)
    .eq('provider', 'stripe')
    .not('provider_customer_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.provider_customer_id) {
    return existing.provider_customer_id as string;
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.full_name ?? undefined,
    metadata: { user_id: user.id },
  });

  return customer.id;
}
