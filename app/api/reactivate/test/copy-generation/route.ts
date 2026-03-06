import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { generateCopy } from "@/lib/reactivate/copyGeneration";

export async function POST(request: NextRequest) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const {
    retrieved_text,
    first_name,
    cta_label,
    query_hint,
    custom_prompt,
  } = body;
  const retrievedText =
    typeof retrieved_text === "string" ? retrieved_text.trim() : "";
  if (!retrievedText) {
    return NextResponse.json(
      { error: "retrieved_text is required" },
      { status: 400 }
    );
  }
  try {
    const copy = await generateCopy({
      retrievedText,
      firstName: first_name ?? null,
      ctaLabel: cta_label ?? null,
      queryHint: query_hint ?? null,
      customPrompt: custom_prompt ?? null,
      maxNewTokens: 350,
    });
    return NextResponse.json({ copy });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Copy generation failed", detail: message },
      { status: 500 }
    );
  }
}
