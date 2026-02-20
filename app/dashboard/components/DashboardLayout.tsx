"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Eye, 
  LayoutDashboard, 
  Activity, 
  BarChart3, 
  Filter, 
  Bell, 
  Users, 
  Key, 
  Settings, 
  Code,
  LogOut,
  Sparkles
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
  { href: "/dashboard/activity", label: "Activity", icon: <Activity className="w-5 h-5" /> },
  { href: "/dashboard/analytics", label: "Analytics", icon: <BarChart3 className="w-5 h-5" /> },
  { href: "/dashboard/segments", label: "Segments", icon: <Filter className="w-5 h-5" /> },
  { href: "/dashboard/alerts", label: "Alerts", icon: <Bell className="w-5 h-5" /> },
  { href: "/dashboard/team", label: "Team", icon: <Users className="w-5 h-5" /> },
  { href: "/dashboard/api-keys", label: "API Keys", icon: <Key className="w-5 h-5" /> },
  { href: "/dashboard/settings", label: "Settings", icon: <Settings className="w-5 h-5" /> },
  { href: "/dashboard/install", label: "Install", icon: <Code className="w-5 h-5" /> },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-dark-bg flex">
      {/* Sidebar */}
      <aside className="w-64 bg-dark-secondary border-r border-dark-border flex flex-col relative overflow-hidden">
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-accent-primary/5 via-transparent to-transparent pointer-events-none" />
        
        {/* Logo */}
        <div className="h-16 flex items-center gap-2 px-6 border-b border-dark-border relative z-10">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative">
              <Eye className="w-6 h-6 text-accent-primary" />
              <Sparkles className="w-3 h-3 text-accent-secondary absolute -top-1 -right-1 animate-pulse-slow" />
            </div>
            <span className="text-xl font-bold gradient-text">Audience Lab</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto relative z-10">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
                           (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
                  isActive
                    ? 'bg-gradient-purple text-white shadow-lg shadow-accent-primary/20'
                    : 'text-gray-400 hover:text-white hover:bg-dark-tertiary'
                }`}
              >
                <span className={isActive ? '' : 'group-hover:scale-110 transition-transform'}>
                  {item.icon}
                </span>
                <span className="font-medium">{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-dark-border relative z-10">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:text-white hover:bg-dark-tertiary rounded-lg transition-all disabled:opacity-50 group"
          >
            <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="font-medium">{loggingOut ? 'Logging out...' : 'Logout'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-dark-bg">
        {children}
      </main>
    </div>
  );
}
