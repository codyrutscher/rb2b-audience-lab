import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { prisma } from "@/lib/reactivate/db";

const OPERATORS = ["contains", "not_contains", "equals", "regex", "is_empty", "is_not_empty"] as const;

function getFieldValue(field: string, visitor: any): string | null {
  // Map common fields
  const fieldMap: Record<string, string> = {
    'email': 'email',
    'company': 'company',
    'city': 'city',
    'country': 'country',
    'landing_page': 'landing_page',
    'utm_source': 'utm_source',
    'utm_campaign': 'utm_campaign',
    'device_type': 'device_type',
    'language': 'language',
  };
  
  const mappedField = fieldMap[field] || field;
  return visitor[mappedField] ?? null;
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

function ruleMatches(rule: any, visitor: any): boolean {
  if (!rule.field || !rule.operator) return false;
  const value = getFieldValue(rule.field, visitor);
  return operatorMatches(rule.operator, value, rule.ruleValue || "");
}

function segmentMatchesVisitor(segment: any, visitor: any): boolean {
  // Check ungrouped rules (all must match - AND logic)
  const ungroupedRules = segment.rules?.filter((r: any) => !r.groupId) || [];
  for (const rule of ungroupedRules) {
    if (!ruleMatches(rule, visitor)) return false;
  }
  
  // Check rule groups (at least one group must match - OR logic)
  const groups = segment.ruleGroups || [];
  if (groups.length > 0) {
    const anyGroupMatches = groups.some((group: any) => {
      // All rules in group must match (AND logic)
      return group.rules.every((rule: any) => ruleMatches(rule, visitor));
    });
    if (!anyGroupMatches) return false;
  }
  
  return true;
}

/**
 * GET /api/reactivate/segments/[id]/preview
 * Preview which visitors would match the segment's filters.
 * Returns count, sample visitors, and how many were evaluated.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: segmentId } = await params;

  try {
    const segment = await prisma.rtSegment.findFirst({
      where: { id: segmentId, accountId },
      include: {
        rules: true,
        ruleGroups: { include: { rules: true }, orderBy: { groupOrder: "asc" } },
      },
    });
    
    if (!segment) {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 });
    }

    // Get visitors - filter by pixel_id if segment has one
    const visitors = await prisma.visitor.findMany({
      where: { 
        workspaceId: accountId,
        ...(segment.pixelId ? { pixelId: segment.pixelId } : {})
      },
      take: 1000,
      orderBy: { lastSeen: "desc" },
    });

    const matched = visitors.filter((v) => segmentMatchesVisitor(segment, v));
    const sample = matched.slice(0, 20).map((v) => ({
      id: v.id,
      email: v.email,
      company: v.company,
      name: v.name,
      city: v.city,
      country: v.country,
      page_views: v.pageViews,
      landing_page: v.landingPage,
      device_type: v.deviceType,
      language: v.language,
      utm_source: v.utmSource,
      utm_campaign: v.utmCampaign,
    }));

    return NextResponse.json({ 
      count: matched.length, 
      sample,
      evaluatedCount: visitors.length 
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
