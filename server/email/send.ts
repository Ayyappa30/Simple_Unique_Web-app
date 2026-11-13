export type Email = { to: string; subject: string; html: string; text: string };

/**
 * Sends one email through Resend (https://resend.com, free tier). Never throws: a failed email must not fail an order.
 * Without RESEND_API_KEY / EMAIL_FROM it only logs the subject and recipient, which is handy in local development.
 */
export async function sendEmail(email: Email): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.info(`[email] Not configured, so not sent: "${email.subject}" to ${email.to}`);
    return false;
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [email.to], subject: email.subject, html: email.html, text: email.text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(`[email] Resend rejected "${email.subject}" (${response.status}): ${detail.slice(0, 300)}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`[email] Could not send "${email.subject}"`, error);
    return false;
  }
}
