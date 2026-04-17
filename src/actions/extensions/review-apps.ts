// src/actions/extensions/review-apps.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  checkDomainSafety,
  getThreatTypeLabel,
  type ThreatType,
} from "@/lib/services/google-safe-browsing";
import { classifyMerchantWithLLM } from "@/lib/services/saas-classifier";
import {
  extractMainDomain,
  matchDomainPattern,
  matchDomainWithTldVariants,
} from "@/lib/utils/domain-extractor";
import type { ActionState } from "@/types";
import { revalidatePath } from "next/cache";

/**
 * 검토 대기 앱 유형
 */
export type ReviewAppType = "malicious" | "saas";

/**
 * 검토 대기 앱 아이템 타입
 */
export type ReviewAppItem = {
  id: string;
  domain: string;
  type: ReviewAppType;
  typeBadge: string;
  reason: string;
  serviceName: string | null;
  category: string | null;
  confidence: number | null;
  website: string | null;
  visitCount: number;
  uniqueUsers: number;
  lastSeenAt: Date;
  scannedAt: Date;
  threatType: ThreatType | null;
  reviewStatus: string;
};

/**
 * 검토 대기 앱 리스트 응답 타입
 */
export type ReviewAppsResponse = {
  items: ReviewAppItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  pendingScanCount: number;
  stats: {
    maliciousCount: number;
    saasCount: number;
  };
};

/**
 * 검토 대기 앱 리스트 조회
 * - 악성 의심 URL + SaaS로 식별된 미등록 도메인 목록
 */
