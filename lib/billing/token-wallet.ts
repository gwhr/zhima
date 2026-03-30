import { db } from "@/lib/db";
import { getPlatformConfig } from "@/lib/system-config";
import { getModelPricing } from "@/lib/model-catalog-config";
import type { AiTaskType, Prisma } from "@prisma/client";

const BILLING_TIMEZONE = process.env.BILLING_TIMEZONE || "Asia/Shanghai";
const FALLBACK_MULTIPLIER = 3;
const FALLBACK_POINTS_PER_YUAN = 1000;
const FALLBACK_DAILY_SPEND_LIMIT = 500_000;

type Tx = Prisma.TransactionClient;

type WalletSnapshot = {
  id: string;
  userId: string;
  totalPoints: number;
  availablePoints: number;
  frozenPoints: number;
  usedPoints: number;
  dailyUsedPoints: number;
  dailyUsageDate: string | null;
};

export interface TokenUsageInput {
  inputTokens: number;
  outputTokens: number;
  cacheHitTokens?: number;
}

export interface FreezeReservationInput {
  userId: string;
  workspaceId?: string | null;
  taskJobId?: string | null;
  source: string;
  reservePoints: number;
  description?: string;
  metadata?: Prisma.InputJsonValue;
}

export interface SettleReservationInput {
  reservationId: string;
  userId: string;
  workspaceId?: string | null;
  taskType: AiTaskType;
  modelId: string;
  usage: TokenUsageInput;
  durationMs: number;
  description?: string;
}

export interface ReleaseReservationInput {
  reservationId?: string;
  taskJobId?: string;
  reason?: string;
  ledgerType?: "REFUND" | "ROLLBACK";
}

export interface RechargeWalletInput {
  userId: string;
  points: number;
  amountYuan: number;
  description?: string;
  metadata?: Prisma.InputJsonValue;
}

export interface AdjustWalletInput {
  userId: string;
  targetTotalPoints: number;
  description?: string;
  metadata?: Prisma.InputJsonValue;
}

type BillingRuntimeConfig = {
  multiplier: number;
  pointsPerYuan: number;
  dailyUserPointLimit: number;
};

function toDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BILLING_TIMEZONE,
  }).format(date);
}

function parsePositiveInt(raw: unknown, fallback: number) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
}

function parsePositiveNumber(raw: unknown, fallback: number) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return value;
}

function normalizeUsage(input: TokenUsageInput): Required<TokenUsageInput> {
  return {
    inputTokens: Math.max(0, Math.floor(input.inputTokens || 0)),
    outputTokens: Math.max(0, Math.floor(input.outputTokens || 0)),
    cacheHitTokens: Math.max(0, Math.floor(input.cacheHitTokens || 0)),
  };
}

function calcModelCostYuan(
  usage: Required<TokenUsageInput>,
  pricing: { input: number; output: number; cache: number }
) {
  return (
    (usage.inputTokens / 1_000_000) * pricing.input +
    (usage.outputTokens / 1_000_000) * pricing.output +
    (usage.cacheHitTokens / 1_000_000) * pricing.cache
  );
}

function calcBilledPoints(
  costYuan: number,
  multiplier: number,
  pointsPerYuan: number
) {
  const raw = costYuan * multiplier * pointsPerYuan;
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.ceil(raw);
}

async function getBillingRuntimeConfig(): Promise<BillingRuntimeConfig> {
  const config = await getPlatformConfig().catch(() => null);
  return {
    multiplier: parsePositiveNumber(
      config?.tokenBillingMultiplier,
      FALLBACK_MULTIPLIER
    ),
    pointsPerYuan: parsePositiveInt(
      config?.tokenPointsPerYuan,
      FALLBACK_POINTS_PER_YUAN
    ),
    dailyUserPointLimit: parsePositiveInt(
      config?.dailyUserPointLimit,
      FALLBACK_DAILY_SPEND_LIMIT
    ),
  };
}

async function resolveEffectiveBudgetForUser(userId: string, tx: Tx) {
  const [config, user] = await Promise.all([
    getPlatformConfig().catch(() => null),
    tx.user.findUnique({
      where: { id: userId },
      select: { tokenBudgetOverride: true },
    }),
  ]);

  if (
    typeof user?.tokenBudgetOverride === "number" &&
    Number.isFinite(user.tokenBudgetOverride) &&
    user.tokenBudgetOverride > 0
  ) {
    return Math.floor(user.tokenBudgetOverride);
  }

  return parsePositiveInt(config?.defaultUserTokenBudget, 500_000);
}

