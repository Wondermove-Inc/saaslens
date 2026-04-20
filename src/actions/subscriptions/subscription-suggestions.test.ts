// src/actions/subscriptions/subscription-suggestions.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock modules
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/utils/renewal-date", () => ({
  calculateNextRenewalDate: vi.fn().mockReturnValue(new Date("2025-04-01")),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    subscription: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    cardTransaction: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    corporateCard: {
      findUnique: vi.fn(),
    },
    app: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    appTeam: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    team: {
      findUnique: vi.fn(),
    },
    paymentRecord: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    subscriptionUser: {
      createMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

// Mock next/navigation redirect
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    const error = new Error(`NEXT_REDIRECT:${url}`);
    (error as Error & { digest: string }).digest = `NEXT_REDIRECT:${url}`;
    throw error;
  },
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type {
  CardTransactionSuggestion,
  PaymentRecordSuggestion,
} from "./subscription-suggestions";
import {
  createSubscriptionFromCardSuggestion,
  createSubscriptionFromPaymentSuggestion,
  ensureAppTeamAssignment,
  suggestFromCardTransactions,
  suggestSubscriptionsFromPayments,
} from "./subscription-suggestions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockedAuth = auth as any;

describe("subscription-suggestions (Phase 3)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockRedirect.mockClear();
  });

  describe("suggestFromCardTransactions", () => {
    const mockOrgId = "org-123";

    beforeEach(() => {
      mockedAuth.mockResolvedValue({
        user: {
          id: "user-123",
          organizationId: mockOrgId,
          role: "ADMIN",
          teamId: null,
        },
        expires: "",
      });
    });

    it("카드 거래가 없으면 빈 배열을 반환해야 한다", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);
      vi.mocked(prisma.cardTransaction.groupBy).mockResolvedValue([]);

      const result = await suggestFromCardTransactions();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it("이미 구독이 있는 앱은 제외해야 한다", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([
        { appId: "app-existing" },
      ] as never);
      vi.mocked(prisma.cardTransaction.groupBy).mockResolvedValue([
        {
          matchedAppId: "app-existing",
          _count: { id: 3 },
          _sum: { useAmt: 150000 },
          _min: { useDt: "20250101" },
          _max: { useDt: "20250301" },
        },
      ] as never);

      const result = await suggestFromCardTransactions();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it("거래가 2건 미만인 앱은 건너뛰어야 한다", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);
      vi.mocked(prisma.cardTransaction.groupBy).mockResolvedValue([
        {
          matchedAppId: "app-1",
          _count: { id: 1 },
          _sum: { useAmt: 50000 },
          _min: { useDt: "20250101" },
          _max: { useDt: "20250101" },
        },
      ] as never);

      const result = await suggestFromCardTransactions();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it("dominant card의 teamId와 availableUsers를 포함해야 한다", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      // 첫 번째 호출: 앱별 그룹화
      vi.mocked(prisma.cardTransaction.groupBy)
        .mockResolvedValueOnce([
          {
            matchedAppId: "app-1",
            _count: { id: 3 },
            _sum: { useAmt: 150000 },
            _min: { useDt: "20250101" },
            _max: { useDt: "20250301" },
          },
        ] as never)
        // 두 번째 호출: dominant card 조회
        .mockResolvedValueOnce([
          { corporateCardId: "card-1", _count: { id: 3 } },
        ] as never);

      vi.mocked(prisma.app.findUnique).mockResolvedValue({
        id: "app-1",
        name: "Slack",
        customLogoUrl: null,
        catalog: { logoUrl: "https://slack.com/logo.png" },
      } as never);

      vi.mocked(prisma.corporateCard.findUnique).mockResolvedValue({
        id: "card-1",
        team: {
          id: "team-marketing",
          name: "마케팅팀",
          members: [
            { id: "user-1", name: "홍길동", email: "hong@test.com" },
            { id: "user-2", name: "김철수", email: "kim@test.com" },
          ],
        },
        assignedUser: null,
      } as never);

      vi.mocked(prisma.cardTransaction.findMany).mockResolvedValue([
        {
          id: "tx-1",
          useDt: "20250101",
          useAmt: 50000,
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
        {
          id: "tx-2",
          useDt: "20250201",
          useAmt: 50000,
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
        {
          id: "tx-3",
          useDt: "20250301",
          useAmt: 50000,
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
      ] as never);

      // appendUnassignedUsers: teamId=null 사용자 없음
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);

      const result = await suggestFromCardTransactions();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].teamId).toBe("team-marketing");
      expect(result.data![0].teamName).toBe("마케팅팀");
      expect(result.data![0].availableUsers).toHaveLength(2);
      expect(result.data![0].source).toBe("card_transaction");
    });

    it("카드에 팀이 없고 거래에도 팀/유저가 없으면 teamId가 null이고 availableUsers에 조직 전체 멤버가 포함되어야 한다", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      vi.mocked(prisma.cardTransaction.groupBy)
        .mockResolvedValueOnce([
          {
            matchedAppId: "app-1",
            _count: { id: 3 },
            _sum: { useAmt: 150000 },
            _min: { useDt: "20250101" },
            _max: { useDt: "20250301" },
          },
        ] as never)
        .mockResolvedValueOnce([
          { corporateCardId: "card-1", _count: { id: 3 } },
        ] as never);

      vi.mocked(prisma.app.findUnique).mockResolvedValue({
        id: "app-1",
        name: "Slack",
        customLogoUrl: null,
        catalog: null,
      } as never);

      vi.mocked(prisma.corporateCard.findUnique).mockResolvedValue({
        id: "card-1",
        team: null,
        assignedUser: null,
      } as never);

      vi.mocked(prisma.cardTransaction.findMany).mockResolvedValue([
        {
          id: "tx-1",
          useDt: "20250101",
          useAmt: 50000,
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
        {
          id: "tx-2",
          useDt: "20250201",
          useAmt: 50000,
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
        {
          id: "tx-3",
          useDt: "20250301",
          useAmt: 50000,
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
      ] as never);

      // SMP-156: 조직 전체 멤버 fallback
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        { id: "user-1", name: "유저1", email: "user1@test.com" },
      ] as never);

      const result = await suggestFromCardTransactions();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].teamId).toBeNull();
      expect(result.data![0].teamName).toBeNull();
      // SMP-156: 팀/유저 미배정 시 조직 전체 멤버로 fallback
      expect(result.data![0].availableUsers).toHaveLength(1);
    });

    it("organizationId로 필터링해야 한다 (multi-tenant)", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);
      vi.mocked(prisma.cardTransaction.groupBy).mockResolvedValue([]);

      await suggestFromCardTransactions();

      expect(prisma.cardTransaction.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrgId,
          }),
        })
      );
    });
  });

  describe("createSubscriptionFromCardSuggestion", () => {
    const mockOrgId = "org-123";
    const mockUserId = "user-123";

    const baseSuggestion: CardTransactionSuggestion = {
      appId: "app-1",
      appName: "Slack",
      appLogoUrl: "https://slack.com/logo.png",
      suggestedBillingCycle: "MONTHLY",
      suggestedAmount: 50000,
      currency: "KRW",
      paymentCount: 3,
      firstPaymentDate: new Date("2025-01-01"),
      lastPaymentDate: new Date("2025-03-01"),
      confidence: 0.85,
      teamId: "team-marketing",
      teamName: "마케팅팀",
      assignedUserId: null,
      assignedUserName: null,
      availableUsers: [
        {
          id: "user-1",
          name: "홍길동",
          email: "hong@test.com",
          teamId: "team-marketing",
          teamName: "마케팅팀",
        },
        {
          id: "user-2",
          name: "김철수",
          email: "kim@test.com",
          teamId: "team-marketing",
          teamName: "마케팅팀",
        },
      ],
      source: "card_transaction",
      // SMP-123: 추가 필드
      suggestedAction: "create",
      unmatchedTransactionIds: ["tx-1", "tx-2", "tx-3"],
      // SMP-134: Seat 구독제 판단
      billingType: "PER_SEAT",
      perSeatPrice: null,
      suggestedSeats: null,
    };

    beforeEach(() => {
      mockedAuth.mockResolvedValue({
        user: {
          id: mockUserId,
          organizationId: mockOrgId,
          role: "ADMIN",
          teamId: null,
        },
        expires: "",
      });
      // SMP-123: 공통 mock 설정 (ensureAppTeamAssignment용)
      vi.mocked(prisma.appTeam.findFirst).mockResolvedValue({
        id: "app-team-1",
        appId: "app-1",
        teamId: "team-marketing",
      } as never);
      vi.mocked(prisma.cardTransaction.updateMany).mockResolvedValue({
        count: 3,
      } as never);
    });

    it("suggestion의 teamId를 포함하여 구독을 생성해야 한다", async () => {
      vi.mocked(prisma.app.findFirst).mockResolvedValue({
        id: "app-1",
        name: "Slack",
      } as never);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.subscription.create).mockResolvedValue({
        id: "sub-1",
      } as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      const result = await createSubscriptionFromCardSuggestion({
        suggestion: baseSuggestion,
        selectedUserIds: [],
      });

      expect(result.success).toBe(true);
      expect(prisma.subscription.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          teamId: "team-marketing",
          appId: "app-1",
        }),
      });
    });

    it("선택된 사용자에 대해 SubscriptionUser 레코드를 생성해야 한다", async () => {
      vi.mocked(prisma.app.findFirst).mockResolvedValue({
        id: "app-1",
        name: "Slack",
      } as never);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        { id: "user-1" },
        { id: "user-2" },
      ] as never);
      vi.mocked(prisma.subscription.create).mockResolvedValue({
        id: "sub-1",
      } as never);
      vi.mocked(prisma.subscriptionUser.createMany).mockResolvedValue({
        count: 2,
      } as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      const result = await createSubscriptionFromCardSuggestion({
        suggestion: baseSuggestion,
        selectedUserIds: ["user-1", "user-2"],
      });

      expect(result.success).toBe(true);
      expect(prisma.subscriptionUser.createMany).toHaveBeenCalledWith({
        data: [
          { subscriptionId: "sub-1", userId: "user-1", assignedBy: mockUserId },
          { subscriptionId: "sub-1", userId: "user-2", assignedBy: mockUserId },
        ],
        skipDuplicates: true, // SMP-123: skipDuplicates 추가됨
      });
    });

    it("ADMIN이 아닌 경우 사용자 배정을 거부해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: {
          id: mockUserId,
          organizationId: mockOrgId,
          role: "MEMBER",
          teamId: null,
        },
        expires: "",
      });

      const result = await createSubscriptionFromCardSuggestion({
        suggestion: baseSuggestion,
        selectedUserIds: ["user-1"],
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("사용자 배정은 관리자만 가능합니다");
    });

    it("사용자 미선택 시 ADMIN이 아니어도 허용해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: {
          id: mockUserId,
          organizationId: mockOrgId,
          role: "MEMBER",
          teamId: null,
        },
        expires: "",
      });
      vi.mocked(prisma.app.findFirst).mockResolvedValue({
        id: "app-1",
        name: "Slack",
      } as never);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.subscription.create).mockResolvedValue({
        id: "sub-1",
      } as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      const result = await createSubscriptionFromCardSuggestion({
        suggestion: baseSuggestion,
        selectedUserIds: [],
      });

      expect(result.success).toBe(true);
    });

    it("이미 구독이 있으면 거부해야 한다", async () => {
      vi.mocked(prisma.app.findFirst).mockResolvedValue({
        id: "app-1",
        name: "Slack",
      } as never);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "existing-sub",
      } as never);

      const result = await createSubscriptionFromCardSuggestion({
        suggestion: baseSuggestion,
        selectedUserIds: [],
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("이미 해당 앱에 대한 구독이 있습니다");
    });

    it("유효하지 않은 사용자가 포함되면 거부해야 한다", async () => {
      vi.mocked(prisma.app.findFirst).mockResolvedValue({
        id: "app-1",
        name: "Slack",
      } as never);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        { id: "user-1" },
      ] as never); // Only 1 valid

      const result = await createSubscriptionFromCardSuggestion({
        suggestion: baseSuggestion,
        selectedUserIds: ["user-1", "user-invalid"],
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("유효하지 않은 사용자가 포함되어 있습니다");
    });

    it("teamId가 null이어도 동작해야 한다", async () => {
      const suggestionWithoutTeam: CardTransactionSuggestion = {
        ...baseSuggestion,
        teamId: null,
        teamName: null,
        availableUsers: [],
      };

      vi.mocked(prisma.app.findFirst).mockResolvedValue({
        id: "app-1",
        name: "Slack",
      } as never);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.subscription.create).mockResolvedValue({
        id: "sub-1",
      } as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      const result = await createSubscriptionFromCardSuggestion({
        suggestion: suggestionWithoutTeam,
        selectedUserIds: [],
      });

      expect(result.success).toBe(true);
      expect(prisma.subscription.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          teamId: null,
        }),
      });
    });

    it("감사 로그에 card_transaction_suggestion 소스를 기록해야 한다", async () => {
      vi.mocked(prisma.app.findFirst).mockResolvedValue({
        id: "app-1",
        name: "Slack",
      } as never);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.subscription.create).mockResolvedValue({
        id: "sub-1",
      } as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await createSubscriptionFromCardSuggestion({
        suggestion: baseSuggestion,
        selectedUserIds: [],
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            source: "card_transaction_suggestion",
            teamId: "team-marketing",
          }),
        }),
      });
    });
  });
});

