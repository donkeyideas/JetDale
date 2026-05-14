import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

// Public endpoint — no auth required
export async function GET() {
  const db = createSupabaseAdminClient();

  const { data, error } = await db
    .from('plan_configs')
    .select('tier, name, description, monthly_price_cents, annual_price_cents, is_featured, sort_order, limits, features, cta_text, cta_url')
    .eq('is_active', true)
    .order('sort_order');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ plans: data ?? [] });
}
