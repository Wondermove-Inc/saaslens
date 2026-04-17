// src/actions/devices.ts
"use server";

import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import {
  getDeviceById,
  getDevices,
  getDeviceStats,
  getShadowITApps,
  getUsersWithoutAgent,
  updateDeviceAppApprovalStatus,
  type DeviceFilterOptions,
  type DeviceListResult,
  type DeviceStats,
  type DeviceWithApps,
  type ShadowITAppSummary,
} from "@/lib/services/fleetdm";
import type { ActionState } from "@/types";
import type { DeviceAppApprovalStatus } from "@prisma/client";

/**
 * 디바이스 목록 조회 Server Action
 */
export async function fetchDevices(
  options: DeviceFilterOptions = {}
): Promise<ActionState<DeviceListResult>> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    const result = await getDevices(session.user.organizationId, options);
    return { success: true, data: result };
  } catch (error) {
    logger.error({ err: error }, "[fetchDevices] Error");
    return {
      success: false,
      error: error instanceof Error ? error.message : "디바이스 목록 조회 실패",
    };
  }
}

/**
 * 디바이스 상세 조회 Server Action
 */
export async function fetchDeviceById(
  deviceId: string
): Promise<ActionState<DeviceWithApps>> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    const device = await getDeviceById(deviceId, session.user.organizationId);
    if (!device) {
      return { success: false, error: "디바이스를 찾을 수 없습니다" };
    }

    return { success: true, data: device };
  } catch (error) {
    logger.error({ err: error }, "[fetchDeviceById] Error");
    return {
      success: false,
      error: error instanceof Error ? error.message : "디바이스 조회 실패",
    };
  }
}

/**
 * 디바이스 통계 조회 Server Action
 */
export async function fetchDeviceStats(): Promise<ActionState<DeviceStats>> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    const stats = await getDeviceStats(session.user.organizationId);
    return { success: true, data: stats };
  } catch (error) {
    logger.error({ err: error }, "[fetchDeviceStats] Error");
    return {
      success: false,
      error: error instanceof Error ? error.message : "통계 조회 실패",
    };
  }
}

/**
 * Shadow IT 앱 목록 조회 Server Action
 */
export async function fetchShadowITApps(): Promise<
  ActionState<ShadowITAppSummary[]>
> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    const apps = await getShadowITApps(session.user.organizationId);
    return { success: true, data: apps };
  } catch (error) {
    logger.error({ err: error }, "[fetchShadowITApps] Error");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Shadow IT 앱 조회 실패",
    };
  }
}

/**
 * 앱 승인 상태 변경 Server Action (Admin 전용)
 */
async function _setDeviceAppApprovalStatus(
  appName: string,
  status: DeviceAppApprovalStatus
): Promise<ActionState<{ updatedCount: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    // Admin만 앱 승인 상태 변경 가능
    if (session.user.role !== "ADMIN") {
      return { success: false, error: "권한이 없습니다" };
    }

    const result = await updateDeviceAppApprovalStatus(
      session.user.organizationId,
      appName,
      status
    );

    return { success: true, data: { updatedCount: result.updatedCount } };
  } catch (error) {
    logger.error({ err: error }, "[setDeviceAppApprovalStatus] Error");
    return {
      success: false,
      error: error instanceof Error ? error.message : "상태 변경 실패",
    };
  }
}
export const setDeviceAppApprovalStatus = withLogging(
  "setDeviceAppApprovalStatus",
  _setDeviceAppApprovalStatus
);

/**
 * 에이전트 미설치 사용자 목록 조회 Server Action
 */
export async function fetchUsersWithoutAgent(): Promise<
  ActionState<{ id: string; name: string | null; email: string }[]>
> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    const users = await getUsersWithoutAgent(session.user.organizationId);
    return { success: true, data: users };
  } catch (error) {
    logger.error({ err: error }, "[fetchUsersWithoutAgent] Error");
    return {
      success: false,
      error: error instanceof Error ? error.message : "사용자 목록 조회 실패",
    };
  }
}
