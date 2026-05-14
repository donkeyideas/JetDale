// ============================================================
// Jetdale — Supabase Browser Client (Next.js)
// For client components ('use client'). Uses cookie-based auth.
// ============================================================

import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
