/**
 * Ingest pixel v4 events into rt_contacts and rt_contact_events.
 * Batch-optimized for fast load. Enqueues EvaluateSegmentsJob per contact.
 */
import { createHash } from "node:crypto";
import { prisma } from "../db";
import { enqueueMany } from "../queue";
import { JOB_NAMES } from "../queue";
import type { PixelEvent } from "../pixelApi";

const EMAIL_FIELDS = [
  "PERSONAL_VERIFIED_EMAILS",
  "PERSONAL_EMAILS",
  "BUSINESS_VERIFIED_EMAILS",
  "BUSINESS_EMAIL",
] as const;

const BATCH_SIZE = 200;

function resolveEmail(resolution: Record<string, string> | null | undefined): string | null {
  if (!resolution || typeof resolution !== "object") return null;
  for (const field of EMAIL_FIELDS) {
    const val = resolution[field];
    if (typeof val === "string") {
      const first = val.split(",").map((s) => s.trim()).filter(Boolean)[0];
      if (first && first.includes("@")) return first;
    }
  }
  return null;
}

function firstNonEmpty(resolution: Record<string, string> | null | undefined, ...fields: string[]): string | null {
  if (!resolution || typeof resolution !== "object") return null;
  for (const field of fields) {
    const val = resolution[field];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return null;
}

function makeSourceEventKey(audiencelabPixelId: string, edid: string, ts: string, fullUrl: string): string {
  const raw = `${audiencelabPixelId}|${edid}|${ts}|${fullUrl || ""}`;
  return createHash("sha256").update(raw).digest("hex");
}

export interface IngestResult {
  contactsUpserted: number;
  eventsInserted: number;
  eventsSkipped: number;
  contactsEnqueued: number;
}

type PreparedEvent = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  edid: string | null;
  hemSha256: string | null;
  fullUrl: string | null;
  referrerUrl: string | null;
  eventTs: Date;
  pixelDataJson: object;
  sourceEventKey: string;
};

export async function ingestPixelData(
  internalPixelId: string,
  audiencelabPixelId: string,
  accountId: string,
  events: PixelEvent[]
): Promise<IngestResult> {
  const result: IngestResult = { contactsUpserted: 0, eventsInserted: 0, eventsSkipped: 0, contactsEnqueued: 0 };

  const prepared: PreparedEvent[] = [];
  for (const ev of events) {
    const resolution = ev.resolution && typeof ev.resolution === "object" ? (ev.resolution as Record<string, string>) : {};
    const email = resolveEmail(resolution);
    if (!email || !email.includes("@")) continue;

    const fullUrl = ev.full_url ?? ev.referrer_url ?? null;
    const sourceEventKey = makeSourceEventKey(audiencelabPixelId, ev.edid || "", ev.event_timestamp || "", fullUrl || "");

    prepared.push({
      email,
      firstName: firstNonEmpty(resolution, "FIRST_NAME") ?? null,
      lastName: firstNonEmpty(resolution, "LAST_NAME") ?? null,
      edid: ev.edid || null,
      hemSha256: ev.hem_sha256 || null,
      fullUrl,
      referrerUrl: ev.referrer_url ?? null,
      eventTs: ev.event_timestamp ? new Date(ev.event_timestamp) : new Date(),
      pixelDataJson: resolution as object,
      sourceEventKey,
    });
  }

  if (prepared.length === 0) return result;

  const sourceKeys = prepared.map((p) => p.sourceEventKey);
  const existing = await prisma.rtContactEvent.findMany({
    where: { sourceEventKey: { in: sourceKeys } },
    select: { sourceEventKey: true },
  });
  const existingSet = new Set(existing.map((e) => e.sourceEventKey).filter(Boolean) as string[]);

  const toIngest = prepared.filter((p) => !existingSet.has(p.sourceEventKey));
  result.eventsSkipped = prepared.length - toIngest.length;

  if (toIngest.length === 0) return result;

  const contactMap = new Map<string, { id: string }>();
  const eventsToCreate: Array<{
    accountId: string;
    contactId: string;
    pixelId: string;
    url: string | null;
    fullUrl: string | null;
    referrerUrl: string | null;
    eventType: string;
    ts: Date;
    resolution: object;
    sourceEventKey: string;
  }> = [];

  const uniqueEmails = [...new Set(toIngest.map((p) => p.email))];
  const emailToFirst = new Map<string, PreparedEvent>();
  for (const p of toIngest) {
    if (!emailToFirst.has(p.email)) emailToFirst.set(p.email, p);
  }

  await prisma.$transaction(async (tx) => {
    const upserts = uniqueEmails.map(async (email) => {
      const first = emailToFirst.get(email)!;
      const contact = await tx.rtContact.upsert({
        where: { accountId_email: { accountId, email } },
        create: {
          accountId,
          email,
          firstName: first.firstName,
          lastName: first.lastName,
          edid: first.edid,
          hemSha256: first.hemSha256,
          pixelData: first.pixelDataJson,
        },
        update: {
          firstName: first.firstName ?? undefined,
          lastName: first.lastName ?? undefined,
          edid: first.edid ?? undefined,
          hemSha256: first.hemSha256 ?? undefined,
          pixelData: first.pixelDataJson,
        },
      });
      return { email, id: contact.id };
    });
    const contacts = await Promise.all(upserts);
    for (const c of contacts) contactMap.set(c.email, { id: c.id });
    result.contactsUpserted = uniqueEmails.length;

    for (const p of toIngest) {
      const contact = contactMap.get(p.email);
      if (!contact) continue;
      eventsToCreate.push({
        accountId,
        contactId: contact.id,
        pixelId: internalPixelId,
        url: p.fullUrl,
        fullUrl: p.fullUrl,
        referrerUrl: p.referrerUrl,
        eventType: "page_view",
        ts: p.eventTs,
        resolution: p.pixelDataJson,
        sourceEventKey: p.sourceEventKey,
      });
    }

    for (let i = 0; i < eventsToCreate.length; i += BATCH_SIZE) {
      await tx.rtContactEvent.createMany({
        data: eventsToCreate.slice(i, i + BATCH_SIZE),
      });
    }
    result.eventsInserted = eventsToCreate.length;
  });

  const contactIdsToEval = [...new Set(toIngest.map((p) => contactMap.get(p.email)!.id))];
  await enqueueMany(
    JOB_NAMES.EvaluateSegments,
    contactIdsToEval.map((contact_id) => ({ contact_id }))
  );
  result.contactsEnqueued = contactIdsToEval.length;

  return result;
}
