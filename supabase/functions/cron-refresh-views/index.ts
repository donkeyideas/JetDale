// ============================================================
// Jetdale — Refresh Materialized Views (Edge Function)
// Runs every 5 minutes via cron. Calls refresh_admin_mvs()
// to keep the admin dashboard materialized views up to date.
// ============================================================

import { getAdminClient } from '../_shared/auth.ts';
import { jsonResponse, errorResponse, corsResponse } from '../_shared/response.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    console.log('cron-refresh-views: refreshing materialized views');

    const supabase = getAdminClient();

    const { error } = await supabase.rpc('refresh_admin_mvs');

    if (error) {
      console.error('Failed to refresh materialized views:', error.message);
      return errorResponse(
        `Failed to refresh materialized views: ${error.message}`,
        500,
      );
    }

    console.log('cron-refresh-views: materialized views refreshed');

    return jsonResponse({
      ok: true,
      refreshed: true,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('cron-refresh-views: fatal error', err);
    return errorResponse('Internal server error', 500);
  }
});
