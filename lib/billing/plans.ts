import {
  TOKEN_PLAN_IDS,
  getDefaultPlatformConfigFromEnv,
  getPlatformConfig,
  type TokenPlanId,
  type TokenRechargePlanConfig,
} from "@/lib/system-config";

export type PlanType = TokenPlanId;

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

function toPlanMap(plans: TokenRechargePlanConfig[]): Record<PlanType, BillingPlan> {
  const map = {} as Record<PlanType, BillingPlan>;
  for (const id of TOKEN_PLAN_IDS) {
    const item = plans.find((plan) => plan.id === id);
    if (!item) continue;
    map[id] = toBillingPlan(item);
  }
  return map;
}

const defaultPlanMap = toPlanMap(
  getDefaultPlatformConfigFromEnv().tokenRechargePlans
);

export const plans = defaultPlanMap;

export function normalizePlanType(raw: string | null | undefined): PlanType | null {
  const normalized = String(raw || "").toUpperCase();
  if (!TOKEN_PLAN_IDS.includes(normalized as PlanType)) return null;
  return normalized as PlanType;
}

async function getRuntimePlanMap(): Promise<Record<PlanType, BillingPlan>> {
  const config = await getPlatformConfig();
  const runtimeMap = toPlanMap(config.tokenRechargePlans);

  for (const id of TOKEN_PLAN_IDS) {
    if (!runtimeMap[id]) {
      runtimeMap[id] = defaultPlanMap[id];
    }
  }
  return runtimeMap;
}

export async function listBillingPlans(options?: {
  publishedOnly?: boolean;
}): Promise<BillingPlan[]> {
  const publishedOnly = options?.publishedOnly ?? false;
  const map = await getRuntimePlanMap();
  return TOKEN_PLAN_IDS.map((id) => map[id]).filter((item) =>
    publishedOnly ? item.published : true
  );
}

export async function getBillingPlanByType(
  planType: PlanType,
  options?: { includeUnpublished?: boolean }
): Promise<BillingPlan | null> {
  const includeUnpublished = options?.includeUnpublished ?? false;
  const map = await getRuntimePlanMap();
  const plan = map[planType];
  if (!plan) return null;
  if (!includeUnpublished && !plan.published) return null;
  return plan;
}
