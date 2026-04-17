// src/actions/security-insights.ts
"use server";

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import {
  matchDomainPattern,
  matchDomainWithTldVariants,
} from "@/lib/utils/domain-extractor";

export interface SecurityInsights {
  blockedApps: number;
  pendingReviewApps: number;
  terminatedUsersWithAccess: number;
  unmatchedPaymentsCount: number;
  unmatchedPaymentsAmount: number;
  ssoCoveragePct: number;
  riskyApps: Array<{
    id: string;
    domain: string;
    type: "malicious" | "saas";
    serviceName: string | null;
    category: string | null;
    visitCount: number;
    uniqueUsers: number;
    scannedAt: Date;
  }>;
  offboardingGaps: Array<{
    userId: string;
    userName: string | null;
    userEmail: string;
    appName: string;
    lastUsedAt: Date | null;
    accessSource: string;
  }>;
  shadowAi: {
    count: number;
    monthlyCost: number;
    topMerchants: Array<{ name: string; total: number; count: number }>;
    topApps: Array<{
      name: string;
      category: string | null;
      total: number;
      count: number;
    }>;
  };
}

function isAiPayment(payment: {
  merchantName: string;
  matchedApp?: {
    category?: string | null;
    catalog?: { category?: string | null } | null;
  } | null;
}) {
  const name = payment.merchantName.toLowerCase();
  const appCat =
    payment.matchedApp?.category?.toLowerCase() ||
    payment.matchedApp?.catalog?.category?.toLowerCase() ||
    "";

  const keywords = [
    "ai",
    "gpt",
    "chatgpt",
    "claude",
    "midjourney",
    "perplexity",
    "cursor",
    "copilot",
    "stability",
    "openai",
  ];

  const nameMatch = keywords.some((k) => name.includes(k));
  const categoryMatch = appCat.includes("ai") || appCat.includes("ml");

  return nameMatch || categoryMatch;
}

