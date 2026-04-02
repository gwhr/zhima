import {
  getDefaultPlatformConfigFromEnv,
  getPlatformConfig,
  normalizeTokenPlanId,
  type TokenRechargePlanConfig,
} from "@/lib/system-config";

export type PlanType = string;

export interface BillingPlan extends TokenRechargePlanConfig {
  price: number;
}

function toBillingPlan(plan: TokenRechargePlanConfig): BillingPlan {
  return {
    ...plan,
    price: Math.round(Number(plan.priceYuan) * 100),
    priceYuan: Number(Number(plan.priceYuan).toFixed(2)),
    points: Math.floor(Number(plan.points)),
  };
}

function toPlanList(plans: TokenRechargePlanConfig[]): BillingPlan[] {
  const usedIds = new Set<string>();
  const normalized: BillingPlan[] = [];

  for (const item of plans) {
    const id = normalizeTokenPlanId(item.id);
    if (!id || usedIds.has(id)) continue;
    const next = toBillingPlan({ ...item, id });
    if (next.price <= 0 || next.points <= 0 || !next.name.trim()) continue;
    normalized.push(next);
    usedIds.add(id);
  }
  return normalized;
}

const defaultPlans = toPlanList(getDefaultPlatformConfigFromEnv().tokenRechargePlans);

export const plans = defaultPlans;

export function normalizePlanType(raw: string | null | undefined): PlanType | null {
  const normalized = normalizeTokenPlanId(raw);
  return normalized || null;
}

function buildPlanMap(planList: BillingPlan[]): Map<string, BillingPlan> {
  return new Map(planList.map((item) => [item.id, item]));
}

async function getRuntimePlans(): Promise<BillingPlan[]> {
  const config = await getPlatformConfig();
  const runtimePlans = toPlanList(config.tokenRechargePlans);
  if (runtimePlans.length > 0) return runtimePlans;
  return defaultPlans;
}

export async function listBillingPlans(options?: {
  publishedOnly?: boolean;
}): Promise<BillingPlan[]> {
  const publishedOnly = options?.publishedOnly ?? false;
  const planList = await getRuntimePlans();
  return planList.filter((item) => (publishedOnly ? item.published : true));
}

export async function getBillingPlanByType(
  planType: PlanType,
  options?: { includeUnpublished?: boolean }
): Promise<BillingPlan | null> {
  const normalizedId = normalizePlanType(planType);
  if (!normalizedId) return null;
  const includeUnpublished = options?.includeUnpublished ?? false;
  const planList = await getRuntimePlans();
  const map = buildPlanMap(planList);
  const plan = map.get(normalizedId);
  if (!plan) return null;
  if (!includeUnpublished && !plan.published) return null;
  return plan;
}

export function getLegacyOrderPlanType(planId: string): "BASIC" | "STANDARD" | "PREMIUM" {
  const normalized = normalizePlanType(planId);
  if (normalized === "standard") return "STANDARD";
  if (normalized === "premium") return "PREMIUM";
  return "BASIC";
}
