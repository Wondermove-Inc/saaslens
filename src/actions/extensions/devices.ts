// src/actions/extensions/devices.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import type { ActionState } from "@/types";
import type {
  ExtensionDeviceDetail,
  ExtensionDeviceItem,
  PaginatedResponse,
  PaginationParams,
  UpdateDeviceStatusInput,
} from "@/types/extension";
import { updateDeviceStatusSchema } from "@/types/extension";
import { revalidatePath } from "next/cache";

/**
 * Extension Device 목록 조회
 */
export async function getExtensionDevices(
  params: PaginationParams & { status?: string } = {}
): Promise<ActionState<PaginatedResponse<ExtensionDeviceDetail>>> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    const { page = 1, limit = 20, status } = params;
    const skip = (page - 1) * limit;

    const where = {
      organizationId: session.user.organizationId,
      ...(status && {
        status: status as "PENDING" | "APPROVED" | "REVOKED" | "INACTIVE",
      }),
    };

    const [items, total] = await Promise.all([
      prisma.extensionDevice.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.extensionDevice.count({ where }),
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
    logger.error({ err: error }, "[getExtensionDevices] Error");
    return {
      success: false,
      error: error instanceof Error ? error.message : "디바이스 목록 조회 실패",
    };
  }
}

/**
 * Extension Device 상세 조회
 */
export async function getExtensionDevice(
  id: string
): Promise<ActionState<ExtensionDeviceDetail>> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    const device = await prisma.extensionDevice.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!device || device.organizationId !== session.user.organizationId) {
      return { success: false, error: "디바이스를 찾을 수 없습니다" };
    }

    return { success: true, data: device };
  } catch (error) {
    logger.error({ err: error }, "[getExtensionDevice] Error");
    return {
      success: false,
      error: error instanceof Error ? error.message : "디바이스 조회 실패",
    };
  }
}

/**
 * Extension Device 상태 업데이트
 */
async function _updateExtensionDeviceStatus(
  id: string,
  input: UpdateDeviceStatusInput
): Promise<ActionState<ExtensionDeviceItem>> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    // 입력 검증
    const validation = updateDeviceStatusSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error:
          validation.error.errors[0]?.message || "입력값이 올바르지 않습니다",
      };
    }

    // 기존 항목 확인
    const existing = await prisma.extensionDevice.findUnique({
      where: { id },
    });

    if (!existing || existing.organizationId !== session.user.organizationId) {
      return { success: false, error: "디바이스를 찾을 수 없습니다" };
    }

    const updated = await prisma.extensionDevice.update({
      where: { id },
      data: { status: input.status },
    });

    revalidatePath("/extensions/devices");
    return { success: true, data: updated };
  } catch (error) {
    logger.error({ err: error }, "[updateExtensionDeviceStatus] Error");
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "디바이스 상태 업데이트 실패",
    };
  }
}
export const updateExtensionDeviceStatus = withLogging(
  "updateExtensionDeviceStatus",
  _updateExtensionDeviceStatus
);

/**
 * Extension Device 동기화 (lastSeenAt 업데이트)
 */
async function _syncExtensionDevice(
  id: string
): Promise<ActionState<ExtensionDeviceItem>> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    // 기존 항목 확인
    const existing = await prisma.extensionDevice.findUnique({
      where: { id },
    });

    if (!existing || existing.organizationId !== session.user.organizationId) {
      return { success: false, error: "디바이스를 찾을 수 없습니다" };
    }

    const updated = await prisma.extensionDevice.update({
      where: { id },
      data: { lastSeenAt: new Date() },
    });

    revalidatePath("/extensions/devices");
    return { success: true, data: updated };
  } catch (error) {
    logger.error({ err: error }, "[syncExtensionDevice] Error");
    return {
      success: false,
      error: error instanceof Error ? error.message : "디바이스 동기화 실패",
    };
  }
}
export const syncExtensionDevice = withLogging(
  "syncExtensionDevice",
  _syncExtensionDevice
);

/**
 * 현재 사용자의 Extension 설치 여부 확인
 * ExtensionDevice 테이블에서 현재 userId + status=APPROVED 레코드 존재 확인
 */
export async function checkExtensionInstalled(): Promise<
  ActionState<{ installed: boolean }>
> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId || !session?.user?.id) {
      return { success: false, error: "인증이 필요합니다" };
    }

    const device = await prisma.extensionDevice.findFirst({
      where: {
        userId: session.user.id,
        organizationId: session.user.organizationId,
        status: "APPROVED",
      },
      select: { id: true },
    });

    return { success: true, data: { installed: !!device } };
  } catch (error) {
    logger.error({ err: error }, "[checkExtensionInstalled] Error");
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Extension 설치 확인 실패",
    };
  }
}