// ==================== SMP-107: CSV 결제 내역 업로드 시 구독 추천 플로우 개선 ====================

describe("SMP-107: ensureAppTeamAssignment", () => {
  const mockOrgId = "org-123";
  const mockUserId = "user-123";

  beforeEach(() => {
    vi.resetAllMocks();
    mockedAuth.mockResolvedValue({
      user: {
        id: mockUserId,
        organizationId: mockOrgId,
        role: "ADMIN",
        teamId: null,
      },
      expires: "",
    });
  });

  it("기존 AppTeam이 있으면 새로 생성하지 않아야 한다", async () => {
    vi.mocked(prisma.appTeam.findFirst).mockResolvedValue({
      id: "app-team-existing",
      appId: "app-1",
      teamId: "team-1",
    } as never);

    const result = await ensureAppTeamAssignment("app-1", "team-1");

    expect(result.success).toBe(true);
    expect(result.data?.created).toBe(false);
    expect(prisma.appTeam.create).not.toHaveBeenCalled();
  });

  it("AppTeam이 없으면 새로 생성해야 한다", async () => {
    vi.mocked(prisma.appTeam.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.appTeam.create).mockResolvedValue({
      id: "app-team-new",
      appId: "app-1",
      teamId: "team-1",
    } as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    const result = await ensureAppTeamAssignment("app-1", "team-1");

    expect(result.success).toBe(true);
    expect(result.data?.created).toBe(true);
    expect(prisma.appTeam.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        appId: "app-1",
        teamId: "team-1",
        assignedBy: mockUserId,
      }),
    });
  });

  it("생성 시 감사 로그가 기록되어야 한다", async () => {
    vi.mocked(prisma.appTeam.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.appTeam.create).mockResolvedValue({
      id: "app-team-new",
      appId: "app-1",
      teamId: "team-1",
    } as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    await ensureAppTeamAssignment("app-1", "team-1");

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "ASSIGN_APP_TEAM",
        entityType: "AppTeam",
        metadata: expect.objectContaining({
          appId: "app-1",
          teamId: "team-1",
          source: "payment_suggestion_auto",
        }),
      }),
    });
  });

  it("teamId가 null이면 아무 작업도 하지 않아야 한다", async () => {
    const result = await ensureAppTeamAssignment("app-1", null);

    expect(result.success).toBe(true);
    expect(result.data?.created).toBe(false);
    expect(prisma.appTeam.findFirst).not.toHaveBeenCalled();
    expect(prisma.appTeam.create).not.toHaveBeenCalled();
  });
});

