import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const result: Record<string, any> = {
    timestamp: new Date().toISOString(),
    step: "init",
  };

  if (!supabaseUrl || !supabaseServiceKey) {
    result.error = "Missing env vars";
    result.hasUrl = !!supabaseUrl;
    result.hasServiceKey = !!supabaseServiceKey;
    return NextResponse.json(result, { status: 500 });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    result.step = "client_created";

    // Try to insert a test visitor
    const testSessionId = "test_" + Date.now();
    const { data: visitor, error: insertError } = await supabase
      .from("visitors")
      .insert({
        session_id: testSessionId,
        workspace_id: "24c32772-7615-42b2-b9fe-5635298e2b86",
        ip_address: "127.0.0.1",
        user_agent: "Test Agent",
        page_views: 1,
        identified: false,
        device_type: "desktop",
        landing_page: "https://test.com",
      })
      .select()
      .single();

    if (insertError) {
      result.step = "insert_failed";
      result.error = insertError.message;
      result.code = insertError.code;
      result.details = insertError.details;
      result.hint = insertError.hint;
      return NextResponse.json(result, { status: 500 });
    }

    result.step = "insert_success";
    result.visitor = visitor;

    // Try to read it back
    const { data: readBack, error: readError } = await supabase
      .from("visitors")
      .select("*")
      .eq("session_id", testSessionId)
      .single();

    if (readError) {
      result.step = "read_failed";
      result.readError = readError.message;
    } else {
      result.step = "complete";
      result.readBack = readBack;
    }

    // Clean up - delete the test visitor
    await supabase.from("visitors").delete().eq("session_id", testSessionId);
    result.cleaned = true;

    return NextResponse.json(result);
  } catch (e) {
    result.step = "exception";
    result.error = e instanceof Error ? e.message : String(e);
    return NextResponse.json(result, { status: 500 });
  }
}
