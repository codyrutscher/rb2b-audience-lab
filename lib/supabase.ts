import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

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
  workspace_id?: string;
  device_type?: string;
  screen_width?: number;
  screen_height?: number;
  language?: string;
  timezone?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  landing_page?: string;
  is_returning?: boolean;
  total_time_on_site?: number;
  total_sessions?: number;
  avg_session_duration?: number;
  bounce_rate?: number;
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
  time_on_page?: number;
  scroll_depth?: number;
  clicks_count?: number;
  exit_page?: boolean;
};
