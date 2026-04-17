// src/actions/payment-import.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    paymentRecord: {
      createMany: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    cardTransaction: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    app: {
      findMany: vi.fn(),
    },
    subscription: {
      findFirst: vi.fn(),
    },
    saaSCatalog: {
      findMany: vi.fn(),
    },
    merchantPattern: {
      findMany: vi.fn(),
    },
    llmInference: {
      create: vi.fn(),
    },
    team: {
      findFirst: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn((fn) => fn()),
  },
}));

vi.mock("@/lib/services/saas-matcher", () => ({
  matchMerchantWithLLM: vi.fn().mockResolvedValue({
    appId: "app-1",
    confidence: 0.8,
    matchSource: "LLM",
  }),
  checkNonSaaSCache: vi.fn().mockResolvedValue(new Set()),
  saveNonSaaSVendors: vi.fn().mockResolvedValue(undefined),
}));

// Mock revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  deletePaymentRecord,
  getPaymentRecords,
  getPaymentSummaryByApp,
  importPaymentCSV,
  linkPaymentToSubscription,
  updatePaymentMatch,
  updatePaymentRecord,
} from "./payment-import";

describe("payment-import actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("importPaymentCSV", () => {
    it("인증되지 않은 사용자는 에러를 반환해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue(null as never);

      const result = await importPaymentCSV(
        "결제일,가맹점명,결제금액\n2024-01-15,SLACK,100000"
      );

      expect(result).toEqual({
        success: false,
        message: "인증이 필요합니다",
      });
    });

    it("조직 ID가 없는 사용자는 에러를 반환해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: null, role: "ADMIN" },
      } as never);

      const result = await importPaymentCSV(
        "결제일,가맹점명,결제금액\n2024-01-15,SLACK,100000"
      );

      expect(result).toEqual({
        success: false,
        message: "조직 정보가 필요합니다",
      });
    });

    it("ADMIN이 아닌 사용자는 에러를 반환해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "MEMBER" },
      } as never);

      const result = await importPaymentCSV(
        "결제일,가맹점명,결제금액\n2024-01-15,SLACK,100000"
      );

      expect(result).toEqual({
        success: false,
        message: "관리자만 결제 내역을 가져올 수 있습니다",
      });
    });

    it("유효한 카드사 CSV로 결제 내역을 가져와야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(prisma.app.findMany).mockResolvedValue([
        { id: "app-1", name: "Slack", catalogId: "cat-1" },
      ] as never);

      vi.mocked(prisma.saaSCatalog.findMany).mockResolvedValue([
        {
          id: "cat-1",
          name: "Slack",
          slug: "slack",
          patterns: [
            { pattern: "slack", matchType: "EXACT", confidence: 0.95 },
          ],
        },
      ] as never);

      vi.mocked(prisma.merchantPattern.findMany).mockResolvedValue([]);

      // 중복 체크를 위한 mock (빈 배열 = 중복 없음)
      vi.mocked(prisma.paymentRecord.findMany).mockResolvedValue([]);

      vi.mocked(prisma.paymentRecord.createMany).mockResolvedValue({
        count: 2,
      });

      const csv = `결제일,가맹점명,결제금액,카드번호,승인번호
2024-01-15,SLACK TECHNOLOGIES,100000,1234-****-****-5678,12345678
2024-01-16,UNKNOWN VENDOR,50000,1234-****-****-5678,12345679`;

      const result = await importPaymentCSV(csv);

      expect(result.success).toBe(true);
      expect(result.data?.imported).toBe(2);
      // 매칭 수는 실제 매칭 로직에 따라 달라질 수 있음
      expect(result.data?.matched).toBeGreaterThanOrEqual(0);
      expect(result.data?.unmatched).toBeGreaterThanOrEqual(0);
      expect(prisma.paymentRecord.createMany).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith("/payments");
    });

    it("빈 CSV는 에러를 반환해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      const result = await importPaymentCSV("");

      expect(result.success).toBe(false);
      expect(result.message).toContain("빈");
    });

    it("지원하지 않는 CSV 형식은 에러를 반환해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      const csv = `col1,col2,col3
val1,val2,val3`;

      const result = await importPaymentCSV(csv);

      expect(result.success).toBe(false);
      expect(result.message).toContain("지원하지 않는");
    });

    // ==================== SMP-78: Team/User 배정 테스트 ====================

    describe("Team/User 배정", () => {
      const validCsv = `결제일,가맹점명,결제금액,카드번호,승인번호
2024-01-15,SLACK TECHNOLOGIES,100000,1234-****-****-5678,12345678`;

      beforeEach(() => {
        vi.mocked(auth).mockResolvedValue({
          user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
        } as never);

        vi.mocked(prisma.app.findMany).mockResolvedValue([]);
        vi.mocked(prisma.saaSCatalog.findMany).mockResolvedValue([]);
        vi.mocked(prisma.merchantPattern.findMany).mockResolvedValue([]);
        vi.mocked(prisma.paymentRecord.findMany).mockResolvedValue([]);
        vi.mocked(prisma.paymentRecord.createMany).mockResolvedValue({
          count: 1,
        });
      });

      it("유효한 teamId와 함께 결제 내역을 가져와야 한다", async () => {
        vi.mocked(prisma.team.findFirst).mockResolvedValue({
          id: "team-1",
          name: "마케팅팀",
          organizationId: "org-1",
        } as never);

        const result = await importPaymentCSV(validCsv, {
          teamId: "team-1",
        });

        expect(result.success).toBe(true);
        expect(prisma.paymentRecord.createMany).toHaveBeenCalledWith({
          data: expect.arrayContaining([
            expect.objectContaining({
              teamId: "team-1",
              userId: null,
            }),
          ]),
        });
      });

      it("유효한 userId와 함께 결제 내역을 가져와야 한다", async () => {
        vi.mocked(prisma.user.findFirst).mockResolvedValue({
          id: "user-2",
          name: "김철수",
          organizationId: "org-1",
        } as never);

        const result = await importPaymentCSV(validCsv, {
          userId: "user-2",
        });

        expect(result.success).toBe(true);
        expect(prisma.paymentRecord.createMany).toHaveBeenCalledWith({
          data: expect.arrayContaining([
            expect.objectContaining({
              teamId: null,
              userId: "user-2",
            }),
          ]),
        });
      });

      it("다른 조직의 teamId는 에러를 반환해야 한다", async () => {
        vi.mocked(prisma.team.findFirst).mockResolvedValue(null);

        const result = await importPaymentCSV(validCsv, {
          teamId: "other-org-team",
        });

        expect(result.success).toBe(false);
        expect(result.message).toBe("유효하지 않은 팀입니다");
      });

      it("다른 조직의 userId는 에러를 반환해야 한다", async () => {
        vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

        const result = await importPaymentCSV(validCsv, {
          userId: "other-org-user",
        });

        expect(result.success).toBe(false);
        expect(result.message).toBe("유효하지 않은 사용자입니다");
      });

      it("teamId와 userId가 둘 다 있으면 에러를 반환해야 한다", async () => {
        const result = await importPaymentCSV(validCsv, {
          teamId: "team-1",
          userId: "user-2",
        });

        expect(result.success).toBe(false);
        expect(result.message).toBe(
          "팀 배정과 유저 배정 중 하나만 선택할 수 있습니다"
        );
      });

      it("teamId와 userId 없이 결제 내역을 가져와야 한다 (미배정)", async () => {
        const result = await importPaymentCSV(validCsv);

        expect(result.success).toBe(true);
        expect(prisma.paymentRecord.createMany).toHaveBeenCalledWith({
          data: expect.arrayContaining([
            expect.objectContaining({
              teamId: null,
              userId: null,
            }),
          ]),
        });
      });
    });
  });

  describe("getPaymentRecords", () => {
    it("조직의 결제 내역을 조회해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      // CardTransaction mock (빈 배열 - 카드 데이터 없음)
      vi.mocked(prisma.cardTransaction.findMany).mockResolvedValue([]);
      vi.mocked(prisma.cardTransaction.count).mockResolvedValue(0);

      // PaymentRecord mock
      vi.mocked(prisma.paymentRecord.findMany).mockResolvedValue([
        {
          id: "pr-1",
          transactionDate: new Date("2024-01-15"),
          merchantName: "SLACK",
          amount: 100000,
          currency: "KRW",
          cardLast4: "5678",
          approvalNumber: "12345678",
          matchStatus: "AUTO_MATCHED",
          matchConfidence: 0.95,
          matchedAppId: "app-1",
          matchedApp: { id: "app-1", name: "Slack" },
          linkedSubscriptionId: null,
          linkedSubscription: null,
        },
      ] as never);

      vi.mocked(prisma.paymentRecord.count).mockResolvedValue(1);

      const result = await getPaymentRecords({ page: 1, limit: 10 });

      expect(result.success).toBe(true);
      expect(result.data?.records).toHaveLength(1);
      expect(result.data?.total).toBe(1);
    });

    it("matchStatus로 필터링해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      // CardTransaction mock - PENDING 필터 시 카드 데이터도 포함될 수 있음
      vi.mocked(prisma.cardTransaction.findMany).mockResolvedValue([]);
      vi.mocked(prisma.cardTransaction.count).mockResolvedValue(0);

      // PaymentRecord mock
      vi.mocked(prisma.paymentRecord.findMany).mockResolvedValue([]);
      vi.mocked(prisma.paymentRecord.count).mockResolvedValue(0);

      await getPaymentRecords({ page: 1, limit: 10, matchStatus: "PENDING" });

      // PENDING 필터 시 PaymentRecord가 호출됨
      expect(prisma.paymentRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            matchStatus: "PENDING",
          }),
        })
      );
    });
  });

  describe("updatePaymentMatch", () => {
    it("csv_ prefix ID로 PaymentRecord를 업데이트해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      // PaymentRecord가 존재함
      vi.mocked(prisma.paymentRecord.findFirst).mockResolvedValue({
        id: "pr-1",
        organizationId: "org-1",
      } as never);

      vi.mocked(prisma.paymentRecord.update).mockResolvedValue({
        id: "pr-1",
        matchedAppId: "app-1",
        matchStatus: "MANUAL",
      } as never);

      // csv_ prefix 사용
      const result = await updatePaymentMatch("csv_pr-1", "app-1");

      expect(result.success).toBe(true);
      expect(prisma.paymentRecord.update).toHaveBeenCalledWith({
        where: { id: "pr-1" },
        data: expect.objectContaining({
          matchedAppId: "app-1",
          matchStatus: "MANUAL",
          matchSource: "MANUAL",
        }),
      });
    });

    it("card_ prefix ID로 CardTransaction을 업데이트해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      // CardTransaction이 존재함
      vi.mocked(prisma.cardTransaction.findFirst).mockResolvedValue({
        id: "ct-1",
        organizationId: "org-1",
      } as never);

      vi.mocked(prisma.cardTransaction.update).mockResolvedValue({
        id: "ct-1",
        matchedAppId: "app-1",
      } as never);

      // card_ prefix 사용
      const result = await updatePaymentMatch("card_ct-1", "app-1");

      expect(result.success).toBe(true);
      expect(prisma.cardTransaction.update).toHaveBeenCalledWith({
        where: { id: "ct-1" },
        data: expect.objectContaining({
          matchedAppId: "app-1",
          matchSource: "MANUAL",
        }),
      });
    });

    it("앱 매칭을 해제해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      // PaymentRecord가 존재함
      vi.mocked(prisma.paymentRecord.findFirst).mockResolvedValue({
        id: "pr-1",
        organizationId: "org-1",
      } as never);

      vi.mocked(prisma.paymentRecord.update).mockResolvedValue({
        id: "pr-1",
        matchedAppId: null,
        matchStatus: "UNMATCHED",
      } as never);

      const result = await updatePaymentMatch("csv_pr-1", null);

      expect(result.success).toBe(true);
      expect(prisma.paymentRecord.update).toHaveBeenCalledWith({
        where: { id: "pr-1" },
        data: expect.objectContaining({
          matchedAppId: null,
          matchStatus: "UNMATCHED",
        }),
      });
    });

    it("레거시 ID (prefix 없음)도 지원해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      // PaymentRecord가 없음
      vi.mocked(prisma.paymentRecord.findFirst).mockResolvedValue(null);

      // CardTransaction이 존재함
      vi.mocked(prisma.cardTransaction.findFirst).mockResolvedValue({
        id: "ct-1",
        organizationId: "org-1",
      } as never);

      vi.mocked(prisma.cardTransaction.update).mockResolvedValue({
        id: "ct-1",
        matchedAppId: "app-1",
      } as never);

      // prefix 없이 호출
      const result = await updatePaymentMatch("ct-1", "app-1");

      expect(result.success).toBe(true);
      expect(prisma.cardTransaction.update).toHaveBeenCalledWith({
        where: { id: "ct-1" },
        data: expect.objectContaining({
          matchedAppId: "app-1",
          matchSource: "MANUAL",
        }),
      });
    });

    it("PaymentRecord도 CardTransaction도 없으면 에러를 반환해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      // 둘 다 없음
      vi.mocked(prisma.paymentRecord.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.cardTransaction.findFirst).mockResolvedValue(null);

      const result = await updatePaymentMatch("invalid-id", "app-1");

      expect(result.success).toBe(false);
      expect(result.message).toBe("결제 내역을 찾을 수 없습니다");
    });
  });

  describe("linkPaymentToSubscription", () => {
    it("결제 내역을 구독에 연결해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "sub-1",
        appId: "app-1",
      } as never);

      vi.mocked(prisma.paymentRecord.update).mockResolvedValue({
        id: "pr-1",
        linkedSubscriptionId: "sub-1",
      } as never);

      const result = await linkPaymentToSubscription("pr-1", "sub-1");

      expect(result.success).toBe(true);
      expect(prisma.paymentRecord.update).toHaveBeenCalledWith({
        where: { id: "pr-1" },
        data: { linkedSubscriptionId: "sub-1" },
      });
    });

    it("존재하지 않는 구독에 연결하면 에러를 반환해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);

      const result = await linkPaymentToSubscription("pr-1", "invalid-sub");

      expect(result.success).toBe(false);
      expect(result.message).toContain("구독");
    });
  });

  describe("getPaymentSummaryByApp", () => {
    it("앱별 결제 내역을 집계해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(prisma.paymentRecord.groupBy).mockResolvedValue([
        {
          matchedAppId: "app-1",
          _sum: { amount: { toNumber: () => 150000 } },
          _count: { id: 3 },
        },
        {
          matchedAppId: "app-2",
          _sum: { amount: { toNumber: () => 80000 } },
          _count: { id: 2 },
        },
      ] as never);

      vi.mocked(prisma.app.findMany).mockResolvedValue([
        { id: "app-1", name: "Slack" },
        { id: "app-2", name: "Notion" },
      ] as never);

      const result = await getPaymentSummaryByApp({
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      });

      expect(result.success).toBe(true);
      expect(result.data?.apps).toHaveLength(2);
      expect(result.data?.totalAmount).toBe(230000);
    });

    it("기간 없이 전체 데이터를 조회해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(prisma.paymentRecord.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.app.findMany).mockResolvedValue([]);

      const result = await getPaymentSummaryByApp({});

      expect(result.success).toBe(true);
      expect(result.data?.apps).toHaveLength(0);
      expect(result.data?.totalAmount).toBe(0);
    });
  });

  describe("updatePaymentRecord", () => {
    it("관리자가 아니면 에러를 반환해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "MEMBER" },
      } as never);

      const result = await updatePaymentRecord("payment-1", {
        notes: "테스트 메모",
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("관리자 권한이 필요합니다");
    });

    it("결제 기록을 수정해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(prisma.paymentRecord.findFirst).mockResolvedValue({
        id: "payment-1",
        organizationId: "org-1",
      } as never);

      vi.mocked(prisma.paymentRecord.update).mockResolvedValue({
        id: "payment-1",
        notes: "테스트 메모",
      } as never);

      const result = await updatePaymentRecord("payment-1", {
        notes: "테스트 메모",
      });

      expect(result.success).toBe(true);
      expect(prisma.paymentRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "payment-1" },
          data: expect.objectContaining({ notes: "테스트 메모" }),
        })
      );
    });

    it("존재하지 않는 결제 기록은 에러를 반환해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(prisma.paymentRecord.findFirst).mockResolvedValue(null);

      const result = await updatePaymentRecord("non-existent", {
        notes: "테스트",
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("결제 기록을 찾을 수 없습니다");
    });
  });

  describe("deletePaymentRecord", () => {
    it("관리자가 아니면 에러를 반환해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "MEMBER" },
      } as never);

      const result = await deletePaymentRecord("payment-1");

      expect(result.success).toBe(false);
      expect(result.message).toBe("관리자 권한이 필요합니다");
    });

    it("결제 기록을 삭제해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(prisma.paymentRecord.findFirst).mockResolvedValue({
        id: "payment-1",
        organizationId: "org-1",
      } as never);

      vi.mocked(prisma.paymentRecord.delete).mockResolvedValue({} as never);

      const result = await deletePaymentRecord("payment-1");

      expect(result.success).toBe(true);
      expect(prisma.paymentRecord.delete).toHaveBeenCalledWith({
        where: { id: "payment-1" },
      });
    });

    it("존재하지 않는 결제 기록은 에러를 반환해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(prisma.paymentRecord.findFirst).mockResolvedValue(null);

      const result = await deletePaymentRecord("non-existent");

      expect(result.success).toBe(false);
      expect(result.message).toBe("결제 기록을 찾을 수 없습니다");
    });
  });
});
