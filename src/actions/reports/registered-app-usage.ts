// src/actions/reports/registered-app-usage.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { matchDomainPattern } from "@/lib/utils/domain-extractor";
import type { ActionState } from "@/types";
import { getTranslations } from "next-intl/server";

/**
 * 등록 앱 접속 로그 아이템 타입
 */
export type RegisteredAppUsageItem = {
  id: string;
  appName: string;
  appId: string | null;
  url: string;
  domain: string;
  ipAddress: string;
  visitedAt: Date;
  durationSeconds: number | null;
  userId: string;
  userName: string | null;
  userEmail: string;
  deviceId: string;
};

/**
 * 등록 앱 접속 현황 응답 타입
 */
export type RegisteredAppUsageResponse = {
  items: RegisteredAppUsageItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: {
    totalVisits: number;
    uniqueUsers: number;
    uniqueApps: number;
    totalDuration: number;
  };
};

/**
 * 등록 앱 접속 현황 필터 타입
 */
export type RegisteredAppUsageFilters = {
  startDate: Date;
  endDate: Date;
  appId?: string;
  userId?: string;
  search?: string;
  page?: number;
  limit?: number;
};

/**
 * 등록 앱별 요약 아이템 타입
 */
export type AppUsageSummaryItem = {
  appId: string | null;
  appName: string;
  pattern: string;
  visitCount: number;
  uniqueUsers: number;
  totalDuration: number;
  lastVisitedAt: Date | null;
};

/**
 * 등록 앱 접속 현황 조회
 */
