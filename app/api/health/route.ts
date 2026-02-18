import { NextResponse } from 'next/server';

export async function GET() {
  console.log('=== HEALTH CHECK CALLED ===');
  
  const response = { 
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Audience Lab API is running',
    env: process.env.NODE_ENV,
    nextVersion: process.env.NEXT_RUNTIME || 'unknown',
  };
  
  console.log('Health check response:', response);
  
  return NextResponse.json(response);
}
