// ============================================================
// Jetdale — Auth helper for Edge Functions
// Verifies JWT and extracts user info. Always use this
// instead of trusting user_id from request body.
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@^2.0.0';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  planTier: string;
}

/**
 * Verify the JWT from the Authorization header and return the authenticated user.
 * Throws if the token is invalid or the user doesn't exist.
 */
export async function getAuthUser(req: Request): Promise<AuthUser> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Missing or invalid Authorization header', 401);
  }

  const token = authHeader.replace('Bearer ', '');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new AuthError('Invalid or expired token', 401);
  }

  // Fetch profile for role and plan info
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // Fetch active subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_tier')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return {
    id: user.id,
    email: user.email ?? '',
    role: profile?.role ?? 'user',
    planTier: subscription?.plan_tier ?? 'free',
  };
}

/**
 * Create a Supabase admin client (service role, bypasses RLS).
 * Only use this for server-side operations like webhooks.
 */
export function getAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

/**
 * Create a Supabase client scoped to the user's JWT (respects RLS).
 */
export function getUserClient(req: Request) {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '') ?? '';

  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    },
  );
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}
