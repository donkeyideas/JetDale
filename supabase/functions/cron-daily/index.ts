// ============================================================
// Jetdale — Daily Cron Job (Edge Function)
// Runs once a day. Handles:
//   1. Cleanup expired exports (older than 7 days)
//   2. Reset monthly usage quotas on the 1st of the month
//   3. Send discovery abandoned recovery emails (>24h, not completed)
//
// Triggered by pg_cron or Supabase scheduled invocations.
// ============================================================

import { getAdminClient } from '../_shared/auth.ts';
import { jsonResponse, errorResponse, corsResponse } from '../_shared/response.ts';
import { sendEmailSafe } from '../_shared/email.ts';
import { discoveryAbandonedEmail } from '../_shared/email-templates.ts';

// ============================================================
// Task: Cleanup expired exports
// ============================================================

async function cleanupExpiredExports(): Promise<number> {
  const supabase = getAdminClient();
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Find expired exports
  const { data: expired, error: fetchError } = await supabase
    .from('exports')
    .select('id, storage_path')
    .lt('created_at', cutoff)
    .limit(500);

  if (fetchError) {
    console.error('Failed to fetch expired exports:', fetchError.message);
    return 0;
  }

  if (!expired || expired.length === 0) {
    console.log('No expired exports to clean up');
    return 0;
  }

  // Delete files from storage
  const storagePaths = expired
    .map((e) => e.storage_path)
    .filter(Boolean) as string[];

  if (storagePaths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from('exports')
      .remove(storagePaths);

    if (storageError) {
      console.error('Failed to remove export files from storage:', storageError.message);
    }
  }

  // Delete export rows
  const ids = expired.map((e) => e.id);
  const { error: deleteError } = await supabase
    .from('exports')
    .delete()
    .in('id', ids);

  if (deleteError) {
    console.error('Failed to delete expired export rows:', deleteError.message);
    return 0;
  }

  console.log(`Cleaned up ${ids.length} expired exports`);
  return ids.length;
}

// ============================================================
// Task: Reset monthly usage quotas (1st of each month)
// ============================================================

async function resetMonthlyQuotas(): Promise<boolean> {
  const today = new Date();
  if (today.getUTCDate() !== 1) {
    console.log('Not the 1st of the month — skipping quota reset');
    return false;
  }

  const supabase = getAdminClient();

  const { error } = await supabase
    .from('usage_quotas')
    .update({
      projects_created: 0,
      discoveries_completed: 0,
      artifacts_generated: 0,
      exports_run: 0,
      voice_minutes_used: 0,
      ai_cost_cents: 0,
      updated_at: new Date().toISOString(),
    })
    .gte('id', '00000000-0000-0000-0000-000000000000'); // match all rows

  if (error) {
    console.error('Failed to reset monthly quotas:', error.message);
    return false;
  }

  console.log('Monthly usage quotas reset successfully');
  return true;
}

// ============================================================
// Task: Send discovery abandoned recovery emails
// ============================================================

async function sendDiscoveryAbandonedEmails(): Promise<number> {
  const supabase = getAdminClient();

  // Find discovery sessions started >24h ago that are not completed
  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  // Only look at sessions from the last 48h window to avoid re-emailing
  const { data: abandoned, error } = await supabase
    .from('discovery_sessions')
    .select(`
      id,
      project_id,
      user_id,
      created_at,
      projects!inner ( name ),
      profiles!inner ( full_name, email )
    `)
    .eq('status', 'in_progress')
    .lt('created_at', cutoff24h)
    .gt('created_at', cutoff48h)
    .is('recovery_email_sent_at', null)
    .limit(100);

  if (error) {
    console.error('Failed to fetch abandoned discovery sessions:', error.message);
    return 0;
  }

  if (!abandoned || abandoned.length === 0) {
    console.log('No abandoned discovery sessions to email');
    return 0;
  }

  let sent = 0;

  for (const session of abandoned) {
    const profile = session.profiles as unknown as { full_name: string | null; email: string };
    const project = session.projects as unknown as { name: string };

    if (!profile?.email) continue;

    const name = profile.full_name || 'there';
    const projectName = project?.name || 'your project';

    const { subject, html } = discoveryAbandonedEmail(name, projectName);
    const result = await sendEmailSafe({
      to: profile.email,
      subject,
      html,
    });

    if (result) {
      // Mark as sent so we don't re-send
      await supabase
        .from('discovery_sessions')
        .update({ recovery_email_sent_at: new Date().toISOString() })
        .eq('id', session.id);

      sent++;
    }
  }

  console.log(`Sent ${sent} discovery abandoned recovery emails`);
  return sent;
}

// ============================================================
// Main handler
// ============================================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    console.log('cron-daily: starting daily tasks');

    const [exportsCleanedUp, quotasReset, abandonedEmailsSent] =
      await Promise.allSettled([
        cleanupExpiredExports(),
        resetMonthlyQuotas(),
        sendDiscoveryAbandonedEmails(),
      ]);

    const results = {
      exportsCleanedUp:
        exportsCleanedUp.status === 'fulfilled'
          ? exportsCleanedUp.value
          : { error: (exportsCleanedUp as PromiseRejectedResult).reason?.message },
      quotasReset:
        quotasReset.status === 'fulfilled'
          ? quotasReset.value
          : { error: (quotasReset as PromiseRejectedResult).reason?.message },
      abandonedEmailsSent:
        abandonedEmailsSent.status === 'fulfilled'
          ? abandonedEmailsSent.value
          : { error: (abandonedEmailsSent as PromiseRejectedResult).reason?.message },
    };

    console.log('cron-daily: completed', JSON.stringify(results));

    return jsonResponse({
      ok: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('cron-daily: fatal error', err);
    return errorResponse('Internal server error', 500);
  }
});
