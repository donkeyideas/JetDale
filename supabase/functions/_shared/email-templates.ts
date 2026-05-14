// ============================================================
// Jetdale — Transactional Email Templates
// Returns { subject, html } for each transactional email type.
// All templates use inline CSS matching Jetdale design tokens.
// ============================================================

// ---- Design tokens ----
const BG = '#F4F1EA';
const TEXT = '#0E0F0C';
const ACCENT = '#FF5B1F';
const MUTED = '#6B6B6B';
const FONT = "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

// ---- Shared layout helpers ----

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Jetdale</title>
</head>
<body style="margin:0; padding:0; background-color:${BG}; font-family:${FONT}; color:${TEXT}; -webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG};">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#FFFFFF; border-radius:12px; overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 0 32px;">
              <span style="font-size:20px; font-weight:800; color:${TEXT}; letter-spacing:-0.02em;">Jetdale</span>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:24px 32px 32px 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px; border-top:1px solid #E8E5DE;">
              <p style="margin:0; font-size:12px; color:${MUTED}; line-height:1.5;">
                You received this email because you have a Jetdale account.<br />
                <a href="https://jetdale.com" style="color:${MUTED}; text-decoration:underline;">jetdale.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 16px 0; font-size:24px; font-weight:700; color:${TEXT}; line-height:1.3;">${text}</h1>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px 0; font-size:15px; line-height:1.6; color:${TEXT};">${text}</p>`;
}

function button(text: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td style="background-color:${ACCENT}; border-radius:8px;">
      <a href="${href}" target="_blank" style="display:inline-block; padding:12px 28px; font-size:15px; font-weight:600; color:#FFFFFF; text-decoration:none; font-family:${FONT};">${text}</a>
    </td>
  </tr>
</table>`;
}

function bulletList(items: string[]): string {
  const lis = items
    .map(
      (item) =>
        `<li style="margin:0 0 8px 0; font-size:15px; line-height:1.5; color:${TEXT};">${item}</li>`,
    )
    .join('\n');
  return `<ul style="margin:0 0 16px 0; padding-left:20px;">${lis}</ul>`;
}

// ============================================================
// Templates
// ============================================================

/**
 * Welcome email sent after account creation.
 */
export function welcomeEmail(name: string): { subject: string; html: string } {
  const firstName = name.split(' ')[0] || 'there';
  return {
    subject: 'Welcome to Jetdale',
    html: layout(`
      ${heading(`Welcome, ${firstName}`)}
      ${paragraph('Thanks for joining Jetdale. We built this to help you turn rough ideas into structured, buildable plans — fast.')}
      ${paragraph('Here is how to get the most out of it:')}
      ${bulletList([
        'Start a Discovery session to map out your idea',
        'Run a Reality Check to pressure-test your plan',
        'Export to your favorite coding tool when you are ready to build',
      ])}
      ${button('Open Jetdale', 'https://jetdale.com')}
      ${paragraph('If you have any questions, just reply to this email. We read every message.')}
    `),
  };
}

/**
 * Discovery abandoned recovery nudge — sent 24h after starting but not finishing.
 */
