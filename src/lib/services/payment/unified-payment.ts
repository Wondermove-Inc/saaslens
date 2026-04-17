// src/lib/services/payment/unified-payment.ts
import { prisma } from "@/lib/db";
import type { MatchSource, PaymentMatchStatus, Prisma } from "@prisma/client";

// 통합 결제 내역 인터페이스
export interface UnifiedPayment {
  id: string;
  source: "card" | "csv";
  transactionDate: Date;
  merchantName: string;
  amount: number;
  currency: string;
  approvalNumber: string | null;
  cardLast4: string | null;

  // 앱 매칭 (CardTransaction은 기본값)
  matchedAppId: string | null;
  matchedApp: { id: string; name: string } | null;
  matchConfidence: number | null;
  matchStatus: PaymentMatchStatus;
  matchSource: MatchSource | null;

  // 구독 연결 (CardTransaction은 null)
  linkedSubscriptionId: string | null;
  linkedSubscription: { id: string; appName: string } | null;

  // 원본 ID (수정/삭제 시 필요)
  cardTransactionId: string | null;
  paymentRecordId: string | null;
}

// 조회 옵션
export interface UnifiedPaymentOptions {
  organizationId: string;
  page?: number;
  limit?: number;
  matchStatus?: PaymentMatchStatus | PaymentMatchStatus[];
  appId?: string;
  startDate?: Date;
  endDate?: Date;
  source?: "card" | "csv" | "all";
}

// CardTransaction 타입 (Prisma include 결과)
type CardTransactionWithRelations = Prisma.CardTransactionGetPayload<{
  include: {
    corporateCard: true;
    matchedApp: true;
    linkedSubscription: {
      include: { app: true };
    };
  };
}>;

// PaymentRecord 타입 (Prisma include 결과)
type PaymentRecordWithRelations = Prisma.PaymentRecordGetPayload<{
  include: {
    matchedApp: true;
    linkedSubscription: {
      include: { app: true };
    };
  };
}>;

/**
 * useDt (YYYYMMDD) + useTm (HHmmss) → Date 변환
 */
function parseCardTransactionDate(useDt: string, useTm?: string | null): Date {
  const year = parseInt(useDt.substring(0, 4), 10);
  const month = parseInt(useDt.substring(4, 6), 10) - 1;
  const day = parseInt(useDt.substring(6, 8), 10);

  if (useTm && useTm.length >= 6) {
    const hour = parseInt(useTm.substring(0, 2), 10);
    const minute = parseInt(useTm.substring(2, 4), 10);
    const second = parseInt(useTm.substring(4, 6), 10);
    return new Date(year, month, day, hour, minute, second);
  }

  return new Date(year, month, day);
}

/**
 * 카드번호에서 마지막 4자리 추출
 */
function extractCardLast4(cardNo: string | null | undefined): string | null {
  if (!cardNo) return null;
  // 카드번호에서 숫자만 추출
  const digits = cardNo.replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : digits;
}

/**
 * CardTransaction → UnifiedPayment 변환
 */
export function convertCardTransaction(
  tx: CardTransactionWithRelations
): UnifiedPayment {
  return {
    id: `card_${tx.id}`,
    source: "card",
    transactionDate: parseCardTransactionDate(tx.useDt, tx.useTm),
    merchantName: tx.useStore,
    amount: Number(tx.useAmt),
    currency: "KRW",
    approvalNumber: tx.apprNo,
    cardLast4: extractCardLast4(tx.corporateCard?.cardNo),

    // 앱 매칭 정보 (matchStatus 필드 직접 사용)
    matchedAppId: tx.matchedAppId,
    matchedApp: tx.matchedApp
      ? { id: tx.matchedApp.id, name: tx.matchedApp.name }
      : null,
    matchConfidence: tx.matchConfidence ?? null,
    matchStatus: tx.matchStatus,
    matchSource: tx.matchSource ?? null,

    // 구독 연결
    linkedSubscriptionId: tx.linkedSubscriptionId,
    linkedSubscription: tx.linkedSubscription
      ? {
          id: tx.linkedSubscription.id,
          appName: tx.linkedSubscription.app?.name ?? "Unknown",
        }
      : null,

    // 원본 ID
    cardTransactionId: tx.id,
    paymentRecordId: null,
  };
}