export async function getReviewApps(params: {
  page?: number;
  limit?: number;
  search?: string;
  filter?: "all" | "malicious" | "saas";
}): Promise<ActionState<ReviewAppsResponse>> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    const { page = 1, limit = 20, search, filter = "all" } = params;
    const skip = (page - 1) * limit;

    // 필터 조건 구성
    const baseWhere = {
      organizationId: session.user.organizationId,
      reviewStatus: "pending",
      ...(search && {
        OR: [
          { domain: { contains: search, mode: "insensitive" as const } },
          { serviceName: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    // 유형별 필터
    const whereClause =
      filter === "malicious"
        ? { ...baseWhere, isMalicious: true }
        : filter === "saas"
          ? { ...baseWhere, isSaaS: true, isMalicious: false }
          : { ...baseWhere, OR: [{ isMalicious: true }, { isSaaS: true }] };

    const [scanHistory, totalCount, pendingCount, allPendingScans] =
      await Promise.all([
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
          orderBy: [{ isMalicious: "desc" }, { scannedAt: "desc" }],
          skip,
          take: limit,
        }),
        prisma.saaSDomainScanHistory.count({ where: whereClause }),
        getUnscannedDomainCount(session.user.organizationId),
        // stats용: 전체 pending 스캔 조회 (필터링 후 정확한 카운트 산출)
        prisma.saaSDomainScanHistory.findMany({
          where: {
            organizationId: session.user.organizationId,
            reviewStatus: "pending",
            OR: [{ isMalicious: true }, { isSaaS: true }],
          },
          select: { domain: true, isMalicious: true, isSaaS: true },
        }),
      ]);

    // 등록된 앱 패턴 목록 조회
    const registeredPatterns = await getRegisteredPatterns(
      session.user.organizationId
    );

    const isRegisteredDomain = (domain: string) =>
      registeredPatterns.some(
        (p) =>
          matchDomainPattern(p, domain) || matchDomainWithTldVariants(p, domain)
      );

    // 등록된 앱 제외 (TLD 변형도 매칭)
    const filteredHistory = scanHistory.filter(
      (item) => !isRegisteredDomain(item.domain)
    );

    // stats: 필터링 후 정확한 카운트
    const filteredAllPending = allPendingScans.filter(
      (item) => !isRegisteredDomain(item.domain)
    );
    const maliciousCount = filteredAllPending.filter(
      (i) => i.isMalicious
    ).length;
    const saasCount = filteredAllPending.filter(
      (i) => i.isSaaS && !i.isMalicious
    ).length;

    // 방문 통계 조회
    const domainStats = await getDomainVisitStats(
      session.user.organizationId,
      filteredHistory.map((h) => h.domain)
    );

    const items: ReviewAppItem[] = filteredHistory.map((item) => {
      const stats = domainStats.get(item.domain);
      const isMalicious = item.isMalicious;

      return {
        id: item.id,
        domain: item.domain,
        type: isMalicious ? "malicious" : "saas",
        typeBadge: isMalicious ? "악성 의심" : "SaaS",
        reason: isMalicious
          ? getThreatTypeLabel(item.threatType as ThreatType)
          : item.reasoning || "AI 분류 결과",
        serviceName: item.serviceName || item.catalog?.name || null,
        category: item.category || item.catalog?.category || null,
        confidence: item.confidence,
        website:
          item.website || item.catalog?.website || `https://${item.domain}`,
        visitCount: stats?.visitCount || 0,
        uniqueUsers: stats?.uniqueUsers || 0,
        lastSeenAt: stats?.lastSeenAt || item.scannedAt,
        scannedAt: item.scannedAt,
        threatType: item.threatType as ThreatType | null,
        reviewStatus: item.reviewStatus,
      };
    });

    return {
      success: true,
      data: {
        items,
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        pendingScanCount: pendingCount,
        stats: {
          maliciousCount,
          saasCount,
        },
      },
    };
  } catch (error) {
    console.error("[getReviewApps] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "검토 대기 앱 리스트 조회 실패",
    };
  }
}

/**
 * 미스캔 도메인 스캔 실행
 * - 접속 로그에서 미등록/미스캔 도메인을 추출
 * - LLM으로 SaaS 여부 판별 + Google Safe Browsing으로 악성 검사
 */
export async function scanUnregisteredDomains(params: {
  batchSize?: number;
  organizationId?: string;
}): Promise<
  ActionState<{ scanned: number; saasFound: number; maliciousFound: number }>
> {
  try {
    let orgId = params.organizationId;

    if (!orgId) {
      const session = await auth();
      if (!session?.user?.organizationId) {
        return { success: false, error: "인증이 필요합니다" };
      }
      orgId = session.user.organizationId;
    }

    const { batchSize = 10 } = params;

    // 미스캔 도메인 추출
    const unscannedDomains = await getUnscannedDomains(orgId, batchSize);

    if (unscannedDomains.length === 0) {
      return {
        success: true,
        data: { scanned: 0, saasFound: 0, maliciousFound: 0 },
        message: "스캔할 새 도메인이 없습니다.",
      };
    }

    let saasFound = 0;
    let maliciousFound = 0;

    // 각 도메인에 대해 SaaS 분류 + 악성 검사 수행
    for (const domain of unscannedDomains) {
      try {
        // 1. Google Safe Browsing API로 악성 검사
        const safetyResult = await checkDomainSafety(domain);

        // 2. LLM으로 SaaS 분류
        const classifyResult = await classifyMerchantWithLLM({
          merchantName: domain,
          memo: `Website domain: ${domain}`,
        });

        const inference = classifyResult.inference;

        // 스캔 결과 저장
        await prisma.saaSDomainScanHistory.create({
          data: {
            organizationId: orgId,
            domain,
            isSaaS: inference?.isSaaS ?? false,
            serviceName: inference?.canonicalName,
            category: inference?.category,
            confidence: inference?.confidence,
            website: inference?.website || `https://${domain}`,
            reasoning: inference?.reasoning,
            // 악성 검사 결과
            isMalicious: safetyResult.isMalicious,
            threatType: safetyResult.threatType,
            safeBrowsingCheckedAt: new Date(),
            reviewStatus: "pending",
          },
        });

        if (inference?.isSaaS) {
          saasFound++;
        }
        if (safetyResult.isMalicious) {
          maliciousFound++;
        }
      } catch (error) {
        console.error(
          `[scanUnregisteredDomains] Error scanning ${domain}:`,
          error
        );
        // 에러가 발생해도 저장하여 재스캔 방지
        await prisma.saaSDomainScanHistory.create({
          data: {
            organizationId: orgId,
            domain,
            isSaaS: false,
            isMalicious: false,
            reasoning: "Scan failed",
            reviewStatus: "pending",
          },
        });
      }
    }

    revalidatePath("/extensions/review-apps");

    return {
      success: true,
      data: {
        scanned: unscannedDomains.length,
        saasFound,
        maliciousFound,
      },
      message: `${unscannedDomains.length}개 도메인 스캔 완료 (SaaS: ${saasFound}, 악성: ${maliciousFound})`,
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
 * 검토 대기 앱을 등록 앱으로 추가
 */
export async function registerReviewApp(
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
      return { success: false, error: "검토 대기 앱을 찾을 수 없습니다" };
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

    // 검토 상태 업데이트
    await prisma.saaSDomainScanHistory.update({
      where: { id: scanHistoryId },
      data: { reviewStatus: "registered" },
    });

    revalidatePath("/extensions/review-apps");
    revalidatePath("/extensions/registered-apps");
    revalidatePath("/apps");

    return {
      success: true,
      data: { appId: app.id },
      message: "앱이 등록되었습니다",
    };
  } catch (error) {
    console.error("[registerReviewApp] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "등록 실패",
    };
  }
}

/**
 * 검토 대기 앱을 차단
 */
export async function blockReviewApp(
  scanHistoryId: string,
  blockReason?: string
): Promise<ActionState> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    // 스캔 히스토리 조회
    const scanHistory = await prisma.saaSDomainScanHistory.findUnique({
      where: { id: scanHistoryId },
    });

    if (
      !scanHistory ||
      scanHistory.organizationId !== session.user.organizationId
    ) {
      return { success: false, error: "검토 대기 앱을 찾을 수 없습니다" };
    }

    // 블랙리스트에 추가
    const pattern = `*.${scanHistory.domain}`;
    const reason =
      blockReason ||
      (scanHistory.isMalicious
        ? `악성 URL 탐지: ${getThreatTypeLabel(scanHistory.threatType as ThreatType)}`
        : "관리자에 의해 차단됨");

    await prisma.extensionBlacklist.upsert({
      where: {
        organizationId_pattern: {
          organizationId: session.user.organizationId,
          pattern,
        },
      },
      update: { enabled: true, reason },
      create: {
        organizationId: session.user.organizationId,
        pattern,
        name: scanHistory.serviceName || scanHistory.domain,
        reason,
        enabled: true,
      },
    });

    // 검토 상태 업데이트
    await prisma.saaSDomainScanHistory.update({
      where: { id: scanHistoryId },
      data: { reviewStatus: "blocked" },
    });

    revalidatePath("/extensions/review-apps");
    revalidatePath("/extensions/blocked-apps");
    revalidatePath("/extensions/blacklist");

    return { success: true, message: "차단되었습니다" };
  } catch (error) {
    console.error("[blockReviewApp] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "차단 실패",
    };
  }
}

/**
 * 검토 대기 앱 무시 (SaaS가 아닌 것으로 표시)
 */
export async function dismissReviewApp(
  scanHistoryId: string
): Promise<ActionState> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    // 스캔 히스토리에서 검토 완료 처리
    await prisma.saaSDomainScanHistory.update({
      where: { id: scanHistoryId },
      data: {
        isSaaS: false,
        isMalicious: false,
        reviewStatus: "dismissed",
        reasoning: "Dismissed by user",
      },
    });

    revalidatePath("/extensions/review-apps");

    return { success: true, message: "무시되었습니다" };
  } catch (error) {
    console.error("[dismissReviewApp] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "처리 실패",
    };
  }
}

