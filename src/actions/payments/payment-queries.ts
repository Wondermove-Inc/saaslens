"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { ActionState } from "@/types";
import type { MatchSource, PaymentMatchStatus } from "@prisma/client";

export interface PaymentRecordWithApp {
  id: string;
  source: "card" | "csv";
  transactionDate: Date;
  merchantName: string;
  amount: number;
  currency: string;
  cardLast4: string | null;
  approvalNumber?: string | null;
  matchStatus: PaymentMatchStatus;
  matchConfidence: number | null;
  matchSource?: MatchSource | null;
  matchedApp: {
    id: string;
    name: string;
  } | null;
  linkedSubscription: {
    id: string;
    appName: string;
  } | null;
  cardTransactionId?: string | null;
  paymentRecordId?: string | null;
}

export interface GetPaymentRecordsResult {
  records: PaymentRecordWithApp[];
  total: number;
  page: number;
  totalPages: number;
}

export interface PaymentSummaryByAppResult {
  apps: Array<{
    appId: string;
    appName: string;
    totalAmount: number;
    transactionCount: number;
  }>;
  totalAmount: number;
  totalTransactions: number;
}

/**
 * 결제 데이터 존재 여부 확인
 * PaymentRecord + CardTransaction 중 하나라도 있으면 hasData: true
 * 에러 시 false alarm 방지를 위해 hasData: true 기본값 반환
 */
export async function hasPaymentData(): Promise<
  ActionState<{ hasData: boolean }>
> {
  try {
    const session = await auth();

    if (!session?.user) {
      return { success: false, message: "인증이 필요합니다" };
    }

    if (!session.user.organizationId) {
      return { success: false, message: "조직 정보가 필요합니다" };
    }

    const orgId = session.user.organizationId;

    const [paymentCount, cardCount] = await Promise.all([
      prisma.paymentRecord.count({ where: { organizationId: orgId } }),
      prisma.cardTransaction.count({ where: { organizationId: orgId } }),
    ]);

    return {
      success: true,
      data: { hasData: paymentCount > 0 || cardCount > 0 },
    };
  } catch (error) {
    console.error("결제 데이터 존재 여부 확인 오류:", error);
    return {
      success: true,
      data: { hasData: true },
    };
  }
}

/**
 * 결제 내역 조회 (CardTransaction + PaymentRecord 통합)
 */
export async function getPaymentRecords(options: {
  page: number;
  limit: number;
  matchStatus?: PaymentMatchStatus | PaymentMatchStatus[];
  appId?: string;
  startDate?: Date;
  endDate?: Date;
  source?: "card" | "csv" | "all";
}): Promise<ActionState<GetPaymentRecordsResult>> {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        message: "인증이 필요합니다",
      };
    }

    if (!session.user.organizationId) {
      return {
        success: false,
        message: "조직 정보가 필요합니다",
      };
    }

    const {
      page,
      limit,
      matchStatus,
      appId,
      startDate,
      endDate,
      source = "all",
    } = options;

    // 통합 결제 서비스 사용
    const { getUnifiedPayments } =
      await import("@/lib/services/payment/unified-payment");

    const result = await getUnifiedPayments({
      organizationId: session.user.organizationId,
      page,
      limit,
      matchStatus,
      appId,
      startDate,
      endDate,
      source,
    });

    return {
      success: true,
      data: {
        records: result.records.map((r) => ({
          id: r.id,
          source: r.source,
          transactionDate: r.transactionDate,
          merchantName: r.merchantName,
          amount: r.amount,
          currency: r.currency,
          cardLast4: r.cardLast4,
          approvalNumber: r.approvalNumber,
          matchStatus: r.matchStatus,
          matchConfidence: r.matchConfidence,
          matchSource: r.matchSource,
          matchedApp: r.matchedApp,
          linkedSubscription: r.linkedSubscription,
          cardTransactionId: r.cardTransactionId,
          paymentRecordId: r.paymentRecordId,
        })),
        total: result.total,
        page,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  } catch (error) {
    console.error("결제 내역 조회 오류:", error);
    return {
      success: false,
      message: "결제 내역 조회 중 오류가 발생했습니다",
    };
  }
}

/**
 * 앱별 결제 내역 집계
 */
