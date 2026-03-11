"use client";

import { useEffect, useState } from "react";
import { Eye, Activity, User, MousePointer, FileText, Clock, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";

type ActivityItem = {
  id: string;
  activity_type: string;
  title: string;
  description?: string;
  metadata?: any;
  timestamp: string;
  visitor_id?: string;
};

export default function ActivityFeedPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    loadActivities();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('activity-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_feed' }, (payload: any) => {
        setActivities(prev => [payload.new as ActivityItem, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadActivities() {
    const { data } = await supabase
      .from('activity_feed')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);

    if (data) {
      setActivities(data);
    }
    setLoading(false);
  }

  function getActivityIcon(type: string) {
    switch (type) {
      case 'visitor_arrived':
        return <User className="w-5 h-5" />;
      case 'page_view':
        return <Eye className="w-5 h-5" />;
      case 'button_clicked':
      case 'link_clicked':
        return <MousePointer className="w-5 h-5" />;
      case 'form_submitted':
        return <FileText className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  }

  function getActivityColor(type: string) {
    switch (type) {
      case 'visitor_arrived':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'page_view':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'button_clicked':
      case 'link_clicked':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'form_submitted':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  }

  const filteredActivities = filter === "all" 
    ? activities 
    : activities.filter(a => a.activity_type === filter);

  const activityTypes = [
    { value: "all", label: "All Activity" },
    { value: "visitor_arrived", label: "New Visitors" },
    { value: "page_view", label: "Page Views" },
    { value: "button_clicked", label: "Clicks" },
    { value: "form_submitted", label: "Form Submissions" },
  ];

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Real-Time Activity</h1>
            <p className="text-gray-400">Live stream of visitor activity on your site</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-accent-primary focus:outline-none transition"
            >
              {activityTypes.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-400 font-medium">Live</span>
            </div>
          </div>
        </div>

        <div className="glass neon-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Loading activity...</div>
          ) : filteredActivities.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-tertiary flex items-center justify-center">
                <Zap className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No activity yet</h3>
              <p className="text-gray-400">Waiting for visitors to interact with your site...</p>
            </div>
          ) : (
            <div className="divide-y divide-dark-border">
              {filteredActivities.map((activity) => (
                <div key={activity.id} className="p-5 hover:bg-dark-tertiary/30 transition">
                  <div className="flex gap-4">
                    <div className={`flex-shrink-0 p-2.5 rounded-lg border ${getActivityColor(activity.activity_type)}`}>
                      {getActivityIcon(activity.activity_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-white">{activity.title}</p>
                          {activity.description && (
                            <p className="text-sm text-gray-400 mt-1">{activity.description}</p>
                          )}
                          {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {Object.entries(activity.metadata).slice(0, 4).map(([key, value]) => (
                                <span key={key} className="inline-flex items-center px-2 py-1 rounded text-xs bg-dark-tertiary text-gray-400">
                                  <span className="text-gray-500 mr-1">{key}:</span> {String(value).substring(0, 30)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 whitespace-nowrap">
                          <Clock className="w-4 h-4" />
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
