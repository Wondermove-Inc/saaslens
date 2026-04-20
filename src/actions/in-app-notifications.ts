// src/actions/in-app-notifications.ts
"use server";

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import {
  matchDomainPattern,
  matchDomainWithTldVariants,
} from "@/lib/utils/domain-extractor";
import type { NotificationSettings } from "./organization-notification-settings";

// 알림 유형
export type InAppNotificationType =
  | "renewal"
  | "offboarding"
  | "shadowIT"
  | "costAnomaly"
  | "pendingReview";

// 인앱 알림 항목
export interface InAppNotification {
  id: string;
  type: InAppNotificationType;
  title: string;
  detail: string;
  createdAt: Date;
  link: string;
}

interface OrganizationSettings {
  notifications?: NotificationSettings;
  [key: string]: unknown;
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  emailEnabled: true,
  renewalAlertDays: [30],
  offboardingAlerts: true,
  weeklyDigest: false,
  shadowITAlerts: true,
  costAnomalyAlerts: true,
  costAnomalyThreshold: 50,
};

/**
 * 인앱 알림 목록 조회
 * 조직 알림 설정에 따라 실시간으로 데이터를 조회하여 알림 생성
 */
export async function getInAppNotifications(): Promise<InAppNotification[]> {
  const { organizationId } = await requireOrganization();

  // 1. 조직 알림 설정 조회
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  });

  const settings = (organization?.settings as OrganizationSettings) ?? {};
  const notifSettings: NotificationSettings = {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...settings.notifications,
  };

  // 2. 설정에 따라 쿼리 선택적 실행
  const queries: Promise<InAppNotification[]>[] = [];

  // 구독 갱신 알림 (renewalAlertDays 기반)
  if (notifSettings.renewalAlertDays.length > 0) {
    queries.push(
      fetchRenewalAlerts(organizationId, notifSettings.renewalAlertDays)
    );
  }

  // 퇴사자 미회수 알림
  if (notifSettings.offboardingAlerts) {
    queries.push(fetchOffboardingAlerts(organizationId));
  }

  // Shadow IT 알림
  if (notifSettings.shadowITAlerts) {
    queries.push(fetchShadowITAlerts(organizationId));
  }

  // 비용 이상 알림
  if (notifSettings.costAnomalyAlerts) {
    queries.push(
      fetchCostAnomalyAlerts(organizationId, notifSettings.costAnomalyThreshold)
    );
  }

  // 검토 대기 앱 (항상 활성)
  queries.push(fetchPendingReviewAlerts(organizationId));

  // 3. 병렬 실행 → 통합 → 날짜순 정렬 → 최대 20개
  const results = await Promise.all(queries);
  const allNotifications = results.flat();

  allNotifications.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return allNotifications.slice(0, 20);
}

// ─── 1) 구독 갱신 알림 ──────────────────────────────────────────

async function fetchRenewalAlerts(
  organizationId: string,
  alertDays: number[]
): Promise<InAppNotification[]> {
  const now = new Date();
  const notifications: InAppNotification[] = [];

  for (const days of alertDays) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + days);

    const startDate = new Date(targetDate);
    startDate.setDate(startDate.getDate() - 1);
    const endDate = new Date(targetDate);
    endDate.setDate(endDate.getDate() + 1);

    const subscriptions = await prisma.subscription.findMany({
      where: {
        app: { organizationId },
        status: "ACTIVE",
        renewalDate: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        renewalDate: true,
        app: { select: { id: true, name: true } },
      },
      take: 5,
    });

    for (const sub of subscriptions) {
      const renewalDate = sub.renewalDate!;
      const daysLeft = Math.ceil(
        (renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      notifications.push({
        id: `renewal-${sub.id}-${days}`,
        type: "renewal",
        title: `D-${daysLeft} ${sub.app.name}`,
        detail: `${renewalDate.toLocaleDateString("ko-KR")}`,
        createdAt: now,
        link: `/apps/${sub.app.id}`,
      });
    }
  }

  return notifications;
}

// ─── 2) 퇴사자 미회수 알림 ──────────────────────────────────────

async function fetchOffboardingAlerts(
  organizationId: string
): Promise<InAppNotification[]> {
  const users = await prisma.user.findMany({
    where: {
      organizationId,
      status: "TERMINATED",
      appAccesses: { some: {} },
    },
    select: {
      id: true,
      name: true,
      email: true,
      _count: { select: { appAccesses: true } },
    },
    take: 5,
  });

  return users.map((user) => ({
    id: `offboard-${user.id}`,
    type: "offboarding" as const,
    title: user.name || user.email,
    detail: `${user._count.appAccesses}`,
    createdAt: new Date(),
    link: "/security",
  }));
}

// ─── 3) Shadow IT 알림 ──────────────────────────────────────────

