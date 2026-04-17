// src/actions/extensions/whitelist.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import type { ActionState } from "@/types";
import type {
  CreateWhitelistInput,
  ExtensionWhitelistItem,
  PaginatedResponse,
  PaginationParams,
  UpdateWhitelistInput,
} from "@/types/extension";
import {
  createWhitelistSchema,
  updateWhitelistSchema,
} from "@/types/extension";
import { revalidatePath } from "next/cache";

/**
 * Whitelist 목록 조회
 */
export async function getWhitelists(
  params: PaginationParams = {}
): Promise<ActionState<PaginatedResponse<ExtensionWhitelistItem>>> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    const { page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.extensionWhitelist.findMany({
        where: { organizationId: session.user.organizationId },
        orderBy: { addedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.extensionWhitelist.count({
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
    logger.error({ err: error }, "[getWhitelists] Error");
    return {
      success: false,
      error: error instanceof Error ? error.message : "화이트리스트 조회 실패",
    };
  }
}

/**
 * Whitelist 항목 생성
 */
async function _createWhitelist(
  input: CreateWhitelistInput
): Promise<ActionState<ExtensionWhitelistItem>> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    // 입력 검증
    const validation = createWhitelistSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error:
          validation.error.errors[0]?.message || "입력값이 올바르지 않습니다",
      };
    }

    const item = await prisma.extensionWhitelist.create({
      data: {
        organizationId: session.user.organizationId,
        pattern: input.pattern,
        name: input.name,
        source: input.source || "MANUAL",
        enabled: true,
      },
    });

    revalidatePath("/extensions/whitelist");
    return { success: true, data: item };
  } catch (error) {
    logger.error({ err: error }, "[createWhitelist] Error");
    return {
      success: false,
      error: error instanceof Error ? error.message : "화이트리스트 생성 실패",
    };
  }
}
export const createWhitelist = withLogging("createWhitelist", _createWhitelist);

/**
 * Whitelist 항목 수정
 */
async function _updateWhitelist(
  id: string,
  input: UpdateWhitelistInput
): Promise<ActionState<ExtensionWhitelistItem>> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    // 입력 검증
    const validation = updateWhitelistSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error:
          validation.error.errors[0]?.message || "입력값이 올바르지 않습니다",
      };
    }

    // 기존 항목 확인
    const existing = await prisma.extensionWhitelist.findUnique({
      where: { id },
    });

    if (!existing || existing.organizationId !== session.user.organizationId) {
      return { success: false, error: "화이트리스트 항목을 찾을 수 없습니다" };
    }

    const updated = await prisma.extensionWhitelist.update({
      where: { id },
      data: input,
    });

    revalidatePath("/extensions/whitelist");
    return { success: true, data: updated };
  } catch (error) {
    logger.error({ err: error }, "[updateWhitelist] Error");
    return {
      success: false,
      error: error instanceof Error ? error.message : "화이트리스트 수정 실패",
    };
  }
}
export const updateWhitelist = withLogging("updateWhitelist", _updateWhitelist);

/**
 * Whitelist 항목 삭제
 */
async function _deleteWhitelist(id: string): Promise<ActionState> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    // 기존 항목 확인
    const existing = await prisma.extensionWhitelist.findUnique({
      where: { id },
    });

    if (!existing || existing.organizationId !== session.user.organizationId) {
      return { success: false, error: "화이트리스트 항목을 찾을 수 없습니다" };
    }

    await prisma.extensionWhitelist.delete({
      where: { id },
    });

    revalidatePath("/extensions/whitelist");
    return { success: true };
  } catch (error) {
    logger.error({ err: error }, "[deleteWhitelist] Error");
    return {
      success: false,
      error: error instanceof Error ? error.message : "화이트리스트 삭제 실패",
    };
  }
}
export const deleteWhitelist = withLogging("deleteWhitelist", _deleteWhitelist);
