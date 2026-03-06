import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { prisma } from "@/lib/reactivate/db";

/**
 * GET /api/reactivate/unsubscribes
 * List unsubscribed emails for the account.
 */
export async function GET(request: Request) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const unsubs = await prisma.rtAccountUnsubscribe.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ unsubscribes: unsubs });
}

/**
 * DELETE /api/reactivate/unsubscribes?email=...
 * Remove an email from the unsubscribe list (re-subscribe).
 */
export async function DELETE(request: NextRequest) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  await prisma.rtAccountUnsubscribe.deleteMany({
    where: { accountId, email },
  });
  return new NextResponse(null, { status: 204 });
}
