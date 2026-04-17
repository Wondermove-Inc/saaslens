// src/lib/services/cost/costAnomalyScan.ts
import { prisma } from "@/lib/db";
import { sendCostAnomalyAlertEmail } from "@/lib/services/notification/securityAlert";

// 조직 설정 타입
interface OrganizationSettings {
  notifications?: {
    emailEnabled?: boolean;
    costAnomalyAlerts?: boolean;
    costAnomalyThreshold?: number; // 기본 50%
  };
}

// 스캔 결과 타입
export interface CostAnomalyScanResult {
  success: boolean;
  processedAt: Date;
  processedOrganizations: number;
  anomaliesFound: number;
  emailsSent: number;
  errors: string[];
}

// 월별 비용 집계 결과
interface MonthlyCost {
  appId: string;
  appName: string;
  previousMonthCost: number;
  currentMonthCost: number;
  percentageChange: number;
}

/**
 * 비용 이상 감지 스캔 처리
 * - 전월 대비 비용 증가율 계산
 * - 임계값 초과 시 관리자에게 이메일 발송
 */
export async function processCostAnomalyScan(): Promise<CostAnomalyScanResult> {
  const result: CostAnomalyScanResult = {
    success: true,
    processedAt: new Date(),
    processedOrganizations: 0,
    anomaliesFound: 0,
    emailsSent: 0,
    errors: [],
  };

  try {
    // 모든 조직 조회 (알림 설정 포함)
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        settings: true,
        users: {
          where: { role: "ADMIN", status: "ACTIVE" },
          select: { email: true },
        },
      },
    });

    result.processedOrganizations = organizations.length;

    for (const org of organizations) {
      try {
        await processOrganization(
          {
            id: org.id,
            name: org.name,
            settings: org.settings,
            adminEmails: org.users.map((u) => u.email),
          },
          result
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "알 수 없는 오류";
        result.errors.push(`${org.id}: ${errorMessage}`);
      }
    }
  } catch (error) {
    result.success = false;
    const errorMessage =
      error instanceof Error ? error.message : "알 수 없는 오류";
    result.errors.push(errorMessage);
  }

  return result;
}

// 개별 조직 처리
async function processOrganization(
  org: {
    id: string;
    name: string;
    settings: unknown;
    adminEmails: string[];
  },
  result: CostAnomalyScanResult
): Promise<void> {
  const settings = org.settings as OrganizationSettings;
  const costAnomalyAlerts = settings?.notifications?.costAnomalyAlerts ?? true;
  const emailEnabled = settings?.notifications?.emailEnabled ?? true;
  const threshold = settings?.notifications?.costAnomalyThreshold ?? 50; // 기본 50%

  // 알림 비활성화된 경우 스킵
  if (!costAnomalyAlerts || !emailEnabled) {
    return;
  }

  // 관리자가 없는 경우
  if (org.adminEmails.length === 0) {
    result.errors.push(`${org.id}: 관리자 없음`);
    return;
  }

  // 월별 비용 집계
  const anomalies = await calculateMonthlyCostAnomalies(org.id, threshold);

  if (anomalies.length === 0) {
    return;
  }

  result.anomaliesFound += anomalies.length;

  // 이상 감지된 각 앱에 대해 관리자에게 이메일 발송
  for (const anomaly of anomalies) {
    const currentMonth = new Date();
    const previousMonth = new Date();
    previousMonth.setMonth(previousMonth.getMonth() - 1);

    const period = `${previousMonth.getFullYear()}년 ${previousMonth.getMonth() + 1}월 → ${currentMonth.getFullYear()}년 ${currentMonth.getMonth() + 1}월`;

    for (const adminEmail of org.adminEmails) {
      const emailResult = await sendCostAnomalyAlertEmail({
        to: adminEmail,
        organizationName: org.name,
        appName: anomaly.appName,
        previousCost: anomaly.previousMonthCost,
        currentCost: anomaly.currentMonthCost,
        percentageIncrease: Math.round(anomaly.percentageChange),
        currency: "KRW",
        period,
      });

      if (emailResult.success) {
        result.emailsSent++;
      } else {
        result.errors.push(
          `${org.id}/${anomaly.appId}: 이메일 발송 실패 (${adminEmail}) - ${emailResult.error}`
        );
      }
    }
  }
}

// 월별 비용 이상 계산
async function calculateMonthlyCostAnomalies(
  organizationId: string,
  threshold: number
): Promise<MonthlyCost[]> {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // 이번 달 비용 집계 (승인내역 기준)
  const currentMonthCosts = await prisma.cardTransaction.groupBy({
    by: ["matchedAppId"],
    where: {
      organizationId,
      matchedAppId: { not: null },
      transactionType: "APPROVAL", // 승인내역 기준 조회
      createdAt: { gte: currentMonthStart },
    },
    _sum: { useAmt: true },
  });

  // 전월 비용 집계 (승인내역 기준)
  const previousMonthCosts = await prisma.cardTransaction.groupBy({
    by: ["matchedAppId"],
    where: {
      organizationId,
      matchedAppId: { not: null },
      transactionType: "APPROVAL", // 승인내역 기준 조회
      createdAt: {
        gte: previousMonthStart,
        lte: previousMonthEnd,
      },
    },
    _sum: { useAmt: true },
  });

  // 앱 이름 조회
  const appIds = [
    ...new Set([
      ...currentMonthCosts
        .map((c) => c.matchedAppId)
        .filter((id): id is string => id !== null),
      ...previousMonthCosts
        .map((c) => c.matchedAppId)
        .filter((id): id is string => id !== null),
    ]),
  ];

  const apps = await prisma.app.findMany({
    where: { id: { in: appIds } },
    select: { id: true, name: true },
  });
  const appNameMap = new Map(apps.map((a) => [a.id, a.name]));

  // 전월 비용 맵 (Decimal을 number로 변환)
  const previousCostMap = new Map(
    previousMonthCosts.map((c) => [c.matchedAppId, Number(c._sum.useAmt) || 0])
  );

  // 이상 감지
  const anomalies: MonthlyCost[] = [];

  for (const current of currentMonthCosts) {
    if (!current.matchedAppId) continue;

    const currentCost = Number(current._sum.useAmt) || 0;
    const previousCost = previousCostMap.get(current.matchedAppId) || 0;

    // 전월 비용이 0인 경우 스킵 (새로운 앱)
    if (previousCost === 0) continue;

    const percentageChange =
      ((currentCost - previousCost) / previousCost) * 100;

    // 임계값 초과 시 이상으로 간주
    if (percentageChange >= threshold) {
      anomalies.push({
        appId: current.matchedAppId,
        appName: appNameMap.get(current.matchedAppId) || "알 수 없는 앱",
        previousMonthCost: previousCost,
        currentMonthCost: currentCost,
        percentageChange,
      });
    }
  }

  return anomalies;
}