async function resetDailyUsageIfNeeded(tx: Tx, wallet: WalletSnapshot) {
  const today = toDateKey();
  if (wallet.dailyUsageDate === today) {
    return wallet;
  }
  const next = await tx.userTokenWallet.update({
    where: { id: wallet.id },
    data: {
      dailyUsedPoints: 0,
      dailyUsageDate: today,
    },
  });
  return toWalletSnapshot(next);
}

function toWalletSnapshot(row: {
  id: string;
  userId: string;
  totalPoints: number;
  availablePoints: number;
  frozenPoints: number;
  usedPoints: number;
  dailyUsedPoints: number;
  dailyUsageDate: string | null;
}): WalletSnapshot {
  return {
    id: row.id,
    userId: row.userId,
    totalPoints: row.totalPoints,
    availablePoints: row.availablePoints,
    frozenPoints: row.frozenPoints,
    usedPoints: row.usedPoints,
    dailyUsedPoints: row.dailyUsedPoints,
    dailyUsageDate: row.dailyUsageDate,
  };
}

async function ensureWalletInternal(userId: string, tx: Tx) {
  let wallet = await tx.userTokenWallet.findUnique({
    where: { userId },
  });

  if (!wallet) {
    const initialPoints = await resolveEffectiveBudgetForUser(userId, tx);
    const today = toDateKey();
    try {
      wallet = await tx.userTokenWallet.create({
        data: {
          userId,
          totalPoints: initialPoints,
          availablePoints: initialPoints,
          frozenPoints: 0,
          usedPoints: 0,
          dailyUsedPoints: 0,
          dailyUsageDate: today,
        },
      });

      await tx.tokenLedger.create({
        data: {
          userId,
          type: "INIT_GRANT",
          deltaAvailablePoints: initialPoints,
          deltaFrozenPoints: 0,
          deltaUsedPoints: 0,
          availableAfter: wallet.availablePoints,
          frozenAfter: wallet.frozenPoints,
          usedAfter: wallet.usedPoints,
          billedPoints: 0,
          description: "Initialize user token wallet",
        },
      });
    } catch {
      wallet = await tx.userTokenWallet.findUnique({
        where: { userId },
      });
    }
  }

  if (!wallet) {
    throw new Error("Failed to initialize token wallet");
  }

  return resetDailyUsageIfNeeded(tx, toWalletSnapshot(wallet));
}

async function withTransaction<T>(handler: (tx: Tx) => Promise<T>, tx?: Tx) {
  if (tx) return handler(tx);
  return db.$transaction(async (innerTx) => handler(innerTx));
}

export async function ensureUserWallet(userId: string, tx?: Tx) {
  return withTransaction((innerTx) => ensureWalletInternal(userId, innerTx), tx);
}

export async function getUserWalletSummary(userId: string) {
  const [wallet, usage] = await db.$transaction(async (tx) => {
    const ensuredWallet = await ensureWalletInternal(userId, tx);
    const sum = await tx.aiUsageLog.aggregate({
      where: { userId },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        cacheHitTokens: true,
      },
    });
    return [ensuredWallet, sum] as const;
  });

  const inputTokens = usage._sum.inputTokens ?? 0;
  const outputTokens = usage._sum.outputTokens ?? 0;
  const cacheHitTokens = usage._sum.cacheHitTokens ?? 0;

  return {
    tokenBudget: wallet.totalPoints,
    tokenUsed: wallet.usedPoints,
    tokenRemaining: wallet.availablePoints,
    tokenFrozen: wallet.frozenPoints,
    dailyUsedPoints: wallet.dailyUsedPoints,
    inputTokens,
    outputTokens,
    cacheHitTokens,
  };
}

export async function ensureWalletCanReserve(
  userId: string,
  reservePoints: number,
  taskLabel = "Current task"
) {
  const normalizedReserve = Math.max(1, Math.floor(reservePoints));
  const config = await getBillingRuntimeConfig();
  const wallet = await ensureUserWallet(userId);

  if (wallet.availablePoints < normalizedReserve) {
    throw new Error(
      `${taskLabel} requires ${normalizedReserve} points, but only ${wallet.availablePoints} available`
    );
  }
  if (wallet.dailyUsedPoints + normalizedReserve > config.dailyUserPointLimit) {
    throw new Error(
      `${taskLabel} exceeds daily spend limit (${config.dailyUserPointLimit} points/day)`
    );
  }
  return wallet;
}