export function discoveryAbandonedEmail(
  name: string,
  projectName: string,
): { subject: string; html: string } {
  const firstName = name.split(' ')[0] || 'there';
  return {
    subject: `Your project "${projectName}" is waiting`,
    html: layout(`
      ${heading(`Hey ${firstName}, pick up where you left off`)}
      ${paragraph(`You started working on <strong>${projectName}</strong> but didn't finish the Discovery session. No worries — your progress is saved.`)}
      ${paragraph('Most great ideas need a second pass. Jump back in and let Jetdale help you shape it into something buildable.')}
      ${button('Continue Discovery', 'https://jetdale.com')}
      ${paragraph('If you've decided to go a different direction, you can ignore this email.')}
    `),
  };
}

/**
 * Weekly check-in email — Monday recap for active projects.
 */
export function weeklyCheckInEmail(
  name: string,
  projectName: string,
  insights: string[],
): { subject: string; html: string } {
  const firstName = name.split(' ')[0] || 'there';
  return {
    subject: `Weekly update: ${projectName}`,
    html: layout(`
      ${heading(`Your week with ${projectName}`)}
      ${paragraph(`Hey ${firstName}, here's a quick recap of what happened with <strong>${projectName}</strong> this week:`)}
      ${insights.length > 0 ? bulletList(insights) : paragraph('No new activity this week — but your project is ready whenever you are.')}
      ${button('Open Project', 'https://jetdale.com')}
      ${paragraph('Keep building.')}
    `),
  };
}

/**
 * Payment receipt — sent after a successful charge.
 */
export function paymentReceiptEmail(
  name: string,
  amount: string,
  plan: string,
): { subject: string; html: string } {
  const firstName = name.split(' ')[0] || 'there';
  return {
    subject: `Payment receipt — ${amount}`,
    html: layout(`
      ${heading('Payment received')}
      ${paragraph(`Hey ${firstName}, thanks for your payment. Here are the details:`)}
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0; width:100%;">
        <tr>
          <td style="padding:8px 0; font-size:14px; color:${MUTED};">Plan</td>
          <td style="padding:8px 0; font-size:14px; font-weight:600; text-align:right;">${plan}</td>
        </tr>
        <tr>
          <td style="padding:8px 0; font-size:14px; color:${MUTED}; border-top:1px solid #E8E5DE;">Amount</td>
          <td style="padding:8px 0; font-size:14px; font-weight:600; text-align:right; border-top:1px solid #E8E5DE;">${amount}</td>
        </tr>
      </table>
      ${paragraph('No action needed — this is just a confirmation. If you have questions about billing, reply to this email.')}
    `),
  };
}

/**
 * Payment failed warning — sent when a charge fails.
 */
export function paymentFailedEmail(
  name: string,
): { subject: string; html: string } {
  const firstName = name.split(' ')[0] || 'there';
  return {
    subject: 'Action needed: payment failed',
    html: layout(`
      ${heading('Your payment didn\'t go through')}
      ${paragraph(`Hey ${firstName}, we tried to charge your payment method but it was declined. Your subscription is at risk of being paused.`)}
      ${paragraph('Please update your payment method to keep your access:')}
      ${button('Update Payment', 'https://jetdale.com/settings/billing')}
      ${paragraph('If this was a temporary issue (like an expired card), updating your details will retry the charge automatically.')}
    `),
  };
}

/**
 * Export ready — download link for a completed export bundle.
 */
export function exportReadyEmail(
  name: string,
  downloadUrl: string,
  projectName: string,
): { subject: string; html: string } {
  const firstName = name.split(' ')[0] || 'there';
  return {
    subject: `Your export for "${projectName}" is ready`,
    html: layout(`
      ${heading('Export ready')}
      ${paragraph(`Hey ${firstName}, your export for <strong>${projectName}</strong> is ready to download.`)}
      ${button('Download Export', downloadUrl)}
      ${paragraph('This link expires in 7 days. After that, you can generate a new export from the project workspace.')}
    `),
  };
}

/**
 * Account deletion confirmation — sent after account is deleted.
 */
export function accountDeletionEmail(
  name: string,
): { subject: string; html: string } {
  const firstName = name.split(' ')[0] || 'there';
  return {
    subject: 'Your Jetdale account has been deleted',
    html: layout(`
      ${heading('Account deleted')}
      ${paragraph(`Hey ${firstName}, your Jetdale account and all associated data have been permanently deleted as requested.`)}
      ${paragraph('If this was a mistake, you can create a new account at any time — but your previous data cannot be recovered.')}
      ${paragraph('We appreciate you giving Jetdale a try. If you have feedback on what we could have done better, we would genuinely love to hear it — just reply to this email.')}
    `),
  };
}
