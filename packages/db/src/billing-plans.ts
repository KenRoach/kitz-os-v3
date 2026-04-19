/**
 * Pure plan catalog + battery topup pack constants.
 * Importable by client code without pulling node:crypto.
 *
 * Pricing is in USD cents. `monthlyCredits` lands in the tenant battery on
 * each successful renewal. Topup packs are one-time and stack on top of plan
 * credits.
 */

export const BILLING_PLANS = ['free', 'starter', 'pro'] as const;
export type BillingPlan = (typeof BILLING_PLANS)[number];

export type PlanSpec = {
  id: BillingPlan;
  name: string;
  priceCents: number;
  monthlyCredits: number;
  seats: number;
  whatsappSessions: number;
  features: string[];
};

export const BILLING_PLAN_SPECS: Record<BillingPlan, PlanSpec> = {
  free: {
    id: 'free',
    name: 'Free',
    priceCents: 0,
    monthlyCredits: 100,
    seats: 1,
    whatsappSessions: 1,
    features: ['1 agente', 'CRM básico', 'Cotizaciones', 'Calendario'],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    priceCents: 1900,
    monthlyCredits: 1500,
    seats: 3,
    whatsappSessions: 1,
    features: ['Hasta 5 agentes', 'WhatsApp 1 número', 'Reportes', 'Soporte por chat'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceCents: 4900,
    monthlyCredits: 5000,
    seats: 10,
    whatsappSessions: 3,
    features: [
      'Agentes ilimitados',
      'WhatsApp 3 números',
      'Skills personalizados',
      'OCR documentos',
      'Soporte prioritario',
    ],
  },
};

export type TopupPack = {
  id: string;
  name: string;
  credits: number;
  priceCents: number;
};

export const BILLING_TOPUP_PACKS: TopupPack[] = [
  { id: 'pack_500', name: '500 créditos', credits: 500, priceCents: 500 },
  { id: 'pack_2k', name: '2,000 créditos', credits: 2000, priceCents: 1800 },
  { id: 'pack_10k', name: '10,000 créditos', credits: 10_000, priceCents: 7900 },
];

export function findTopupPack(id: string): TopupPack | null {
  return BILLING_TOPUP_PACKS.find((p) => p.id === id) ?? null;
}
