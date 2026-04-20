// src/actions/extensions/recommended-apps.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { classifyMerchantWithLLM } from "@/lib/services/saas-classifier";
import {
  extractMainDomain,
  matchDomainPattern,
} from "@/lib/utils/domain-extractor";
import type { ActionState } from "@/types";
import { revalidatePath } from "next/cache";

/**
 * 추천 앱 아이템 타입
 */
export type RecommendedAppItem = {
  id: string;
  domain: string;
  serviceName: string | null;
  category: string | null;
  confidence: number | null;
  website: string | null;
  visitCount: number;
  uniqueUsers: number;
  lastSeenAt: Date;
  scannedAt: Date;
};

/**
 * 추천 앱 리스트 응답 타입
 */
export type RecommendedAppsResponse = {
  items: RecommendedAppItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  pendingScanCount: number;
};

/**
 * 추천 앱 리스트 조회
 * - SaaS로 식별된 미등록 도메인 목록
 */
export async function getRecommendedApps(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<ActionState<RecommendedAppsResponse>> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    const { page = 1, limit = 20, search } = params;
    const skip = (page - 1) * limit;

    // SaaS로 식별된 스캔 히스토리 조회 (등록되지 않은 것만)
    const whereClause = {
      organizationId: session.user.organizationId,
      isSaaS: true,
      ...(search && {
        OR: [
          { domain: { contains: search, mode: "insensitive" as const } },
          { serviceName: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [scanHistory, , pendingCount] = await Promise.all([
      prisma.saaSDomainScanHistory.findMany({
        where: whereClause,
        include: {
          catalog: {
            select: {
              name: true,
              category: true,
              website: true,
            },
          },
        },
        orderBy: { scannedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.saaSDomainScanHistory.count({ where: whereClause }),
      getUnscannedDomainCount(session.user.organizationId),
    ]);

    // 등록된 앱 패턴 목록 조회
    const registeredPatterns = await getRegisteredPatterns(
      session.user.organizationId
    );

    // 등록된 앱 제외
    const filteredHistory = scanHistory.filter((item) => {
      return !registeredPatterns.some((p) =>
        matchDomainPattern(p, item.domain)
      );
    });

    // 방문 통계 조회
    const domainStats = await getDomainVisitStats(
      session.user.organizationId,
      filteredHistory.map((h) => h.domain)
    );

    const items: RecommendedAppItem[] = filteredHistory.map((item) => {
      const stats = domainStats.get(item.domain);
      return {
        id: item.id,
        domain: item.domain,
        serviceName: item.serviceName || item.catalog?.name || null,
        category: item.category || item.catalog?.category || null,
        confidence: item.confidence,
        website:
          item.website || item.catalog?.website || `https://${item.domain}`,
        visitCount: stats?.visitCount || 0,
        uniqueUsers: stats?.uniqueUsers || 0,
        lastSeenAt: stats?.lastSeenAt || item.scannedAt,
        scannedAt: item.scannedAt,
      };
    });

    return {
      success: true,
      data: {
        items,
        total: filteredHistory.length,
        page,
        limit,
        totalPages: Math.ceil(filteredHistory.length / limit),
        pendingScanCount: pendingCount,
      },
    };
  } catch (error) {
    console.error("[getRecommendedApps] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "추천 앱 리스트 조회 실패",
    };
  }
}

/**
 * 미스캔 도메인 스캔 실행
 * - 접속 로그에서 미등록/미스캔 도메인을 추출하여 SaaS 여부 판별
 */
export async function scanUnregisteredDomains(params: {
  batchSize?: number;
}): Promise<ActionState<{ scanned: number; saasFound: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    const { batchSize = 10 } = params;

    // 미스캔 도메인 추출
    const unscannedDomains = await getUnscannedDomains(
      session.user.organizationId,
      batchSize
    );

    if (unscannedDomains.length === 0) {
      return {
        success: true,
        data: { scanned: 0, saasFound: 0 },
        message: "스캔할 새 도메인이 없습니다.",
      };
    }

    let saasFound = 0;

    // 각 도메인에 대해 SaaS 분류 수행
    for (const domain of unscannedDomains) {
      try {
        const result = await classifyMerchantWithLLM({
          merchantName: domain,
          memo: `Website domain: ${domain}`,
        });

        const inference = result.inference;

        // 스캔 결과 저장
        await prisma.saaSDomainScanHistory.create({
          data: {
            organizationId: session.user.organizationId,
            domain,
            isSaaS: inference?.isSaaS ?? false,
            serviceName: inference?.canonicalName,
            category: inference?.category,
            confidence: inference?.confidence,
            website: inference?.website || `https://${domain}`,
            reasoning: inference?.reasoning,
          },
        });

        if (inference?.isSaaS) {
          saasFound++;
        }
      } catch (error) {
        console.error(
          `[scanUnregisteredDomains] Error scanning ${domain}:`,
          error
        );
        // 에러가 발생해도 non-SaaS로 저장하여 재스캔 방지
        await prisma.saaSDomainScanHistory.create({
          data: {
            organizationId: session.user.organizationId,
            domain,
            isSaaS: false,
            reasoning: "Scan failed",
          },
        });
      }
    }

    revalidatePath("/extensions/recommended-apps");

    return {
      success: true,
      data: {
        scanned: unscannedDomains.length,
        saasFound,
      },
      message: `${unscannedDomains.length}개 도메인 스캔 완료, ${saasFound}개 SaaS 발견`,
    };
  } catch (error) {
    console.error("[scanUnregisteredDomains] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "스캔 실패",
    };
  }
}

/**
 * 추천 앱을 등록 앱으로 추가
 */
export async function registerRecommendedApp(
  scanHistoryId: string
): Promise<ActionState<{ appId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    // 스캔 히스토리 조회
    const scanHistory = await prisma.saaSDomainScanHistory.findUnique({
      where: { id: scanHistoryId },
      include: { catalog: true },
    });

    if (
      !scanHistory ||
      scanHistory.organizationId !== session.user.organizationId
    ) {
      return { success: false, error: "추천 앱을 찾을 수 없습니다" };
    }

    // 앱 생성
    const app = await prisma.app.create({
      data: {
        organizationId: session.user.organizationId,
        name: scanHistory.serviceName || scanHistory.domain,
        customWebsite: scanHistory.website || `https://${scanHistory.domain}`,
        category: scanHistory.category,
        catalogId: scanHistory.catalogId,
        source: "MANUAL",
        status: "ACTIVE",
      },
    });

    // 화이트리스트에 추가
    const pattern = `*.${scanHistory.domain}`;
    await prisma.extensionWhitelist.upsert({
      where: {
        organizationId_pattern: {
          organizationId: session.user.organizationId,
          pattern,
        },
      },
      update: { enabled: true },
      create: {
        organizationId: session.user.organizationId,
        pattern,
        name: app.name,
        source: "ADMIN_IMPORT",
        enabled: true,
      },
    });

    revalidatePath("/extensions/recommended-apps");
    revalidatePath("/extensions/registered-apps");
    revalidatePath("/apps");

    return {
      success: true,
      data: { appId: app.id },
      message: "앱이 등록되었습니다",
    };
  } catch (error) {
    console.error("[registerRecommendedApp] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "등록 실패",
    };
  }
}

/**
 * 추천 앱 무시 (SaaS가 아닌 것으로 표시)
 */
export async function dismissRecommendedApp(
  scanHistoryId: string
): Promise<ActionState> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    // 스캔 히스토리에서 isSaaS를 false로 변경
    await prisma.saaSDomainScanHistory.update({
      where: { id: scanHistoryId },
      data: { isSaaS: false, reasoning: "Dismissed by user" },
    });

    revalidatePath("/extensions/recommended-apps");

    return { success: true, message: "무시되었습니다" };
  } catch (error) {
    console.error("[dismissRecommendedApp] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "처리 실패",
    };
  }
}

// ==================== Helper Functions ====================

/**
 * 등록된 앱 패턴 목록 조회
 */
async function getRegisteredPatterns(
  organizationId: string
): Promise<string[]> {
  const whitelists = await prisma.extensionWhitelist.findMany({
    where: { organizationId },
    select: { pattern: true },
  });
  return whitelists.map((w) => w.pattern);
}

/**
 * 미스캔 도메인 수 조회
 */
async function getUnscannedDomainCount(
  organizationId: string
): Promise<number> {
  // 최근 30일 브라우징 로그에서 고유 도메인 추출
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const browsingLogs = await prisma.extensionBrowsingLog.findMany({
    where: {
      organizationId,
      visitedAt: { gte: thirtyDaysAgo },
    },
    select: { domain: true },
    distinct: ["domain"],
  });

  const mainDomains = new Set<string>();
  for (const log of browsingLogs) {
    const mainDomain = extractMainDomain(log.domain);
    if (mainDomain) {
      mainDomains.add(mainDomain);
    }
  }

  // 이미 스캔된 도메인 제외
  const scannedDomains = await prisma.saaSDomainScanHistory.findMany({
    where: { organizationId },
    select: { domain: true },
  });
  const scannedSet = new Set(scannedDomains.map((s) => s.domain));

  // 등록된 앱 패턴 조회
  const registeredPatterns = await getRegisteredPatterns(organizationId);

  let unscannedCount = 0;
  for (const domain of mainDomains) {
    if (scannedSet.has(domain)) continue;
    if (registeredPatterns.some((p) => matchDomainPattern(p, domain))) continue;
    unscannedCount++;
  }

  return unscannedCount;
}

/**
 * 미스캔 도메인 목록 조회
 */
async function getUnscannedDomains(
  organizationId: string,
  limit: number
): Promise<string[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // 브라우징 로그에서 도메인별 방문 횟수로 정렬
  const domainStats = await prisma.extensionBrowsingLog.groupBy({
    by: ["domain"],
    where: {
      organizationId,
      visitedAt: { gte: thirtyDaysAgo },
    },
    _count: { domain: true },
    orderBy: { _count: { domain: "desc" } },
    take: 500, // 상위 500개 도메인만 검사
  });

  // 메인 도메인 추출
  const mainDomainCounts = new Map<string, number>();
  for (const stat of domainStats) {
    const mainDomain = extractMainDomain(stat.domain);
    if (mainDomain) {
      const current = mainDomainCounts.get(mainDomain) || 0;
      mainDomainCounts.set(mainDomain, current + stat._count.domain);
    }
  }

  // 이미 스캔된 도메인 제외
  const scannedDomains = await prisma.saaSDomainScanHistory.findMany({
    where: { organizationId },
    select: { domain: true },
  });
  const scannedSet = new Set(scannedDomains.map((s) => s.domain));

  // 등록된 앱 패턴 조회
  const registeredPatterns = await getRegisteredPatterns(organizationId);

  // 필터링 및 정렬
  const unscannedDomains = Array.from(mainDomainCounts.entries())
    .filter(([domain]) => {
      if (scannedSet.has(domain)) return false;
      if (registeredPatterns.some((p) => matchDomainPattern(p, domain)))
        return false;
      return true;
    })
    .sort((a, b) => b[1] - a[1]) // 방문 횟수 내림차순
    .slice(0, limit)
    .map(([domain]) => domain);

  return unscannedDomains;
}

/**
 * 도메인별 방문 통계 조회
 */
async function getDomainVisitStats(
  organizationId: string,
  domains: string[]
): Promise<
  Map<string, { visitCount: number; uniqueUsers: number; lastSeenAt: Date }>
> {
  const stats = new Map<
    string,
    { visitCount: number; uniqueUsers: number; lastSeenAt: Date }
  >();

  if (domains.length === 0) return stats;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  for (const domain of domains) {
    const [visitStats, userStats, lastLog] = await Promise.all([
      prisma.extensionBrowsingLog.count({
        where: {
          organizationId,
          domain: { contains: domain },
          visitedAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.extensionBrowsingLog.groupBy({
        by: ["userId"],
        where: {
          organizationId,
          domain: { contains: domain },
          visitedAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.extensionBrowsingLog.findFirst({
        where: {
          organizationId,
          domain: { contains: domain },
        },
        orderBy: { visitedAt: "desc" },
        select: { visitedAt: true },
      }),
    ]);

    stats.set(domain, {
      visitCount: visitStats,
      uniqueUsers: userStats.length,
      lastSeenAt: lastLog?.visitedAt || new Date(),
    });
  }

  return stats;
}
