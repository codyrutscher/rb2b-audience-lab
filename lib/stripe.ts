import Stripe from "stripe";

// Lazy singleton — only instantiated when actually used, so missing key doesn't crash at build time
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia" as any,
    });
  }
  return _stripe;
}

// Named export for convenience — routes that already guard for the key can use this
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as any)[prop];
  },
});

export const STRIPE_ENABLED = !!process.env.STRIPE_SECRET_KEY;

// Plan definitions — update price IDs after creating them in Stripe Dashboard
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
    integrations: -1,
    teamMembers: -1,
    features: ["50,000 visitors/mo", "25 pixels", "Unlimited integrations", "Unlimited team members", "Priority support", "Custom webhooks", "API access"],
  },
} as const;

export type PlanKey = keyof typeof PLANS;
