// src/actions/extensions/usage.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { ActionState } from "@/types";
import type {
  DomainDetailData,
  LoginEventDetail,
  UsageAnalyticsData,
  UsageAnalyticsPeriod,
} from "@/types/extension";

/**
 * URL 또는 도메인 문자열에서 순수 도메인 추출
 * 예: "https://www.google.com/login" → "www.google.com"
 */
function extractDomain(urlOrDomain: string): string {
  try {
    // URL 형식이면 hostname 추출
    if (urlOrDomain.includes("://")) {
      const url = new URL(urlOrDomain);
      return url.hostname;
    }
    // 경로가 포함된 경우 (google.com/login)
    if (urlOrDomain.includes("/")) {
      return urlOrDomain.split("/")[0];
    }
    // 이미 순수 도메인
    return urlOrDomain;
  } catch {
    return urlOrDomain;
  }
}

/**
 * 도메인이 whitelist 패턴과 매칭되는지 확인
 */
function matchesWhitelistPattern(domain: string, pattern: string): boolean {
  const extractedDomain = extractDomain(domain);
  const domainLower = extractedDomain.toLowerCase();
  const patternLower = pattern.toLowerCase();

  // 와일드카드 패턴 (*.example.com)
  if (patternLower.startsWith("*.")) {
    const suffix = patternLower.slice(2);
    return domainLower === suffix || domainLower.endsWith("." + suffix);
  }

  // 정확한 매칭
  return domainLower === patternLower;
}

/**
 * 조직의 활성화된 whitelist 패턴 목록 조회
 */
async function getEnabledWhitelistPatterns(
  organizationId: string
): Promise<string[]> {
  const whitelists = await prisma.extensionWhitelist.findMany({
    where: {
      organizationId,
      enabled: true,
    },
    select: {
      pattern: true,
    },
  });

  return whitelists.map((w) => w.pattern);
}

/**
 * 도메인이 whitelist에 포함되는지 확인
 */
function isDomainWhitelisted(domain: string, patterns: string[]): boolean {
  return patterns.some((pattern) => matchesWhitelistPattern(domain, pattern));
}

/**
 * Usage Analytics 데이터 조회 (로그인 기반 + Whitelist 필터링)
 */
export async function getUsageAnalytics(
  period: UsageAnalyticsPeriod = "today"
): Promise<ActionState<UsageAnalyticsData>> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    const organizationId = session.user.organizationId;

    // 기간 계산
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    // Whitelist 패턴 조회
    const whitelistPatterns = await getEnabledWhitelistPatterns(organizationId);

    // 로그인 이벤트 조회
    const loginEvents = await prisma.extensionLoginEvent.findMany({
      where: {
        organizationId,
        capturedAt: { gte: startDate },
      },
      select: {
        id: true,
        domain: true,
        username: true,
        deviceId: true,
      },
    });

    // Whitelist 필터링
    const filteredEvents = loginEvents.filter((event) =>
      isDomainWhitelisted(event.domain, whitelistPatterns)
    );

    // 도메인별 집계
    const domainStats = new Map<
      string,
      { loginCount: number; users: Set<string>; devices: Set<string> }
    >();

    for (const event of filteredEvents) {
      const existing = domainStats.get(event.domain) || {
        loginCount: 0,
        users: new Set<string>(),
        devices: new Set<string>(),
      };

      existing.loginCount++;
      existing.users.add(event.username);
      existing.devices.add(event.deviceId);

      domainStats.set(event.domain, existing);
    }

    // 정렬 및 변환
    const topDomains = Array.from(domainStats.entries())
      .map(([domain, stats]) => ({
        domain,
        loginCount: stats.loginCount,
        uniqueUsers: stats.users.size,
        uniqueDevices: stats.devices.size,
      }))
      .sort((a, b) => b.loginCount - a.loginCount)
      .slice(0, 20);

    // 전체 통계
    const allUsers = new Set<string>();
    const allDevices = new Set<string>();

    for (const event of filteredEvents) {
      allUsers.add(event.username);
      allDevices.add(event.deviceId);
    }

    return {
      success: true,
      data: {
        period,
        totalLogins: filteredEvents.length,
        uniqueUsers: allUsers.size,
        uniqueDevices: allDevices.size,
        topDomains,
      },
    };
  } catch (error) {
    console.error("[getUsageAnalytics] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "사용량 분석 조회 실패",
    };
  }
}

/**
 * 도메인별 로그인 이벤트 상세 조회
 */
export async function getDomainLoginEvents(
  domain: string,
  date: string
): Promise<ActionState<DomainDetailData>> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    const organizationId = session.user.organizationId;

    // 날짜 파싱 (YYYY-MM-DD)
    const targetDate = new Date(date);
    const startOfDay = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate()
    );
    const endOfDay = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate() + 1
    );

    // Whitelist 체크
    const whitelistPatterns = await getEnabledWhitelistPatterns(organizationId);
    if (!isDomainWhitelisted(domain, whitelistPatterns)) {
      return {
        success: false,
        error: "해당 도메인은 whitelist에 등록되지 않았습니다",
      };
    }

    // 로그인 이벤트 조회 (User join 포함)
    const events = await prisma.extensionLoginEvent.findMany({
      where: {
        organizationId,
        domain,
        capturedAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: {
        capturedAt: "desc",
      },
      take: 200,
    });

    // 통계 계산
    const users = new Set<string>();
    const devices = new Set<string>();

    for (const event of events) {
      users.add(event.username);
      devices.add(event.deviceId);
    }

    const eventDetails: LoginEventDetail[] = events.map((e) => ({
      id: e.id,
      domain: e.domain,
      username: e.username,
      userName: e.user?.name ?? null,
      userEmail: e.user?.email ?? null,
      authType: e.authType,
      capturedAt: e.capturedAt,
      deviceId: e.deviceId,
    }));

    return {
      success: true,
      data: {
        domain,
        loginCount: events.length,
        uniqueUsers: users.size,
        uniqueDevices: devices.size,
        events: eventDetails,
      },
    };
  } catch (error) {
    console.error("[getDomainLoginEvents] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "로그인 이벤트 조회 실패",
    };
  }
}
