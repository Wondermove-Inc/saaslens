// src/actions/saas-patterns.ts
"use server";

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import type { ActionState } from "@/types";
import type { MerchantMatchType, MerchantPattern } from "@prisma/client";
import { revalidatePath } from "next/cache";

function isRedirectError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    ((error as { digest: string }).digest.includes("NEXT_REDIRECT") ||
      (error as { digest: string }).digest.includes("NEXT_NOT_FOUND"))
  );
}

interface MerchantPatternWithApp extends MerchantPattern {
  app: { name: string };
}

/**
 * 가맹점 패턴 목록 조회
 */
export async function getMerchantPatterns(): Promise<MerchantPatternWithApp[]> {
  const { organizationId } = await requireOrganization();

  const patterns = await prisma.merchantPattern.findMany({
    where: { organizationId },
    include: {
      app: {
        select: { name: true },
      },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  return patterns;
}

/**
 * 단일 가맹점 패턴 조회
 */
export async function getMerchantPattern(
  id: string
): Promise<MerchantPatternWithApp | null> {
  const { organizationId } = await requireOrganization();

  const pattern = await prisma.merchantPattern.findFirst({
    where: { id, organizationId },
    include: {
      app: {
        select: { name: true },
      },
    },
  });

  return pattern;
}

interface CreateMerchantPatternInput {
  pattern: string;
  matchType: MerchantMatchType;
  appId: string;
  priority?: number;
  isActive?: boolean;
}

/**
 * 가맹점 패턴 생성
 */
async function _createMerchantPattern(
  input: CreateMerchantPatternInput
): Promise<ActionState<{ id: string }>> {
  try {
    const { organizationId, role } = await requireOrganization();

    if (role !== "ADMIN") {
      return { success: false, message: "관리자 권한이 필요합니다" };
    }

    // 앱 존재 확인
    const app = await prisma.app.findFirst({
      where: { id: input.appId, organizationId },
    });

    if (!app) {
      return { success: false, message: "앱을 찾을 수 없습니다" };
    }

    const pattern = await prisma.merchantPattern.create({
      data: {
        organizationId,
        pattern: input.pattern,
        matchType: input.matchType,
        appId: input.appId,
        priority: input.priority ?? 0,
        isActive: input.isActive ?? true,
      },
    });

    revalidatePath("/settings/patterns");

    return { success: true, data: { id: pattern.id } };
  } catch (error) {
    logger.error({ err: error }, "가맹점 패턴 생성 오류");
    if (isRedirectError(error)) throw error;
    return {
      success: false,
      message: "가맹점 패턴 생성 중 오류가 발생했습니다",
    };
  }
}
export const createMerchantPattern = withLogging(
  "createMerchantPattern",
  _createMerchantPattern
);

interface UpdateMerchantPatternInput {
  pattern?: string;
  matchType?: MerchantMatchType;
  appId?: string;
  priority?: number;
  isActive?: boolean;
}

/**
 * 가맹점 패턴 수정
 */
async function _updateMerchantPattern(
  id: string,
  input: UpdateMerchantPatternInput
): Promise<ActionState> {
  try {
    const { organizationId, role } = await requireOrganization();

    if (role !== "ADMIN") {
      return { success: false, message: "관리자 권한이 필요합니다" };
    }

    const existingPattern = await prisma.merchantPattern.findFirst({
      where: { id, organizationId },
    });

    if (!existingPattern) {
      return { success: false, message: "패턴을 찾을 수 없습니다" };
    }

    // 앱 변경 시 존재 확인
    if (input.appId) {
      const app = await prisma.app.findFirst({
        where: { id: input.appId, organizationId },
      });
      if (!app) {
        return { success: false, message: "앱을 찾을 수 없습니다" };
      }
    }

    await prisma.merchantPattern.update({
      where: { id },
      data: {
        ...(input.pattern !== undefined && { pattern: input.pattern }),
        ...(input.matchType !== undefined && { matchType: input.matchType }),
        ...(input.appId !== undefined && { appId: input.appId }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });

    revalidatePath("/settings/patterns");

    return { success: true };
  } catch (error) {
    logger.error({ err: error }, "가맹점 패턴 수정 오류");
    if (isRedirectError(error)) throw error;
    return {
      success: false,
      message: "가맹점 패턴 수정 중 오류가 발생했습니다",
    };
  }
}
export const updateMerchantPattern = withLogging(
  "updateMerchantPattern",
  _updateMerchantPattern
);

/**
 * 가맹점 패턴 삭제
 */
async function _deleteMerchantPattern(id: string): Promise<ActionState> {
  try {
    const { organizationId, role } = await requireOrganization();

    if (role !== "ADMIN") {
      return { success: false, message: "관리자 권한이 필요합니다" };
    }

    const existingPattern = await prisma.merchantPattern.findFirst({
      where: { id, organizationId },
    });

    if (!existingPattern) {
      return { success: false, message: "패턴을 찾을 수 없습니다" };
    }

    await prisma.merchantPattern.delete({ where: { id } });

    revalidatePath("/settings/patterns");

    return { success: true };
  } catch (error) {
    logger.error({ err: error }, "가맹점 패턴 삭제 오류");
    if (isRedirectError(error)) throw error;
    return {
      success: false,
      message: "가맹점 패턴 삭제 중 오류가 발생했습니다",
    };
  }
}
export const deleteMerchantPattern = withLogging(
  "deleteMerchantPattern",
  _deleteMerchantPattern
);