/**
 * 일괄 등록
 */
export async function bulkRegisterReviewApps(
  scanHistoryIds: string[]
): Promise<ActionState<{ registered: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    let registered = 0;

    for (const id of scanHistoryIds) {
      const result = await registerReviewApp(id);
      if (result.success) {
        registered++;
      }
    }

    return {
      success: true,
      data: { registered },
      message: `${registered}개 앱이 등록되었습니다`,
    };
  } catch (error) {
    console.error("[bulkRegisterReviewApps] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "일괄 등록 실패",
    };
  }
}

/**
 * 일괄 차단
 */
export async function bulkBlockReviewApps(
  scanHistoryIds: string[],
  blockReason?: string
): Promise<ActionState<{ blocked: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    let blocked = 0;

    for (const id of scanHistoryIds) {
      const result = await blockReviewApp(id, blockReason);
      if (result.success) {
        blocked++;
      }
    }

    return {
      success: true,
      data: { blocked },
      message: `${blocked}개 앱이 차단되었습니다`,
    };
  } catch (error) {
    console.error("[bulkBlockReviewApps] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "일괄 차단 실패",
    };
  }
}

/**
 * 자동 스캔 스케줄 현황 조회
 */
export async function getScanScheduleStatus(): Promise<
  ActionState<{
    totalScannedCount: number;
    pendingScanCount: number;
    lastScanAt: Date | null;
    nextScanAt: Date;
  }>