export async function getSecurityInsights(): Promise<SecurityInsights> {
  const { organizationId } = await requireOrganization();

  const [
    blockedApps,
    pendingDomainScans,
    whitelistPatterns,
    terminatedUsersWithAccess,
    unmatchedPaymentsCount,
    unmatchedAgg,
    totalApps,
    ssoApps,
    offboarding,
    shadowAiAgg,
    shadowAiPayments,
  ] = await Promise.all([
    prisma.extensionBlacklist.count({
      where: { organizationId, enabled: true },
    }),
    // 검토 대기 도메인 스캔 전체 조회 (카운트 + riskyApps 겸용)
    prisma.saaSDomainScanHistory.findMany({
      where: {
        organizationId,
        reviewStatus: "pending",
        OR: [{ isMalicious: true }, { isSaaS: true }],
      },
      select: {
        id: true,
        domain: true,
        isMalicious: true,
        serviceName: true,
        category: true,
        scannedAt: true,
      },
      orderBy: { scannedAt: "desc" },
    }),
    // 등록된 앱 패턴 (화이트리스트)
    prisma.extensionWhitelist.findMany({
      where: { organizationId },
      select: { pattern: true },
    }),
    prisma.user.count({
      where: {
        organizationId,
        status: "TERMINATED",
        appAccesses: { some: {} },
      },
    }),
    prisma.paymentRecord.count({
      where: {
        organizationId,
        matchStatus: { in: ["PENDING", "UNMATCHED"] },
      },
    }),
    prisma.paymentRecord.aggregate({
      where: {
        organizationId,
        matchStatus: { in: ["PENDING", "UNMATCHED"] },
      },
      _sum: { amount: true },
    }),
    prisma.app.count({ where: { organizationId } }),
    prisma.app.count({
      where: { organizationId, source: "SSO_DISCOVERY" },
    }),
    prisma.userAppAccess.findMany({
      where: {
        user: {
          organizationId,
          status: "TERMINATED",
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        app: { select: { name: true } },
      },
      orderBy: { lastUsedAt: "desc" },
      take: 5,
    }),
    prisma.paymentRecord.aggregate({
      where: {
        organizationId,
        matchStatus: { in: ["MANUAL", "AUTO_MATCHED"] },
        merchantName: { contains: "AI", mode: "insensitive" },
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.paymentRecord.findMany({
      where: {
        organizationId,
        matchStatus: { in: ["MANUAL", "AUTO_MATCHED"] },
        OR: [
          { merchantName: { contains: "AI", mode: "insensitive" } },
          { merchantName: { contains: "GPT", mode: "insensitive" } },
          { merchantName: { contains: "CHATGPT", mode: "insensitive" } },
          { merchantName: { contains: "MIDJOURNEY", mode: "insensitive" } },
          { merchantName: { contains: "CLAUDE", mode: "insensitive" } },
          { merchantName: { contains: "PERPLEXITY", mode: "insensitive" } },
          { merchantName: { contains: "CURSOR", mode: "insensitive" } },
          { merchantName: { contains: "COPILOT", mode: "insensitive" } },
        ],
      },
      select: {
        amount: true,
        merchantName: true,
        matchedApp: {
          select: {
            name: true,
            category: true,
            catalog: { select: { category: true } },
          },
        },
      },
      take: 100,
    }),
  ]);

  // 등록된 패턴으로 필터링 (이미 앱으로 등록된 도메인 제외)
  const registeredPatterns = whitelistPatterns.map((w) => w.pattern);
  const filteredScans = pendingDomainScans.filter(
    (scan) =>
      !registeredPatterns.some(
        (p) =>
          matchDomainPattern(p, scan.domain) ||
          matchDomainWithTldVariants(p, scan.domain)
      )
  );

  const unmatchedPaymentsAmount = Number(unmatchedAgg._sum.amount || 0);
  const ssoCoveragePct =
    totalApps > 0 ? Math.round((ssoApps / totalApps) * 100) : 0;

  const aiPayments = shadowAiPayments.filter((p) => isAiPayment(p));

  // riskyApps: 필터링된 스캔 데이터에서 생성 (review-apps 페이지와 동일 로직)
  const riskyApps = await (async () => {
    if (filteredScans.length === 0) return [];

    // 악성 우선 → 최신 스캔 순 정렬 (review-apps 페이지와 동일)
    const sorted = [...filteredScans].sort((a, b) => {
      if (a.isMalicious !== b.isMalicious) return a.isMalicious ? -1 : 1;
      return b.scannedAt.getTime() - a.scannedAt.getTime();
    });
    const top5 = sorted.slice(0, 5);
    const domains = top5.map((s) => s.domain);

    // 최근 30일 방문 통계 (review-apps 페이지와 동일)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [stats, uniqueUserStats] = await Promise.all([
      prisma.extensionBrowsingLog.groupBy({
        by: ["domain"],
        where: {
          organizationId,
          domain: { in: domains },
          visitedAt: { gte: thirtyDaysAgo },
        },
        _count: { _all: true },
      }),
      prisma.extensionBrowsingLog.findMany({
        where: {
          organizationId,
          domain: { in: domains },
          visitedAt: { gte: thirtyDaysAgo },
        },
        select: { domain: true, userId: true },
        distinct: ["domain", "userId"],
      }),
    ]);

    const visitMap = new Map(stats.map((s) => [s.domain, s._count._all]));
    const uniqueMap = new Map<string, number>();
    for (const row of uniqueUserStats) {
      uniqueMap.set(row.domain, (uniqueMap.get(row.domain) || 0) + 1);
    }

    return top5.map((s) => ({
      id: s.id,
      domain: s.domain,
      type: (s.isMalicious ? "malicious" : "saas") as "malicious" | "saas",
      serviceName: s.serviceName,
      category: s.category,
      visitCount: visitMap.get(s.domain) || 0,
      uniqueUsers: uniqueMap.get(s.domain) || 0,
      scannedAt: s.scannedAt,
    }));
  })();

  return {
    blockedApps,
    pendingReviewApps: filteredScans.length,
    terminatedUsersWithAccess,
    unmatchedPaymentsCount,
    unmatchedPaymentsAmount,
    ssoCoveragePct,
    riskyApps,
    offboardingGaps: offboarding.map((item) => ({
      userId: item.user.id,
      userName: item.user.name,
      userEmail: item.user.email,
      appName: item.app.name,
      lastUsedAt: item.lastUsedAt,
      accessSource: item.source,
    })),
    shadowAi: {
      count: aiPayments.length || shadowAiAgg._count._all || 0,
      monthlyCost:
        aiPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0) ||
        Number(shadowAiAgg._sum.amount || 0),
      topMerchants: Array.from(
        aiPayments.reduce((map, p) => {
          const key = p.merchantName || "Unknown";
          const prev = map.get(key) || { total: 0, count: 0 };
          map.set(key, {
            total: prev.total + Number(p.amount || 0),
            count: prev.count + 1,
          });
          return map;
        }, new Map<string, { total: number; count: number }>())
      )
        .map(([name, v]) => ({ name, total: v.total, count: v.count }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5),
      topApps: Array.from(
        aiPayments.reduce((map, p) => {
          const key = p.matchedApp?.name || p.merchantName || "Unknown";
          const cat =
            p.matchedApp?.category || p.matchedApp?.catalog?.category || null;
          const prev = map.get(key) || { total: 0, count: 0, category: cat };
          map.set(key, {
            category: cat ?? prev.category,
            total: prev.total + Number(p.amount || 0),
            count: prev.count + 1,
          });
          return map;
        }, new Map<string, { total: number; count: number; category: string | null }>())
      )
        .map(([name, v]) => ({
          name,
          category: v.category,
          total: v.total,
          count: v.count,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5),
    },
  };
}
