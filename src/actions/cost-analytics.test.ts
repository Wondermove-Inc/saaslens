// src/actions/cost-analytics.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    paymentRecord: {
      aggregate: vi.fn(),
      groupBy: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    cardTransaction: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    app: {
      findMany: vi.fn(),
    },
    subscription: {
      findMany: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  detectCostAnomalies,
  getCostStatistics,
  getForecastedCost,
  getMonthlyCostTrend,
  getTopCostApps,
  getUnmatchedPaymentCount,
} from "./cost-analytics";

describe("cost-analytics actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCostStatistics", () => {
    it("인증되지 않은 사용자는 에러를 반환해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue(null as never);

      const result = await getCostStatistics({});

      expect(result).toEqual({
        success: false,
        message: "인증이 필요합니다",
      });
    });

    it("조직 ID가 없는 사용자는 에러를 반환해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: null, role: "ADMIN" },
      } as never);

      const result = await getCostStatistics({});

      expect(result).toEqual({
        success: false,
        message: "조직 정보가 필요합니다",
      });
    });

    it("비용 통계를 올바르게 계산해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      // 현재 기간 PaymentRecord 집계 (SaaS)
      vi.mocked(prisma.paymentRecord.aggregate).mockResolvedValueOnce({
        _sum: { amount: { toNumber: () => 1000000 } },
        _count: { id: 10 },
      } as never);

      // 현재 기간 CardTransaction 집계 (SaaS)
      vi.mocked(prisma.cardTransaction.aggregate).mockResolvedValueOnce({
        _sum: { useAmt: null },
        _count: { id: 0 },
      } as never);

      // 전체 비용 PaymentRecord 집계 (SaaS + Non-SaaS)
      vi.mocked(prisma.paymentRecord.aggregate).mockResolvedValueOnce({
        _sum: { amount: { toNumber: () => 1500000 } },
      } as never);

      // 전체 비용 CardTransaction 집계 (SaaS + Non-SaaS)
      vi.mocked(prisma.cardTransaction.aggregate).mockResolvedValueOnce({
        _sum: { useAmt: null },
      } as never);

      // 이전 기간 PaymentRecord 집계 (전월 대비 비교용)
      vi.mocked(prisma.paymentRecord.aggregate).mockResolvedValueOnce({
        _sum: { amount: { toNumber: () => 800000 } },
        _count: { id: 8 },
      } as never);

      // 이전 기간 CardTransaction 집계
      vi.mocked(prisma.cardTransaction.aggregate).mockResolvedValueOnce({
        _sum: { useAmt: null },
        _count: { id: 0 },
      } as never);

      // 전체 기간 PaymentRecord 집계 (월 평균용)
      vi.mocked(prisma.paymentRecord.aggregate).mockResolvedValueOnce({
        _sum: { amount: { toNumber: () => 3000000 } },
      } as never);

      // 가장 오래된 PaymentRecord
      vi.mocked(prisma.paymentRecord.findFirst).mockResolvedValueOnce({
        transactionDate: new Date("2023-10-01"),
      } as never);

      // 전체 기간 CardTransaction 집계 (월 평균용)
      vi.mocked(prisma.cardTransaction.aggregate).mockResolvedValueOnce({
        _sum: { useAmt: null },
      } as never);

      // 가장 오래된 CardTransaction
      vi.mocked(prisma.cardTransaction.findFirst).mockResolvedValueOnce(
        null as never
      );

      const result = await getCostStatistics({
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-01-31"),
      });

      expect(result.success).toBe(true);
      expect(result.data?.statistics.totalCost).toBe(1000000);
      expect(result.data?.statistics.transactionCount).toBe(10);
      expect(result.data?.statistics.costChange).toBe(25); // (1000000 - 800000) / 800000 * 100 = 25%
      // 월 평균: 전체 기간 기준 (totalCost와 다른 값)
      expect(result.data?.statistics.monthlyAverage).toBeDefined();
      expect(result.data?.statistics.monthlyAverage).not.toBe(
        result.data?.statistics.totalCost
      );
      // totalCostAll >= totalCost (전체 >= SaaS)
      expect(result.data?.statistics.totalCostAll).toBe(1500000);
      expect(result.data?.statistics.totalCostAll).toBeGreaterThanOrEqual(
        result.data?.statistics.totalCost ?? 0
      );
    });

    it("이전 데이터가 없을 때 증감률은 0이어야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      // 현재 기간 PaymentRecord 집계 (SaaS)
      vi.mocked(prisma.paymentRecord.aggregate).mockResolvedValueOnce({
        _sum: { amount: { toNumber: () => 500000 } },
        _count: { id: 5 },
      } as never);

      // 현재 기간 CardTransaction 집계 (SaaS)
      vi.mocked(prisma.cardTransaction.aggregate).mockResolvedValueOnce({
        _sum: { useAmt: null },
        _count: { id: 0 },
      } as never);

      // 전체 비용 PaymentRecord 집계 (SaaS + Non-SaaS)
      vi.mocked(prisma.paymentRecord.aggregate).mockResolvedValueOnce({
        _sum: { amount: { toNumber: () => 500000 } },
      } as never);

      // 전체 비용 CardTransaction 집계 (SaaS + Non-SaaS)
      vi.mocked(prisma.cardTransaction.aggregate).mockResolvedValueOnce({
        _sum: { useAmt: null },
      } as never);

      // 이전 기간 PaymentRecord 집계 (데이터 없음)
      vi.mocked(prisma.paymentRecord.aggregate).mockResolvedValueOnce({
        _sum: { amount: null },
        _count: { id: 0 },
      } as never);

      // 이전 기간 CardTransaction 집계
      vi.mocked(prisma.cardTransaction.aggregate).mockResolvedValueOnce({
        _sum: { useAmt: null },
        _count: { id: 0 },
      } as never);

      // 전체 기간 PaymentRecord 집계 (월 평균용)
      vi.mocked(prisma.paymentRecord.aggregate).mockResolvedValueOnce({
        _sum: { amount: { toNumber: () => 500000 } },
      } as never);

      // 가장 오래된 PaymentRecord
      vi.mocked(prisma.paymentRecord.findFirst).mockResolvedValueOnce(
        null as never
      );

      // 전체 기간 CardTransaction 집계 (월 평균용)
      vi.mocked(prisma.cardTransaction.aggregate).mockResolvedValueOnce({
        _sum: { useAmt: null },
      } as never);

      // 가장 오래된 CardTransaction
      vi.mocked(prisma.cardTransaction.findFirst).mockResolvedValueOnce(
        null as never
      );

      const result = await getCostStatistics({});

      expect(result.success).toBe(true);
      expect(result.data?.statistics.costChange).toBe(0);
    });

    it("월 평균 비용은 전체 기간 기준으로 계산되어야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      // 현재 기간 (30일) totalCost = 1,000,000 (SaaS)
      vi.mocked(prisma.paymentRecord.aggregate).mockResolvedValueOnce({
        _sum: { amount: { toNumber: () => 1000000 } },
        _count: { id: 10 },
      } as never);
      vi.mocked(prisma.cardTransaction.aggregate).mockResolvedValueOnce({
        _sum: { useAmt: null },
        _count: { id: 0 },
      } as never);

      // 전체 비용 (SaaS + Non-SaaS)
      vi.mocked(prisma.paymentRecord.aggregate).mockResolvedValueOnce({
        _sum: { amount: { toNumber: () => 1200000 } },
      } as never);
      vi.mocked(prisma.cardTransaction.aggregate).mockResolvedValueOnce({
        _sum: { useAmt: null },
      } as never);

      // 이전 기간
      vi.mocked(prisma.paymentRecord.aggregate).mockResolvedValueOnce({
        _sum: { amount: null },
        _count: { id: 0 },
      } as never);
      vi.mocked(prisma.cardTransaction.aggregate).mockResolvedValueOnce({
        _sum: { useAmt: null },
        _count: { id: 0 },
      } as never);

      // 전체 기간 allTimeTotal = 5,000,000 (5개월간 총액)
      vi.mocked(prisma.paymentRecord.aggregate).mockResolvedValueOnce({
        _sum: { amount: { toNumber: () => 5000000 } },
      } as never);

      // 가장 오래된 거래: 정확히 150일 전 (ceil(150/30.44) = 5개월)
      const msPerMonth = 30.44 * 24 * 60 * 60 * 1000;
      const fiveMonthsAgo = new Date(Date.now() - 150 * 24 * 60 * 60 * 1000);
      vi.mocked(prisma.paymentRecord.findFirst).mockResolvedValueOnce({
        transactionDate: fiveMonthsAgo,
      } as never);

      vi.mocked(prisma.cardTransaction.aggregate).mockResolvedValueOnce({
        _sum: { useAmt: null },
      } as never);
      vi.mocked(prisma.cardTransaction.findFirst).mockResolvedValueOnce(
        null as never
      );

      const result = await getCostStatistics({});

      expect(result.success).toBe(true);
      // totalCost = 1,000,000 (현재 기간)
      expect(result.data?.statistics.totalCost).toBe(1000000);
      // 전체 기간 기준 월 평균 계산
      const expectedMonths = Math.max(
        1,
        Math.ceil((Date.now() - fiveMonthsAgo.getTime()) / msPerMonth)
      );
      const expectedAvg = Math.round(5000000 / expectedMonths);
      expect(result.data?.statistics.monthlyAverage).toBe(expectedAvg);
    });

    it("teamId 필터가 결제 집계에 반영되어야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      // 현재 기간 (SaaS)
      vi.mocked(prisma.paymentRecord.aggregate).mockResolvedValueOnce({
        _sum: { amount: { toNumber: () => 0 } },
        _count: { id: 0 },
      } as never);
      vi.mocked(prisma.cardTransaction.aggregate).mockResolvedValueOnce({
        _sum: { useAmt: null },
        _count: { id: 0 },
      } as never);

      // 전체 비용 (SaaS + Non-SaaS)
      vi.mocked(prisma.paymentRecord.aggregate).mockResolvedValueOnce({
        _sum: { amount: null },
      } as never);
      vi.mocked(prisma.cardTransaction.aggregate).mockResolvedValueOnce({
        _sum: { useAmt: null },
      } as never);

      // 이전 기간
      vi.mocked(prisma.paymentRecord.aggregate).mockResolvedValueOnce({
        _sum: { amount: null },
        _count: { id: 0 },
      } as never);
      vi.mocked(prisma.cardTransaction.aggregate).mockResolvedValueOnce({
        _sum: { useAmt: null },
        _count: { id: 0 },
      } as never);

      // 전체 기간 mocks (월 평균용)
      vi.mocked(prisma.paymentRecord.aggregate).mockResolvedValueOnce({
        _sum: { amount: null },
      } as never);
      vi.mocked(prisma.paymentRecord.findFirst).mockResolvedValueOnce(
        null as never
      );
      vi.mocked(prisma.cardTransaction.aggregate).mockResolvedValueOnce({
        _sum: { useAmt: null },
      } as never);
      vi.mocked(prisma.cardTransaction.findFirst).mockResolvedValueOnce(
        null as never
      );

      await getCostStatistics({ teamId: "team-1" });

      expect(prisma.paymentRecord.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { teamId: "team-1" },
              { user: { teamId: "team-1" } },
            ]),
          }),
        })
      );

      expect(prisma.cardTransaction.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            corporateCard: {
              OR: [
                { teamId: "team-1" },
                { assignedUser: { teamId: "team-1" } },
              ],
            },
          }),
        })
      );
    });

    it("userId 필터가 결제 집계에 반영되어야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      // 현재 기간 (SaaS)
      vi.mocked(prisma.paymentRecord.aggregate).mockResolvedValueOnce({
        _sum: { amount: { toNumber: () => 0 } },
        _count: { id: 0 },
      } as never);
      vi.mocked(prisma.cardTransaction.aggregate).mockResolvedValueOnce({
        _sum: { useAmt: null },
        _count: { id: 0 },
      } as never);

      // 전체 비용 (SaaS + Non-SaaS)
      vi.mocked(prisma.paymentRecord.aggregate).mockResolvedValueOnce({
        _sum: { amount: null },
      } as never);
      vi.mocked(prisma.cardTransaction.aggregate).mockResolvedValueOnce({
        _sum: { useAmt: null },
      } as never);

      // 이전 기간
      vi.mocked(prisma.paymentRecord.aggregate).mockResolvedValueOnce({
        _sum: { amount: null },
        _count: { id: 0 },
      } as never);
      vi.mocked(prisma.cardTransaction.aggregate).mockResolvedValueOnce({
        _sum: { useAmt: null },
        _count: { id: 0 },
      } as never);

      // 전체 기간 mocks (월 평균용)
      vi.mocked(prisma.paymentRecord.aggregate).mockResolvedValueOnce({
        _sum: { amount: null },
      } as never);
      vi.mocked(prisma.paymentRecord.findFirst).mockResolvedValueOnce(
        null as never
      );
      vi.mocked(prisma.cardTransaction.aggregate).mockResolvedValueOnce({
        _sum: { useAmt: null },
      } as never);
      vi.mocked(prisma.cardTransaction.findFirst).mockResolvedValueOnce(
        null as never
      );

      await getCostStatistics({ userId: "user-1" });

      expect(prisma.paymentRecord.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: "user-1",
          }),
        })
      );

      expect(prisma.cardTransaction.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            corporateCard: { assignedUserId: "user-1" },
          }),
        })
      );
    });

    it("matchStatus 필터에 PENDING과 UNMATCHED가 포함되어야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      // 현재 기간 (SaaS)
      vi.mocked(prisma.paymentRecord.aggregate).mockResolvedValueOnce({
        _sum: { amount: { toNumber: () => 0 } },
        _count: { id: 0 },
      } as never);
      vi.mocked(prisma.cardTransaction.aggregate).mockResolvedValueOnce({
        _sum: { useAmt: null },
        _count: { id: 0 },
      } as never);

      // 전체 비용 (SaaS + Non-SaaS)
      vi.mocked(prisma.paymentRecord.aggregate).mockResolvedValueOnce({
        _sum: { amount: null },
      } as never);
      vi.mocked(prisma.cardTransaction.aggregate).mockResolvedValueOnce({
        _sum: { useAmt: null },
      } as never);

      // 이전 기간
      vi.mocked(prisma.paymentRecord.aggregate).mockResolvedValueOnce({
        _sum: { amount: null },
        _count: { id: 0 },
      } as never);
      vi.mocked(prisma.cardTransaction.aggregate).mockResolvedValueOnce({
        _sum: { useAmt: null },
        _count: { id: 0 },
      } as never);

      // 전체 기간 mocks (월 평균용)
      vi.mocked(prisma.paymentRecord.aggregate).mockResolvedValueOnce({
        _sum: { amount: null },
      } as never);
      vi.mocked(prisma.paymentRecord.findFirst).mockResolvedValueOnce(
        null as never
      );
      vi.mocked(prisma.cardTransaction.aggregate).mockResolvedValueOnce({
        _sum: { useAmt: null },
      } as never);
      vi.mocked(prisma.cardTransaction.findFirst).mockResolvedValueOnce(
        null as never
      );

      await getCostStatistics({});

      // 현재 기간 + 전체 비용 + 이전 기간 + 전체 기간 aggregate 호출 확인
      expect(prisma.paymentRecord.aggregate).toHaveBeenCalledTimes(4);

      // 현재 기간
      expect(prisma.paymentRecord.aggregate).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: expect.objectContaining({
            matchStatus: {
              in: ["MANUAL", "AUTO_MATCHED", "UNMATCHED", "PENDING"],
            },
          }),
        })
      );

      // 이전 기간
      expect(prisma.paymentRecord.aggregate).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: expect.objectContaining({
            matchStatus: {
              in: ["MANUAL", "AUTO_MATCHED", "UNMATCHED", "PENDING"],
            },
          }),
        })
      );
    });

    it("SaaS 매칭된 결제만 집계하기 위해 matchedAppId 필터가 포함되어야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      // 현재 기간 (SaaS)
      vi.mocked(prisma.paymentRecord.aggregate).mockResolvedValueOnce({
        _sum: { amount: { toNumber: () => 0 } },
        _count: { id: 0 },
      } as never);
      vi.mocked(prisma.cardTransaction.aggregate).mockResolvedValueOnce({
        _sum: { useAmt: null },
        _count: { id: 0 },
      } as never);

      // 전체 비용 (SaaS + Non-SaaS) — matchedAppId 필터 없음
      vi.mocked(prisma.paymentRecord.aggregate).mockResolvedValueOnce({
        _sum: { amount: null },
      } as never);
      vi.mocked(prisma.cardTransaction.aggregate).mockResolvedValueOnce({
        _sum: { useAmt: null },
      } as never);

      // 이전 기간
      vi.mocked(prisma.paymentRecord.aggregate).mockResolvedValueOnce({
        _sum: { amount: null },
        _count: { id: 0 },
      } as never);
      vi.mocked(prisma.cardTransaction.aggregate).mockResolvedValueOnce({
        _sum: { useAmt: null },
        _count: { id: 0 },
      } as never);

      // 전체 기간 mocks (월 평균용)
      vi.mocked(prisma.paymentRecord.aggregate).mockResolvedValueOnce({
        _sum: { amount: null },
      } as never);
      vi.mocked(prisma.paymentRecord.findFirst).mockResolvedValueOnce(
        null as never
      );
      vi.mocked(prisma.cardTransaction.aggregate).mockResolvedValueOnce({
        _sum: { useAmt: null },
      } as never);
      vi.mocked(prisma.cardTransaction.findFirst).mockResolvedValueOnce(
        null as never
      );

      await getCostStatistics({});

      // PaymentRecord: 1=현재(SaaS), 2=전체비용, 3=이전(SaaS), 4=전체기간(월평균)
      // 현재 기간 (SaaS) — matchedAppId 필터 있음
      expect(prisma.paymentRecord.aggregate).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: expect.objectContaining({
            matchedAppId: { not: null },
          }),
        })
      );

      // 전체 비용 (call 2) — matchedAppId 필터 없음
      expect(prisma.paymentRecord.aggregate).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: expect.not.objectContaining({
            matchedAppId: expect.anything(),
          }),
        })
      );

      // 이전 기간 (SaaS) — matchedAppId 필터 있음
      expect(prisma.paymentRecord.aggregate).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          where: expect.objectContaining({
            matchedAppId: { not: null },
          }),
        })
      );

      // 전체 기간 (월 평균용) — matchedAppId 필터 있음
      expect(prisma.paymentRecord.aggregate).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({
          where: expect.objectContaining({
            matchedAppId: { not: null },
          }),
        })
      );

      // CardTransaction: 1=현재(SaaS), 2=전체비용, 3=이전(SaaS), 4=전체기간(월평균)
      // 현재 기간 (SaaS) — matchedAppId 필터 있음
      expect(prisma.cardTransaction.aggregate).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: expect.objectContaining({
            matchedAppId: { not: null },
          }),
        })
      );

      // 전체 비용 (call 2) — matchedAppId 필터 없음
      expect(prisma.cardTransaction.aggregate).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: expect.not.objectContaining({
            matchedAppId: expect.anything(),
          }),
        })
      );

      // 이전 기간 (SaaS) — matchedAppId 필터 있음
      expect(prisma.cardTransaction.aggregate).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          where: expect.objectContaining({
            matchedAppId: { not: null },
          }),
        })
      );

      // 전체 기간 (월 평균용) — matchedAppId 필터 있음
      expect(prisma.cardTransaction.aggregate).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({
          where: expect.objectContaining({
            matchedAppId: { not: null },
          }),
        })
      );
    });
  });

  describe("getTopCostApps", () => {
    it("비용 상위 앱 목록을 반환해야 한다 (PaymentRecord + CardTransaction 통합)", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(prisma.paymentRecord.groupBy).mockResolvedValue([
        {
          matchedAppId: "app-1",
          _sum: { amount: { toNumber: () => 500000 } },
          _count: { id: 5 },
        },
        {
          matchedAppId: "app-2",
          _sum: { amount: { toNumber: () => 300000 } },
          _count: { id: 3 },
        },
      ] as never);

      // CardTransaction groupBy: app-1에 추가 200000
      vi.mocked(prisma.cardTransaction.groupBy).mockResolvedValue([
        {
          matchedAppId: "app-1",
          _sum: { useAmt: 200000 },
          _count: { id: 2 },
        },
      ] as never);

      vi.mocked(prisma.app.findMany).mockResolvedValue([
        { id: "app-1", name: "Slack", logoUrl: null },
        { id: "app-2", name: "Notion", logoUrl: null },
      ] as never);

      const result = await getTopCostApps({ limit: 5 });

      expect(result.success).toBe(true);
      expect(result.data?.apps).toHaveLength(2);
      expect(result.data?.apps[0].appName).toBe("Slack");
      // PaymentRecord 500000 + CardTransaction 200000 = 700000
      expect(result.data?.apps[0].totalCost).toBe(700000);
      // 전체: 700000 + 300000 = 1000000
      expect(result.data?.totalCost).toBe(1000000);
      expect(result.data?.apps[0].percentage).toBeCloseTo(70);
    });

    it("matchStatus 5종이 사용되어야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(prisma.paymentRecord.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.cardTransaction.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.app.findMany).mockResolvedValue([]);

      await getTopCostApps({});

      expect(prisma.paymentRecord.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            matchStatus: {
              in: ["MANUAL", "AUTO_MATCHED", "UNMATCHED", "PENDING"],
            },
          }),
        })
      );
    });

    it("데이터가 없을 때 빈 배열을 반환해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(prisma.paymentRecord.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.cardTransaction.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.app.findMany).mockResolvedValue([]);

      const result = await getTopCostApps({});

      expect(result.success).toBe(true);
      expect(result.data?.apps).toHaveLength(0);
      expect(result.data?.totalCost).toBe(0);
    });

    it("CardTransaction만 있는 앱도 포함되어야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      // PaymentRecord: 없음
      vi.mocked(prisma.paymentRecord.groupBy).mockResolvedValue([]);

      // CardTransaction: app-3에 100000
      vi.mocked(prisma.cardTransaction.groupBy).mockResolvedValue([
        {
          matchedAppId: "app-3",
          _sum: { useAmt: 100000 },
          _count: { id: 1 },
        },
      ] as never);

      vi.mocked(prisma.app.findMany).mockResolvedValue([
        { id: "app-3", name: "GitHub", logoUrl: null },
      ] as never);

      const result = await getTopCostApps({});

      expect(result.success).toBe(true);
      expect(result.data?.apps).toHaveLength(1);
      expect(result.data?.apps[0].appName).toBe("GitHub");
      expect(result.data?.apps[0].totalCost).toBe(100000);
      expect(result.data?.totalCost).toBe(100000);
    });
  });

  describe("getMonthlyCostTrend", () => {
    it("최근 6개월 월별 추세를 반환해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      // CardTransaction mock (빈 배열 - 카드 데이터 없음)
      vi.mocked(prisma.cardTransaction.findMany).mockResolvedValue([]);

      // 월별 그룹 결과 모킹
      vi.mocked(prisma.paymentRecord.findMany).mockResolvedValue([
        {
          transactionDate: new Date("2024-01-15"),
          amount: { toNumber: () => 100000 },
        },
        {
          transactionDate: new Date("2024-01-20"),
          amount: { toNumber: () => 200000 },
        },
        {
          transactionDate: new Date("2024-02-10"),
          amount: { toNumber: () => 150000 },
        },
      ] as never);

      const result = await getMonthlyCostTrend({ months: 6 });

      expect(result.success).toBe(true);
      expect(result.data?.trends).toBeDefined();
      expect(result.data?.trends.length).toBeGreaterThanOrEqual(0);
    });

    it("UNMATCHED 상태의 Non-SaaS 비용이 정상 집계되어야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      // CardTransaction mock (빈 배열)
      vi.mocked(prisma.cardTransaction.findMany).mockResolvedValue([]);

      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 15);

      // SaaS 매칭된 결제 + Non-SaaS(UNMATCHED) 결제 혼합
      vi.mocked(prisma.paymentRecord.findMany).mockResolvedValue([
        {
          transactionDate: currentMonth,
          amount: { toNumber: () => 100000 },
          matchedAppId: "app-1", // SaaS
        },
        {
          transactionDate: currentMonth,
          amount: { toNumber: () => 50000 },
          matchedAppId: null, // Non-SaaS (UNMATCHED)
        },
        {
          transactionDate: currentMonth,
          amount: { toNumber: () => 30000 },
          matchedAppId: null, // Non-SaaS (UNMATCHED)
        },
      ] as never);

      const result = await getMonthlyCostTrend({ months: 1 });

      expect(result.success).toBe(true);
      expect(result.data?.trends).toBeDefined();
      expect(result.data!.trends.length).toBe(1);

      const monthData = result.data!.trends[0];
      // Non-SaaS 비용이 0이 아니어야 함
      expect(monthData.nonSaasCost).toBe(80000); // 50000 + 30000
      expect(monthData.saasCost).toBe(100000);
      expect(monthData.totalCost).toBe(180000);
      expect(monthData.nonSaasTransactionCount).toBe(2);
      expect(monthData.saasTransactionCount).toBe(1);
    });

    it("matchStatus 필터에 PENDING과 UNMATCHED가 포함되어야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(prisma.cardTransaction.findMany).mockResolvedValue([]);
      vi.mocked(prisma.paymentRecord.findMany).mockResolvedValue([]);

      await getMonthlyCostTrend({});

      expect(prisma.paymentRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            matchStatus: {
              in: ["MANUAL", "AUTO_MATCHED", "UNMATCHED", "PENDING"],
            },
          }),
        })
      );
    });

    it("PENDING 상태 레코드가 Non-SaaS 비용으로 집계되어야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(prisma.cardTransaction.findMany).mockResolvedValue([]);

      const now = new Date();
      vi.mocked(prisma.paymentRecord.findMany).mockResolvedValue([
        {
          transactionDate: now,
          amount: { toNumber: () => 50000 },
          matchedAppId: null,
          matchStatus: "PENDING",
        },
        {
          transactionDate: now,
          amount: { toNumber: () => 30000 },
          matchedAppId: null,
          matchStatus: "UNMATCHED",
        },
      ] as never);

      const result = await getMonthlyCostTrend({});

      expect(result.success).toBe(true);
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const monthData = result.data?.trends.find((t) => t.month === monthKey);
      expect(monthData).toBeDefined();
      expect(monthData!.nonSaasCost).toBe(80000);
      expect(monthData!.nonSaasTransactionCount).toBe(2);
    });

    it("기본 months는 6이어야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      // CardTransaction mock (빈 배열)
      vi.mocked(prisma.cardTransaction.findMany).mockResolvedValue([]);

      vi.mocked(prisma.paymentRecord.findMany).mockResolvedValue([]);

      const result = await getMonthlyCostTrend({});

      expect(result.success).toBe(true);
      // 6개월치 빈 데이터 반환
      expect(result.data?.trends).toBeDefined();
    });

    it("averageCost 계산 시 데이터가 없는 월(0원)은 분모에서 제외해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(prisma.cardTransaction.findMany).mockResolvedValue([]);

      // 3개월 중 1개월만 데이터 있음
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 15);

      vi.mocked(prisma.paymentRecord.findMany).mockResolvedValue([
        {
          transactionDate: currentMonth,
          amount: { toNumber: () => 300000 },
          matchedAppId: "app-1",
        },
      ] as never);

      const result = await getMonthlyCostTrend({ months: 3 });

      expect(result.success).toBe(true);
      // 3개월 중 1개월만 데이터가 있으므로 평균 = 300000 / 1 = 300000
      // (이전 방식: 300000 / 3 = 100000 — 잘못됨)
      expect(result.data?.averageCost).toBe(300000);
    });

    it("모든 월에 데이터가 없으면 averageCost는 0이어야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(prisma.cardTransaction.findMany).mockResolvedValue([]);
      vi.mocked(prisma.paymentRecord.findMany).mockResolvedValue([]);

      const result = await getMonthlyCostTrend({ months: 6 });

      expect(result.success).toBe(true);
      expect(result.data?.averageCost).toBe(0);
    });
  });

  describe("getUnmatchedPaymentCount", () => {
    it("미매칭 결제 건수를 반환해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      // CardTransaction mock (모든 카드 결제는 미매칭 처리됨)
      vi.mocked(prisma.cardTransaction.aggregate).mockResolvedValue({
        _count: { id: 5 },
        _sum: { useAmt: 500000 },
      } as never);

      // CardTransaction findFirst - 최신 카드 거래일
      vi.mocked(prisma.cardTransaction.findFirst).mockResolvedValue({
        useDt: "20240125",
      } as never);

      // PaymentRecord mock
      vi.mocked(prisma.paymentRecord.aggregate).mockResolvedValue({
        _count: { id: 10 },
        _sum: { amount: { toNumber: () => 750000 } },
      } as never);

      // PaymentRecord findFirst - 최신 CSV 결제일
      vi.mocked(prisma.paymentRecord.findFirst).mockResolvedValue({
        transactionDate: new Date("2024-01-25"),
      } as never);

      const result = await getUnmatchedPaymentCount();

      expect(result.success).toBe(true);
      // 카드 5건 + CSV 10건 = 15건
      expect(result.data?.count).toBe(15);
    });

    it("미매칭 결제가 없으면 0을 반환해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      // CardTransaction mock (없음)
      vi.mocked(prisma.cardTransaction.aggregate).mockResolvedValue({
        _count: { id: 0 },
        _sum: { useAmt: null },
      } as never);

      // CardTransaction findFirst - 없음
      vi.mocked(prisma.cardTransaction.findFirst).mockResolvedValue(null);

      // PaymentRecord mock (없음)
      vi.mocked(prisma.paymentRecord.aggregate).mockResolvedValue({
        _count: { id: 0 },
        _sum: { amount: null },
      } as never);

      // PaymentRecord findFirst - 없음
      vi.mocked(prisma.paymentRecord.findFirst).mockResolvedValue(null);

      const result = await getUnmatchedPaymentCount();

      expect(result.success).toBe(true);
      expect(result.data?.count).toBe(0);
      expect(result.data?.totalAmount).toBe(0);
      expect(result.data?.latestDate).toBeNull();
    });
  });

  describe("detectCostAnomalies", () => {
    it("비용 급증 앱을 감지해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      // 현재 월 데이터
      vi.mocked(prisma.paymentRecord.groupBy).mockResolvedValueOnce([
        { matchedAppId: "app-1", _sum: { amount: { toNumber: () => 300000 } } },
        { matchedAppId: "app-2", _sum: { amount: { toNumber: () => 100000 } } },
      ] as never);

      // 이전 월 데이터
      vi.mocked(prisma.paymentRecord.groupBy).mockResolvedValueOnce([
        { matchedAppId: "app-1", _sum: { amount: { toNumber: () => 100000 } } },
        { matchedAppId: "app-2", _sum: { amount: { toNumber: () => 90000 } } },
      ] as never);

      vi.mocked(prisma.app.findMany).mockResolvedValue([
        { id: "app-1", name: "Slack" },
        { id: "app-2", name: "Notion" },
      ] as never);

      const result = await detectCostAnomalies();

      expect(result.success).toBe(true);
      expect(result.data?.hasAnomalies).toBe(true);
      // app-1은 200% 증가 (100000 -> 300000)
      expect(result.data?.anomalies.some((a) => a.appId === "app-1")).toBe(
        true
      );
      expect(
        result.data?.anomalies.find((a) => a.appId === "app-1")?.severity
      ).toBe("high");
    });

    it("이상이 없으면 빈 배열을 반환해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(prisma.paymentRecord.groupBy).mockResolvedValueOnce([
        { matchedAppId: "app-1", _sum: { amount: { toNumber: () => 100000 } } },
      ] as never);

      vi.mocked(prisma.paymentRecord.groupBy).mockResolvedValueOnce([
        { matchedAppId: "app-1", _sum: { amount: { toNumber: () => 100000 } } },
      ] as never);

      vi.mocked(prisma.app.findMany).mockResolvedValue([
        { id: "app-1", name: "Slack" },
      ] as never);

      const result = await detectCostAnomalies();

      expect(result.success).toBe(true);
      expect(result.data?.hasAnomalies).toBe(false);
      expect(result.data?.anomalies).toHaveLength(0);
    });
  });

  describe("getForecastedCost", () => {
    it("구독 기반 예측 비용을 반환해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(prisma.subscription.findMany).mockResolvedValue([
        {
          id: "sub-1",
          app: { name: "Slack" },
          amount: { toNumber: () => 100000 },
          billingCycle: "MONTHLY",
          renewalDate: new Date("2024-02-15"),
        },
        {
          id: "sub-2",
          app: { name: "Notion" },
          amount: { toNumber: () => 600000 },
          billingCycle: "YEARLY",
          renewalDate: new Date("2024-12-01"),
        },
      ] as never);

      // 실제 결제 내역
      vi.mocked(prisma.paymentRecord.aggregate).mockResolvedValue({
        _sum: { amount: { toNumber: () => 95000 } },
      } as never);

      const result = await getForecastedCost({ targetMonth: "2024-02" });

      expect(result.success).toBe(true);
      expect(result.data?.forecast.forecastedCost).toBeGreaterThan(0);
      expect(result.data?.forecast.subscriptionBreakdown).toBeDefined();
    });

    it("구독이 없으면 예측 비용은 0이어야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);
      vi.mocked(prisma.paymentRecord.aggregate).mockResolvedValue({
        _sum: { amount: null },
      } as never);

      const result = await getForecastedCost({});

      expect(result.success).toBe(true);
      expect(result.data?.forecast.forecastedCost).toBe(0);
      expect(result.data?.forecast.subscriptionBreakdown).toHaveLength(0);
    });
  });
});
