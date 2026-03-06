import { prisma } from "../db";

const LEGACY_RULE_TYPES = ["url_contains", "url_regex", "event_type", "has_email"] as const;
const OPERATORS = ["contains", "not_contains", "equals", "regex", "is_empty", "is_not_empty"] as const;

type ContactWithPixel = {
  id: string;
  accountId: string;
  email: string;
  pixelData: Record<string, unknown> | null;
};

type EventWithResolution = {
  url: string | null;
  fullUrl: string | null;
  referrerUrl: string | null;
  eventType: string;
  resolution: Record<string, unknown> | null;
  ts: Date;
};

function getFieldValue(
  field: string,
  contact: ContactWithPixel,
  events: EventWithResolution[]
): string | null {
  if (field === "FULL_URL" || field === "REFERRER_URL") {
    for (const e of events) {
      const v = field === "FULL_URL" ? (e.fullUrl ?? e.url) : e.referrerUrl;
      if (v) return v;
    }
    return null;
  }
  if (contact.pixelData && typeof contact.pixelData[field] === "string") {
    return contact.pixelData[field] as string;
  }
  for (const e of events) {
    const r = e.resolution;
    if (r && typeof r === "object" && typeof (r as Record<string, unknown>)[field] === "string") {
      return (r as Record<string, unknown>)[field] as string;
    }
  }
  return null;
}

function operatorMatches(op: string, value: string | null, ruleValue: string): boolean {
  const v = (value ?? "").trim();
  switch (op) {
    case "contains":
      return v.toLowerCase().includes(ruleValue.toLowerCase());
    case "not_contains":
      return !v.toLowerCase().includes(ruleValue.toLowerCase());
    case "equals":
      return v.toLowerCase() === ruleValue.toLowerCase();
    case "regex": {
      try {
        return new RegExp(ruleValue, "i").test(v);
      } catch {
        return false;
      }
    }
    case "is_empty":
      return v === "";
    case "is_not_empty":
      return v !== "";
    default:
      return false;
  }
}

function ruleMatchesNew(
  rule: { field: string | null; operator: string | null; ruleValue: string },
  contact: ContactWithPixel,
  events: EventWithResolution[]
): boolean {
  if (!rule.field || !rule.operator || !OPERATORS.includes(rule.operator as (typeof OPERATORS)[number])) {
    return false;
  }
  const value = getFieldValue(rule.field, contact, events);
  if (rule.operator === "is_empty" || rule.operator === "is_not_empty") {
    return operatorMatches(rule.operator, value ?? "", "");
  }
  return operatorMatches(rule.operator, value ?? "", rule.ruleValue || "");
}

function ruleMatchesLegacy(
  rule: { ruleType: string; ruleValue: string },
  contact: { email: string },
  events: { url: string | null; eventType: string }[]
): boolean {
  if (!LEGACY_RULE_TYPES.includes(rule.ruleType as (typeof LEGACY_RULE_TYPES)[number])) return false;
  switch (rule.ruleType) {
    case "url_contains":
      return events.some((e) => e.url != null && e.url.includes(rule.ruleValue));
    case "url_regex": {
      try {
        const re = new RegExp(rule.ruleValue);
        return events.some((e) => e.url != null && re.test(e.url));
      } catch {
        return false;
      }
    }
    case "event_type":
      return events.some((e) => e.eventType === rule.ruleValue);
    case "has_email":
      return contact.email.length > 0;
    default:
      return false;
  }
}

function rulesInGroupMatch(
  rules: { field: string | null; operator: string | null; ruleValue: string }[],
  logicalOp: string,
  contact: ContactWithPixel,
  events: EventWithResolution[]
): boolean {
  if (rules.length === 0) return false;
  const results = rules.map((r) => ruleMatchesNew(r, contact, events));
  if (logicalOp === "AND") return results.every(Boolean);
  return results.some(Boolean);
}

function segmentMatchesContact(
  segment: {
    rules: { field: string | null; operator: string | null; ruleType: string; ruleValue: string; groupId: string | null }[];
    ruleGroups?: { id: string; logicalOp: string; groupOrder: number; rules: { field: string | null; operator: string | null; ruleValue: string }[] }[];
  },
  contact: ContactWithPixel,
  events: EventWithResolution[],
  _lastActivityAt: Date | null
): boolean {
  const legacyRules = segment.rules.filter((r) => !r.field && !r.groupId);
  const ungroupedNewRules = segment.rules.filter((r) => r.field && !r.groupId);

  if (segment.ruleGroups && segment.ruleGroups.length > 0) {
    const groupResults = segment.ruleGroups.map((g) =>
      rulesInGroupMatch(g.rules, g.logicalOp, contact, events)
    );
    if (groupResults.some(Boolean)) return true;
  }

  for (const rule of ungroupedNewRules) {
    if (ruleMatchesNew(rule, contact, events)) return true;
  }

  const eventsForLegacy = events.map((e) => ({ url: e.url ?? e.fullUrl, eventType: e.eventType }));
  for (const rule of legacyRules) {
    if (ruleMatchesLegacy(rule, contact, eventsForLegacy)) return true;
  }

  return false;
}