describe("SMP-107: suggestSubscriptionsFromPayments - 확장된 추천 로직", () => {
  const mockOrgId = "org-123";

  beforeEach(() => {
    vi.resetAllMocks();
    mockedAuth.mockResolvedValue({
      user: {
        id: "user-123",
        organizationId: mockOrgId,
        role: "ADMIN",
        teamId: null,
      },
      expires: "",
    });
  });

  it("기존 구독이 있어도 연결 안 된 결제내역이 있으면 suggestedAction: link로 포함해야 한다", async () => {
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([
      { appId: "app-1", id: "sub-existing" },
    ] as never);

    vi.mocked(prisma.paymentRecord.groupBy).mockResolvedValue([
      {
        matchedAppId: "app-1",
        _count: { id: 3 },
        _sum: { amount: 150000 },
        _min: { transactionDate: new Date("2025-01-01") },
        _max: { transactionDate: new Date("2025-03-01") },
      },
    ] as never);

    vi.mocked(prisma.app.findUnique).mockResolvedValue({
      id: "app-1",
      name: "Slack",
      customLogoUrl: null,
      catalog: { logoUrl: "https://slack.com/logo.png" },
    } as never);

    // 결제내역 중 일부는 연결됨, 일부는 연결 안 됨
    vi.mocked(prisma.paymentRecord.findMany).mockResolvedValue([
      {
        id: "pr-1",
        transactionDate: new Date("2025-01-01"),
        amount: 50000,
        currency: "KRW",
        teamId: "team-1",
        userId: null,
        linkedSubscriptionId: "sub-existing", // 연결됨
      },
      {
        id: "pr-2",
        transactionDate: new Date("2025-02-01"),
        amount: 50000,
        currency: "KRW",
        teamId: "team-1",
        userId: null,
        linkedSubscriptionId: null, // 연결 안 됨
      },
      {
        id: "pr-3",
        transactionDate: new Date("2025-03-01"),
        amount: 50000,
        currency: "KRW",
        teamId: "team-1",
        userId: null,
        linkedSubscriptionId: null, // 연결 안 됨
      },
    ] as never);

    vi.mocked(prisma.team.findUnique).mockResolvedValue({
      id: "team-1",
      name: "마케팅팀",
      members: [],
    } as never);

    // appendUnassignedUsers: teamId=null 사용자 없음
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);

    const result = await suggestSubscriptionsFromPayments();

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data![0].suggestedAction).toBe("link");
    expect(result.data![0].existingSubscriptionId).toBe("sub-existing");
    expect(result.data![0].unmatchedPaymentIds).toEqual(["pr-2", "pr-3"]);
  });

  it("기존 구독이 있고 모든 결제내역이 연결되어 있으면 제외해야 한다", async () => {
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([
      { appId: "app-1", id: "sub-existing" },
    ] as never);

    vi.mocked(prisma.paymentRecord.groupBy).mockResolvedValue([
      {
        matchedAppId: "app-1",
        _count: { id: 2 },
        _sum: { amount: 100000 },
        _min: { transactionDate: new Date("2025-01-01") },
        _max: { transactionDate: new Date("2025-02-01") },
      },
    ] as never);

    vi.mocked(prisma.app.findUnique).mockResolvedValue({
      id: "app-1",
      name: "Slack",
      customLogoUrl: null,
      catalog: null,
    } as never);

    // 모든 결제내역이 연결됨
    vi.mocked(prisma.paymentRecord.findMany).mockResolvedValue([
      {
        id: "pr-1",
        transactionDate: new Date("2025-01-01"),
        amount: 50000,
        currency: "KRW",
        teamId: null,
        userId: null,
        linkedSubscriptionId: "sub-existing",
      },
      {
        id: "pr-2",
        transactionDate: new Date("2025-02-01"),
        amount: 50000,
        currency: "KRW",
        teamId: null,
        userId: null,
        linkedSubscriptionId: "sub-existing",
      },
    ] as never);

    const result = await suggestSubscriptionsFromPayments();

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it("기존 구독이 없으면 suggestedAction: create여야 한다", async () => {
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

    vi.mocked(prisma.paymentRecord.groupBy).mockResolvedValue([
      {
        matchedAppId: "app-new",
        _count: { id: 3 },
        _sum: { amount: 150000 },
        _min: { transactionDate: new Date("2025-01-01") },
        _max: { transactionDate: new Date("2025-03-01") },
      },
    ] as never);

    vi.mocked(prisma.app.findUnique).mockResolvedValue({
      id: "app-new",
      name: "Notion",
      customLogoUrl: null,
      catalog: null,
    } as never);

    vi.mocked(prisma.paymentRecord.findMany).mockResolvedValue([
      {
        id: "pr-1",
        transactionDate: new Date("2025-01-01"),
        amount: 50000,
        currency: "KRW",
        teamId: null,
        userId: "user-1",
        linkedSubscriptionId: null,
      },
      {
        id: "pr-2",
        transactionDate: new Date("2025-02-01"),
        amount: 50000,
        currency: "KRW",
        teamId: null,
        userId: "user-1",
        linkedSubscriptionId: null,
      },
      {
        id: "pr-3",
        transactionDate: new Date("2025-03-01"),
        amount: 50000,
        currency: "KRW",
        teamId: null,
        userId: "user-1",
        linkedSubscriptionId: null,
      },
    ] as never);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      name: "홍길동",
      email: "hong@test.com",
      team: { id: "team-1", name: "개발팀" },
    } as never);

    // SMP-134: 팀 멤버 조회 (dominantUserId가 있을 때 availableUsers 채우기)
    vi.mocked(prisma.team.findUnique).mockResolvedValue({
      id: "team-1",
      name: "개발팀",
      members: [{ id: "user-1", name: "홍길동", email: "hong@test.com" }],
    } as never);

    // appendUnassignedUsers: teamId=null 사용자 없음
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);

    const result = await suggestSubscriptionsFromPayments();

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data![0].suggestedAction).toBe("create");
    expect(result.data![0].existingSubscriptionId).toBeUndefined();
    expect(result.data![0].unmatchedPaymentIds).toEqual([
      "pr-1",
      "pr-2",
      "pr-3",
    ]);
  });
});

describe("SMP-107: createSubscriptionFromPaymentSuggestion - 확장된 생성/연결 로직", () => {
  const mockOrgId = "org-123";
  const mockUserId = "user-123";

  beforeEach(() => {
    vi.resetAllMocks();
    mockedAuth.mockResolvedValue({
      user: {
        id: mockUserId,
        organizationId: mockOrgId,
        role: "ADMIN",
        teamId: null,
      },
      expires: "",
    });
  });

  const baseSuggestion: PaymentRecordSuggestion = {
    appId: "app-1",
    appName: "Slack",
    appLogoUrl: "https://slack.com/logo.png",
    suggestedBillingCycle: "MONTHLY",
    suggestedAmount: 50000,
    currency: "KRW",
    paymentCount: 3,
    firstPaymentDate: new Date("2025-01-01"),
    lastPaymentDate: new Date("2025-03-01"),
    confidence: 0.85,
    teamId: "team-marketing",
    teamName: "마케팅팀",
    assignedUserId: "user-kim",
    assignedUserName: "김철수",
    availableUsers: [],
    source: "payment_record",
    suggestedAction: "create",
    unmatchedPaymentIds: ["pr-1", "pr-2", "pr-3"],
    // SMP-134: Seat 구독제 판단
    billingType: "PER_SEAT",
    perSeatPrice: null,
    suggestedSeats: null,
  };

  it("suggestedAction: create일 때 새 구독을 생성하고 PaymentRecord를 연결해야 한다", async () => {
    vi.mocked(prisma.app.findFirst).mockResolvedValue({
      id: "app-1",
      name: "Slack",
    } as never);
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.appTeam.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.appTeam.create).mockResolvedValue({
      id: "app-team-new",
    } as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: "user-kim" },
    ] as never);
    vi.mocked(prisma.subscription.create).mockResolvedValue({
      id: "sub-new",
    } as never);
    vi.mocked(prisma.subscriptionUser.createMany).mockResolvedValue({
      count: 1,
    } as never);
    vi.mocked(prisma.paymentRecord.updateMany).mockResolvedValue({
      count: 3,
    } as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    const result = await createSubscriptionFromPaymentSuggestion({
      suggestion: baseSuggestion,
      selectedUserIds: [],
    });

    expect(result.success).toBe(true);
    expect(prisma.subscription.create).toHaveBeenCalled();
    expect(prisma.paymentRecord.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["pr-1", "pr-2", "pr-3"] } },
      data: { linkedSubscriptionId: "sub-new" },
    });
  });

  it("suggestedAction: link일 때 새 구독을 생성하지 않고 기존 구독에 연결만 해야 한다", async () => {
    const linkSuggestion: PaymentRecordSuggestion = {
      ...baseSuggestion,
      suggestedAction: "link",
      existingSubscriptionId: "sub-existing",
      unmatchedPaymentIds: ["pr-2", "pr-3"],
    };

    vi.mocked(prisma.app.findFirst).mockResolvedValue({
      id: "app-1",
      name: "Slack",
    } as never);
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
      id: "sub-existing",
    } as never);
    vi.mocked(prisma.paymentRecord.updateMany).mockResolvedValue({
      count: 2,
    } as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    const result = await createSubscriptionFromPaymentSuggestion({
      suggestion: linkSuggestion,
      selectedUserIds: [],
    });

    expect(result.success).toBe(true);
    expect(result.data?.id).toBe("sub-existing");
    expect(prisma.subscription.create).not.toHaveBeenCalled();
    expect(prisma.paymentRecord.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["pr-2", "pr-3"] } },
      data: { linkedSubscriptionId: "sub-existing" },
    });
  });

  it("App-Team 자동 배정이 수행되어야 한다", async () => {
    vi.mocked(prisma.app.findFirst).mockResolvedValue({
      id: "app-1",
      name: "Slack",
    } as never);
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.appTeam.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.appTeam.create).mockResolvedValue({
      id: "app-team-new",
    } as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: "user-kim" },
    ] as never);
    vi.mocked(prisma.subscription.create).mockResolvedValue({
      id: "sub-new",
    } as never);
    vi.mocked(prisma.subscriptionUser.createMany).mockResolvedValue({
      count: 1,
    } as never);
    vi.mocked(prisma.paymentRecord.updateMany).mockResolvedValue({
      count: 3,
    } as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    await createSubscriptionFromPaymentSuggestion({
      suggestion: baseSuggestion,
      selectedUserIds: [],
    });

    expect(prisma.appTeam.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        appId: "app-1",
        teamId: "team-marketing",
      }),
    });
  });

  it("SubscriptionUser 생성 시 skipDuplicates: true가 적용되어야 한다", async () => {
    vi.mocked(prisma.app.findFirst).mockResolvedValue({
      id: "app-1",
      name: "Slack",
    } as never);
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.appTeam.findFirst).mockResolvedValue({
      id: "app-team-existing",
    } as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: "user-kim" },
      { id: "user-lee" },
    ] as never);
    vi.mocked(prisma.subscription.create).mockResolvedValue({
      id: "sub-new",
    } as never);
    vi.mocked(prisma.subscriptionUser.createMany).mockResolvedValue({
      count: 2,
    } as never);
    vi.mocked(prisma.paymentRecord.updateMany).mockResolvedValue({
      count: 3,
    } as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    await createSubscriptionFromPaymentSuggestion({
      suggestion: baseSuggestion,
      selectedUserIds: ["user-lee"],
    });

    expect(prisma.subscriptionUser.createMany).toHaveBeenCalledWith({
      data: expect.any(Array),
      skipDuplicates: true,
    });
  });

  it("assignedUserId가 있으면 SubscriptionUser에 자동 배정되어야 한다", async () => {
    vi.mocked(prisma.app.findFirst).mockResolvedValue({
      id: "app-1",
      name: "Slack",
    } as never);
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.appTeam.findFirst).mockResolvedValue({
      id: "app-team-existing",
    } as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: "user-kim" },
    ] as never);
    vi.mocked(prisma.subscription.create).mockResolvedValue({
      id: "sub-new",
    } as never);
    vi.mocked(prisma.subscriptionUser.createMany).mockResolvedValue({
      count: 1,
    } as never);
    vi.mocked(prisma.paymentRecord.updateMany).mockResolvedValue({
      count: 3,
    } as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    await createSubscriptionFromPaymentSuggestion({
      suggestion: baseSuggestion,
      selectedUserIds: [], // 수동 선택 없음
    });

    // assignedUserId가 자동으로 포함되어야 함
    expect(prisma.subscriptionUser.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ userId: "user-kim" }),
      ]),
      skipDuplicates: true,
    });
  });
});

