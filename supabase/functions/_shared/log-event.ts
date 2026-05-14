// ============================================================
// Jetdale — Product Event Logger (Edge Function shared utility)
// Inserts events into product_events table for analytics.
// ============================================================

import { getAdminClient } from './auth.ts';

interface EventOptions {
  userId?: string;
  sessionId?: string;
  event: string;
  properties?: Record<string, unknown>;
  platform?: 'ios' | 'android' | 'web';
  appVersion?: string;
}

/**
 * Log a product event to the product_events table.
 */
export async function logProductEvent(opts: EventOptions): Promise<void> {
  const supabase = getAdminClient();

  await supabase.from('product_events').insert({
    user_id: opts.userId ?? null,
    session_id: opts.sessionId ?? null,
    event: opts.event,
    properties: opts.properties ?? {},
    platform: opts.platform ?? null,
    app_version: opts.appVersion ?? null,
  });
}

/**
 * Log an admin action to the audit log.
 */
export async function logAuditEvent(opts: {
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  req?: Request;
}): Promise<void> {
  const supabase = getAdminClient();

  await supabase.from('audit_log').insert({
    actor_id: opts.actorId,
    action: opts.action,
    target_type: opts.targetType ?? null,
    target_id: opts.targetId ?? null,
    before_state: opts.beforeState ?? null,
    after_state: opts.afterState ?? null,
    ip_address: opts.req?.headers.get('x-forwarded-for') ?? null,
    user_agent: opts.req?.headers.get('user-agent') ?? null,
  });
}
