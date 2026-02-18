import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, email, name, company, linkedinUrl } = body;

    // Update visitor with identification data
    const { data, error } = await supabase
      .from('visitors')
      .update({
        email,
        name,
        company,
        linkedin_url: linkedinUrl,
        identified: true,
      })
      .eq('session_id', sessionId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, visitor: data });
  } catch (error) {
    console.error('Identification error:', error);
    return NextResponse.json({ error: 'Identification failed' }, { status: 500 });
  }
}