// SMP-134: availableUsers 항상 채우기 테스트
describe("SMP-134: availableUsers population fix", () => {
  const mockOrgId = "org-123";

  beforeEach(() => {
    vi.resetAllMocks();
    mockedAuth.mockResolvedValue({
      user: {
        id: "user-123",
        organizationId: mockOrgId,
        role: "ADMIN",
        teamId: null,
      },
      expires: "",
    });
  });

  describe("suggestSubscriptionsFromPayments - dominantUserId가 있을 때 availableUsers 채우기", () => {
    it("dominantUserId가 있고 팀이 있으면 팀 멤버로 availableUsers를 채워야 한다", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      vi.mocked(prisma.paymentRecord.groupBy).mockResolvedValue([
        {
          matchedAppId: "app-1",
          _count: { id: 3 },
          _sum: { amount: 150000 },
          _min: { transactionDate: new Date("2025-01-01") },
          _max: { transactionDate: new Date("2025-03-01") },
        },
      ] as never);

      vi.mocked(prisma.app.findUnique).mockResolvedValue({
        id: "app-1",
        name: "Slack",
        customLogoUrl: null,
        catalog: null,
      } as never);

      vi.mocked(prisma.paymentRecord.findMany).mockResolvedValue([
        {
          id: "pr-1",
          transactionDate: new Date("2025-01-01"),
          amount: 50000,
          currency: "KRW",
          teamId: null,
          userId: "user-kim",
          linkedSubscriptionId: null,
        },
        {
          id: "pr-2",
          transactionDate: new Date("2025-02-01"),
          amount: 50000,
          currency: "KRW",
          teamId: null,
          userId: "user-kim",
          linkedSubscriptionId: null,
        },
        {
          id: "pr-3",
          transactionDate: new Date("2025-03-01"),
          amount: 50000,
          currency: "KRW",
          teamId: null,
          userId: "user-kim",
          linkedSubscriptionId: null,
        },
      ] as never);

      // dominantUser 조회
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-kim",
        name: "김철수",
        email: "kim@test.com",
        team: { id: "team-dev", name: "개발팀" },
      } as never);

      // 팀 멤버 조회 (SMP-134 새로 추가된 쿼리)
      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        id: "team-dev",
        name: "개발팀",
        members: [
          { id: "user-kim", name: "김철수", email: "kim@test.com" },
          { id: "user-lee", name: "이영희", email: "lee@test.com" },
        ],
      } as never);

      // appendUnassignedUsers: teamId=null 사용자 없음
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);

      const result = await suggestSubscriptionsFromPayments();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].assignedUserId).toBe("user-kim");
      expect(result.data![0].teamId).toBe("team-dev");
      // SMP-134: availableUsers가 팀 멤버로 채워져야 함
      expect(result.data![0].availableUsers).toHaveLength(2);
      expect(result.data![0].availableUsers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "user-kim" }),
          expect.objectContaining({ id: "user-lee" }),
        ])
      );
    });

    it("dominantUserId가 있고 팀이 없으면 조직 전체 멤버로 fallback해야 한다", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      vi.mocked(prisma.paymentRecord.groupBy).mockResolvedValue([
        {
          matchedAppId: "app-1",
          _count: { id: 3 },
          _sum: { amount: 150000 },
          _min: { transactionDate: new Date("2025-01-01") },
          _max: { transactionDate: new Date("2025-03-01") },
        },
      ] as never);

      vi.mocked(prisma.app.findUnique).mockResolvedValue({
        id: "app-1",
        name: "Slack",
        customLogoUrl: null,
        catalog: null,
      } as never);

      vi.mocked(prisma.paymentRecord.findMany).mockResolvedValue([
        {
          id: "pr-1",
          transactionDate: new Date("2025-01-01"),
          amount: 50000,
          currency: "KRW",
          teamId: null,
          userId: "user-solo",
          linkedSubscriptionId: null,
        },
        {
          id: "pr-2",
          transactionDate: new Date("2025-02-01"),
          amount: 50000,
          currency: "KRW",
          teamId: null,
          userId: "user-solo",
          linkedSubscriptionId: null,
        },
        {
          id: "pr-3",
          transactionDate: new Date("2025-03-01"),
          amount: 50000,
          currency: "KRW",
          teamId: null,
          userId: "user-solo",
          linkedSubscriptionId: null,
        },
      ] as never);

      // 유저에 팀 없음
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-solo",
        name: "나혼자",
        email: "solo@test.com",
        team: null,
      } as never);

      // 조직 전체 멤버 fallback
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        { id: "user-solo", name: "나혼자", email: "solo@test.com" },
        { id: "user-other", name: "다른사람", email: "other@test.com" },
      ] as never);

      const result = await suggestSubscriptionsFromPayments();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].assignedUserId).toBe("user-solo");
      expect(result.data![0].teamId).toBeNull();
      // SMP-134: availableUsers가 조직 전체 멤버로 채워져야 함
      expect(result.data![0].availableUsers).toHaveLength(2);
    });
  });

  describe("suggestFromCardTransactions - assignedUser가 있을 때 availableUsers 채우기", () => {
    it("카드 assignedUser의 팀 멤버로 availableUsers를 채워야 한다", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      vi.mocked(prisma.cardTransaction.groupBy)
        .mockResolvedValueOnce([
          {
            matchedAppId: "app-1",
            _count: { id: 3 },
            _sum: { useAmt: 150000 },
            _min: { useDt: "20250101" },
            _max: { useDt: "20250301" },
          },
        ] as never)
        .mockResolvedValueOnce([
          { corporateCardId: "card-1", _count: { id: 3 } },
        ] as never);

      vi.mocked(prisma.app.findUnique).mockResolvedValue({
        id: "app-1",
        name: "Slack",
        customLogoUrl: null,
        catalog: null,
      } as never);

      vi.mocked(prisma.corporateCard.findUnique).mockResolvedValue({
        id: "card-1",
        team: null,
        assignedUser: {
          id: "user-kim",
          name: "김철수",
          email: "kim@test.com",
          team: { id: "team-dev", name: "개발팀" },
        },
      } as never);

      // SMP-134: 팀 멤버 조회
      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        id: "team-dev",
        name: "개발팀",
        members: [
          { id: "user-kim", name: "김철수", email: "kim@test.com" },
          { id: "user-park", name: "박지성", email: "park@test.com" },
        ],
      } as never);

      vi.mocked(prisma.cardTransaction.findMany).mockResolvedValue([
        {
          id: "tx-1",
          useDt: "20250101",
          useAmt: 50000,
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
        {
          id: "tx-2",
          useDt: "20250201",
          useAmt: 50000,
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
        {
          id: "tx-3",
          useDt: "20250301",
          useAmt: 50000,
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
      ] as never);

      // appendUnassignedUsers: teamId=null 사용자 없음
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);

      const result = await suggestFromCardTransactions();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].assignedUserId).toBe("user-kim");
      expect(result.data![0].teamId).toBe("team-dev");
      // SMP-134: availableUsers가 팀 멤버로 채워져야 함
      expect(result.data![0].availableUsers).toHaveLength(2);
      expect(result.data![0].availableUsers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "user-kim" }),
          expect.objectContaining({ id: "user-park" }),
        ])
      );
    });

    it("카드 assignedUser에 팀이 없으면 조직 전체 멤버로 fallback해야 한다", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      vi.mocked(prisma.cardTransaction.groupBy)
        .mockResolvedValueOnce([
          {
            matchedAppId: "app-1",
            _count: { id: 3 },
            _sum: { useAmt: 150000 },
            _min: { useDt: "20250101" },
            _max: { useDt: "20250301" },
          },
        ] as never)
        .mockResolvedValueOnce([
          { corporateCardId: "card-1", _count: { id: 3 } },
        ] as never);

      vi.mocked(prisma.app.findUnique).mockResolvedValue({
        id: "app-1",
        name: "Slack",
        customLogoUrl: null,
        catalog: null,
      } as never);

      // 유저에 팀 없음
      vi.mocked(prisma.corporateCard.findUnique).mockResolvedValue({
        id: "card-1",
        team: null,
        assignedUser: {
          id: "user-solo",
          name: "나혼자",
          email: "solo@test.com",
          team: null,
        },
      } as never);

      // SMP-134: 조직 전체 멤버 fallback
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        { id: "user-solo", name: "나혼자", email: "solo@test.com" },
        { id: "user-other", name: "다른사람", email: "other@test.com" },
      ] as never);

      vi.mocked(prisma.cardTransaction.findMany).mockResolvedValue([
        {
          id: "tx-1",
          useDt: "20250101",
          useAmt: 50000,
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
        {
          id: "tx-2",
          useDt: "20250201",
          useAmt: 50000,
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
        {
          id: "tx-3",
          useDt: "20250301",
          useAmt: 50000,
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
      ] as never);

      const result = await suggestFromCardTransactions();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].assignedUserId).toBe("user-solo");
      expect(result.data![0].teamId).toBeNull();
      // SMP-134: availableUsers가 조직 전체 멤버로 채워져야 함
      expect(result.data![0].availableUsers).toHaveLength(2);
    });
  });
});