export async function freezeTokenReservation(input: FreezeReservationInput, tx?: Tx) {
  const normalizedReserve = Math.max(1, Math.floor(input.reservePoints));
  const config = await getBillingRuntimeConfig();

  return withTransaction(async (innerTx) => {
    const wallet = await ensureWalletInternal(input.userId, innerTx);

    if (wallet.dailyUsedPoints + normalizedReserve > config.dailyUserPointLimit) {
      throw new Error(
        `Task exceeds daily spend limit (${config.dailyUserPointLimit} points/day)`
      );
    }

    const walletUpdate = await innerTx.userTokenWallet.updateMany({
      where: {
        id: wallet.id,
        availablePoints: { gte: normalizedReserve },
      },
      data: {
        availablePoints: { decrement: normalizedReserve },
        frozenPoints: { increment: normalizedReserve },
      },
    });
    if (walletUpdate.count === 0) {
      throw new Error("Insufficient token balance for reservation");
    }

    const updatedWallet = await innerTx.userTokenWallet.findUnique({
      where: { id: wallet.id },
    });
    if (!updatedWallet) {
      throw new Error("Token wallet not found after reservation");
    }

    const reservation = await innerTx.tokenReservation.create({
      data: {
        userId: input.userId,
        workspaceId: input.workspaceId ?? null,
        taskJobId: input.taskJobId ?? null,
        source: input.source,
        reservedPoints: normalizedReserve,
        metadata: input.metadata,
      },
    });

    await innerTx.tokenLedger.create({
      data: {
        userId: input.userId,
        workspaceId: input.workspaceId ?? null,
        taskJobId: input.taskJobId ?? null,
        reservationId: reservation.id,
        type: "FREEZE",
        deltaAvailablePoints: -normalizedReserve,
        deltaFrozenPoints: normalizedReserve,
        deltaUsedPoints: 0,
        availableAfter: updatedWallet.availablePoints,
        frozenAfter: updatedWallet.frozenPoints,
        usedAfter: updatedWallet.usedPoints,
        billedPoints: 0,
        description:
          input.description || `Reserve ${normalizedReserve} points for ${input.source}`,
      },
    });

    if (input.taskJobId) {
      await innerTx.taskJob.update({
        where: { id: input.taskJobId },
        data: {
          tokenReservedPoints: normalizedReserve,
          tokenSettlementStatus: "FROZEN",
        },
      });
    }

    return {
      reservationId: reservation.id,
      reservedPoints: normalizedReserve,
      availableAfter: updatedWallet.availablePoints,
      frozenAfter: updatedWallet.frozenPoints,
      dailyUsedPoints: updatedWallet.dailyUsedPoints,
    };
  }, tx);
}