/**
 * PaymentRecord → UnifiedPayment 변환
 */
export function convertPaymentRecord(
  pr: PaymentRecordWithRelations
): UnifiedPayment {
  return {
    id: `csv_${pr.id}`,
    source: "csv",
    transactionDate: pr.transactionDate,
    merchantName: pr.merchantName,
    amount: Number(pr.amount),
    currency: pr.currency,
    approvalNumber: pr.approvalNumber,
    cardLast4: pr.cardLast4,

    // 앱 매칭 정보
    matchedAppId: pr.matchedAppId,
    matchedApp: pr.matchedApp,
    matchConfidence: pr.matchConfidence,
    matchStatus: pr.matchStatus,
    matchSource: pr.matchSource || null,

    // 구독 연결
    linkedSubscriptionId: pr.linkedSubscriptionId,
    linkedSubscription: pr.linkedSubscription
      ? {
          id: pr.linkedSubscription.id,
          appName: pr.linkedSubscription.app?.name ?? "Unknown",
        }
      : null,

    // 원본 ID
    cardTransactionId: null,
    paymentRecordId: pr.id,
  };
}

/**
 * 통합 결제 내역 조회 (CardTransaction + PaymentRecord Union)
 */
export async function getUnifiedPayments(
  options: UnifiedPaymentOptions
): Promise<{ records: UnifiedPayment[]; total: number }> {
  const {
    organizationId,
    page = 1,
    limit = 10,
    matchStatus,
    appId,
    startDate,
    endDate,
    source = "all",
  } = options;

  const skip = (page - 1) * limit;

  // 1. CardTransaction 조회 (source가 'csv'가 아닌 경우)
  let cardTransactions: CardTransactionWithRelations[] = [];
  let cardTotal = 0;

  if (source !== "csv") {
    // CardTransaction 쿼리 조건 구성
    const cardWhere: Prisma.CardTransactionWhereInput = {
      organizationId,
    };

    // matchStatus 필터 적용
    if (matchStatus) {
      if (Array.isArray(matchStatus)) {
        cardWhere.matchStatus = { in: matchStatus };
      } else {
        cardWhere.matchStatus = matchStatus;
      }
    }

    // appId 필터 적용
    if (appId) {
      cardWhere.matchedAppId = appId;
    }

    // 날짜 필터 (useDt는 YYYYMMDD 문자열)
    if (startDate) {
      const startStr = startDate.toISOString().slice(0, 10).replace(/-/g, "");
      cardWhere.useDt = { gte: startStr };
    }
    if (endDate) {
      const endStr = endDate.toISOString().slice(0, 10).replace(/-/g, "");
      if (cardWhere.useDt && typeof cardWhere.useDt === "object") {
        (cardWhere.useDt as Prisma.StringFilter<"CardTransaction">).lte =
          endStr;
      } else {
        cardWhere.useDt = { lte: endStr };
      }
    }

    [cardTransactions, cardTotal] = await Promise.all([
      prisma.cardTransaction.findMany({
        where: cardWhere,
        include: {
          corporateCard: true,
          matchedApp: true,
          linkedSubscription: {
            include: { app: true },
          },
        },
        orderBy: { useDt: "desc" },
      }),
      prisma.cardTransaction.count({ where: cardWhere }),
    ]);
  }

  // 2. PaymentRecord 조회 (source가 'card'가 아닌 경우)
  let paymentRecords: PaymentRecordWithRelations[] = [];
  let csvTotal = 0;

  if (source !== "card") {
    const csvWhere: Prisma.PaymentRecordWhereInput = {
      organizationId,
    };

    if (matchStatus) {
      if (Array.isArray(matchStatus)) {
        csvWhere.matchStatus = { in: matchStatus };
      } else {
        csvWhere.matchStatus = matchStatus;
      }
    }
    if (appId) {
      csvWhere.matchedAppId = appId;
    }
    if (startDate || endDate) {
      csvWhere.transactionDate = {};
      if (startDate) {
        (csvWhere.transactionDate as Prisma.DateTimeFilter).gte = startDate;
      }
      if (endDate) {
        (csvWhere.transactionDate as Prisma.DateTimeFilter).lte = endDate;
      }
    }

    [paymentRecords, csvTotal] = await Promise.all([
      prisma.paymentRecord.findMany({
        where: csvWhere,
        include: {
          matchedApp: true,
          linkedSubscription: {
            include: { app: true },
          },
        },
        orderBy: { transactionDate: "desc" },
      }),
      prisma.paymentRecord.count({ where: csvWhere }),
    ]);
  }

  // 3. Union 및 정렬
  const allRecords: UnifiedPayment[] = [
    ...cardTransactions.map(convertCardTransaction),
    ...paymentRecords.map(convertPaymentRecord),
  ];

  // 날짜 내림차순 정렬
  allRecords.sort(
    (a, b) => b.transactionDate.getTime() - a.transactionDate.getTime()
  );

  // 4. 페이지네이션 적용
  const paginatedRecords = allRecords.slice(skip, skip + limit);

  return {
    records: paginatedRecords,
    total: cardTotal + csvTotal,
  };
}

