import { prisma } from "../db";
import { retrieveChunks } from "../retrieval";
import { generateCopy } from "../copyGeneration";
import { renderTemplate, type TemplateSlots, type TemplateId } from "../templates";
import { sendEmail } from "../resend";
import { resolveEmailForSend } from "../emailResolution";

const COOLDOWN_HOURS = 24;

function getUnsubscribeUrl(accountId: string, email: string): string {
  const base = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://example.com";
  return `${base.replace(/\/$/, "")}/api/reactivate/unsubscribe?email=${encodeURIComponent(email)}&account=${encodeURIComponent(accountId)}`;
}

export async function sendCampaignEmailForContact(
  contactId: string,
  segmentCampaignId: string
): Promise<{ sent: boolean; error?: string }> {
  const contact = await prisma.rtContact.findUnique({
    where: { id: contactId },
    include: { segmentState: { include: { segment: true } } },
  });
  if (!contact) return { sent: false, error: "Contact not found" };

  const campaign = await prisma.rtSegmentCampaign.findFirst({
    where: { id: segmentCampaignId, accountId: contact.accountId, enabled: true },
    include: {
      segment: true,
      knowledgeBank: true,
      emailTemplate: { include: { knowledgeBank: true } },
    },
  });
  if (!campaign) return { sent: false, error: "Campaign not found or disabled" };

  if (campaign.enabled && !campaign.emailFieldMap?.trim()) {
    return { sent: false, error: "Campaign enabled but email_field_map not set" };
  }

  const toEmail = resolveEmailForSend(contact, campaign.emailFieldMap);
  if (!toEmail || !toEmail.includes("@")) {
    return { sent: false, error: "No valid email resolved for contact" };
  }

  if (campaign.segment.isSuppression) {
    return { sent: false, error: "Campaign segment is suppression; never send" };
  }
  if (contact.segmentState?.segmentId !== campaign.segmentId) {
    return { sent: false, error: "Contact segment does not match campaign" };
  }

  const unsub = await prisma.rtAccountUnsubscribe.findUnique({
    where: { accountId_email: { accountId: contact.accountId, email: toEmail } },
  });
  if (unsub) return { sent: false, error: "Contact unsubscribed" };

  const since = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000);
  const recentSend = await prisma.rtEmailSend.findFirst({
    where: {
      contactId,
      segmentCampaignId,
      createdAt: { gte: since },
      status: "sent",
    },
  });
  if (recentSend) return { sent: false, error: "Cooldown: already sent in last 24h" };

  const kbId = campaign.emailTemplate?.knowledgeBankId ?? campaign.knowledgeBankId;
  const copyPrompt = campaign.emailTemplate?.copyPrompt ?? campaign.copyPrompt;
  const subjectText = campaign.emailTemplate?.subjectTemplate ?? campaign.subjectText;
  const ctaUrl = campaign.emailTemplate?.ctaUrl ?? campaign.ctaUrl;
  const ctaLabel = campaign.emailTemplate?.ctaLabel ?? campaign.ctaLabel;
  const queryHint = campaign.emailTemplate?.queryHint ?? campaign.queryHint;

  const queryParts: string[] = [campaign.segment.name];
  if (queryHint?.trim()) queryParts.push(queryHint.trim());
  const queryText = queryParts.join(". ");

  const kb = campaign.emailTemplate?.knowledgeBank ?? campaign.knowledgeBank;

  let chunks: { text: string }[];
  try {
    const retrieved = await retrieveChunks({
      accountId: contact.accountId,
      knowledgeBankId: kbId,
      queryText,
      topK: 8,
    });
    chunks = retrieved;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logSend(contact.accountId, contactId, segmentCampaignId, campaign.templateId, campaign.emailTemplateId, toEmail, null, "failed", msg);
    return { sent: false, error: msg };
  }

  const retrievedText =
    chunks.length > 0
      ? chunks.map((c) => c.text).join("\n\n")
      : (kb?.description as string | null) || "We have something relevant for you.";

  let personalizedContent: string;
  try {
    personalizedContent = await generateCopy({
      retrievedText,
      firstName: contact.firstName,
      ctaLabel: ctaLabel ?? undefined,
      queryHint: queryHint ?? undefined,
      customPrompt: copyPrompt,
      maxNewTokens: 350,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logSend(contact.accountId, contactId, segmentCampaignId, campaign.templateId, campaign.emailTemplateId, toEmail, null, "failed", msg);
    return { sent: false, error: msg };
  }

  const templateId = (campaign.emailTemplate?.templateId ?? campaign.templateId) as TemplateId;
  const slots: TemplateSlots = {
    first_name: contact.firstName?.trim() || "there",
    personalized_content: personalizedContent,
    cta_url: ctaUrl?.trim() || "",
    cta_label: ctaLabel?.trim() || "Learn more",
    unsubscribe_url: getUnsubscribeUrl(contact.accountId, toEmail),
  };

  let html: string;
  try {
    html = renderTemplate(templateId, slots);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logSend(contact.accountId, contactId, segmentCampaignId, campaign.templateId, campaign.emailTemplateId, toEmail, null, "failed", msg);
    return { sent: false, error: msg };
  }

  const { messageId, error: sendError } = await sendEmail({
    to: toEmail,
    subject: subjectText,
    html,
  });

  if (sendError) {
    await logSend(contact.accountId, contactId, segmentCampaignId, campaign.templateId, campaign.emailTemplateId, toEmail, null, "failed", sendError);
    return { sent: false, error: sendError };
  }

  await logSend(contact.accountId, contactId, segmentCampaignId, campaign.templateId, campaign.emailTemplateId, toEmail, messageId ?? null, "sent");
  return { sent: true };
}

async function logSend(
  accountId: string,
  contactId: string,
  segmentCampaignId: string,
  templateId: string,
  emailTemplateId: string | null,
  resolvedEmail: string | null,
  resendMessageId: string | null,
  status: string,
  error?: string
): Promise<void> {
  await prisma.rtEmailSend.create({
    data: {
      accountId,
      contactId,
      segmentCampaignId,
      templateId,
      emailTemplateId,
      resolvedEmail,
      resendMessageId,
      status,
      error: error ?? null,
    },
  });
}
