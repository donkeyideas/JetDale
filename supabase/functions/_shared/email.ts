// ============================================================
// Jetdale — Email Utility (Resend API wrapper)
// Sends transactional emails via the Resend API.
// All edge functions should use this shared wrapper.
// ============================================================

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

interface SendEmailResult {
  id: string;
}

const DEFAULT_FROM = 'Jetdale <info@donkeyideas.com>';

/**
 * Send a transactional email via the Resend API.
 * Requires the RESEND_API_KEY secret to be set.
 */
export async function sendEmail(
  opts: SendEmailOptions,
): Promise<SendEmailResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const body = {
    from: opts.from ?? DEFAULT_FROM,
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    subject: opts.subject,
    html: opts.html,
  };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(
      `Resend API error: status=${response.status} body=${errorBody}`,
    );
    throw new Error(`Failed to send email: ${response.status} ${errorBody}`);
  }

  const result = await response.json();
  console.log(`Email sent via Resend: id=${result.id} to=${body.to.join(',')}`);

  return { id: result.id };
}

/**
 * Send an email and swallow errors (logs them instead of throwing).
 * Use this in cron jobs where a single email failure shouldn't abort the batch.
 */
export async function sendEmailSafe(
  opts: SendEmailOptions,
): Promise<SendEmailResult | null> {
  try {
    return await sendEmail(opts);
  } catch (err) {
    console.error(
      `sendEmailSafe failed: to=${opts.to} subject="${opts.subject}"`,
      err,
    );
    return null;
  }
}
