import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("STRIPE_SECRET_KEY not set — billing features disabled");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acacia" as any,
});

// Plan definitions — update these price IDs after creating them in Stripe Dashboard
export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    priceId: null,
    visitors: 100,
    pixels: 1,
    integrations: 1,
    teamMembers: 1,
    features: ["100 visitors/mo", "1 pixel", "1 integration", "Basic analytics"],
  },
  pro: {
    name: "Pro",
    price: 49,
    priceId: process.env.STRIPE_PRO_PRICE_ID || null,
    visitors: 5000,
    pixels: 5,
    integrations: 10,
    teamMembers: 5,
    features: ["5,000 visitors/mo", "5 pixels", "10 integrations", "Advanced analytics", "Segments & exports", "Email alerts"],
  },
  enterprise: {
    name: "Enterprise",
    price: 199,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || null,
    visitors: 50000,
    pixels: 25,
    integrations: -1, // unlimited
    teamMembers: -1,
    features: ["50,000 visitors/mo", "25 pixels", "Unlimited integrations", "Unlimited team members", "Priority support", "Custom webhooks", "API access"],
  },
} as const;

export type PlanKey = keyof typeof PLANS;
