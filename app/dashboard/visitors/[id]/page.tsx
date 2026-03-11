"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Eye, ArrowLeft, MapPin, Monitor, Clock, ExternalLink, Mail, Building2, 
  Calendar, Globe, Smartphone, MousePointer, FileText, User, Activity
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow, format } from "date-fns";

type Visitor = any;
type PageView = any;
type Event = any;

export default function VisitorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [pageViews, setPageViews] = useState<PageView[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"timeline" | "pages" | "events">("timeline");

  useEffect(() => {
    if (params.id) {
      loadVisitorData(params.id as string);
    }
  }, [params.id]);

  async function loadVisitorData(visitorId: string) {
    setLoading(true);

    const { data: visitorData } = await supabase
      .from('visitors')
      .select('*')
      .eq('id', visitorId)
      .single();

    if (visitorData) {
      setVisitor(visitorData);
    }

    const { data: pageViewsData } = await supabase
      .from('page_views')
      .select('*')
      .eq('visitor_id', visitorId)
      .order('timestamp', { ascending: false });

    if (pageViewsData) {
      setPageViews(pageViewsData);
    }

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

  function getLeadScore(visitor: Visitor): number {
    let score = 0;
    if (visitor.identified) score += 20;
    if (visitor.company) score += 15;
    score += Math.min((visitor.page_views || 0) * 2, 30);
    if (visitor.is_returning) score += 10;
    if (visitor.linkedin_url) score += 10;
    if (visitor.utm_campaign) score += 15;
    return score;
  }

  function getLeadScoreBadge(score: number) {
    if (score >= 70) {
      return <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30">🔥 Hot Lead</span>;
    } else if (score >= 40) {
      return <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">⚡ Warm Lead</span>;
    } else if (score >= 20) {
      return <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">💡 Interested</span>;
    }
    return <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">❄️ Cold</span>;
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-gray-400">Loading visitor details...</div>
      </div>
    );
  }

  if (!visitor) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto text-center py-12">
          <User className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Visitor not found</h2>
          <p className="text-gray-400 mb-6">This visitor may have been deleted or doesn&apos;t exist.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:opacity-90 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const allActivity = [
    ...pageViews.map(pv => ({ ...pv, type: 'pageview' as const })), 
    ...events.map(e => ({ ...e, type: 'event' as const }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-accent-primary hover:text-accent-primary/80 mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Visitor Header Card */}
        <div className="glass neon-border rounded-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-purple flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-accent-primary/20">
                {visitor.name ? visitor.name.charAt(0).toUpperCase() : '?'}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-white">
                    {visitor.name || 'Anonymous Visitor'}
                  </h1>
                  {getLeadScoreBadge(getLeadScore(visitor))}
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                  {visitor.email && (
                    <a href={`mailto:${visitor.email}`} className="flex items-center gap-1.5 hover:text-accent-primary transition">
                      <Mail className="w-4 h-4" />
                      {visitor.email}
                    </a>
                  )}
                  {visitor.company && (
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4" />
                      {visitor.company}
                    </span>
                  )}
                  {(visitor.city || visitor.country) && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      {visitor.city && visitor.country ? `${visitor.city}, ${visitor.country}` : visitor.country}
                    </span>
                  )}
                </div>
                {visitor.is_returning && (
                  <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    Returning Visitor
                  </span>
                )}
              </div>
            </div>
            {visitor.linkedin_url && (
              <a
                href={visitor.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition"
              >
                <ExternalLink className="w-4 h-4" />
                View LinkedIn
              </a>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard icon={<Eye />} label="Page Views" value={visitor.page_views?.toString() || '0'} color="purple" />
          <StatCard 
            icon={visitor.device_type === 'mobile' ? <Smartphone /> : <Monitor />} 
            label="Device" 
            value={visitor.device_type || 'Unknown'} 
            color="blue" 
          />
          <StatCard 
            icon={<Calendar />} 
            label="First Seen" 
            value={format(new Date(visitor.first_seen), 'MMM d, yyyy')} 
            color="green" 
          />
          <StatCard 
            icon={<Clock />} 
            label="Last Active" 
            value={formatDistanceToNow(new Date(visitor.last_seen), { addSuffix: true })} 
            color="orange" 
          />
        </div>

        {/* Additional Info */}
        {(visitor.utm_source || visitor.utm_campaign || visitor.referrer) && (
          <div className="glass neon-border rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-accent-primary" />
              Traffic Source
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {visitor.utm_source && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Source</div>
                  <div className="text-white">{visitor.utm_source}</div>
                </div>
              )}
              {visitor.utm_medium && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Medium</div>
                  <div className="text-white">{visitor.utm_medium}</div>
                </div>
              )}
              {visitor.utm_campaign && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Campaign</div>
                  <div className="text-white">{visitor.utm_campaign}</div>
                </div>
              )}
              {visitor.referrer && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Referrer</div>
                  <div className="text-white truncate" title={visitor.referrer}>{visitor.referrer}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Activity Tabs */}
        <div className="glass neon-border rounded-xl overflow-hidden">
          <div className="flex border-b border-dark-border">
            <button
              onClick={() => setActiveTab("timeline")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition ${
                activeTab === "timeline" 
                  ? "text-accent-primary border-b-2 border-accent-primary bg-dark-tertiary/30" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Activity className="w-4 h-4 inline mr-2" />
              Timeline ({allActivity.length})
            </button>
            <button
              onClick={() => setActiveTab("pages")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition ${
                activeTab === "pages" 
                  ? "text-accent-primary border-b-2 border-accent-primary bg-dark-tertiary/30" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Eye className="w-4 h-4 inline mr-2" />
              Pages ({pageViews.length})
            </button>
            <button
              onClick={() => setActiveTab("events")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition ${
                activeTab === "events" 
                  ? "text-accent-primary border-b-2 border-accent-primary bg-dark-tertiary/30" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <MousePointer className="w-4 h-4 inline mr-2" />
              Events ({events.length})
            </button>
          </div>

          <div className="p-6">
            {activeTab === "timeline" && (
              <div className="space-y-4">
                {allActivity.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No activity recorded yet</div>
                ) : (
                  allActivity.map((item, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          item.type === 'pageview' 
                            ? 'bg-blue-500/20 text-blue-400' 
                            : 'bg-purple-500/20 text-purple-400'
                        }`}>
                          {item.type === 'pageview' ? <Eye className="w-5 h-5" /> : <MousePointer className="w-5 h-5" />}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            {item.type === 'pageview' ? (
                              <>
                                <div className="font-medium text-white">Viewed page</div>
                                <div className="text-sm text-gray-400 truncate">{item.url}</div>
                                {item.title && (
                                  <div className="text-xs text-gray-500 mt-1">{item.title}</div>
                                )}
                              </>
                            ) : (
                              <>
                                <div className="font-medium text-white">{item.event_name}</div>
                                {item.properties && Object.keys(item.properties).length > 0 && (
                                  <div className="text-sm text-gray-400 mt-1">
                                    {Object.entries(item.properties).slice(0, 3).map(([k, v]) => (
                                      <span key={k} className="mr-3">{k}: {String(v)}</span>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 whitespace-nowrap">
                            {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "pages" && (
              <div className="space-y-3">
                {pageViews.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No page views recorded</div>
                ) : (
                  pageViews.map((pv, index) => (
                    <div key={index} className="p-4 bg-dark-tertiary/30 rounded-lg">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="font-medium text-white truncate">{pv.title || pv.url}</div>
                          <div className="text-sm text-gray-400 truncate">{pv.url}</div>
                          {pv.time_on_page && (
                            <div className="text-xs text-gray-500 mt-1">
                              Time on page: {Math.floor(pv.time_on_page / 60)}m {pv.time_on_page % 60}s
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 whitespace-nowrap">
                          {formatDistanceToNow(new Date(pv.timestamp), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "events" && (
              <div className="space-y-3">
                {events.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No events recorded</div>
                ) : (
                  events.map((event, index) => (
                    <div key={index} className="p-4 bg-dark-tertiary/30 rounded-lg">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-medium text-white">{event.event_name}</div>
                          {event.properties && Object.keys(event.properties).length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {Object.entries(event.properties).map(([k, v]) => (
                                <span key={k} className="px-2 py-1 bg-dark-bg rounded text-xs text-gray-400">
                                  {k}: {String(v)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 whitespace-nowrap">
                          {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorClasses = {
    purple: 'bg-gradient-purple shadow-accent-primary/20',
    green: 'bg-green-500 shadow-green-500/20',
    blue: 'bg-blue-500 shadow-blue-500/20',
    orange: 'bg-orange-500 shadow-orange-500/20',
  };

  return (
    <div className="glass neon-border rounded-xl p-4 hover:shadow-lg hover:shadow-accent-primary/10 transition-all group">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg text-white shadow-lg ${colorClasses[color as keyof typeof colorClasses]} group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-lg font-bold text-white truncate">{value}</div>
          <div className="text-xs text-gray-400">{label}</div>
        </div>
      </div>
    </div>
  );
}
