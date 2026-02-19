import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    const { sessionId, workspaceId, url, time_on_page, scroll_depth, clicks } = body;

    // Get the most recent page view for this session and URL
    const { data: pageView } = await supabase
      .from('page_views')
      .select('id')
      .eq('session_id', sessionId)
      .eq('url', url)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (pageView) {
      // Update page view with exit data
      await supabase
        .from('page_views')
        .update({
          time_on_page,
          scroll_depth,
          clicks_count: clicks,
          exit_page: true,
        })
        .eq('id', pageView.id);
    }

    // Update session
    const { data: session } = await supabase
      .from('sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (session) {
      const duration = Math.round((Date.now() - new Date(session.started_at).getTime()) / 1000);
      
      await supabase
        .from('sessions')
        .update({
          ended_at: new Date().toISOString(),
          duration,
          exit_page: url,
        })
        .eq('session_id', sessionId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Page exit tracking error:', error);
    return NextResponse.json({ error: 'Page exit tracking failed' }, { status: 500 });
  }
}
