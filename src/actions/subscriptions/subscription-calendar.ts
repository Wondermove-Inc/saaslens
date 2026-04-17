"use server";

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";

// ==================== Calendar Types ====================

export interface RenewalItem {
  subscriptionId: string;
  appId: string;
  appName: string;
  appLogo: string | null;
  planName: string | null;
  amount: number;
  currency: string;
  renewalDate: string; // ISO 8601 문자열
  status: "ACTIVE" | "EXPIRED" | "CANCELLED" | "PENDING";
}

export interface CalendarData {
  year: number;
  month: number;
  renewals: Record<string, RenewalItem[]>; // key: "YYYY-MM-DD"
}

export interface RenewalsByDateResponse {
  date: string; // ISO 8601 문자열
  renewals: RenewalItem[];
}

// ==================== Calendar Server Actions ====================

/**
 * Date를 UTC 기준 YYYY-MM-DD 문자열로 변환
 * (타임존 이슈 방지: UTC 기준으로 통일하여 날짜 밀림 현상 해결)
 */
function formatLocalDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 조회 월에 구독 갱신이 발생하는지 계산 (billingCycle 고려)
 */
function calculateRenewalDateInMonth(
  subscription: {
    renewalDate: Date | null;
    billingCycle: string;
    startDate: Date;
    endDate: Date | null;
  },
  targetYear: number,
  targetMonth: number
): Date | null {
  if (!subscription.renewalDate) return null;

  const renewalDate = subscription.renewalDate;
  const renewalDay = renewalDate.getUTCDate();

  // 조회 월의 시작/종료 시점
  const monthStart = new Date(
    Date.UTC(targetYear, targetMonth - 1, 1, 0, 0, 0, 0)
  );
  const monthEnd = new Date(
    Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999)
  );

  // 구독 시작일 이전이면 표시 안 함
  if (subscription.startDate > monthEnd) {
    return null;
  }

  // 구독 종료일 이후이면 표시 안 함
  if (subscription.endDate && subscription.endDate < monthStart) {
    return null;
  }

  // billingCycle에 따라 갱신일 계산
  if (subscription.billingCycle === "MONTHLY") {
    // 매월 같은 날짜에 갱신 (예: 매월 25일)
    const lastDayOfMonth = new Date(
      Date.UTC(targetYear, targetMonth, 0)
    ).getUTCDate();
    const actualDay = Math.min(renewalDay, lastDayOfMonth); // 31일 → 30일로 조정

    const calculatedDate = new Date(
      Date.UTC(targetYear, targetMonth - 1, actualDay, 0, 0, 0, 0)
    );

    // 구독 시작일 이전이거나 종료일 이후면 null
    if (calculatedDate < subscription.startDate) return null;
    if (subscription.endDate && calculatedDate > subscription.endDate)
      return null;

    return calculatedDate;
  } else if (subscription.billingCycle === "YEARLY") {
    // 매년 같은 월/일에 갱신
    const renewalMonth = renewalDate.getUTCMonth() + 1; // 1-12
    if (renewalMonth === targetMonth) {
      const calculatedDate = new Date(
        Date.UTC(targetYear, targetMonth - 1, renewalDay, 0, 0, 0, 0)
      );

      if (calculatedDate < subscription.startDate) return null;
      if (subscription.endDate && calculatedDate > subscription.endDate)
        return null;

      return calculatedDate;
    }
  } else if (subscription.billingCycle === "QUARTERLY") {
    // 3개월마다 갱신 (구현 생략, 필요 시 추가)
    // TODO: 분기별 갱신 로직 구현
  }

  return null;
}

/**
 * 월별 갱신 캘린더 데이터 조회
 */
