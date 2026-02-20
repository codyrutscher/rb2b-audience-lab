import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { workspaceId, type, filters } = await request.json();

    let data: any[] = [];
    let csvContent = '';

    if (type === 'visitors') {
      const { data: visitors } = await supabase
        .from('visitors')
        .select('*')
        .eq('workspace_id', workspaceId);

      data = visitors || [];
      
      // CSV Headers
      csvContent = 'Name,Email,Company,City,Country,Device,Page Views,First Seen,Last Seen,Identified,UTM Source,UTM Campaign\n';
      
      // CSV Rows
      data.forEach(v => {
        csvContent += `"${v.name || ''}","${v.email || ''}","${v.company || ''}","${v.city || ''}","${v.country || ''}","${v.device_type || ''}",${v.page_views},"${v.first_seen}","${v.last_seen}",${v.identified},"${v.utm_source || ''}","${v.utm_campaign || ''}"\n`;
      });
    } else if (type === 'page_views') {
      const { data: pageViews } = await supabase
        .from('page_views')
        .select('*, visitors(name, email)')
        .limit(10000);

      data = pageViews || [];
      
      csvContent = 'Visitor Name,Visitor Email,URL,Title,Referrer,Timestamp,Time on Page,Scroll Depth\n';
      
      data.forEach(pv => {
        const visitor = pv.visitors as any;
        csvContent += `"${visitor?.name || ''}","${visitor?.email || ''}","${pv.url}","${pv.title || ''}","${pv.referrer || ''}","${pv.timestamp}",${pv.time_on_page || ''},${pv.scroll_depth || ''}\n`;
      });
    }

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${type}_export_${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