export async function getRegisteredAppUsageReport(
  filters: RegisteredAppUsageFilters
): Promise<ActionState<RegisteredAppUsageResponse>> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    const {
      startDate,
      endDate,
      appId,
      userId,
      search,
      page = 1,
      limit = 50,
    } = filters;
    const skip = (page - 1) * limit;

    // 등록된 앱 패턴 조회
    const whitelists = await prisma.extensionWhitelist.findMany({
      where: {
        organizationId: session.user.organizationId,
        enabled: true,
      },
      select: { pattern: true, name: true },
    });

    if (whitelists.length === 0) {
      return {
        success: true,
        data: {
          items: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
          summary: {
            totalVisits: 0,
            uniqueUsers: 0,
            uniqueApps: 0,
            totalDuration: 0,
          },
        },
      };
    }

    // 앱 ID로 필터링 시 해당 앱의 URL 패턴 조회
    let targetPatterns = whitelists;
    if (appId) {
      const app = await prisma.app.findUnique({
        where: { id: appId },
        include: { catalog: { select: { website: true } } },
      });
      if (app) {
        const website = app.customWebsite || app.catalog?.website;
        if (website) {
          const pattern = `*.${extractDomainFromUrl(website)}`;
          targetPatterns = whitelists.filter((w) => w.pattern === pattern);
        }
      }
    }

    // 브라우징 로그 조회 (화이트리스트 패턴과 매칭되는 것만)
    const browsingLogs = await prisma.extensionBrowsingLog.findMany({
      where: {
        organizationId: session.user.organizationId,
        visitedAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(userId && { userId }),
        ...(search && {
          OR: [
            { url: { contains: search, mode: "insensitive" } },
            { domain: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { visitedAt: "desc" },
    });

    // 패턴 매칭 필터링
    const patternMap = new Map(targetPatterns.map((p) => [p.pattern, p.name]));
    const matchedLogs = browsingLogs.filter((log) => {
      for (const pattern of patternMap.keys()) {
        if (matchDomainPattern(pattern, log.domain)) {
          return true;
        }
      }
      return false;
    });

    // 페이지네이션 적용
    const paginatedLogs = matchedLogs.slice(skip, skip + limit);

    // 앱 정보 조회 (URL 기반 매칭)
    const apps = await prisma.app.findMany({
      where: { organizationId: session.user.organizationId, status: "ACTIVE" },
      include: { catalog: { select: { website: true } } },
    });

    const urlToAppMap = new Map<string, { id: string; name: string }>();
    for (const app of apps) {
      const website = app.customWebsite || app.catalog?.website;
      if (website) {
        const domain = extractDomainFromUrl(website);
        urlToAppMap.set(domain, { id: app.id, name: app.name });
      }
    }

    // 체류 시간 조회 (extension_usages에서)
    const usageData = await prisma.extensionUsage.findMany({
      where: {
        organizationId: session.user.organizationId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        deviceId: true,
        domain: true,
        totalSeconds: true,
        date: true,
      },
    });

    const usageMap = new Map<string, number>();
    for (const usage of usageData) {
      const key = `${usage.deviceId}-${usage.domain}-${usage.date.toISOString().split("T")[0]}`;
      usageMap.set(key, usage.totalSeconds);
    }

    // 결과 매핑
    const items: RegisteredAppUsageItem[] = paginatedLogs.map((log) => {
      // 앱 찾기
      let appInfo: { id: string | null; name: string } = {
        id: null,
        name: "Unknown",
      };
      for (const [domain, info] of urlToAppMap) {
        if (log.domain.includes(domain) || domain.includes(log.domain)) {
          appInfo = info;
          break;
        }
      }

      // 패턴에서 이름 찾기
      for (const [pattern, name] of patternMap) {
        if (matchDomainPattern(pattern, log.domain)) {
          if (!appInfo.id) {
            appInfo.name = name;
          }
          break;
        }
      }

      // 체류 시간 찾기
      const dateStr = log.visitedAt.toISOString().split("T")[0];
      const usageKey = `${log.deviceId}-${log.domain}-${dateStr}`;
      const durationSeconds = usageMap.get(usageKey) || null;

      return {
        id: log.id,
        appName: appInfo.name,
        appId: appInfo.id,
        url: log.url,
        domain: log.domain,
        ipAddress: log.ipAddress,
        visitedAt: log.visitedAt,
        durationSeconds,
        userId: log.user.id,
        userName: log.user.name,
        userEmail: log.user.email,
        deviceId: log.deviceId,
      };
    });

    // 요약 통계 계산
    const uniqueUsers = new Set(matchedLogs.map((l) => l.userId));
    const uniqueApps = new Set<string>();
    let totalDuration = 0;

    for (const log of matchedLogs) {
      for (const [domain] of urlToAppMap) {
        if (log.domain.includes(domain)) {
          uniqueApps.add(domain);
          break;
        }
      }
      const dateStr = log.visitedAt.toISOString().split("T")[0];
      const usageKey = `${log.deviceId}-${log.domain}-${dateStr}`;
      totalDuration += usageMap.get(usageKey) || 0;
    }

    return {
      success: true,
      data: {
        items,
        total: matchedLogs.length,
        page,
        limit,
        totalPages: Math.ceil(matchedLogs.length / limit),
        summary: {
          totalVisits: matchedLogs.length,
          uniqueUsers: uniqueUsers.size,
          uniqueApps: uniqueApps.size,
          totalDuration,
        },
      },
    };
  } catch (error) {
    console.error("[getRegisteredAppUsageReport] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "등록 앱 접속 현황 조회 실패",
    };
  }
}

/**
 * 등록 앱별 사용 요약 조회
 */
export async function getRegisteredAppUsageSummary(filters: {
  startDate: Date;
  endDate: Date;
}): Promise<ActionState<AppUsageSummaryItem[]>> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    const { startDate, endDate } = filters;

    // 등록된 앱 패턴 조회
    const whitelists = await prisma.extensionWhitelist.findMany({
      where: {
        organizationId: session.user.organizationId,
        enabled: true,
      },
      select: { pattern: true, name: true },
    });

    // 앱 정보 조회
    const apps = await prisma.app.findMany({
      where: { organizationId: session.user.organizationId, status: "ACTIVE" },
      include: { catalog: { select: { website: true } } },
    });

    const patternToAppMap = new Map<
      string,
      { id: string | null; name: string }
    >();
    for (const whitelist of whitelists) {
      // 앱과 매칭
      let matchedApp: { id: string | null; name: string } = {
        id: null,
        name: whitelist.name,
      };
      for (const app of apps) {
        const website = app.customWebsite || app.catalog?.website;
        if (website) {
          const appPattern = `*.${extractDomainFromUrl(website)}`;
          if (appPattern === whitelist.pattern) {
            matchedApp = { id: app.id, name: app.name };
            break;
          }
        }
      }
      patternToAppMap.set(whitelist.pattern, matchedApp);
    }

    // 브라우징 로그 조회
    const browsingLogs = await prisma.extensionBrowsingLog.findMany({
      where: {
        organizationId: session.user.organizationId,
        visitedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        domain: true,
        userId: true,
        visitedAt: true,
        deviceId: true,
      },
    });

    // 체류 시간 조회
    const usageData = await prisma.extensionUsage.findMany({
      where: {
        organizationId: session.user.organizationId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        deviceId: true,
        domain: true,
        totalSeconds: true,
      },
    });

    const usageMap = new Map<string, number>();
    for (const usage of usageData) {
      const existing = usageMap.get(usage.domain) || 0;
      usageMap.set(usage.domain, existing + usage.totalSeconds);
    }

    // 패턴별 통계 집계
    const summaryMap = new Map<
      string,
      {
        appId: string | null;
        appName: string;
        visitCount: number;
        users: Set<string>;
        totalDuration: number;
        lastVisitedAt: Date | null;
      }
    >();

    for (const [pattern, appInfo] of patternToAppMap) {
      summaryMap.set(pattern, {
        appId: appInfo.id,
        appName: appInfo.name,
        visitCount: 0,
        users: new Set(),
        totalDuration: 0,
        lastVisitedAt: null,
      });
    }

    for (const log of browsingLogs) {
      for (const [pattern, summary] of summaryMap) {
        if (matchDomainPattern(pattern, log.domain)) {
          summary.visitCount++;
          summary.users.add(log.userId);
          summary.totalDuration += usageMap.get(log.domain) || 0;
          if (!summary.lastVisitedAt || log.visitedAt > summary.lastVisitedAt) {
            summary.lastVisitedAt = log.visitedAt;
          }
          break;
        }
      }
    }

    const items: AppUsageSummaryItem[] = Array.from(summaryMap.entries())
      .map(([pattern, summary]) => ({
        appId: summary.appId,
        appName: summary.appName,
        pattern,
        visitCount: summary.visitCount,
        uniqueUsers: summary.users.size,
        totalDuration: summary.totalDuration,
        lastVisitedAt: summary.lastVisitedAt,
      }))
      .filter((item) => item.visitCount > 0)
      .sort((a, b) => b.visitCount - a.visitCount);

    return { success: true, data: items };
  } catch (error) {
    console.error("[getRegisteredAppUsageSummary] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "앱별 사용 요약 조회 실패",
    };
  }
}

/**
 * 날짜 범위 프리셋 조회
 */
export async function getDateRangePresets(): Promise<
  { value: string; label: string; startDate: Date; endDate: Date }[]
> {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const t = await getTranslations("reports.registeredAppUsage.presets");

  return [
    {
      value: "today",
      label: t("today"),
      startDate: startOfToday,
      endDate: today,
    },
    {
      value: "7d",
      label: t("7d"),
      startDate: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
      endDate: today,
    },
    {
      value: "30d",
      label: t("30d"),
      startDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
      endDate: today,
    },
    {
      value: "90d",
      label: t("90d"),
      startDate: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000),
      endDate: today,
    },
  ];
}

// ==================== Helper Functions ====================

/**
 * URL에서 도메인 추출
 */
function extractDomainFromUrl(url: string): string {
  try {
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    const urlObj = new URL(normalizedUrl);
    let hostname = urlObj.hostname.toLowerCase();
    if (hostname.startsWith("www.")) {
      hostname = hostname.substring(4);
    }
    return hostname;
  } catch {
    return url;
  }
}