> {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return { success: false, error: "인증이 필요합니다" };
    }

    const orgId = session.user.organizationId;

    const [totalScannedCount, pendingScanCount, lastScanRecord] =
      await Promise.all([
        prisma.saaSDomainScanHistory.count({
          where: { organizationId: orgId },
        }),
        getUnscannedDomainCount(orgId),
        prisma.saaSDomainScanHistory.findFirst({
          where: { organizationId: orgId },
          orderBy: { scannedAt: "desc" },
          select: { scannedAt: true },
        }),
      ]);

    // 다음 3:00 AM UTC 계산
    const now = new Date();
    const nextScanAt = new Date(now);
    nextScanAt.setUTCHours(3, 0, 0, 0);
    if (nextScanAt <= now) {
      nextScanAt.setUTCDate(nextScanAt.getUTCDate() + 1);
    }

    return {
      success: true,
      data: {
        totalScannedCount,
        pendingScanCount,
        lastScanAt: lastScanRecord?.scannedAt ?? null,
        nextScanAt,
      },
    };
  } catch (error) {
    console.error("[getScanScheduleStatus] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "스케줄 현황 조회 실패",
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

  const scannedDomains = await prisma.saaSDomainScanHistory.findMany({
    where: { organizationId },
    select: { domain: true },
  });
  const scannedSet = new Set(scannedDomains.map((s) => s.domain));

  const registeredPatterns = await getRegisteredPatterns(organizationId);

  let unscannedCount = 0;
  for (const domain of mainDomains) {
    if (scannedSet.has(domain)) continue;
    if (
      registeredPatterns.some(
        (p) =>
          matchDomainPattern(p, domain) || matchDomainWithTldVariants(p, domain)
      )
    )
      continue;
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

  const domainStats = await prisma.extensionBrowsingLog.groupBy({
    by: ["domain"],
    where: {
      organizationId,
      visitedAt: { gte: thirtyDaysAgo },
    },
    _count: { domain: true },
    orderBy: { _count: { domain: "desc" } },
    take: 500,
  });

  const mainDomainCounts = new Map<string, number>();
  for (const stat of domainStats) {
    const mainDomain = extractMainDomain(stat.domain);
    if (mainDomain) {
      const current = mainDomainCounts.get(mainDomain) || 0;
      mainDomainCounts.set(mainDomain, current + stat._count.domain);
    }
  }

  const scannedDomains = await prisma.saaSDomainScanHistory.findMany({
    where: { organizationId },
    select: { domain: true },
  });
  const scannedSet = new Set(scannedDomains.map((s) => s.domain));

  const registeredPatterns = await getRegisteredPatterns(organizationId);

  const unscannedDomains = Array.from(mainDomainCounts.entries())
    .filter(([domain]) => {
      if (scannedSet.has(domain)) return false;
      if (
        registeredPatterns.some(
          (p) =>
            matchDomainPattern(p, domain) ||
            matchDomainWithTldVariants(p, domain)
        )
      )
        return false;
      return true;
    })
    .sort((a, b) => b[1] - a[1])
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
