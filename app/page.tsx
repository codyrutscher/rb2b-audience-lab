"use client";

import Link from "next/link";
import { Eye, Sparkles, ArrowRight, Zap, Target, TrendingUp, Shield, Users, BarChart3, Bell, Globe, Code, CheckCircle2, Star } from "lucide-react";
import { useState, useEffect } from "react";

export default function Home() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [visitorCount, setVisitorCount] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    
    // Animated counter
    const interval = setInterval(() => {
      setVisitorCount(prev => (prev < 2847 ? prev + 47 : 2847));
    }, 50);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-dark-bg text-white overflow-hidden relative">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/10 via-transparent to-accent-secondary/10" />
        <div 
          className="absolute w-96 h-96 bg-accent-primary/20 rounded-full blur-3xl"
          style={{
            left: `${mousePosition.x - 192}px`,
            top: `${mousePosition.y - 192}px`,
            transition: 'all 0.3s ease-out',
          }}
        />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-accent-secondary/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-accent-primary/10 rounded-full blur-3xl animate-pulse-slow" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 border-b border-dark-border glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <Eye className="w-8 h-8 text-accent-primary group-hover:scale-110 transition-transform" />
                <Sparkles className="w-4 h-4 text-accent-secondary absolute -top-1 -right-1 animate-pulse-slow" />
              </div>
              <span className="text-2xl font-bold gradient-text">Audience Lab</span>
            </Link>
            <div className="flex gap-4">
              <Link 
                href="/login" 
                className="px-6 py-2.5 glass-hover rounded-lg transition-all font-medium text-gray-300 hover:text-white border border-dark-border"
              >
                Login
              </Link>
              <Link 
                href="/signup" 
                className="px-6 py-2.5 bg-gradient-purple text-white hover:shadow-lg hover:shadow-accent-primary/30 rounded-lg transition-all font-medium flex items-center gap-2 group"
              >
                Get Started
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 glass neon-border rounded-full mb-8 animate-pulse-slow">
              <Zap className="w-4 h-4 text-accent-primary" />
              <span className="text-sm font-medium text-gray-300">
                <span className="text-accent-primary font-bold">{visitorCount.toLocaleString()}</span> visitors identified today
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-6xl md:text-8xl font-black mb-8 leading-tight">
              <span className="text-white">Turn Anonymous</span>
              <br />
              <span className="gradient-text">Visitors Into Leads</span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed">
              Identify who&apos;s browsing your site, get their contact info, and close deals faster. 
              <span className="text-white font-semibold"> No forms required.</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link 
                href="/signup" 
                className="px-8 py-4 bg-gradient-purple text-white hover:shadow-2xl hover:shadow-accent-primary/40 rounded-xl transition-all font-bold text-lg flex items-center gap-3 group"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </Link>
              <Link 
                href="/dashboard/install" 
                className="px-8 py-4 glass-hover neon-border text-white rounded-xl transition-all font-bold text-lg flex items-center gap-3"
              >
                <Code className="w-5 h-5" />
                View Demo
              </Link>
            </div>

            {/* Social Proof */}
            <div className="flex items-center justify-center gap-8 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span>5-minute setup</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>

          {/* Hero Image/Dashboard Preview */}
          <div className="relative max-w-6xl mx-auto">
            <div className="glass neon-border rounded-2xl p-2 glow">
              <div className="bg-dark-tertiary rounded-xl overflow-hidden">
                {/* Fake browser chrome */}
                <div className="h-12 bg-dark-secondary border-b border-dark-border flex items-center px-4 gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  <div className="flex-1 mx-4 h-6 bg-dark-tertiary rounded-md flex items-center px-3">
                    <span className="text-xs text-gray-500">app.audiencelab.io/dashboard</span>
                  </div>
                </div>
                {/* Fake table header */}
                <div className="px-6 pt-5 pb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Recent Visitors</span>
                  <span className="text-xs text-green-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
                    Live
                  </span>
                </div>
                <div className="px-6 pb-6 space-y-3">
                  {[
                    {
                      initials: "SC",
                      color: "from-violet-500 to-purple-600",
                      name: "Sarah Chen",
                      email: "s.chen@stripe.com",
                      company: "Stripe",
                      location: "San Francisco, CA",
                      pages: 8,
                      time: "2m ago",
                      badge: { label: "🔥 Hot Lead", cls: "bg-red-500/20 text-red-400 border-red-500/30" },
                    },
                    {
                      initials: "MR",
                      color: "from-blue-500 to-cyan-500",
                      name: "Marcus Reid",
                      email: "m.reid@hubspot.com",
                      company: "HubSpot",
                      location: "Boston, MA",
                      pages: 5,
                      time: "7m ago",
                      badge: { label: "⚡ Warm", cls: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
                    },
                    {
                      initials: "AL",
                      color: "from-emerald-500 to-teal-500",
                      name: "Aisha Lawson",
                      email: "a.lawson@notion.so",
                      company: "Notion",
                      location: "New York, NY",
                      pages: 12,
                      time: "14m ago",
                      badge: { label: "🔥 Hot Lead", cls: "bg-red-500/20 text-red-400 border-red-500/30" },
                    },
                  ].map((visitor) => (
                    <div key={visitor.name} className="flex items-center gap-4 glass rounded-lg p-4 hover:border-accent-primary/30 transition-all cursor-pointer group">
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${visitor.color} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                        {visitor.initials}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{visitor.name}</span>
                          <span className="text-xs text-gray-500">·</span>
                          <span className="text-xs text-gray-400">{visitor.company}</span>
                        </div>
                        <div className="text-xs text-gray-500 truncate">{visitor.email}</div>
                      </div>
                      {/* Meta */}
                      <div className="hidden sm:flex flex-col items-end gap-1 text-xs text-gray-500 flex-shrink-0">
                        <span>{visitor.location}</span>
                        <span>{visitor.pages} pages · {visitor.time}</span>
                      </div>
                      {/* Badge */}
                      <div className={`px-2.5 py-1 rounded-full text-xs font-bold border flex-shrink-0 ${visitor.badge.cls}`}>
                        {visitor.badge.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: <Users />, value: "95%", label: "Identification Rate" },
              { icon: <Zap />, value: "<100ms", label: "Tracking Speed" },
              { icon: <Target />, value: "50+", label: "Data Points" },
              { icon: <TrendingUp />, value: "3x", label: "More Leads" },
            ].map((stat, i) => (
              <div key={i} className="glass neon-border rounded-xl p-6 text-center hover:shadow-lg hover:shadow-accent-primary/20 transition-all group">
                <div className="inline-flex p-4 bg-gradient-purple rounded-xl mb-4 group-hover:scale-110 transition-transform">
                  {stat.icon}
                </div>
                <div className="text-4xl font-black gradient-text mb-2">{stat.value}</div>
                <div className="text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-black text-white mb-4">
              Everything You Need to
              <span className="gradient-text"> Convert Visitors</span>
            </h2>
            <p className="text-xl text-gray-400">
              Powerful features that turn anonymous traffic into qualified leads
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Eye />,
                title: "Real-Time Identification",
                description: "Instantly identify companies and contacts visiting your site"
              },
              {
                icon: <BarChart3 />,
                title: "Advanced Analytics",
                description: "Track behavior, engagement, and conversion patterns"
              },
              {
                icon: <Bell />,
                title: "Smart Alerts",
                description: "Get notified when high-value prospects visit"
              },
              {
                icon: <Globe />,
                title: "IP Intelligence",
                description: "Enrich visitor data with company and location info"
              },
              {
                icon: <Target />,
                title: "Lead Scoring",
                description: "Automatically prioritize your hottest leads"
              },
              {
                icon: <Shield />,
                title: "Privacy First",
                description: "GDPR compliant with enterprise-grade security"
              },
            ].map((feature, i) => (
              <div key={i} className="glass neon-border rounded-xl p-6 hover:shadow-lg hover:shadow-accent-primary/20 transition-all group">
                <div className="inline-flex p-3 bg-gradient-purple rounded-lg mb-4 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="glass neon-border rounded-2xl p-12 text-center">
            <div className="flex justify-center gap-1 mb-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-8 h-8 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <blockquote className="text-2xl md:text-3xl font-medium text-white mb-6">
              &quot;Audience Lab helped us identify 10x more leads than our old solution. 
              The real-time alerts are a game changer.&quot;
            </blockquote>
            <div className="text-gray-400">
              <div className="font-semibold text-white">Sarah Chen</div>
              <div>Head of Growth, TechCorp</div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-black text-white mb-6">
            Ready to <span className="gradient-text">10x Your Leads?</span>
          </h2>
          <p className="text-xl text-gray-400 mb-12">
            Join hundreds of companies using Audience Lab to convert anonymous visitors into customers
          </p>
          <Link 
            href="/signup" 
            className="inline-flex items-center gap-3 px-12 py-5 bg-gradient-purple text-white hover:shadow-2xl hover:shadow-accent-primary/50 rounded-xl transition-all font-bold text-xl group"
          >
            Start Your Free Trial
            <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-dark-border glass py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Eye className="w-6 h-6 text-accent-primary" />
              <span className="text-lg font-bold gradient-text">Audience Lab</span>
            </div>
            <div className="text-gray-400 text-sm">
              © 2026 Audience Lab. All rights reserved.
            </div>
            <div className="flex gap-6 text-sm text-gray-400">
              <Link href="/docs" className="hover:text-white transition">Docs</Link>
              <Link href="/login" className="hover:text-white transition">Login</Link>
              <Link href="/signup" className="hover:text-white transition">Sign Up</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