export async function evaluateSegmentsForContact(contactId: string): Promise<string | null> {
  const contact = await prisma.rtContact.findUnique({
    where: { id: contactId },
    select: { id: true, accountId: true, email: true, pixelData: true },
  });
  if (!contact) return null;

  const pixelData = contact.pixelData as Record<string, unknown> | null;
  const contactWithPixel: ContactWithPixel = { ...contact, pixelData };

  const contactWithCreated = await prisma.rtContact.findUnique({
    where: { id: contactId },
    select: { createdAt: true },
  });
  const events = await prisma.rtContactEvent.findMany({
    where: { contactId },
    orderBy: { ts: "desc" },
    take: 500,
    select: { url: true, fullUrl: true, referrerUrl: true, eventType: true, resolution: true, ts: true },
  });
  const eventsWithUrl: EventWithResolution[] = events.map((e) => ({
    ...e,
    url: e.url ?? e.fullUrl ?? null,
    resolution: (e.resolution as Record<string, unknown>) ?? null,
    ts: e.ts,
  }));

  const segments = await prisma.rtSegment.findMany({
    where: { accountId: contact.accountId, enabled: true },
    orderBy: { priority: "asc" },
    include: {
      rules: true,
      ruleGroups: { include: { rules: true }, orderBy: { groupOrder: "asc" } },
    },
  });

  const lastActivityAt =
    eventsWithUrl.length > 0
      ? eventsWithUrl[0]!.ts
      : contactWithCreated?.createdAt ?? null;

  const suppressionSegments = segments.filter((s) => s.isSuppression);
  const matchesAnySuppression = suppressionSegments.some((s) =>
    segmentMatchesContact(s, contactWithPixel, eventsWithUrl, lastActivityAt)
  );
  if (matchesAnySuppression) {
    await prisma.rtContactSegmentState.upsert({
      where: { contactId },
      create: { contactId, segmentId: null, evaluatedAt: new Date() },
      update: { segmentId: null, evaluatedAt: new Date() },
    });
    return null;
  }

  let winningSegmentId: string | null = null;
  for (const segment of segments) {
    if (!segment.isSuppression && segmentMatchesContact(segment, contactWithPixel, eventsWithUrl, lastActivityAt)) {
      winningSegmentId = segment.id;
      break;
    }
  }

  await prisma.rtContactSegmentState.upsert({
    where: { contactId },
    create: { contactId, segmentId: winningSegmentId, evaluatedAt: new Date() },
    update: { segmentId: winningSegmentId, evaluatedAt: new Date() },
  });

  return winningSegmentId;
}

const PREVIEW_CONTACT_LIMIT = 3000;
const PREVIEW_SAMPLE_SIZE = 20;

export async function previewSegment(
  segmentId: string,
  accountId: string
): Promise<{ count: number; sample: Array<{ email: string; firstName: string | null; lastName: string | null }>; evaluatedCount: number }> {
  const segment = await prisma.rtSegment.findFirst({
    where: { id: segmentId, accountId },
    include: {
      rules: true,
      ruleGroups: { include: { rules: true }, orderBy: { groupOrder: "asc" } },
    },
  });
  if (!segment) {
    throw new Error("Segment not found");
  }

  const contacts = await prisma.rtContact.findMany({
    where: { accountId },
    take: PREVIEW_CONTACT_LIMIT,
    select: {
      id: true,
      accountId: true,
      email: true,
      firstName: true,
      lastName: true,
      pixelData: true,
      createdAt: true,
      events: {
        take: 300,
        orderBy: { ts: "desc" },
        select: { url: true, fullUrl: true, referrerUrl: true, eventType: true, resolution: true, ts: true },
      },
    },
  });

  const sample: Array<{ email: string; firstName: string | null; lastName: string | null }> = [];

  let count = 0;
  for (const c of contacts) {
    const contactWithPixel: ContactWithPixel = {
      id: c.id,
      accountId: c.accountId,
      email: c.email,
      pixelData: c.pixelData as Record<string, unknown> | null,
    };
    const eventsWithUrl: EventWithResolution[] = c.events.map((e) => ({
      url: e.url ?? e.fullUrl ?? null,
      fullUrl: e.fullUrl ?? null,
      referrerUrl: e.referrerUrl ?? null,
      eventType: e.eventType,
      resolution: (e.resolution as Record<string, unknown>) ?? null,
      ts: e.ts,
    }));
    const lastActivityAt =
      eventsWithUrl.length > 0 ? eventsWithUrl[0]!.ts : c.createdAt ?? null;

    if (segmentMatchesContact(segment, contactWithPixel, eventsWithUrl, lastActivityAt)) {
      count++;
      if (sample.length < PREVIEW_SAMPLE_SIZE) {
        sample.push({ email: c.email, firstName: c.firstName, lastName: c.lastName });
      }
    }
  }

  return { count, sample, evaluatedCount: contacts.length };
}
