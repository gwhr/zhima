import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export interface AdminAuditInput {
  adminUserId?: string | null;
  action: string;
  module?: string;
  targetType?: string;
  targetId?: string;
  summary?: string;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
  req?: Request;
}

function getRequestMetadata(req: Request | undefined): Record<string, string> | null {
  if (!req) return null;

  const forwardedFor = req.headers.get("x-forwarded-for") || "";
  const ip = forwardedFor.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "";
  const userAgent = req.headers.get("user-agent") || "";
  const traceId =
    req.headers.get("x-request-id") || req.headers.get("x-correlation-id") || "";

  const metadata: Record<string, string> = {};
  if (ip) metadata.ip = ip;
  if (userAgent) metadata.userAgent = userAgent;
  if (traceId) metadata.traceId = traceId;

  return Object.keys(metadata).length > 0 ? metadata : null;
}

export async function logAdminAudit(input: AdminAuditInput) {
  const requestMeta = getRequestMetadata(input.req);
  const mergedMetadata =
    requestMeta || input.metadata
      ? ({
          ...(requestMeta ? { request: requestMeta } : {}),
          ...(input.metadata ? { extra: input.metadata } : {}),
        } as unknown as Prisma.InputJsonValue)
      : undefined;

  try {
    await db.adminAuditLog.create({
      data: {
        adminUserId: input.adminUserId ?? null,
        action: input.action,
        module: input.module ?? null,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        summary: input.summary ?? null,
        ...(input.before !== undefined
          ? { before: input.before as Prisma.InputJsonValue }
          : {}),
        ...(input.after !== undefined
          ? { after: input.after as Prisma.InputJsonValue }
          : {}),
        ...(mergedMetadata !== undefined ? { metadata: mergedMetadata } : {}),
      },
    });
  } catch (auditError) {
    console.error("[AdminAudit] failed to write log:", auditError);
  }
}