// SMP-199: availableUsers에 teamId/teamName 포함 테스트
describe("SMP-199: availableUsers teamId/teamName 포함", () => {
  const mockOrgId = "org-123";

  beforeEach(() => {
    vi.resetAllMocks();
    mockedAuth.mockResolvedValue({
      user: {
        id: "user-123",
        organizationId: mockOrgId,
        role: "ADMIN",
        teamId: null,
      },
      expires: "",
    });
  });

  describe("suggestSubscriptionsFromPayments - availableUsers에 teamId/teamName 포함", () => {
    it("팀 소속 사용자의 availableUsers 항목에 teamId와 teamName이 포함되어야 한다", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      vi.mocked(prisma.paymentRecord.groupBy).mockResolvedValue([
        {
          matchedAppId: "app-1",
          _count: { id: 3 },
          _sum: { amount: 150000 },
          _min: { transactionDate: new Date("2025-01-01") },
          _max: { transactionDate: new Date("2025-03-01") },
        },
      ] as never);

      vi.mocked(prisma.app.findUnique).mockResolvedValue({
        id: "app-1",
        name: "Slack",
        customLogoUrl: null,
        catalog: null,
      } as never);

      vi.mocked(prisma.paymentRecord.findMany).mockResolvedValue([
        {
          id: "pr-1",
          transactionDate: new Date("2025-01-01"),
          amount: 50000,
          currency: "KRW",
          teamId: null,
          userId: "user-kim",
          linkedSubscriptionId: null,
        },
        {
          id: "pr-2",
          transactionDate: new Date("2025-02-01"),
          amount: 50000,
          currency: "KRW",
          teamId: null,
          userId: "user-kim",
          linkedSubscriptionId: null,
        },
        {
          id: "pr-3",
          transactionDate: new Date("2025-03-01"),
          amount: 50000,
          currency: "KRW",
          teamId: null,
          userId: "user-kim",
          linkedSubscriptionId: null,
        },
      ] as never);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-kim",
        name: "김철수",
        email: "kim@test.com",
        team: { id: "team-dev", name: "개발팀" },
      } as never);

      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        id: "team-dev",
        name: "개발팀",
        members: [
          { id: "user-kim", name: "김철수", email: "kim@test.com" },
          { id: "user-lee", name: "이영희", email: "lee@test.com" },
        ],
      } as never);

      // appendUnassignedUsers: teamId=null 사용자 없음
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);

      const result = await suggestSubscriptionsFromPayments();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      const users = result.data![0].availableUsers;
      expect(users).toHaveLength(2);
      // SMP-199: 팀 소속 사용자는 teamId와 teamName이 non-null이어야 한다
      users.forEach((user) => {
        expect(user).toHaveProperty("teamId");
        expect(user).toHaveProperty("teamName");
        expect(user.teamId).toBe("team-dev");
        expect(user.teamName).toBe("개발팀");
      });
    });

    it("팀 미소속(fallback) 사용자의 availableUsers 항목에 teamId와 teamName이 null이어야 한다", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      vi.mocked(prisma.paymentRecord.groupBy).mockResolvedValue([
        {
          matchedAppId: "app-1",
          _count: { id: 3 },
          _sum: { amount: 150000 },
          _min: { transactionDate: new Date("2025-01-01") },
          _max: { transactionDate: new Date("2025-03-01") },
        },
      ] as never);

      vi.mocked(prisma.app.findUnique).mockResolvedValue({
        id: "app-1",
        name: "Slack",
        customLogoUrl: null,
        catalog: null,
      } as never);

      vi.mocked(prisma.paymentRecord.findMany).mockResolvedValue([
        {
          id: "pr-1",
          transactionDate: new Date("2025-01-01"),
          amount: 50000,
          currency: "KRW",
          teamId: null,
          userId: "user-solo",
          linkedSubscriptionId: null,
        },
        {
          id: "pr-2",
          transactionDate: new Date("2025-02-01"),
          amount: 50000,
          currency: "KRW",
          teamId: null,
          userId: "user-solo",
          linkedSubscriptionId: null,
        },
        {
          id: "pr-3",
          transactionDate: new Date("2025-03-01"),
          amount: 50000,
          currency: "KRW",
          teamId: null,
          userId: "user-solo",
          linkedSubscriptionId: null,
        },
      ] as never);

      // 유저에 팀 없음
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-solo",
        name: "나혼자",
        email: "solo@test.com",
        team: null,
      } as never);

      // 조직 전체 멤버 fallback (팀 미소속)
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        { id: "user-solo", name: "나혼자", email: "solo@test.com" },
        { id: "user-other", name: "다른사람", email: "other@test.com" },
      ] as never);

      const result = await suggestSubscriptionsFromPayments();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      const users = result.data![0].availableUsers;
      expect(users).toHaveLength(2);
      // SMP-199: 팀 미소속 사용자는 teamId와 teamName이 null이어야 한다
      users.forEach((user) => {
        expect(user).toHaveProperty("teamId");
        expect(user).toHaveProperty("teamName");
        expect(user.teamId).toBeNull();
        expect(user.teamName).toBeNull();
      });
    });
  });

  describe("suggestFromCardTransactions - availableUsers에 teamId/teamName 포함", () => {
    it("카드 팀 멤버의 availableUsers 항목에 teamId와 teamName이 포함되어야 한다", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      vi.mocked(prisma.cardTransaction.groupBy)
        .mockResolvedValueOnce([
          {
            matchedAppId: "app-1",
            _count: { id: 3 },
            _sum: { useAmt: 150000 },
            _min: { useDt: "20250101" },
            _max: { useDt: "20250301" },
          },
        ] as never)
        .mockResolvedValueOnce([
          { corporateCardId: "card-1", _count: { id: 3 } },
        ] as never);

      vi.mocked(prisma.app.findUnique).mockResolvedValue({
        id: "app-1",
        name: "Slack",
        customLogoUrl: null,
        catalog: { logoUrl: "https://slack.com/logo.png" },
      } as never);

      vi.mocked(prisma.corporateCard.findUnique).mockResolvedValue({
        id: "card-1",
        team: {
          id: "team-marketing",
          name: "마케팅팀",
          members: [
            { id: "user-1", name: "홍길동", email: "hong@test.com" },
            { id: "user-2", name: "김철수", email: "kim@test.com" },
          ],
        },
        assignedUser: null,
      } as never);

      vi.mocked(prisma.cardTransaction.findMany).mockResolvedValue([
        {
          id: "tx-1",
          useDt: "20250101",
          useAmt: 50000,
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
        {
          id: "tx-2",
          useDt: "20250201",
          useAmt: 50000,
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
        {
          id: "tx-3",
          useDt: "20250301",
          useAmt: 50000,
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
      ] as never);

      // appendUnassignedUsers: teamId=null 사용자 없음
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);

      const result = await suggestFromCardTransactions();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      const users = result.data![0].availableUsers;
      expect(users).toHaveLength(2);
      // SMP-199: 팀 소속 사용자는 teamId와 teamName이 non-null이어야 한다
      users.forEach((user) => {
        expect(user).toHaveProperty("teamId");
        expect(user).toHaveProperty("teamName");
        expect(user.teamId).toBe("team-marketing");
        expect(user.teamName).toBe("마케팅팀");
      });
    });

    it("카드에 팀이 없고 fallback 사용자의 availableUsers 항목에 teamId와 teamName이 null이어야 한다", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      vi.mocked(prisma.cardTransaction.groupBy)
        .mockResolvedValueOnce([
          {
            matchedAppId: "app-1",
            _count: { id: 3 },
            _sum: { useAmt: 150000 },
            _min: { useDt: "20250101" },
            _max: { useDt: "20250301" },
          },
        ] as never)
        .mockResolvedValueOnce([
          { corporateCardId: "card-1", _count: { id: 3 } },
        ] as never);

      vi.mocked(prisma.app.findUnique).mockResolvedValue({
        id: "app-1",
        name: "Slack",
        customLogoUrl: null,
        catalog: null,
      } as never);

      vi.mocked(prisma.corporateCard.findUnique).mockResolvedValue({
        id: "card-1",
        team: null,
        assignedUser: null,
      } as never);

      vi.mocked(prisma.cardTransaction.findMany).mockResolvedValue([
        {
          id: "tx-1",
          useDt: "20250101",
          useAmt: 50000,
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
        {
          id: "tx-2",
          useDt: "20250201",
          useAmt: 50000,
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
        {
          id: "tx-3",
          useDt: "20250301",
          useAmt: 50000,
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
      ] as never);

      // SMP-156: 조직 전체 멤버 fallback (팀 미소속)
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        { id: "user-1", name: "유저1", email: "user1@test.com" },
        { id: "user-2", name: "유저2", email: "user2@test.com" },
      ] as never);

      const result = await suggestFromCardTransactions();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      const users = result.data![0].availableUsers;
      expect(users).toHaveLength(2);
      // SMP-199: 팀 미소속 사용자는 teamId와 teamName이 null이어야 한다
      users.forEach((user) => {
        expect(user).toHaveProperty("teamId");
        expect(user).toHaveProperty("teamName");
        expect(user.teamId).toBeNull();
        expect(user.teamName).toBeNull();
      });
    });
  });
});

