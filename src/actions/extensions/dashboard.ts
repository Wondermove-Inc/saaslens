// src/actions/extensions/dashboard.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { ActionState } from "@/types";
import type { ExtensionDashboardStats } from "@/types/extension";

/**
 * Extension Dashboard 통계 조회
 */
export async function getExtensionDashboard(): Promise<
  ActionState<ExtensionDashboardStats>
> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    const organizationId = session.user.organizationId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 디바이스 통계
    const [activeDevices, inactiveDevices] = await Promise.all([
      prisma.extensionDevice.count({
        where: {
          organizationId,
          status: "APPROVED",
        },
      }),
      prisma.extensionDevice.count({
        where: {
          organizationId,
          status: { in: ["PENDING", "REVOKED", "INACTIVE"] },
        },
      }),
    ]);

    // 블랙리스트/화이트리스트 카운트
    const [blockedSitesCount, trackedSitesCount] = await Promise.all([
      prisma.extensionBlacklist.count({
        where: {
          organizationId,
          enabled: true,
        },
      }),
      prisma.extensionWhitelist.count({
        where: {
          organizationId,
          enabled: true,
        },
      }),
    ]);

    // 오늘 총 사용 시간
    const usageToday = await prisma.extensionUsage.aggregate({
      where: {
        organizationId,
        date: { gte: today },
      },
      _sum: {
        totalSeconds: true,
      },
    });

    // 최근 동기화 상태 (ExtensionConfig에서 조회)
    const syncConfigs = await prisma.extensionConfig.findMany({
      where: {
        organizationId,
        configKey: {
          in: ["blacklist_last_sync", "whitelist_last_sync", "usage_last_sync"],
        },
      },
    });

    const getSyncStatus = (key: string) => {
      const config = syncConfigs.find((c) => c.configKey === key);
      if (!config) {
        return { lastSync: null, status: "pending" as const };
      }
      const lastSync = new Date(config.configValue);
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return {
        lastSync,
        status:
          lastSync > hourAgo ? ("success" as const) : ("pending" as const),
      };
    };

    return {
      success: true,
      data: {
        activeDevices,
        inactiveDevices,
        blockedSitesCount,
        trackedSitesCount,
        totalUsageTimeToday: usageToday._sum.totalSeconds || 0,
        syncStatus: {
          blacklist: getSyncStatus("blacklist_last_sync"),
          whitelist: getSyncStatus("whitelist_last_sync"),
          usageData: getSyncStatus("usage_last_sync"),
        },
      },
    };
  } catch (error) {
    console.error("[getExtensionDashboard] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "대시보드 통계 조회 실패",
    };
  }
}
