import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { lookupIPWithFallback } from '@/lib/ip-lookup';
import { sendVisitorNotifications } from '@/lib/notifications';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// Handle CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();
  try {
    const body = await request.json();
    const { 
      sessionId, 
      workspaceId, // This can be either a workspace ID or a pixel ID
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

    // Resolve workspace ID - check if workspaceId is actually a pixel ID
    let resolvedWorkspaceId = workspaceId;
    let pixelId: string | null = null;
    
    if (workspaceId) {
      // First check if it's a pixel ID by looking up rt_pixels
      const { data: pixel } = await supabase
        .from('rt_pixels')
        .select('id, account_id')
        .eq('id', workspaceId)
        .single();
      
      if (pixel) {
        // It's a pixel ID - get the workspace from the account
        pixelId = pixel.id;
        const { data: account } = await supabase
          .from('rt_accounts')
          .select('workspace_id')
          .eq('id', pixel.account_id)
          .single();
        
        if (account) {
          resolvedWorkspaceId = account.workspace_id;
        }
      }
      // If not found as pixel, assume it's already a workspace ID
    }

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
          workspace_id: resolvedWorkspaceId || null,
          pixel_id: pixelId,
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

      // Send notifications for new visitors
      if (resolvedWorkspaceId) {
        await sendVisitorNotifications(resolvedWorkspaceId, {
          visitorId: newVisitor.id,
          name: newVisitor.name,
          email: newVisitor.email,
          company: newVisitor.company || ipInfo?.company,
          city: ipInfo?.city,
          country: ipInfo?.country,
          deviceType: device_type,
          currentPage: url,
          landingPage: url,
          utmSource: utm_source,
          utmCampaign: utm_campaign,
          isReturning: false,
        });
      }
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

    return NextResponse.json({ success: true, visitorId: visitor.id }, { headers: corsHeaders });
  } catch (error) {
    console.error('Tracking error:', error);
    return NextResponse.json({ error: 'Tracking failed' }, { status: 500, headers: corsHeaders });
  }
}
