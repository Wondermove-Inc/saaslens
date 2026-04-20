// src/actions/pending-confirmations.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import { sendConfirmationResultEmail } from "@/lib/services/notification/email";
import { normalizeMerchantName } from "@/lib/services/payment/merchant-matcher";
import type { ActionState } from "@/types";
import { AppStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

/**
 * 확인 필요 항목 (50~80% 신뢰도의 LLM 추론 결과)
 */
export interface PendingConfirmationItem {
  id: string;
  merchantName: string;
  normalizedName: string | null;
  confidence: number;
  suggestedName: string | null;
  category: string | null;
  website: string | null;
  reasoning: string | null;
  createdAt: Date;
  appId: string | null;
  appName: string | null;
  appStatus: string | null;
}

export interface PendingConfirmationsData {
  items: PendingConfirmationItem[];
  total: number;
}

const CONFIDENCE_MIN = 0.5;
const CONFIDENCE_MAX = 0.8;

async function requireSession() {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return { error: "인증이 필요합니다" };
  }
  return { user: session.user };
}

async function requireAdminSession() {
  const result = await requireSession();
  if ("error" in result) return result;
  if (result.user.role !== "ADMIN") {
    return { error: "관리자만 확인할 수 있습니다" };
  }
  return result;
}

/**
 * 확인 필요 항목 조회 (50~80% 신뢰도)
 * - isSaaS: true이면서 PENDING_REVIEW 상태인 앱
 * - confidence가 0.5 ~ 0.8 범위
 */