export async function getRenewalCalendar(
  year: number,
  month: number
): Promise<CalendarData> {
  const { organizationId } = await requireOrganization();

  // 조회 월이 현재보다 과거인지 확인
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1; // 1-12
  const queryDate = year * 100 + month; // 202603
  const currentDate = currentYear * 100 + currentMonth; // 202602
  const isPastMonth = queryDate < currentDate;

  // 날짜별로 그룹화
  const renewals: Record<string, RenewalItem[]> = {};

  if (isPastMonth) {
    // 과거 달: DB에 실제로 renewalDate가 있는 것만 표시
    const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const subscriptions = await prisma.subscription.findMany({
      where: {
        organizationId,
        renewalDate: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      include: {
        app: true,
      },
      orderBy: { renewalDate: "asc" },
    });

    for (const sub of subscriptions) {
      if (!sub.renewalDate) continue;

      const dateKey = formatLocalDateKey(sub.renewalDate);

      if (!renewals[dateKey]) {
        renewals[dateKey] = [];
      }

      renewals[dateKey].push({
        subscriptionId: sub.id,
        appId: sub.appId,
        appName: sub.app.name,
        appLogo: sub.app.customLogoUrl,
        planName: sub.notes,
        amount: sub.amount.toNumber(),
        currency: sub.currency,
        renewalDate: sub.renewalDate.toISOString(),
        status: sub.status as RenewalItem["status"],
      });
    }
  } else {
    // 현재/미래 달: 반복 갱신 로직 적용
    const subscriptions = await prisma.subscription.findMany({
      where: {
        organizationId,
        status: "ACTIVE",
        renewalDate: { not: null },
      },
      include: {
        app: true,
      },
    });

    for (const sub of subscriptions) {
      if (!sub.renewalDate) continue;

      // 조회 월에 갱신이 발생하는지 계산
      const calculatedDate = calculateRenewalDateInMonth(
        {
          renewalDate: sub.renewalDate,
          billingCycle: sub.billingCycle,
          startDate: sub.startDate,
          endDate: sub.endDate,
        },
        year,
        month
      );

      if (!calculatedDate) continue;

      const dateKey = formatLocalDateKey(calculatedDate);

      if (!renewals[dateKey]) {
        renewals[dateKey] = [];
      }

      renewals[dateKey].push({
        subscriptionId: sub.id,
        appId: sub.appId,
        appName: sub.app.name,
        appLogo: sub.app.customLogoUrl,
        planName: sub.notes,
        amount: sub.amount.toNumber(),
        currency: sub.currency,
        renewalDate: calculatedDate.toISOString(),
        status: sub.status as RenewalItem["status"],
      });
    }
  }

  return {
    year,
    month,
    renewals,
  };
}

/**
 * 특정 날짜의 갱신 목록 조회
 */
export async function getRenewalsByDate(
  date: string
): Promise<RenewalsByDateResponse> {
  const { organizationId } = await requireOrganization();

  // 날짜 파싱 (YYYY-MM-DD)
  const targetDate = new Date(date);
  const targetYear = targetDate.getUTCFullYear();
  const targetMonth = targetDate.getUTCMonth() + 1; // 1-12
  const targetDay = targetDate.getUTCDate();

  // 현재 날짜와 비교
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  const queryYearMonth = targetYear * 100 + targetMonth;
  const currentYearMonth = currentYear * 100 + currentMonth;
  const isPastMonth = queryYearMonth < currentYearMonth;

  const renewals: RenewalItem[] = [];

  if (isPastMonth) {
    // 과거 달: DB에서 실제 renewalDate 조회
    const startOfDay = new Date(
      Date.UTC(targetYear, targetMonth - 1, targetDay, 0, 0, 0, 0)
    );
    const endOfDay = new Date(
      Date.UTC(targetYear, targetMonth - 1, targetDay, 23, 59, 59, 999)
    );

    const subscriptions = await prisma.subscription.findMany({
      where: {
        organizationId,
        renewalDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        app: true,
      },
      orderBy: { app: { name: "asc" } },
    });

    for (const sub of subscriptions) {
      renewals.push({
        subscriptionId: sub.id,
        appId: sub.appId,
        appName: sub.app.name,
        appLogo: sub.app.customLogoUrl,
        planName: sub.notes,
        amount: sub.amount.toNumber(),
        currency: sub.currency,
        renewalDate: sub.renewalDate?.toISOString() ?? date,
        status: sub.status as RenewalItem["status"],
      });
    }
  } else {
    // 현재/미래 달: 반복 갱신 로직 적용
    const subscriptions = await prisma.subscription.findMany({
      where: {
        organizationId,
        status: "ACTIVE",
        renewalDate: { not: null },
      },
      include: {
        app: true,
      },
    });

    for (const sub of subscriptions) {
      if (!sub.renewalDate) continue;

      // 조회 월에 갱신이 발생하는지 계산
      const calculatedDate = calculateRenewalDateInMonth(
        {
          renewalDate: sub.renewalDate,
          billingCycle: sub.billingCycle,
          startDate: sub.startDate,
          endDate: sub.endDate,
        },
        targetYear,
        targetMonth
      );

      if (!calculatedDate) continue;

      // 계산된 날짜가 요청한 날짜(일)와 일치하는지 확인
      if (calculatedDate.getUTCDate() === targetDay) {
        renewals.push({
          subscriptionId: sub.id,
          appId: sub.appId,
          appName: sub.app.name,
          appLogo: sub.app.customLogoUrl,
          planName: sub.notes,
          amount: sub.amount.toNumber(),
          currency: sub.currency,
          renewalDate: calculatedDate.toISOString(),
          status: sub.status as RenewalItem["status"],
        });
      }
    }

    // 앱 이름 순으로 정렬
    renewals.sort((a, b) => a.appName.localeCompare(b.appName));
  }

  return {
    date,
    renewals,
  };
}