// SMP-134: assignedUserId가 availableUsers에 반드시 포함되는지 검증
describe("SMP-134: assignedUserId inclusion guarantee in availableUsers", () => {
  const mockOrgId = "org-123";

  beforeEach(() => {
    vi.resetAllMocks();
    mockedAuth.mockResolvedValue({
      user: {
        id: "user-123",
        organizationId: mockOrgId,
        role: "ADMIN",
        teamId: null,
      },
      expires: "",
    });
  });

  it("suggestSubscriptionsFromPayments: assignedUserId가 팀 멤버에 없어도 availableUsers에 포함되어야 한다", async () => {
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

    vi.mocked(prisma.paymentRecord.groupBy).mockResolvedValue([
      {
        matchedAppId: "app-1",
        _count: { id: 3 },
        _sum: { amount: 150000 },
        _min: { transactionDate: new Date("2025-01-01") },
        _max: { transactionDate: new Date("2025-03-01") },
      },
    ] as never);

    vi.mocked(prisma.app.findUnique).mockResolvedValue({
      id: "app-1",
      name: "Slack",
      customLogoUrl: null,
      catalog: null,
    } as never);

    vi.mocked(prisma.paymentRecord.findMany).mockResolvedValue([
      {
        id: "pr-1",
        transactionDate: new Date("2025-01-01"),
        amount: 50000,
        currency: "KRW",
        teamId: null,
        userId: "user-kim",
        linkedSubscriptionId: null,
      },
      {
        id: "pr-2",
        transactionDate: new Date("2025-02-01"),
        amount: 50000,
        currency: "KRW",
        teamId: null,
        userId: "user-kim",
        linkedSubscriptionId: null,
      },
      {
        id: "pr-3",
        transactionDate: new Date("2025-03-01"),
        amount: 50000,
        currency: "KRW",
        teamId: null,
        userId: "user-kim",
        linkedSubscriptionId: null,
      },
    ] as never);

    // dominantUser는 팀이 있지만, 팀 멤버에 자기 자신이 빠진 경우
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-kim",
      name: "김철수",
      email: "kim@test.com",
      team: { id: "team-dev", name: "개발팀" },
    } as never);

    vi.mocked(prisma.team.findUnique).mockResolvedValue({
      id: "team-dev",
      name: "개발팀",
      members: [
        // user-kim이 멤버 목록에 없음 (예: 상태 변경 등)
        { id: "user-lee", name: "이영희", email: "lee@test.com" },
      ],
    } as never);

    // appendUnassignedUsers: teamId=null 사용자 없음
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);

    const result = await suggestSubscriptionsFromPayments();

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data![0].assignedUserId).toBe("user-kim");
    // assignedUserId가 availableUsers에 반드시 포함
    expect(
      result.data![0].availableUsers.some((u) => u.id === "user-kim")
    ).toBe(true);
    // 기존 팀 멤버도 포함
    expect(
      result.data![0].availableUsers.some((u) => u.id === "user-lee")
    ).toBe(true);
  });

  it("suggestFromCardTransactions: assignedUserId가 팀 멤버에 없어도 availableUsers에 포함되어야 한다", async () => {
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

    vi.mocked(prisma.cardTransaction.groupBy)
      .mockResolvedValueOnce([
        {
          matchedAppId: "app-1",
          _count: { id: 3 },
          _sum: { useAmt: 150000 },
          _min: { useDt: "20250101" },
          _max: { useDt: "20250301" },
        },
      ] as never)
      .mockResolvedValueOnce([
        { corporateCardId: "card-1", _count: { id: 3 } },
      ] as never);

    vi.mocked(prisma.app.findUnique).mockResolvedValue({
      id: "app-1",
      name: "Slack",
      customLogoUrl: null,
      catalog: null,
    } as never);

    vi.mocked(prisma.corporateCard.findUnique).mockResolvedValue({
      id: "card-1",
      team: null,
      assignedUser: {
        id: "user-kim",
        name: "김철수",
        email: "kim@test.com",
        team: { id: "team-dev", name: "개발팀" },
      },
    } as never);

    // 팀 멤버에 assignedUser가 빠진 경우
    vi.mocked(prisma.team.findUnique).mockResolvedValue({
      id: "team-dev",
      name: "개발팀",
      members: [{ id: "user-park", name: "박지성", email: "park@test.com" }],
    } as never);

    // assignedUser 단독 조회 (safety fallback)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-kim",
      name: "김철수",
      email: "kim@test.com",
    } as never);

    vi.mocked(prisma.cardTransaction.findMany).mockResolvedValue([
      {
        id: "tx-1",
        useDt: "20250101",
        useAmt: 50000,
        teamId: null,
        userId: null,
        linkedSubscriptionId: null,
      },
      {
        id: "tx-2",
        useDt: "20250201",
        useAmt: 50000,
        teamId: null,
        userId: null,
        linkedSubscriptionId: null,
      },
      {
        id: "tx-3",
        useDt: "20250301",
        useAmt: 50000,
        teamId: null,
        userId: null,
        linkedSubscriptionId: null,
      },
    ] as never);

    // appendUnassignedUsers: teamId=null 사용자 없음
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);

    const result = await suggestFromCardTransactions();

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data![0].assignedUserId).toBe("user-kim");
    // assignedUserId가 availableUsers에 반드시 포함
    expect(
      result.data![0].availableUsers.some((u) => u.id === "user-kim")
    ).toBe(true);
    // 기존 팀 멤버도 포함
    expect(
      result.data![0].availableUsers.some((u) => u.id === "user-park")
    ).toBe(true);
  });
});