export async function settleTokenReservation(input: SettleReservationInput, tx?: Tx) {
  const usage = normalizeUsage(input.usage);
  const [pricing, billingConfig] = await Promise.all([
    getModelPricing(input.modelId),
    getBillingRuntimeConfig(),
  ]);

  const costYuan = calcModelCostYuan(usage, pricing);
  const billedPoints = calcBilledPoints(
    costYuan,
    billingConfig.multiplier,
    billingConfig.pointsPerYuan
  );

  return withTransaction(async (innerTx) => {
    const reservation = await innerTx.tokenReservation.findUnique({
      where: { id: input.reservationId },
    });
    if (!reservation) {
      throw new Error("Token reservation not found");
    }
    if (reservation.userId !== input.userId) {
      throw new Error("Token reservation does not belong to current user");
    }
    if (reservation.status === "SETTLED") {
      const existingUsage = await innerTx.aiUsageLog.findFirst({
        where: {
          userId: input.userId,
          taskJobId: reservation.taskJobId ?? undefined,
          model: input.modelId,
          taskType: input.taskType,
        },
        orderBy: { createdAt: "desc" },
      });
      return {
        billedPoints: reservation.settledPoints,
        costYuan,
        usageLogId: existingUsage?.id ?? null,
        reservationId: reservation.id,
      };
    }
    if (reservation.status !== "ACTIVE") {
      throw new Error("Token reservation already released");
    }

    const wallet = await ensureWalletInternal(input.userId, innerTx);
    const extraRequired = Math.max(0, billedPoints - reservation.reservedPoints);

    if (wallet.dailyUsedPoints + billedPoints > billingConfig.dailyUserPointLimit) {
      throw new Error(
        `Task exceeds daily spend limit (${billingConfig.dailyUserPointLimit} points/day)`
      );
    }

    const walletUpdate = await innerTx.userTokenWallet.updateMany({
      where: {
        id: wallet.id,
        availablePoints: { gte: extraRequired },
        frozenPoints: { gte: reservation.reservedPoints },
      },
      data: {
        availablePoints: {
          increment: reservation.reservedPoints - billedPoints,
        },
        frozenPoints: { decrement: reservation.reservedPoints },
        usedPoints: { increment: billedPoints },
        dailyUsedPoints: { increment: billedPoints },
      },
    });
    if (walletUpdate.count === 0) {
      throw new Error("Insufficient token balance for settlement");
    }

    const updatedWallet = await innerTx.userTokenWallet.findUnique({
      where: { id: wallet.id },
    });
    if (!updatedWallet) {
      throw new Error("Token wallet not found after settlement");
    }

    await innerTx.tokenReservation.update({
      where: { id: reservation.id },
      data: {
        status: "SETTLED",
        settledPoints: billedPoints,
        settledAt: new Date(),
      },
    });

    const resolvedWorkspaceId = input.workspaceId ?? reservation.workspaceId;
    if (!resolvedWorkspaceId) {
      throw new Error("Workspace id is required when settling token reservation");
    }

    const usageLog = await innerTx.aiUsageLog.create({
      data: {
        userId: input.userId,
        workspaceId: resolvedWorkspaceId,
        taskJobId: reservation.taskJobId ?? null,
        taskType: input.taskType,
        model: input.modelId,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cacheHitTokens: usage.cacheHitTokens,
        costYuan,
        billedPoints,
        pointRate: billingConfig.pointsPerYuan,
        billingMultiplier: billingConfig.multiplier,
        durationMs: Math.max(0, Math.floor(input.durationMs || 0)),
      },
    });

    await innerTx.tokenLedger.create({
      data: {
        userId: input.userId,
        workspaceId: resolvedWorkspaceId,
        taskJobId: reservation.taskJobId ?? null,
        reservationId: reservation.id,
        type: "SETTLE",
        deltaAvailablePoints: reservation.reservedPoints - billedPoints,
        deltaFrozenPoints: -reservation.reservedPoints,
        deltaUsedPoints: billedPoints,
        availableAfter: updatedWallet.availablePoints,
        frozenAfter: updatedWallet.frozenPoints,
        usedAfter: updatedWallet.usedPoints,
        billedPoints,
        pointRate: billingConfig.pointsPerYuan,
        billingMultiplier: billingConfig.multiplier,
        model: input.modelId,
        taskType: input.taskType,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cacheHitTokens: usage.cacheHitTokens,
        costYuan,
        description:
          input.description ||
          `Settle reservation ${reservation.id} for ${input.taskType}`,
      },
    });

    if (reservation.taskJobId) {
      await innerTx.taskJob.update({
        where: { id: reservation.taskJobId },
        data: {
          tokenSettledPoints: billedPoints,
          tokenCostYuan: costYuan,
          tokenSettlementStatus: "SETTLED",
          tokenSettledAt: new Date(),
        },
      });
    }

    return {
      billedPoints,
      costYuan,
      usageLogId: usageLog.id,
      reservationId: reservation.id,
      availableAfter: updatedWallet.availablePoints,
      frozenAfter: updatedWallet.frozenPoints,
      usedAfter: updatedWallet.usedPoints,
      multiplier: billingConfig.multiplier,
      pointRate: billingConfig.pointsPerYuan,
    };
  }, tx);
}

