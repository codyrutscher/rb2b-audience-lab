import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/reactivate/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim() ?? "";
  const accountId = searchParams.get("account")?.trim() ?? "";
  if (!email || !accountId) {
    return NextResponse.json({ error: "Missing email or account" }, { status: 400 });
  }
  try {
    await prisma.rtAccountUnsubscribe.upsert({
      where: { accountId_email: { accountId, email } },
      create: { accountId, email },
      update: {},
    });
  } catch {
    // account may not exist; ignore
  }
  return new NextResponse(
    "<!DOCTYPE html><html><body><p>You have been unsubscribed. You will not receive these emails again.</p></body></html>",
    {
      headers: { "Content-Type": "text/html" },
    }
  );
}
