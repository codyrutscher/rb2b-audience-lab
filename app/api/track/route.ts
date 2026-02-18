import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, url, title, referrer } = body;

    // Get IP and user agent
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Check if visitor exists
    let { data: visitor } = await supabase
      .from('visitors')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (!visitor) {
      // Create new visitor
      const { data: newVisitor, error } = await supabase
        .from('visitors')
        .insert({
          session_id: sessionId,
          ip_address: ip,
          user_agent: userAgent,
          page_views: 1,
          identified: false,
        })
        .select()
        .single();

      if (error) throw error;
      visitor = newVisitor;
    } else {
      // Update existing visitor
      await supabase
        .from('visitors')
        .update({
          last_seen: new Date().toISOString(),
          page_views: visitor.page_views + 1,
        })
        .eq('id', visitor.id);
    }

    // Record page view
    await supabase.from('page_views').insert({
      visitor_id: visitor.id,
      session_id: sessionId,
      url,
      title,
      referrer,
    });

    return NextResponse.json({ success: true, visitorId: visitor.id });
  } catch (error) {
    console.error('Tracking error:', error);
    return NextResponse.json({ error: 'Tracking failed' }, { status: 500 });
  }
}
