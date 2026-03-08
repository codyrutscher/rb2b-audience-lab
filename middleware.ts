import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Minimal middleware: pass through only. Wrapped in try/catch so any Edge
 * runtime error returns next() instead of 500 MIDDLEWARE_INVOCATION_FAILED.
 * Auth for /dashboard is enforced in app/dashboard/layout.tsx (client-side).
 */
export function middleware(request: NextRequest) {
  try {
    return NextResponse.next();
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  // Match a path that is never requested so middleware never runs.
  // This avoids MIDDLEWARE_INVOCATION_FAILED while keeping the file for Vercel.
  matcher: ["/__middleware_skip"],
};