/**
 * 매칭 상태별 건수 조회 (TabFilter용)
 * PaymentRecord + CardTransaction 모두 집계
 */
export async function getPaymentStatusCounts(): Promise<
  ActionState<Record<PaymentMatchStatus | "all", number>>
> {
  try {
    const session = await auth();

    if (!session?.user) {
      return { success: false, message: "인증이 필요합니다" };
    }

    if (!session.user.organizationId) {
      return { success: false, message: "조직 정보가 필요합니다" };
    }

    const orgId = session.user.organizationId;

    // PaymentRecord groupBy
    const csvCounts = await prisma.paymentRecord.groupBy({
      by: ["matchStatus"],
      where: { organizationId: orgId },
      _count: { id: true },
    });

    // CardTransaction groupBy
    const cardCounts = await prisma.cardTransaction.groupBy({
      by: ["matchStatus"],
      where: { organizationId: orgId },
      _count: { id: true },
    });

    // 합산
    const counts: Record<string, number> = {
      all: 0,
      PENDING: 0,
      AUTO_MATCHED: 0,
      MANUAL: 0,
      UNMATCHED: 0,
    };

    for (const row of csvCounts) {
      counts[row.matchStatus] = (counts[row.matchStatus] || 0) + row._count.id;
      counts.all += row._count.id;
    }

    for (const row of cardCounts) {
      counts[row.matchStatus] = (counts[row.matchStatus] || 0) + row._count.id;
      counts.all += row._count.id;
    }

    return {
      success: true,
      data: counts as Record<PaymentMatchStatus | "all", number>,
    };
  } catch (error) {
    console.error("상태별 건수 조회 오류:", error);
    return {
      success: false,
      message: "상태별 건수 조회 중 오류가 발생했습니다",
    };
  }
}

/**
 * 앱별 결제 내역 집계
 */
export async function getPaymentSummaryByApp(options: {
  startDate?: Date;
  endDate?: Date;
}): Promise<ActionState<PaymentSummaryByAppResult>> {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        message: "인증이 필요합니다",
      };
    }

    if (!session.user.organizationId) {
      return {
        success: false,
        message: "조직 정보가 필요합니다",
      };
    }

    const { startDate, endDate } = options;

    // 필터 조건 구성
    const where: Record<string, unknown> = {
      organizationId: session.user.organizationId,
      matchedAppId: { not: null },
      matchStatus: { in: ["MANUAL", "AUTO_MATCHED"] },
    };

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) {
        (where.transactionDate as Record<string, Date>).gte = startDate;
      }
      if (endDate) {
        (where.transactionDate as Record<string, Date>).lte = endDate;
      }
    }

    // 앱별 집계
    const groupedPayments = await prisma.paymentRecord.groupBy({
      by: ["matchedAppId"],
      where,
      _sum: { amount: true },
      _count: { id: true },
    });

    // 앱 정보 조회
    const appIds = groupedPayments
      .map((g) => g.matchedAppId)
      .filter((id): id is string => id !== null);

    const apps = await prisma.app.findMany({
      where: { id: { in: appIds } },
      select: { id: true, name: true },
    });

    const appMap = new Map(apps.map((app) => [app.id, app.name]));

    // 결과 구성
    let totalAmount = 0;
    let totalTransactions = 0;

    const appSummaries = groupedPayments
      .filter((g) => g.matchedAppId !== null)
      .map((g) => {
        const amount =
          typeof g._sum.amount === "object" && g._sum.amount !== null
            ? (g._sum.amount as { toNumber: () => number }).toNumber()
            : Number(g._sum.amount) || 0;
        const count = g._count.id || 0;

        totalAmount += amount;
        totalTransactions += count;

        return {
          appId: g.matchedAppId!,
          appName: appMap.get(g.matchedAppId!) || "알 수 없음",
          totalAmount: amount,
          transactionCount: count,
        };
      })
      .sort((a, b) => b.totalAmount - a.totalAmount);

    return {
      success: true,
      data: {
        apps: appSummaries,
        totalAmount,
        totalTransactions,
      },
    };
  } catch (error) {
    console.error("비용 집계 오류:", error);
    return {
      success: false,
      message: "비용 집계 중 오류가 발생했습니다",
    };
  }
}