async function fetchShadowITAlerts(
  organizationId: string
): Promise<InAppNotification[]> {
  const [pendingScans, whitelistPatterns] = await Promise.all([
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
        scannedAt: true,
      },
      orderBy: { scannedAt: "desc" },
      take: 20,
    }),
    prisma.extensionWhitelist.findMany({
      where: { organizationId },
      select: { pattern: true },
    }),
  ]);

  // 화이트리스트 필터링
  const registeredPatterns = whitelistPatterns.map((w) => w.pattern);
  const filtered = pendingScans.filter(
    (scan) =>
      !registeredPatterns.some(
        (p) =>
          matchDomainPattern(p, scan.domain) ||
          matchDomainWithTldVariants(p, scan.domain)
      )
  );

  return filtered.slice(0, 5).map((scan) => ({
    id: `shadow-${scan.id}`,
    type: "shadowIT" as const,
    title: scan.serviceName || scan.domain,
    detail: scan.isMalicious ? "malicious" : "saas",
    createdAt: scan.scannedAt,
    link: "/extensions/review-apps",
  }));
}

// ─── 4) 비용 이상 알림 ──────────────────────────────────────────

async function fetchCostAnomalyAlerts(
  organizationId: string,
  threshold: number
): Promise<InAppNotification[]> {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const [currentCosts, previousCosts] = await Promise.all([
    prisma.cardTransaction.groupBy({
      by: ["matchedAppId"],
      where: {
        organizationId,
        matchedAppId: { not: null },
        transactionType: "APPROVAL",
        createdAt: { gte: currentMonthStart },
      },
      _sum: { useAmt: true },
    }),
    prisma.cardTransaction.groupBy({
      by: ["matchedAppId"],
      where: {
        organizationId,
        matchedAppId: { not: null },
        transactionType: "APPROVAL",
        createdAt: { gte: previousMonthStart, lte: previousMonthEnd },
      },
      _sum: { useAmt: true },
    }),
  ]);

  const previousCostMap = new Map(
    previousCosts.map((c) => [c.matchedAppId, Number(c._sum.useAmt) || 0])
  );

  // 이상 감지된 앱 ID 수집
  const anomalyAppIds: string[] = [];
  const anomalyData = new Map<
    string,
    { currentCost: number; previousCost: number; pctChange: number }
  >();

  for (const current of currentCosts) {
    if (!current.matchedAppId) continue;
    const currentCost = Number(current._sum.useAmt) || 0;
    const previousCost = previousCostMap.get(current.matchedAppId) || 0;
    if (previousCost === 0) continue;

    const pctChange = ((currentCost - previousCost) / previousCost) * 100;
    if (pctChange >= threshold) {
      anomalyAppIds.push(current.matchedAppId);
      anomalyData.set(current.matchedAppId, {
        currentCost,
        previousCost,
        pctChange,
      });
    }
  }

  if (anomalyAppIds.length === 0) return [];

  // 앱 이름 조회
  const apps = await prisma.app.findMany({
    where: { id: { in: anomalyAppIds } },
    select: { id: true, name: true },
  });
  const appNameMap = new Map(apps.map((a) => [a.id, a.name]));

  return anomalyAppIds.slice(0, 5).map((appId) => {
    const data = anomalyData.get(appId)!;
    return {
      id: `cost-${appId}`,
      type: "costAnomaly" as const,
      title: appNameMap.get(appId) || appId,
      detail: `+${Math.round(data.pctChange)}%`,
      createdAt: new Date(),
      link: "/cost",
    };
  });
}

// ─── 5) 검토 대기 앱 (항상 활성) ────────────────────────────────

async function fetchPendingReviewAlerts(
  organizationId: string
): Promise<InAppNotification[]> {
  const [pendingScans, whitelistPatterns] = await Promise.all([
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
        scannedAt: true,
      },
      orderBy: { scannedAt: "desc" },
    }),
    prisma.extensionWhitelist.findMany({
      where: { organizationId },
      select: { pattern: true },
    }),
  ]);

  const registeredPatterns = whitelistPatterns.map((w) => w.pattern);
  const filtered = pendingScans.filter(
    (scan) =>
      !registeredPatterns.some(
        (p) =>
          matchDomainPattern(p, scan.domain) ||
          matchDomainWithTldVariants(p, scan.domain)
      )
  );

  const malicious = filtered.filter((s) => s.isMalicious);
  const saas = filtered.filter((s) => !s.isMalicious);

  const notifications: InAppNotification[] = [];

  if (malicious.length > 0) {
    notifications.push({
      id: "pending-malicious",
      type: "pendingReview",
      title: `${malicious.length}`,
      detail: "malicious",
      createdAt: malicious[0].scannedAt,
      link: "/extensions/review-apps",
    });
  }

  if (saas.length > 0) {
    notifications.push({
      id: "pending-saas",
      type: "pendingReview",
      title: `${saas.length}`,
      detail: "saas",
      createdAt: saas.length > 0 ? saas[0].scannedAt : new Date(),
      link: "/extensions/review-apps",
    });
  }

  return notifications;
}
