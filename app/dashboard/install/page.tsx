"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Code, Eye } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase-auth";

export default function InstallPage() {
  const [copied, setCopied] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rb2b-audience-lab-l5h8.vercel.app";

  useEffect(() => {
    loadWorkspace();
  }, []);

  async function loadWorkspace() {
    const user = await getCurrentUser();
    if (user) {
      // For now, use user ID as workspace ID
      // Later we'll fetch the actual workspace
      setWorkspaceId(user.id);
    }
  }

  const trackingScript = `<!-- Audience Lab Tracking -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${appUrl}/track.js';
    script.async = true;
    script.setAttribute('data-workspace-id', '${workspaceId}');
    document.head.appendChild(script);
  })();
</script>`;

  const identifyExample = `<!-- Example: Identify a visitor after form submission -->
<script>
  // Call this when you have user information
  window.audienceLabIdentify({
    email: 'user@company.com',
    name: 'John Doe',
    company: 'Acme Corp',
    linkedinUrl: 'https://linkedin.com/in/johndoe'
  });
</script>`;

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
              <Link href="/dashboard/install" className="text-purple-600 font-medium">
                Install
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Install Tracking Script</h1>
          <p className="text-gray-600">
            Add this script to your website to start tracking visitors
          </p>
        </div>

        {/* Step 1: Add Tracking Script */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="p-6 border-b">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">
                1
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Add Tracking Script</h2>
            </div>
            <p className="text-gray-600 ml-11">
              Copy and paste this code into the <code className="bg-gray-100 px-2 py-1 rounded">&lt;head&gt;</code> section of your website
            </p>
          </div>
          <div className="p-6">
            <div className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                {trackingScript}
              </pre>
              <button
                onClick={() => copyToClipboard(trackingScript)}
                className="absolute top-4 right-4 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Step 2: Identify Visitors */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="p-6 border-b">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">
                2
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Identify Visitors (Optional)</h2>
            </div>
            <p className="text-gray-600 ml-11">
              When you capture user information (form submission, login, etc.), call this function
            </p>
          </div>
          <div className="p-6">
            <div className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                {identifyExample}
              </pre>
              <button
                onClick={() => copyToClipboard(identifyExample)}
                className="absolute top-4 right-4 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
              >
                <Copy className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Step 3: Verify Installation */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">
                3
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Verify Installation</h2>
            </div>
            <p className="text-gray-600 ml-11">
              Visit your website and check the dashboard to see if visitors are being tracked
            </p>
          </div>
          <div className="p-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition"
            >
              <Code className="w-5 h-5" />
              View Dashboard
            </Link>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Pro Tips</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• The script is lightweight and loads asynchronously</li>
            <li>• It automatically tracks page views and session data</li>
            <li>• Use the identify function to link anonymous visitors to known contacts</li>
            <li>• Check your browser console for any tracking errors</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
