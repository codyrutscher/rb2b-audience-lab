"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Eye, ArrowLeft, MapPin, Monitor, Clock, ExternalLink, Mail, Building2, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow, format } from "date-fns";

type Visitor = any;
type PageView = any;
type Event = any;

export default function VisitorDetailPage() {
  const params = useParams();
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [pageViews, setPageViews] = useState<PageView[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      loadVisitorData(params.id as string);
    }
  }, [params.id]);

  async function loadVisitorData(visitorId: string) {
    setLoading(true);

    // Load visitor
    const { data: visitorData } = await supabase
      .from('visitors')
      .select('*')
      .eq('id', visitorId)
      .single();

    if (visitorData) {
      setVisitor(visitorData);
    }

    // Load page views
    const { data: pageViewsData } = await supabase
      .from('page_views')
      .select('*')
      .eq('visitor_id', visitorId)
      .order('timestamp', { ascending: false });

    if (pageViewsData) {
      setPageViews(pageViewsData);
    }

    // Load events
    const { data: eventsData } = await supabase
      .from('events')
      .select('*')
      .eq('visitor_id', visitorId)
      .order('timestamp', { ascending: false });

    if (eventsData) {
      setEvents(eventsData);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!visitor) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-gray-600">Visitor not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex items-center gap-2">
              <Eye className="w-6 h-6 text-purple-600" />
              <span className="text-xl font-bold text-gray-900">Audience Lab</span>
            </Link>
            <div className="flex gap-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Visitor Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {visitor.name || 'Anonymous Visitor'}
              </h1>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                {visitor.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <a href={`mailto:${visitor.email}`} className="hover:text-purple-600">
                      {visitor.email}
                    </a>
                  </div>
                )}
                {visitor.company && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    {visitor.company}
                  </div>
                )}
                {(visitor.city || visitor.country) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {visitor.city && visitor.country ? `${visitor.city}, ${visitor.country}` : visitor.country}
                  </div>
                )}
              </div>
            </div>
            {visitor.linkedin_url && (
              <a
                href={visitor.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                LinkedIn
              </a>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-6">
          <StatCard
            icon={<Eye />}
            label="Page Views"
            value={visitor.page_views.toString()}
          />
          <StatCard
            icon={<Monitor />}
            label="Device"
            value={visitor.device_type || 'Unknown'}
          />
          <StatCard
            icon={<Calendar />}
            label="First Seen"
            value={format(new Date(visitor.first_seen), 'MMM d, yyyy')}
          />
          <StatCard
            icon={<Clock />}
            label="Last Seen"
            value={formatDistanceToNow(new Date(visitor.last_seen), { addSuffix: true })}
          />
        </div>

        {/* Activity Timeline */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Activity Timeline</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {/* Combine page views and events, sort by timestamp */}
              {[...pageViews.map(pv => ({ ...pv, type: 'pageview' })), ...events.map(e => ({ ...e, type: 'event' }))]
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((item, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-purple-600"></div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          {item.type === 'pageview' ? (
                            <>
                              <div className="font-medium text-gray-900">Viewed page</div>
                              <div className="text-sm text-gray-600">{item.url}</div>
                              {item.title && (
                                <div className="text-xs text-gray-500">{item.title}</div>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="font-medium text-gray-900">{item.event_name}</div>
                              {item.properties && Object.keys(item.properties).length > 0 && (
                                <div className="text-sm text-gray-600">
                                  {JSON.stringify(item.properties)}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="text-purple-600">{icon}</div>
        <div className="text-sm text-gray-600">{label}</div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}
