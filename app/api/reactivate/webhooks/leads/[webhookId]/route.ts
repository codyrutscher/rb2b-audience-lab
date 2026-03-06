import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/reactivate/db";
import { enqueue, JOB_NAMES } from "@/lib/reactivate/queue";
import { parseLeadPayload } from "@/lib/reactivate/webhook-types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ webhookId: string }> }
) {
  try {
    const { webhookId } = await params;
    const payload = parseLeadPayload(await request.json());

    const webhook = await prisma.rtWebhook.findUnique({
      where: { id: webhookId },
      select: { accountId: true },
    });
    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    const accountId = webhook.accountId;
    const ts = new Date(payload.timestamp);

    const contact = await prisma.rtContact.upsert({
      where: {
        accountId_email: { accountId, email: payload.email },
      },
      create: {
        accountId,
        email: payload.email,
        firstName: payload.first_name ?? null,
        lastName: payload.last_name ?? null,
      },
      update: {
        firstName: payload.first_name ?? undefined,
        lastName: payload.last_name ?? undefined,
        updatedAt: new Date(),
      },
    });

    await prisma.rtContactEvent.create({
      data: {
        accountId,
        contactId: contact.id,
        url: payload.url ?? null,
        eventType: payload.event_type,
        ts,
        metadata: (payload.metadata ?? {}) as object,
      },
    });

    await enqueue(JOB_NAMES.EvaluateSegments, { contact_id: contact.id });

    return NextResponse.json(
      {
        contact_id: contact.id,
        message: "Lead ingested; segment evaluation enqueued",
      },
      { status: 202 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request";
    if (
      message.includes("required") ||
      message.includes("must be") ||
      message.includes("Body must")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[webhooks/leads]", err);
    return NextResponse.json({ error: "Server error", detail: message }, { status: 500 });
  }
}
