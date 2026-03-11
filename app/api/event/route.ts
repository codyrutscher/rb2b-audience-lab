import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();
  
  try {
    const body = await request.json();
    const { sessionId, workspaceId, event, properties, url } = body;

    // Get visitor ID from session
    const { data: visitor } = await supabase
      .from('visitors')
      .select('id')
      .eq('session_id', sessionId)
      .single();

    if (!visitor) {
      return NextResponse.json({ error: 'Visitor not found' }, { status: 404, headers: corsHeaders });
    }

    // Record event
    const { error } = await supabase.from('events').insert({
      visitor_id: visitor.id,
      workspace_id: workspaceId || null,
      session_id: sessionId,
      event_name: event,
      properties: properties || {},
      url,
    });

    if (error) throw error;

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error('Event tracking error:', error);
    return NextResponse.json({ error: 'Event tracking failed' }, { status: 500, headers: corsHeaders });
  }
}