// SMP-156: Regression - 팀/유저 미배정 시 조직 전체 멤버 fallback 테스트
describe("SMP-156: availableUsers fallback to org members when no team/user assigned", () => {
  const mockOrgId = "org-123";

  beforeEach(() => {
    vi.resetAllMocks();
    mockedAuth.mockResolvedValue({
      user: {
        id: "user-123",
        organizationId: mockOrgId,
        role: "ADMIN",
        teamId: null,
      },
      expires: "",
    });
  });

  describe("suggestSubscriptionsFromPayments - dominantUserId와 dominantTeamId가 둘 다 null일 때", () => {
    it("결제내역에 팀/유저 미배정 시 availableUsers에 조직 전체 활성 멤버가 포함되어야 한다", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      vi.mocked(prisma.paymentRecord.groupBy).mockResolvedValue([
        {
          matchedAppId: "app-1",
          _count: { id: 3 },
          _sum: { amount: 150000 },
          _min: { transactionDate: new Date("2025-01-01") },
          _max: { transactionDate: new Date("2025-03-01") },
        },
      ] as never);

      vi.mocked(prisma.app.findUnique).mockResolvedValue({
        id: "app-1",
        name: "Slack",
        customLogoUrl: null,
        catalog: null,
      } as never);

      // 결제내역에 teamId와 userId가 모두 null
      vi.mocked(prisma.paymentRecord.findMany).mockResolvedValue([
        {
          id: "pr-1",
          transactionDate: new Date("2025-01-01"),
          amount: 50000,
          currency: "KRW",
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
        {
          id: "pr-2",
          transactionDate: new Date("2025-02-01"),
          amount: 50000,
          currency: "KRW",
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
        {
          id: "pr-3",
          transactionDate: new Date("2025-03-01"),
          amount: 50000,
          currency: "KRW",
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
      ] as never);

      // 조직 전체 활성 멤버 mock
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        { id: "user-a", name: "유저A", email: "a@test.com" },
        { id: "user-b", name: "유저B", email: "b@test.com" },
        { id: "user-c", name: "유저C", email: "c@test.com" },
      ] as never);

      const result = await suggestSubscriptionsFromPayments();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      // 팀/유저 미배정이므로 teamId와 assignedUserId는 null
      expect(result.data![0].teamId).toBeNull();
      expect(result.data![0].assignedUserId).toBeNull();
      // SMP-156 수정: availableUsers에 조직 전체 멤버가 포함되어야 함
      expect(result.data![0].availableUsers).toHaveLength(3);
      expect(result.data![0].availableUsers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "user-a" }),
          expect.objectContaining({ id: "user-b" }),
          expect.objectContaining({ id: "user-c" }),
        ])
      );
    });

    it("기존 동작 유지: dominantUserId가 있으면 팀 멤버로 채워야 한다", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      vi.mocked(prisma.paymentRecord.groupBy).mockResolvedValue([
        {
          matchedAppId: "app-1",
          _count: { id: 3 },
          _sum: { amount: 150000 },
          _min: { transactionDate: new Date("2025-01-01") },
          _max: { transactionDate: new Date("2025-03-01") },
        },
      ] as never);

      vi.mocked(prisma.app.findUnique).mockResolvedValue({
        id: "app-1",
        name: "Slack",
        customLogoUrl: null,
        catalog: null,
      } as never);

      // 결제내역에 userId가 있음
      vi.mocked(prisma.paymentRecord.findMany).mockResolvedValue([
        {
          id: "pr-1",
          transactionDate: new Date("2025-01-01"),
          amount: 50000,
          currency: "KRW",
          teamId: null,
          userId: "user-kim",
          linkedSubscriptionId: null,
        },
        {
          id: "pr-2",
          transactionDate: new Date("2025-02-01"),
          amount: 50000,
          currency: "KRW",
          teamId: null,
          userId: "user-kim",
          linkedSubscriptionId: null,
        },
        {
          id: "pr-3",
          transactionDate: new Date("2025-03-01"),
          amount: 50000,
          currency: "KRW",
          teamId: null,
          userId: "user-kim",
          linkedSubscriptionId: null,
        },
      ] as never);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-kim",
        name: "김철수",
        email: "kim@test.com",
        team: { id: "team-dev", name: "개발팀" },
      } as never);

      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        id: "team-dev",
        name: "개발팀",
        members: [
          { id: "user-kim", name: "김철수", email: "kim@test.com" },
          { id: "user-lee", name: "이영희", email: "lee@test.com" },
        ],
      } as never);

      // appendUnassignedUsers: teamId=null 사용자 없음
      vi.mocked(prisma.user.findMany).mockResolvedValueOnce([]);

      const result = await suggestSubscriptionsFromPayments();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].assignedUserId).toBe("user-kim");
      // 기존 동작 유지: 팀 멤버로 availableUsers 채우기
      expect(result.data![0].availableUsers).toHaveLength(2);
      // appendUnassignedUsers를 위해 user.findMany가 1회 호출됨 (조직 전체 fallback 아님)
      expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe("suggestFromCardTransactions - 카드 미배정 및 거래 팀/유저 미배정 시", () => {
    it("카드 팀/유저 미배정이고 거래에도 팀/유저 미배정 시 availableUsers에 조직 전체 활성 멤버가 포함되어야 한다", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      vi.mocked(prisma.cardTransaction.groupBy)
        .mockResolvedValueOnce([
          {
            matchedAppId: "app-1",
            _count: { id: 3 },
            _sum: { useAmt: 150000 },
            _min: { useDt: "20250101" },
            _max: { useDt: "20250301" },
          },
        ] as never)
        .mockResolvedValueOnce([
          { corporateCardId: "card-1", _count: { id: 3 } },
        ] as never);

      vi.mocked(prisma.app.findUnique).mockResolvedValue({
        id: "app-1",
        name: "Slack",
        customLogoUrl: null,
        catalog: null,
      } as never);

      // 카드에 팀/유저 미배정
      vi.mocked(prisma.corporateCard.findUnique).mockResolvedValue({
        id: "card-1",
        team: null,
        assignedUser: null,
      } as never);

      // 거래에도 teamId/userId가 모두 null
      vi.mocked(prisma.cardTransaction.findMany).mockResolvedValue([
        {
          id: "tx-1",
          useDt: "20250101",
          useAmt: 50000,
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
        {
          id: "tx-2",
          useDt: "20250201",
          useAmt: 50000,
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
        {
          id: "tx-3",
          useDt: "20250301",
          useAmt: 50000,
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
      ] as never);

      // 조직 전체 활성 멤버 mock
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        { id: "user-a", name: "유저A", email: "a@test.com" },
        { id: "user-b", name: "유저B", email: "b@test.com" },
      ] as never);

      const result = await suggestFromCardTransactions();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      // 팀/유저 미배정이므로 모두 null
      expect(result.data![0].teamId).toBeNull();
      expect(result.data![0].assignedUserId).toBeNull();
      // SMP-156 수정: availableUsers에 조직 전체 멤버가 포함되어야 함
      expect(result.data![0].availableUsers).toHaveLength(2);
      expect(result.data![0].availableUsers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "user-a" }),
          expect.objectContaining({ id: "user-b" }),
        ])
      );
    });

    it("기존 동작 유지: 카드 team 배정이 있으면 해당 팀 멤버로 availableUsers를 채워야 한다", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      vi.mocked(prisma.cardTransaction.groupBy)
        .mockResolvedValueOnce([
          {
            matchedAppId: "app-1",
            _count: { id: 3 },
            _sum: { useAmt: 150000 },
            _min: { useDt: "20250101" },
            _max: { useDt: "20250301" },
          },
        ] as never)
        .mockResolvedValueOnce([
          { corporateCardId: "card-1", _count: { id: 3 } },
        ] as never);

      vi.mocked(prisma.app.findUnique).mockResolvedValue({
        id: "app-1",
        name: "Slack",
        customLogoUrl: null,
        catalog: null,
      } as never);

      // 카드에 팀 배정됨
      vi.mocked(prisma.corporateCard.findUnique).mockResolvedValue({
        id: "card-1",
        team: {
          id: "team-marketing",
          name: "마케팅팀",
          members: [
            { id: "user-1", name: "홍길동", email: "hong@test.com" },
            { id: "user-2", name: "김철수", email: "kim@test.com" },
          ],
        },
        assignedUser: null,
      } as never);

      vi.mocked(prisma.cardTransaction.findMany).mockResolvedValue([
        {
          id: "tx-1",
          useDt: "20250101",
          useAmt: 50000,
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
        {
          id: "tx-2",
          useDt: "20250201",
          useAmt: 50000,
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
        {
          id: "tx-3",
          useDt: "20250301",
          useAmt: 50000,
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
      ] as never);

      // appendUnassignedUsers: teamId=null 사용자 없음
      vi.mocked(prisma.user.findMany).mockResolvedValueOnce([]);

      const result = await suggestFromCardTransactions();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].teamId).toBe("team-marketing");
      // 기존 동작 유지: 팀 멤버로 채워야 함
      expect(result.data![0].availableUsers).toHaveLength(2);
      // appendUnassignedUsers를 위해 user.findMany가 1회 호출됨 (조직 전체 fallback 아님)
      expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
    });
  });
});