export async function releaseTokenReservation(input: ReleaseReservationInput, tx?: Tx) {
  return withTransaction(async (innerTx) => {
    const reservation = input.reservationId
      ? await innerTx.tokenReservation.findUnique({
          where: { id: input.reservationId },
        })
      : input.taskJobId
      ? await innerTx.tokenReservation.findUnique({
          where: { taskJobId: input.taskJobId },
        })
      : null;

    if (!reservation) {
      return { released: false, reason: "not_found" as const };
    }
    if (reservation.status !== "ACTIVE") {
      return {
        released: false,
        reason: "already_finalized" as const,
        status: reservation.status,
      };
    }

    const wallet = await ensureWalletInternal(reservation.userId, innerTx);
    const walletUpdate = await innerTx.userTokenWallet.updateMany({
      where: {
        id: wallet.id,
        frozenPoints: { gte: reservation.reservedPoints },
      },
      data: {
        availablePoints: { increment: reservation.reservedPoints },
        frozenPoints: { decrement: reservation.reservedPoints },
      },
    });
    if (walletUpdate.count === 0) {
      throw new Error("Token wallet release failed because frozen balance is insufficient");
    }

    const updatedWallet = await innerTx.userTokenWallet.findUnique({
      where: { id: wallet.id },
    });
    if (!updatedWallet) {
      throw new Error("Token wallet not found after release");
    }

    await innerTx.tokenReservation.update({
      where: { id: reservation.id },
      data: {
        status: "RELEASED",
        releasedAt: new Date(),
      },
    });

    await innerTx.tokenLedger.create({
      data: {
        userId: reservation.userId,
        workspaceId: reservation.workspaceId,
        taskJobId: reservation.taskJobId,
        reservationId: reservation.id,
        type: input.ledgerType || "REFUND",
        deltaAvailablePoints: reservation.reservedPoints,
        deltaFrozenPoints: -reservation.reservedPoints,
        deltaUsedPoints: 0,
        availableAfter: updatedWallet.availablePoints,
        frozenAfter: updatedWallet.frozenPoints,
        usedAfter: updatedWallet.usedPoints,
        billedPoints: 0,
        description:
          input.reason ||
          `Release reservation ${reservation.id} (${reservation.source})`,
      },
    });

    if (reservation.taskJobId) {
      await innerTx.taskJob.update({
        where: { id: reservation.taskJobId },
        data: {
          tokenSettlementStatus: "REFUNDED",
        },
      });
    }

    return {
      released: true,
      reservationId: reservation.id,
      availableAfter: updatedWallet.availablePoints,
      frozenAfter: updatedWallet.frozenPoints,
    };
  }, tx);
}

export async function rechargeWallet(input: RechargeWalletInput, tx?: Tx) {
  const rechargePoints = Math.max(1, Math.floor(input.points));
  return withTransaction(async (innerTx) => {
    const wallet = await ensureWalletInternal(input.userId, innerTx);
    const nextWallet = await innerTx.userTokenWallet.update({
      where: { id: wallet.id },
      data: {
        totalPoints: { increment: rechargePoints },
        availablePoints: { increment: rechargePoints },
      },
    });

    await innerTx.tokenLedger.create({
      data: {
        userId: input.userId,
        type: "RECHARGE",
        deltaAvailablePoints: rechargePoints,
        deltaFrozenPoints: 0,
        deltaUsedPoints: 0,
        availableAfter: nextWallet.availablePoints,
        frozenAfter: nextWallet.frozenPoints,
        usedAfter: nextWallet.usedPoints,
        billedPoints: 0,
        costYuan: Number(input.amountYuan || 0),
        description: input.description || `Recharge ${rechargePoints} points`,
        metadata: input.metadata,
      },
    });

    return toWalletSnapshot(nextWallet);
  }, tx);
}

export async function adjustWalletTotal(input: AdjustWalletInput, tx?: Tx) {
  const target = Math.max(0, Math.floor(input.targetTotalPoints));
  return withTransaction(async (innerTx) => {
    const wallet = await ensureWalletInternal(input.userId, innerTx);
    const minimumAllowed = wallet.usedPoints + wallet.frozenPoints;
    if (target < minimumAllowed) {
      throw new Error(
        `Target points must be >= used+frozen (${minimumAllowed})`
      );
    }

    const delta = target - wallet.totalPoints;
    const nextWallet = await innerTx.userTokenWallet.update({
      where: { id: wallet.id },
      data: {
        totalPoints: target,
        availablePoints: { increment: delta },
      },
    });

    await innerTx.tokenLedger.create({
      data: {
        userId: input.userId,
        type: "MANUAL_ADJUST",
        deltaAvailablePoints: delta,
        deltaFrozenPoints: 0,
        deltaUsedPoints: 0,
        availableAfter: nextWallet.availablePoints,
        frozenAfter: nextWallet.frozenPoints,
        usedAfter: nextWallet.usedPoints,
        billedPoints: 0,
        description:
          input.description ||
          `Adjust total points to ${target} (delta: ${delta >= 0 ? "+" : ""}${delta})`,
        metadata: input.metadata,
      },
    });

    return toWalletSnapshot(nextWallet);
  }, tx);
}
