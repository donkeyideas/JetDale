// ============================================================
// Jetdale — Weekly Cron Job (Edge Function)
// Runs once a week (Monday mornings). Handles:
//   1. Send weekly check-in emails for active projects
//      (projects with activity in the last 30 days)
//
// Triggered by pg_cron or Supabase scheduled invocations.
// ============================================================

import { getAdminClient } from '../_shared/auth.ts';
import { jsonResponse, errorResponse, corsResponse } from '../_shared/response.ts';
import { sendEmailSafe } from '../_shared/email.ts';
import { weeklyCheckInEmail } from '../_shared/email-templates.ts';

// ============================================================
// Task: Send weekly check-in emails for active projects
// ============================================================

async function sendWeeklyCheckIns(): Promise<number> {
  const supabase = getAdminClient();

  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Find projects with recent activity (updated in the last 30 days)
  const { data: activeProjects, error } = await supabase
    .from('projects')
    .select(`
      id,
      name,
      user_id,
      updated_at,
      profiles!inner ( full_name, email )
    `)
    .gt('updated_at', thirtyDaysAgo)
    .eq('status', 'active')
    .limit(500);

  if (error) {
    console.error('Failed to fetch active projects:', error.message);
    return 0;
  }

  if (!activeProjects || activeProjects.length === 0) {
    console.log('No active projects for weekly check-in');
    return 0;
  }

  // Group projects by user to avoid sending multiple emails
  const userProjects = new Map<
    string,
    {
      email: string;
      fullName: string | null;
      projects: Array<{ id: string; name: string }>;
    }
  >();

  for (const project of activeProjects) {
    const profile = project.profiles as unknown as {
      full_name: string | null;
      email: string;
    };
    if (!profile?.email) continue;

    const userId = project.user_id;
    if (!userProjects.has(userId)) {
      userProjects.set(userId, {
        email: profile.email,
        fullName: profile.full_name,
        projects: [],
      });
    }
    userProjects.get(userId)!.projects.push({
      id: project.id,
      name: project.name,
    });
  }

  let sent = 0;

  for (const [userId, userData] of userProjects) {
    // For each user, send one email per project (or you could combine them)
    // We'll send for the most recently active project to avoid spamming
    const primaryProject = userData.projects[0];

    // Gather insights for this project from the last week
    const insights = await gatherProjectInsights(
      supabase,
      primaryProject.id,
      sevenDaysAgo,
    );

    const name = userData.fullName || 'there';
    const { subject, html } = weeklyCheckInEmail(
      name,
      primaryProject.name,
      insights,
    );

    const result = await sendEmailSafe({
      to: userData.email,
      subject,
      html,
    });

    if (result) {
      sent++;
    }
  }

  console.log(`Sent ${sent} weekly check-in emails`);
  return sent;
}

// ============================================================
// Gather project insights for the last week
// ============================================================

async function gatherProjectInsights(
  supabase: ReturnType<typeof getAdminClient>,
  projectId: string,
  since: string,
): Promise<string[]> {
  const insights: string[] = [];

  try {
    // Count artifacts generated this week
    const { count: artifactCount } = await supabase
      .from('artifacts')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .gte('created_at', since);

    if (artifactCount && artifactCount > 0) {
      insights.push(
        `${artifactCount} new artifact${artifactCount === 1 ? '' : 's'} generated`,
      );
    }

    // Count chat messages this week
    const { count: chatCount } = await supabase
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .gte('created_at', since);

    if (chatCount && chatCount > 0) {
      insights.push(
        `${chatCount} workspace chat message${chatCount === 1 ? '' : 's'}`,
      );
    }

    // Check if a reality check was completed
    const { count: realityCheckCount } = await supabase
      .from('reality_checks')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .gte('created_at', since);

    if (realityCheckCount && realityCheckCount > 0) {
      insights.push(
        `${realityCheckCount} Reality Check${realityCheckCount === 1 ? '' : 's'} completed`,
      );
    }

    // Check if any exports were created
    const { count: exportCount } = await supabase
      .from('exports')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .gte('created_at', since);

    if (exportCount && exportCount > 0) {
      insights.push(
        `${exportCount} export${exportCount === 1 ? '' : 's'} generated`,
      );
    }
  } catch (err) {
    console.error(
      `Failed to gather insights for project ${projectId}:`,
      err,
    );
  }

  if (insights.length === 0) {
    insights.push('Your project is ready for your next move');
  }

  return insights;
}

// ============================================================
// Main handler
// ============================================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    console.log('cron-weekly: starting weekly tasks');

    const emailsSent = await sendWeeklyCheckIns();

    const results = {
      weeklyCheckInEmailsSent: emailsSent,
    };

    console.log('cron-weekly: completed', JSON.stringify(results));

    return jsonResponse({
      ok: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('cron-weekly: fatal error', err);
    return errorResponse('Internal server error', 500);
  }
});
