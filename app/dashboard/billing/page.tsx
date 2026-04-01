"use client";

import { useState, useEffect } from "react";
import { Check, CreditCard, ExternalLink, Zap, Crown, Rocket } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase-auth";
import { useSearchParams } from "next/navigation";

const PLANS = [
  {
    key: "free",
    name: "Free",
    price: 0,
    icon: <Zap className="w-6 h-6" />,
    color: "text-gray-400",
    features: ["100 visitors/mo", "1 pixel", "1 integration", "Basic analytics"],
  },
  {
    key: "pro",
    name: "Pro",
    price: 49,
    icon: <Crown className="w-6 h-6" />,
    color: "text-accent-primary",
    popular: true,
    features: [
      "5,000 visitors/mo",
      "5 pixels",
      "10 integrations",
      "Advanced analytics",
      "Segments & exports",
      "Email alerts",
    ],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: 199,
    icon: <Rocket className="w-6 h-6" />,
    color: "text-yellow-400",
    features: [
      "50,000 visitors/mo",
      "25 pixels",
      "Unlimited integrations",
      "Unlimited team members",
      "Priority support",
      "Custom webhooks",
      "API access",
    ],
  },
];

type BillingStatus = {
  plan: string;
  status: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  hasStripeCustomer?: boolean;
};

export default function BillingPage() {
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  useEffect(() => {
    loadBilling();
  }, []);

  async function loadBilling() {
    const user = await getCurrentUser();
    if (!user) return;
    setUserId(user.id);

    try {
      const res = await fetch("/api/billing/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      if (res.ok) {
        setBilling(await res.json());
      }
    } catch {
      setBilling({ plan: "free", status: "active" });
    }
    setLoading(false);
  }

  async function handleUpgrade(planKey: string) {
    if (!userId) return;
    setUpgrading(planKey);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey, userId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to create checkout session");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    }
    setUpgrading(null);
  }

  async function handleManageBilling() {
    if (!userId) return;
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to open billing portal");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    }
    setPortalLoading(false);
  }

  if (loading) {
    return <div className="p-8 text-gray-400">Loading billing...</div>;
  }

  const currentPlan = billing?.plan || "free";

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Billing & Plans</h1>
          <p className="text-gray-400">Manage your subscription and payment method</p>
        </div>

        {/* Success / Cancel banners */}
        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400">
            Payment successful — your plan has been upgraded. It may take a moment to reflect.
          </div>
        )}
        {canceled && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400">
            Checkout was canceled. No charges were made.
          </div>
        )}

        {/* Current Plan Info */}
        <div className="glass neon-border rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-sm text-gray-400 mb-1">Current Plan</div>
              <div className="text-2xl font-bold text-white capitalize">{currentPlan}</div>
              {billing?.status === "past_due" && (
                <span className="text-sm text-red-400">Payment past due — please update your payment method</span>
              )}
              {billing?.cancelAtPeriodEnd && billing?.currentPeriodEnd && (
                <span className="text-sm text-yellow-400">
                  Cancels on {new Date(billing.currentPeriodEnd).toLocaleDateString()}
                </span>
              )}
              {billing?.currentPeriodEnd && !billing?.cancelAtPeriodEnd && currentPlan !== "free" && (
                <div className="text-sm text-gray-500 mt-1">
                  Renews {new Date(billing.currentPeriodEnd).toLocaleDateString()}
                </div>
              )}
            </div>
            {billing?.hasStripeCustomer && (
              <button
                onClick={handleManageBilling}
                disabled={portalLoading}
                className="flex items-center gap-2 px-4 py-2 bg-dark-tertiary border border-dark-border hover:border-accent-primary text-white rounded-lg transition text-sm disabled:opacity-50"
              >
                <CreditCard className="w-4 h-4" />
                {portalLoading ? "Opening..." : "Manage Billing"}
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.key;
            const isDowngrade = PLANS.findIndex(p => p.key === currentPlan) > PLANS.findIndex(p => p.key === plan.key);

            return (
              <div
                key={plan.key}
                className={`glass rounded-xl p-6 border transition-all ${
                  plan.popular
                    ? "border-accent-primary/50 shadow-lg shadow-accent-primary/10"
                    : "border-dark-border"
                } ${isCurrent ? "ring-2 ring-accent-primary/50" : ""}`}
              >
                {plan.popular && (
                  <div className="text-xs font-bold text-accent-primary mb-3 uppercase tracking-wider">Most Popular</div>
                )}
                <div className={`mb-3 ${plan.color}`}>{plan.icon}</div>
                <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-3xl font-black text-white">${plan.price}</span>
                  <span className="text-gray-500 text-sm">/month</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="w-full py-2.5 text-center text-sm font-medium text-accent-primary border border-accent-primary/30 rounded-lg">
                    Current Plan
                  </div>
                ) : plan.key === "free" ? (
                  isDowngrade ? (
                    <button
                      onClick={handleManageBilling}
                      disabled={portalLoading}
                      className="w-full py-2.5 text-sm font-medium text-gray-400 bg-dark-tertiary border border-dark-border rounded-lg hover:text-white transition disabled:opacity-50"
                    >
                      Downgrade
                    </button>
                  ) : null
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.key)}
                    disabled={!!upgrading}
                    className={`w-full py-2.5 text-sm font-medium text-white rounded-lg transition disabled:opacity-50 ${
                      plan.popular
                        ? "bg-gradient-purple hover:shadow-lg hover:shadow-accent-primary/30"
                        : "bg-accent-primary/80 hover:bg-accent-primary"
                    }`}
                  >
                    {upgrading === plan.key ? "Redirecting..." : isDowngrade ? "Downgrade" : "Upgrade"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
