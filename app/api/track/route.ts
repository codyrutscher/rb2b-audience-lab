import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { lookupIPWithFallback } from '@/lib/ip-lookup';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();
  try {
    const body = await request.json();
    const { 
      sessionId, 
      workspaceId, 
      url, 
      title, 
      referrer,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      screen_width,
      screen_height,
      viewport_width,
      viewport_height,
      language,
      timezone,
      device_type,
    } = body;

    // Get IP and user agent
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Lookup IP geolocation
    const ipInfo = await lookupIPWithFallback(ip);

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
          workspace_id: workspaceId || null,
          ip_address: ip,
          user_agent: userAgent,
          page_views: 1,
          identified: false,
          device_type,
          screen_width,
          screen_height,
          language,
          timezone,
          utm_source,
          utm_medium,
          utm_campaign,
          utm_term,
          utm_content,
          landing_page: url,
          // IP geolocation data
          city: ipInfo?.city,
          country: ipInfo?.country,
          company: ipInfo?.company,
          is_returning: false,
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
