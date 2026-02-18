import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  console.log('=== MIDDLEWARE LOG ===');
  console.log('URL:', request.url);
  console.log('Path:', request.nextUrl.pathname);
  console.log('Method:', request.method);
  console.log('Headers:', Object.fromEntries(request.headers.entries()));
  console.log('======================');
  
  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};
