// src/app/api/v1/extensions/config/sync/route.ts
/**
 * Extension Config Sync API
 * 원격 설정 조회 (syncIntervals, features, filters)
 */

import { withExtensionAuth } from "@/lib/api/extension-auth";
import { prisma } from "@/lib/db";
import { withLogging } from "@/lib/logging";
import type { RemoteConfigData } from "@/types/extension-api";
import { NextResponse } from "next/server";

// 기본 설정값
const DEFAULT_CONFIG: RemoteConfigData = {
  version: "1.0.0",
  syncIntervals: {
    blacklist: 5, // 5분
    whitelist: 5, // 5분
    usage: 10, // 10분
    config: 60, // 60분
  },
  features: {
    timeTracking: true,
    blacklistBlocking: true,
    loginCapture: true,
    usernameFiltering: false,
  },
  filters: {
    usernameFilters: [],
  },
};

/**
 * POST /api/v1/extensions/config/sync
 * 조직의 Extension 설정 조회
 */
export const POST = withLogging(
  "ext:config-sync",
  withExtensionAuth(async (_request, { auth }) => {
    // DB에서 조직별 설정 조회
    const configItems = await prisma.extensionConfig.findMany({
      where: {
        organizationId: auth.organizationId,
        isActive: true,
      },
      select: {
        configKey: true,
        configValue: true,
        category: true,
        valueType: true,
      },
    });

    // 기본값 복사
    const config: RemoteConfigData = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

    // DB 설정으로 오버라이드
    for (const item of configItems) {
      const value = parseConfigValue(item.configValue, item.valueType);

      switch (item.category) {
        case "SYNC_INTERVALS":
          if (item.configKey in config.syncIntervals) {
            (config.syncIntervals as Record<string, number>)[item.configKey] =
              value as number;
          }
          break;
        case "FEATURES":
          if (item.configKey in config.features) {
            (config.features as Record<string, boolean>)[item.configKey] =
              value as boolean;
          }
          break;
        case "FILTERS":
          if (item.configKey === "usernameFilters" && Array.isArray(value)) {
            config.filters.usernameFilters = value;
          }
          break;
        case "GENERAL":
          if (item.configKey === "version" && typeof value === "string") {
            config.version = value;
          }
          break;
      }
    }

    // 온보딩 섹션 추가 (항상 enabled)
    config.onboarding = { enabled: true };

    return NextResponse.json({
      success: true,
      config,
    });
  })
);

/**
 * 설정값 파싱
 */
function parseConfigValue(
  value: string,
  valueType: string
): string | number | boolean | string[] {
  switch (valueType) {
    case "NUMBER":
      return parseInt(value, 10);
    case "BOOLEAN":
      return value.toLowerCase() === "true";
    case "JSON":
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    default:
      return value;
  }
}