export async function getPendingConfirmations(
  limit = 10
): Promise<ActionState<PendingConfirmationsData>> {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return { success: false, message: sessionResult.error };
  }

  const { user } = sessionResult;

  try {
    const whereClause = {
      organizationId: user.organizationId!,
      confidence: { gte: CONFIDENCE_MIN, lte: CONFIDENCE_MAX },
      isSaaS: true,
      app: { status: AppStatus.PENDING_REVIEW },
    };

    const [logs, total] = await Promise.all([
      prisma.vendorInferenceLog.findMany({
        where: whereClause,
        include: {
          app: {
            select: { id: true, name: true, status: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.vendorInferenceLog.count({ where: whereClause }),
    ]);

    const items: PendingConfirmationItem[] = logs.map((log) => ({
      id: log.id,
      merchantName: log.merchantName,
      normalizedName: log.normalizedName,
      confidence: log.confidence,
      suggestedName: log.suggestedName,
      category: log.category,
      website: log.website,
      reasoning: log.reasoning,
      createdAt: log.createdAt,
      appId: log.appId,
      appName: log.app?.name ?? null,
      appStatus: log.app?.status ?? null,
    }));

    return {
      success: true,
      data: { items, total },
    };
  } catch (error) {
    logger.error({ err: error }, "확인 필요 항목 조회 실패");
    return {
      success: false,
      message: "확인 필요 항목을 조회하는 중 오류가 발생했습니다",
    };
  }
}

/**
 * SaaS로 확인 (승인)
 * - 앱 상태를 ACTIVE로 변경
 */
async function _confirmAsSaaS(appId: string): Promise<ActionState> {
  const sessionResult = await requireAdminSession();
  if ("error" in sessionResult) {
    return { success: false, message: sessionResult.error };
  }

  const { user } = sessionResult;

  try {
    // 앱 소유권 확인
    const app = await prisma.app.findFirst({
      where: { id: appId, organizationId: user.organizationId! },
    });

    if (!app) {
      return { success: false, message: "앱을 찾을 수 없습니다" };
    }

    await prisma.app.update({
      where: { id: appId },
      data: { status: AppStatus.ACTIVE },
    });

    await sendConfirmationEmail({
      organizationId: user.organizationId!,
      appName: app.name,
      action: "approved",
      confidence: null,
      normalizedName: null,
      actorEmail: user.email ?? null,
    });

    revalidatePath("/");
    revalidatePath("/settings/saas-review");

    return {
      success: true,
      message: `"${app.name}"이(가) SaaS로 승인되었습니다`,
    };
  } catch (error) {
    logger.error({ err: error }, "SaaS 승인 실패");
    return { success: false, message: "SaaS 승인 중 오류가 발생했습니다" };
  }
}
export const confirmAsSaaS = withLogging("confirmAsSaaS", _confirmAsSaaS);

/**
 * 비-SaaS로 확인 (거부)
 * - 앱 상태를 BLOCKED로 변경
 * - NonSaaSVendor 캐시에 추가
 */
async function _confirmAsNonSaaS(
  appId: string,
  normalizedName: string
): Promise<ActionState> {
  const sessionResult = await requireAdminSession();
  if ("error" in sessionResult) {
    return { success: false, message: sessionResult.error };
  }

  const { user } = sessionResult;

  try {
    // 앱 소유권 확인
    const app = await prisma.app.findFirst({
      where: { id: appId, organizationId: user.organizationId! },
    });

    if (!app) {
      return { success: false, message: "앱을 찾을 수 없습니다" };
    }

    // 트랜잭션으로 앱 차단 + Non-SaaS 캐시 등록
    await prisma.$transaction(async (tx) => {
      await tx.app.update({
        where: { id: appId },
        data: { status: AppStatus.BLOCKED },
      });

      // Non-SaaS 캐시에 추가
      const normalized = normalizedName || normalizeMerchantName(app.name);
      await tx.nonSaaSVendor.upsert({
        where: {
          organizationId_normalizedName: {
            organizationId: user.organizationId!,
            normalizedName: normalized,
          },
        },
        create: {
          organizationId: user.organizationId!,
          normalizedName: normalized,
          originalName: app.name,
          confidence: 1.0, // 사용자 확인이므로 100%
          reasoning: "사용자가 비-SaaS로 확인함",
          transactionCount: 1,
        },
        update: {
          transactionCount: { increment: 1 },
          lastSeenAt: new Date(),
        },
      });
    });

    await sendConfirmationEmail({
      organizationId: user.organizationId!,
      appName: app.name,
      action: "rejected",
      confidence: null,
      normalizedName,
      actorEmail: user.email ?? null,
    });

    revalidatePath("/");
    revalidatePath("/settings/saas-review");

    return {
      success: true,
      message: `"${app.name}"이(가) 비-SaaS로 처리되었습니다`,
    };
  } catch (error) {
    logger.error({ err: error }, "비-SaaS 처리 실패");
    return { success: false, message: "비-SaaS 처리 중 오류가 발생했습니다" };
  }
}
export const confirmAsNonSaaS = withLogging(
  "confirmAsNonSaaS",
  _confirmAsNonSaaS
);

async function sendConfirmationEmail(params: {
  organizationId: string;
  appName: string;
  action: "approved" | "rejected";
  confidence: number | null;
  normalizedName: string | null;
  actorEmail: string | null;
}) {
  try {
    const [org, adminFallback] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: params.organizationId },
        select: { name: true },
      }),
      prisma.user.findFirst({
        where: {
          organizationId: params.organizationId,
          role: "ADMIN",
          status: "ACTIVE",
        },
        select: { email: true },
      }),
    ]);

    const recipient = params.actorEmail || adminFallback?.email;
    if (!recipient) return;

    await sendConfirmationResultEmail({
      to: recipient,
      organizationName: org?.name || "SaaS 관리 플랫폼",
      appName: params.appName,
      action: params.action,
      confidence: params.confidence,
      normalizedName: params.normalizedName || undefined,
    });
  } catch (error) {
    logger.error({ err: error }, "확인 결과 이메일 발송 실패");
  }
}

/**
 * 대시보드 요약용: 확인 필요 항목 수 조회
 */
export async function getPendingConfirmationsCount(): Promise<number> {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return 0;
  }

  const { user } = sessionResult;

  try {
    const count = await prisma.vendorInferenceLog.count({
      where: {
        organizationId: user.organizationId!,
        confidence: { gte: CONFIDENCE_MIN, lte: CONFIDENCE_MAX },
        isSaaS: true,
        app: { status: AppStatus.PENDING_REVIEW },
      },
    });

    return count;
  } catch {
    return 0;
  }
}
