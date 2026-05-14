// ============================================================
// Jetdale — Admin Auth Verification
// Verifies the request is from an authenticated admin user.
// Used by every /api/admin/* route.
// ============================================================

import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from './supabase-server';

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  full_name: string | null;
}

export async function verifyAdmin(
  req: NextRequest,
): Promise<AdminUser | NextResponse> {
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
    .select('id, email, full_name, role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: admin role required' }, { status: 403 });
  }

  return profile as AdminUser;
}

export function isErrorResponse(result: AdminUser | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
