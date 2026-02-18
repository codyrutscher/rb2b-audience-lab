import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Visitor = {
  id: string;
  session_id: string;
  ip_address: string;
  user_agent: string;
  country?: string;
  city?: string;
  company?: string;
  email?: string;
  name?: string;
  linkedin_url?: string;
  first_seen: string;
  last_seen: string;
  page_views: number;
  identified: boolean;
};

export type PageView = {
  id: string;
  visitor_id: string;
  session_id: string;
  url: string;
  title?: string;
  referrer?: string;
  timestamp: string;
  duration?: number;
};
