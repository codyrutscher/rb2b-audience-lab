import { Resend } from "resend";

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey?.trim()) {
      throw new Error("RESEND_API_KEY is required to send email");
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

export function getFromAddress(): { from: string; name?: string } {
  const email = process.env.RESEND_FROM_EMAIL;
  if (!email?.trim()) {
    throw new Error("RESEND_FROM_EMAIL is required");
  }
  const name = process.env.RESEND_FROM_NAME?.trim();
  return name ? { from: email, name } : { from: email };
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<{ messageId: string | null; error: string | null }> {
  const { to, subject, html, replyTo } = params;
  const { from, name } = getFromAddress();
  const fromHeader = name ? `${name} <${from}>` : from;
  const { data, error } = await getResend().emails.send({
    from: fromHeader,
    to: [to],
    subject,
    html,
    replyTo: replyTo ?? undefined,
  });
  return { messageId: data?.id ?? null, error: error?.message ?? null };
}