// Phase 2 추가: 법인카드 유저 배정 시 구독 자동 배정 테스트
describe("subscription-suggestions (Phase 2 - User Assignment)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockRedirect.mockClear();
  });

  describe("suggestFromCardTransactions - assignedUser 처리", () => {
    const mockOrgId = "org-123";

    beforeEach(() => {
      mockedAuth.mockResolvedValue({
        user: {
          id: "user-123",
          organizationId: mockOrgId,
          role: "ADMIN",
          teamId: null,
        },
        expires: "",
      });
    });

    it("카드에 assignedUser가 있으면 assignedUserId와 유저 정보를 포함해야 한다", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      vi.mocked(prisma.cardTransaction.groupBy)
        .mockResolvedValueOnce([
          {
            matchedAppId: "app-1",
            _count: { id: 3 },
            _sum: { useAmt: 150000 },
            _min: { useDt: "20250101" },
            _max: { useDt: "20250301" },
          },
        ] as never)
        .mockResolvedValueOnce([
          { corporateCardId: "card-1", _count: { id: 3 } },
        ] as never);

      vi.mocked(prisma.app.findUnique).mockResolvedValue({
        id: "app-1",
        name: "Slack",
        customLogoUrl: null,
        catalog: { logoUrl: "https://slack.com/logo.png" },
      } as never);

      // 카드에 assignedUser가 있고, team은 없는 경우
      vi.mocked(prisma.corporateCard.findUnique).mockResolvedValue({
        id: "card-1",
        team: null,
        assignedUser: {
          id: "user-kim",
          name: "김철수",
          email: "kim@test.com",
          team: { id: "team-dev", name: "개발팀" },
        },
      } as never);

      // SMP-134: 팀 멤버 조회 (assignedUser의 팀 멤버로 availableUsers 채우기)
      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        id: "team-dev",
        name: "개발팀",
        members: [{ id: "user-kim", name: "김철수", email: "kim@test.com" }],
      } as never);

      // appendUnassignedUsers: teamId=null 사용자 없음
      vi.mocked(prisma.user.findMany).mockResolvedValueOnce([]);

      vi.mocked(prisma.cardTransaction.findMany).mockResolvedValue([
        {
          id: "tx-1",
          useDt: "20250101",
          useAmt: 50000,
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
        {
          id: "tx-2",
          useDt: "20250201",
          useAmt: 50000,
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
        {
          id: "tx-3",
          useDt: "20250301",
          useAmt: 50000,
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
      ] as never);

      const result = await suggestFromCardTransactions();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      // assignedUserId가 있어야 함
      expect(result.data![0].assignedUserId).toBe("user-kim");
      expect(result.data![0].assignedUserName).toBe("김철수");
      // 유저 배정 시, 해당 유저의 팀 정보를 teamId/teamName에 설정
      expect(result.data![0].teamId).toBe("team-dev");
      expect(result.data![0].teamName).toBe("개발팀");
      // SMP-134: availableUsers가 채워져야 함
      expect(result.data![0].availableUsers).toHaveLength(1);
    });

    it("카드에 team 배정만 있고 assignedUser가 없으면 assignedUserId가 null이어야 한다", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      vi.mocked(prisma.cardTransaction.groupBy)
        .mockResolvedValueOnce([
          {
            matchedAppId: "app-1",
            _count: { id: 3 },
            _sum: { useAmt: 150000 },
            _min: { useDt: "20250101" },
            _max: { useDt: "20250301" },
          },
        ] as never)
        .mockResolvedValueOnce([
          { corporateCardId: "card-1", _count: { id: 3 } },
        ] as never);

      vi.mocked(prisma.app.findUnique).mockResolvedValue({
        id: "app-1",
        name: "Slack",
        customLogoUrl: null,
        catalog: null,
      } as never);

      // 카드에 team만 배정된 경우
      vi.mocked(prisma.corporateCard.findUnique).mockResolvedValue({
        id: "card-1",
        team: {
          id: "team-marketing",
          name: "마케팅팀",
          members: [{ id: "user-1", name: "홍길동", email: "hong@test.com" }],
        },
        assignedUser: null,
      } as never);

      // appendUnassignedUsers: teamId=null 사용자 없음
      vi.mocked(prisma.user.findMany).mockResolvedValueOnce([]);

      vi.mocked(prisma.cardTransaction.findMany).mockResolvedValue([
        {
          id: "tx-1",
          useDt: "20250101",
          useAmt: 50000,
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
        {
          id: "tx-2",
          useDt: "20250201",
          useAmt: 50000,
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
        {
          id: "tx-3",
          useDt: "20250301",
          useAmt: 50000,
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
      ] as never);

      const result = await suggestFromCardTransactions();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].assignedUserId).toBeNull();
      expect(result.data![0].assignedUserName).toBeNull();
      expect(result.data![0].teamId).toBe("team-marketing");
    });

    it("카드에 team과 assignedUser 둘 다 없으면 teamId/assignedUserId는 null이고 availableUsers에 조직 전체 멤버가 포함되어야 한다", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      vi.mocked(prisma.cardTransaction.groupBy)
        .mockResolvedValueOnce([
          {
            matchedAppId: "app-1",
            _count: { id: 3 },
            _sum: { useAmt: 150000 },
            _min: { useDt: "20250101" },
            _max: { useDt: "20250301" },
          },
        ] as never)
        .mockResolvedValueOnce([
          { corporateCardId: "card-1", _count: { id: 3 } },
        ] as never);

      vi.mocked(prisma.app.findUnique).mockResolvedValue({
        id: "app-1",
        name: "Slack",
        customLogoUrl: null,
        catalog: null,
      } as never);

      // 카드에 배정 없음
      vi.mocked(prisma.corporateCard.findUnique).mockResolvedValue({
        id: "card-1",
        team: null,
        assignedUser: null,
      } as never);

      vi.mocked(prisma.cardTransaction.findMany).mockResolvedValue([
        {
          id: "tx-1",
          useDt: "20250101",
          useAmt: 50000,
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
        {
          id: "tx-2",
          useDt: "20250201",
          useAmt: 50000,
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
        {
          id: "tx-3",
          useDt: "20250301",
          useAmt: 50000,
          teamId: null,
          userId: null,
          linkedSubscriptionId: null,
        },
      ] as never);

      // SMP-156: 조직 전체 멤버 fallback
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        { id: "user-1", name: "유저1", email: "user1@test.com" },
        { id: "user-2", name: "유저2", email: "user2@test.com" },
      ] as never);

      const result = await suggestFromCardTransactions();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].assignedUserId).toBeNull();
      expect(result.data![0].teamId).toBeNull();
      // SMP-156: 팀/유저 미배정 시 조직 전체 멤버로 fallback
      expect(result.data![0].availableUsers).toHaveLength(2);
    });
  });

  describe("createSubscriptionFromCardSuggestion - assignedUserId 자동 배정", () => {
    const mockOrgId = "org-123";
    const mockUserId = "user-123";

    beforeEach(() => {
      mockedAuth.mockResolvedValue({
        user: {
          id: mockUserId,
          organizationId: mockOrgId,
          role: "ADMIN",
          teamId: null,
        },
        expires: "",
      });
    });

    it("assignedUserId가 있으면 자동으로 SubscriptionUser에 배정해야 한다", async () => {
      const suggestionWithAssignedUser: CardTransactionSuggestion = {
        appId: "app-1",
        appName: "Slack",
        appLogoUrl: "https://slack.com/logo.png",
        suggestedBillingCycle: "MONTHLY",
        suggestedAmount: 50000,
        currency: "KRW",
        paymentCount: 3,
        firstPaymentDate: new Date("2025-01-01"),
        lastPaymentDate: new Date("2025-03-01"),
        confidence: 0.85,
        teamId: "team-dev",
        teamName: "개발팀",
        assignedUserId: "user-kim",
        assignedUserName: "김철수",
        availableUsers: [],
        source: "card_transaction",
        suggestedAction: "create",
        unmatchedTransactionIds: ["tx-1", "tx-2"],
        billingType: "PER_SEAT",
        perSeatPrice: null,
        suggestedSeats: null,
      };

      vi.mocked(prisma.app.findFirst).mockResolvedValue({
        id: "app-1",
        name: "Slack",
      } as never);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);
      // SMP-123: ensureAppTeamAssignment를 위한 mock 추가
      vi.mocked(prisma.appTeam.findFirst).mockResolvedValue({
        id: "app-team-1",
        appId: "app-1",
        teamId: "team-dev",
      } as never);
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        { id: "user-kim" },
      ] as never);
      vi.mocked(prisma.subscription.create).mockResolvedValue({
        id: "sub-1",
      } as never);
      vi.mocked(prisma.subscriptionUser.createMany).mockResolvedValue({
        count: 1,
      } as never);
      // SMP-123: cardTransaction.updateMany mock 추가
      vi.mocked(prisma.cardTransaction.updateMany).mockResolvedValue({
        count: 2,
      } as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      // selectedUserIds 비어 있어도 assignedUserId가 있으면 자동 배정
      const result = await createSubscriptionFromCardSuggestion({
        suggestion: suggestionWithAssignedUser,
        selectedUserIds: [],
      });

      expect(result.success).toBe(true);
      // subscription.teamId는 유저의 팀으로 설정
      expect(prisma.subscription.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          teamId: "team-dev",
        }),
      });
      // SubscriptionUser에 assignedUserId 자동 배정
      expect(prisma.subscriptionUser.createMany).toHaveBeenCalledWith({
        data: [
          {
            subscriptionId: "sub-1",
            userId: "user-kim",
            assignedBy: mockUserId,
          },
        ],
        skipDuplicates: true, // SMP-123: skipDuplicates 추가됨
      });
    });

    it("selectedUserIds와 assignedUserId 모두 처리해야 한다", async () => {
      const suggestionWithBoth: CardTransactionSuggestion = {
        appId: "app-1",
        appName: "Slack",
        appLogoUrl: null,
        suggestedBillingCycle: "MONTHLY",
        suggestedAmount: 50000,
        currency: "KRW",
        paymentCount: 3,
        firstPaymentDate: new Date("2025-01-01"),
        lastPaymentDate: new Date("2025-03-01"),
        confidence: 0.85,
        teamId: "team-dev",
        teamName: "개발팅",
        assignedUserId: "user-kim",
        assignedUserName: "김철수",
        availableUsers: [
          {
            id: "user-lee",
            name: "이영희",
            email: "lee@test.com",
            teamId: "team-dev",
            teamName: "개발팅",
          },
        ],
        source: "card_transaction",
        suggestedAction: "create",
        unmatchedTransactionIds: ["tx-1"],
        billingType: "PER_SEAT",
        perSeatPrice: null,
        suggestedSeats: null,
      };

      vi.mocked(prisma.app.findFirst).mockResolvedValue({
        id: "app-1",
        name: "Slack",
      } as never);
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);
      // SMP-123: ensureAppTeamAssignment를 위한 mock 추가
      vi.mocked(prisma.appTeam.findFirst).mockResolvedValue({
        id: "app-team-1",
        appId: "app-1",
        teamId: "team-dev",
      } as never);
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        { id: "user-kim" },
        { id: "user-lee" },
      ] as never);
      vi.mocked(prisma.subscription.create).mockResolvedValue({
        id: "sub-1",
      } as never);
      vi.mocked(prisma.subscriptionUser.createMany).mockResolvedValue({
        count: 2,
      } as never);
      // SMP-123: cardTransaction.updateMany mock 추가
      vi.mocked(prisma.cardTransaction.updateMany).mockResolvedValue({
        count: 1,
      } as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      const result = await createSubscriptionFromCardSuggestion({
        suggestion: suggestionWithBoth,
        selectedUserIds: ["user-lee"],
      });

      expect(result.success).toBe(true);
      // assignedUserId + selectedUserIds 모두 배정 (중복 제거)
      expect(prisma.subscriptionUser.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: "user-kim" }),
          expect.objectContaining({ userId: "user-lee" }),
        ]),
        skipDuplicates: true, // SMP-123: skipDuplicates 추가됨
      });
    });
  });

  describe("suggestSubscriptionsFromPayments - 에러 핸들링", () => {
    it("requireOrganization이 일반 에러를 throw하면 { success: false }를 반환해야 한다", async () => {
      mockedAuth.mockRejectedValue(new Error("Auth service unavailable"));

      const result = await suggestSubscriptionsFromPayments();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Auth service unavailable");
    });

    it("Prisma 쿼리 실패 시 { success: false }를 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: {
          id: "user-123",
          organizationId: "org-123",
          role: "ADMIN",
          teamId: null,
        },
        expires: "",
      });
      vi.mocked(prisma.subscription.findMany).mockRejectedValue(
        new Error("DB connection failed")
      );

      const result = await suggestSubscriptionsFromPayments();

      expect(result.success).toBe(false);
      expect(result.error).toBe("DB connection failed");
    });

    it("redirect 에러는 그대로 rethrow해야 한다", async () => {
      mockedAuth.mockImplementation(() => {
        const error = new Error("NEXT_REDIRECT:/login");
        (error as Error & { digest: string }).digest = "NEXT_REDIRECT:/login";
        throw error;
      });

      await expect(suggestSubscriptionsFromPayments()).rejects.toThrow(
        "NEXT_REDIRECT:/login"
      );
    });
  });
});
