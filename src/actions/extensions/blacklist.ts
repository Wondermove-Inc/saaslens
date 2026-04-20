// src/actions/extensions/blacklist.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import type { ActionState } from "@/types";
import type {
  CreateBlacklistInput,
  ExtensionBlacklistItem,
  PaginatedResponse,
  PaginationParams,
  UpdateBlacklistInput,
} from "@/types/extension";
import {
  createBlacklistSchema,
  updateBlacklistSchema,
} from "@/types/extension";
import { revalidatePath } from "next/cache";

/**
 * Blacklist 목록 조회
 */
export async function getBlacklists(
  params: PaginationParams = {}
): Promise<ActionState<PaginatedResponse<ExtensionBlacklistItem>>> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    const { page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.extensionBlacklist.findMany({
        where: { organizationId: session.user.organizationId },
        orderBy: { addedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.extensionBlacklist.count({
        where: { organizationId: session.user.organizationId },
      }),
    ]);

    return {
      success: true,
      data: {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error({ err: error }, "[getBlacklists] Error");
    return {
      success: false,
      error: error instanceof Error ? error.message : "블랙리스트 조회 실패",
    };
  }
}

/**
 * Blacklist 항목 생성
 */
async function _createBlacklist(
  input: CreateBlacklistInput
): Promise<ActionState<ExtensionBlacklistItem>> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    // 입력 검증
    const validation = createBlacklistSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error:
          validation.error.errors[0]?.message || "입력값이 올바르지 않습니다",
      };
    }

    const item = await prisma.extensionBlacklist.create({
      data: {
        organizationId: session.user.organizationId,
        pattern: input.pattern,
        name: input.name,
        reason: input.reason,
        enabled: true,
      },
    });

    revalidatePath("/extensions/blacklist");
    return { success: true, data: item };
  } catch (error) {
    logger.error({ err: error }, "[createBlacklist] Error");
    return {
      success: false,
      error: error instanceof Error ? error.message : "블랙리스트 생성 실패",
    };
  }
}
export const createBlacklist = withLogging("createBlacklist", _createBlacklist);

/**
 * Blacklist 항목 수정
 */
async function _updateBlacklist(
  id: string,
  input: UpdateBlacklistInput
): Promise<ActionState<ExtensionBlacklistItem>> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    // 입력 검증
    const validation = updateBlacklistSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error:
          validation.error.errors[0]?.message || "입력값이 올바르지 않습니다",
      };
    }

    // 기존 항목 확인
    const existing = await prisma.extensionBlacklist.findUnique({
      where: { id },
    });

    if (!existing || existing.organizationId !== session.user.organizationId) {
      return { success: false, error: "블랙리스트 항목을 찾을 수 없습니다" };
    }

    const updated = await prisma.extensionBlacklist.update({
      where: { id },
      data: input,
    });

    revalidatePath("/extensions/blacklist");
    return { success: true, data: updated };
  } catch (error) {
    logger.error({ err: error }, "[updateBlacklist] Error");
    return {
      success: false,
      error: error instanceof Error ? error.message : "블랙리스트 수정 실패",
    };
  }
}
export const updateBlacklist = withLogging("updateBlacklist", _updateBlacklist);

/**
 * Blacklist 항목 삭제
 */
async function _deleteBlacklist(id: string): Promise<ActionState> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    // 기존 항목 확인
    const existing = await prisma.extensionBlacklist.findUnique({
      where: { id },
    });

    if (!existing || existing.organizationId !== session.user.organizationId) {
      return { success: false, error: "블랙리스트 항목을 찾을 수 없습니다" };
    }

    await prisma.extensionBlacklist.delete({
      where: { id },
    });

    revalidatePath("/extensions/blacklist");
    return { success: true };
  } catch (error) {
    logger.error({ err: error }, "[deleteBlacklist] Error");
    return {
      success: false,
      error: error instanceof Error ? error.message : "블랙리스트 삭제 실패",
    };
  }
}
export const deleteBlacklist = withLogging("deleteBlacklist", _deleteBlacklist);
