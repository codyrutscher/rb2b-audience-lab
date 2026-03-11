import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const databaseUrl = process.env.DATABASE_URL;

  const checks: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : "NOT SET",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey 
        ? `${supabaseAnonKey.substring(0, 20)}...${supabaseAnonKey.substring(supabaseAnonKey.length - 10)}` 
        : "NOT SET",
      DATABASE_URL: databaseUrl 
        ? `${databaseUrl.substring(0, 40)}...` 
        : "NOT SET",
    },
    supabase_url_project: null,
    anon_key_project: null,
    database_url_project: null,
    mismatch: false,
  };

  // Extract project ID from URL
  if (supabaseUrl) {
    const urlMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
    checks.supabase_url_project = urlMatch ? urlMatch[1] : "INVALID FORMAT";
  }

  // Extract project ID from anon key (it's in the JWT payload)
  if (supabaseAnonKey) {
    try {
      const payload = JSON.parse(atob(supabaseAnonKey.split('.')[1]));
      checks.anon_key_project = payload.ref || "NOT FOUND IN TOKEN";
      checks.anon_key_details = {
        iss: payload.iss,
        ref: payload.ref,
        role: payload.role,
        exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
      };
    } catch (e) {
      checks.anon_key_project = "FAILED TO DECODE";
    }
  }

  // Extract project ID from DATABASE_URL
  if (databaseUrl) {
    const dbMatch = databaseUrl.match(/postgres(?:ql)?:\/\/postgres\.([^:]+):/);
    if (dbMatch) {
      checks.database_url_project = dbMatch[1];
    } else {
      const dbMatch2 = databaseUrl.match(/db\.([^.]+)\.supabase\.co/);
      checks.database_url_project = dbMatch2 ? dbMatch2[1] : "COULD NOT EXTRACT";
    }
  }

  // Check for mismatches
  const projects = [checks.supabase_url_project, checks.anon_key_project, checks.database_url_project].filter(Boolean);
  const uniqueProjects = [...new Set(projects)];
  if (uniqueProjects.length > 1) {
    checks.mismatch = true;
    checks.mismatch_details = `Found ${uniqueProjects.length} different project IDs: ${uniqueProjects.join(', ')}`;
  }

  // Test Supabase connection
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      
      // Try a simple query
      const { data, error } = await supabase.from('workspaces').select('count').limit(1);
      
      if (error) {
        checks.supabase_connection = {
          status: "ERROR",
          error: error.message,
          code: error.code,
        };
      } else {
        checks.supabase_connection = {
          status: "OK",
          message: "Successfully connected to Supabase",
        };
      }
    } catch (e) {
      checks.supabase_connection = {
        status: "EXCEPTION",
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  return NextResponse.json(checks, { status: checks.mismatch ? 400 : 200 });
}