/**
 * 통합 결제 금액 집계 (월별)
 */
export async function getUnifiedPaymentTotals(
  organizationId: string,
  startDate: Date,
  endDate?: Date
): Promise<{ cardTotal: number; csvTotal: number; total: number }> {
  // CardTransaction 합계 (승인내역 기준)
  const cardWhere: Prisma.CardTransactionWhereInput = {
    organizationId,
    transactionType: "APPROVAL", // 승인내역 기준 조회
  };

  const startStr = startDate.toISOString().slice(0, 10).replace(/-/g, "");
  cardWhere.useDt = { gte: startStr };

  if (endDate) {
    const endStr = endDate.toISOString().slice(0, 10).replace(/-/g, "");
    (cardWhere.useDt as Prisma.StringFilter<"CardTransaction">).lte = endStr;
  }

  const cardAgg = await prisma.cardTransaction.aggregate({
    where: cardWhere,
    _sum: { useAmt: true },
  });

  // PaymentRecord 합계 (매칭된 것만)
  const csvWhere: Prisma.PaymentRecordWhereInput = {
    organizationId,
    matchStatus: { in: ["MANUAL", "AUTO_MATCHED"] },
    transactionDate: { gte: startDate },
  };

  if (endDate) {
    (csvWhere.transactionDate as Prisma.DateTimeFilter).lte = endDate;
  }

  const csvAgg = await prisma.paymentRecord.aggregate({
    where: csvWhere,
    _sum: { amount: true },
  });

  const cardTotal = Number(cardAgg._sum.useAmt || 0);
  const csvTotal = Number(csvAgg._sum.amount || 0);

  return {
    cardTotal,
    csvTotal,
    total: cardTotal + csvTotal,
  };
}

/**
 * 미매칭 결제 건수 조회
 */
export async function getUnifiedUnmatchedCount(
  organizationId: string
): Promise<{ cardCount: number; csvCount: number; total: number }> {
  const [cardCount, csvCount] = await Promise.all([
    // CardTransaction 미매칭 (PENDING만 — UNMATCHED는 Non-SaaS 판정 완료)
    prisma.cardTransaction.count({
      where: {
        organizationId,
        transactionType: "APPROVAL",
        matchStatus: "PENDING",
      },
    }),
    // PaymentRecord 미매칭 (PENDING만)
    prisma.paymentRecord.count({
      where: {
        organizationId,
        matchStatus: "PENDING",
      },
    }),
  ]);

  return {
    cardCount,
    csvCount,
    total: cardCount + csvCount,
  };
}
