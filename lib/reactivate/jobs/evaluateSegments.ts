import { prisma } from "../db";

const RULE_TYPES = ["url_contains", "url_regex", "event_type", "has_email"] as const;

function segmentMatchesContact(
  segment: { rules: { ruleType: string; ruleValue: string }[] },
  contact: { email: string },
  events: { url: string | null; eventType: string }[]
): boolean {
  if (segment.rules.length === 0) return false;
  for (const rule of segment.rules) {
    if (!RULE_TYPES.includes(rule.ruleType as (typeof RULE_TYPES)[number])) continue;
    if (ruleMatches(rule, contact, events)) return true;
  }
  return false;
}

function ruleMatches(
  rule: { ruleType: string; ruleValue: string },
  contact: { email: string },
  events: { url: string | null; eventType: string }[]
): boolean {
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

export async function evaluateSegmentsForContact(contactId: string): Promise<string | null> {
  const contact = await prisma.rtContact.findUnique({
    where: { id: contactId },
    select: { id: true, accountId: true, email: true },
  });
  if (!contact) return null;

  const events = await prisma.rtContactEvent.findMany({
    where: { contactId },
    orderBy: { ts: "desc" },
    take: 500,
    select: { url: true, eventType: true },
  });

  const segments = await prisma.rtSegment.findMany({
    where: { accountId: contact.accountId, enabled: true },
    orderBy: { priority: "asc" },
    include: { rules: true },
  });

  let winningSegmentId: string | null = null;
  for (const segment of segments) {
    if (segmentMatchesContact(segment, contact, events)) {
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
