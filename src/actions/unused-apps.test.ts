// src/actions/unused-apps.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-auth", () => ({
  requireOrganization: vi.fn().mockResolvedValue({ organizationId: "org-1" }),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    subscription: { findMany: vi.fn() },
    userAppAccess: { findMany: vi.fn() },
    extensionUsage: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/utils/domain-extractor", () => ({
  extractMainDomain: vi.fn((url: string) => {
    if (!url) return null;
    try {
      const withProtocol = url.startsWith("http") ? url : `https://${url}`;
      return new URL(withProtocol).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  }),
}));

import { prisma } from "@/lib/db";
import { getUnusedApps } from "./unused-apps";

const mockSubFindMany = prisma.subscription.findMany as ReturnType<
  typeof vi.fn
>;
const mockAccessFindMany = prisma.userAppAccess.findMany as ReturnType<
  typeof vi.fn
>;
const mockUsageFindMany = prisma.extensionUsage.findMany as ReturnType<
  typeof vi.fn
>;

// 테스트용 구독 데이터 생성 헬퍼
function makeSub(
  overrides: {
    id?: string;
    appId?: string;
    billingType?: string;
    billingCycle?: string;
    amount?: number;
    perSeatPrice?: number | null;
    totalLicenses?: number | null;
    assignedUsers?: { userId: string }[];
    appWebsite?: string | null;
  } = {}
) {
  return {
    id: overrides.id ?? "sub-1",
    appId: overrides.appId ?? "app-1",
    billingType: overrides.billingType ?? "FLAT_RATE",
    billingCycle: overrides.billingCycle ?? "MONTHLY",
    amount: { toNumber: () => overrides.amount ?? 50000 },
    perSeatPrice:
      overrides.perSeatPrice != null
        ? { toNumber: () => overrides.perSeatPrice }
        : null,
    totalLicenses: overrides.totalLicenses ?? null,
    assignedUsers: overrides.assignedUsers ?? [{ userId: "user-1" }],
    app: {
      customWebsite:
        overrides.appWebsite !== undefined
          ? overrides.appWebsite
          : "https://slack.com",
      catalog: null,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // ExtensionUsage는 기본적으로 빈 배열 반환
  mockUsageFindMany.mockResolvedValue([]);
});

describe("getUnusedApps", () => {
  // ─── 기본 케이스 ───────────────────────────────────────────────

  it("should return count=0, cost=0 when there are no active subscriptions", async () => {
    mockSubFindMany.mockResolvedValue([]);

    const result = await getUnusedApps();

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ count: 0, cost: 0 });
  });

  it("should count a FLAT_RATE subscription as unused when assigned user has no access", async () => {
    mockSubFindMany.mockResolvedValue([makeSub({ amount: 50000 })]);
    mockAccessFindMany.mockResolvedValue([]);

    const result = await getUnusedApps();

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ count: 1, cost: 50000 });
  });

  it("should count a FLAT_RATE subscription as unused when no users are assigned", async () => {
    mockSubFindMany.mockResolvedValue([
      makeSub({ assignedUsers: [], amount: 30000 }),
    ]);
    mockAccessFindMany.mockResolvedValue([]);

    const result = await getUnusedApps();

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ count: 1, cost: 30000 });
  });

  it("should NOT count a FLAT_RATE subscription as unused when assigned user has recent UserAppAccess", async () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 5);

    mockSubFindMany.mockResolvedValue([makeSub()]);
    mockAccessFindMany.mockResolvedValue([
      { appId: "app-1", userId: "user-1", lastUsedAt: recentDate },
    ]);

    const result = await getUnusedApps();

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ count: 0, cost: 0 });
  });

  it("should handle mixed case: some unused, some used", async () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 5);

    mockSubFindMany.mockResolvedValue([
      makeSub({
        id: "sub-1",
        appId: "app-1",
        amount: 50000,
        assignedUsers: [{ userId: "user-1" }],
      }),
      makeSub({
        id: "sub-2",
        appId: "app-2",
        amount: 30000,
        assignedUsers: [{ userId: "user-2" }],
      }),
      makeSub({
        id: "sub-3",
        appId: "app-3",
        amount: 20000,
        assignedUsers: [{ userId: "user-3" }],
      }),
    ]);
    // app-1만 최근 접속
    mockAccessFindMany.mockResolvedValue([
      { appId: "app-1", userId: "user-1", lastUsedAt: recentDate },
    ]);

    const result = await getUnusedApps();

    expect(result.success).toBe(true);
    expect(result.data?.count).toBe(2); // app-2, app-3 미사용
    expect(result.data?.cost).toBe(50000); // 30000 + 20000
  });

  // ─── 빌링 사이클 변환 ─────────────────────────────────────────

  it("should convert YEARLY amount to monthly (amount / 12)", async () => {
    mockSubFindMany.mockResolvedValue([
      makeSub({ billingCycle: "YEARLY", amount: 120000 }),
    ]);
    mockAccessFindMany.mockResolvedValue([]);

    const result = await getUnusedApps();

    expect(result.success).toBe(true);
    expect(result.data?.cost).toBe(10000); // 120000 / 12
  });

  it("should convert QUARTERLY amount to monthly (amount / 3)", async () => {
    mockSubFindMany.mockResolvedValue([
      makeSub({ billingCycle: "QUARTERLY", amount: 90000 }),
    ]);
    mockAccessFindMany.mockResolvedValue([]);

    const result = await getUnusedApps();

    expect(result.success).toBe(true);
    expect(result.data?.cost).toBe(30000); // 90000 / 3
  });

  // ─── 중복 구독 처리 ──────────────────────────────────────────

  it("should aggregate multiple subscriptions for the same app", async () => {
    mockSubFindMany.mockResolvedValue([
      makeSub({
        id: "sub-1",
        appId: "app-1",
        billingCycle: "MONTHLY",
        amount: 30000,
      }),
      makeSub({
        id: "sub-2",
        appId: "app-1",
        billingCycle: "YEARLY",
        amount: 120000,
      }),
    ]);
    mockAccessFindMany.mockResolvedValue([]);

    const result = await getUnusedApps();

    expect(result.success).toBe(true);
    expect(result.data?.count).toBe(1); // 앱은 1개
    expect(result.data?.cost).toBe(40000); // 30000 + 120000/12
  });

  // ─── PER_SEAT 케이스 ─────────────────────────────────────────

  it("should calculate per-seat waste for PER_SEAT subscription", async () => {
    mockSubFindMany.mockResolvedValue([
      makeSub({
        billingType: "PER_SEAT",
        amount: 100000,
        perSeatPrice: 10000,
        assignedUsers: [
          { userId: "user-1" },
          { userId: "user-2" },
          { userId: "user-3" },
        ],
      }),
    ]);
    // user-1만 최근 접속, user-2/user-3은 미접속
    mockAccessFindMany.mockResolvedValue([
      { appId: "app-1", userId: "user-1" },
    ]);

    const result = await getUnusedApps();

    expect(result.success).toBe(true);
    expect(result.data?.cost).toBe(20000); // 2명 × 10000
    expect(result.data?.count).toBe(1);
  });

  it("should NOT count PER_SEAT subscription as wasted when all assigned users are active", async () => {
    mockSubFindMany.mockResolvedValue([
      makeSub({
        billingType: "PER_SEAT",
        perSeatPrice: 10000,
        assignedUsers: [{ userId: "user-1" }, { userId: "user-2" }],
      }),
    ]);
    mockAccessFindMany.mockResolvedValue([
      { appId: "app-1", userId: "user-1" },
      { appId: "app-1", userId: "user-2" },
    ]);

    const result = await getUnusedApps();

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ count: 0, cost: 0 });
  });

  // ─── ExtensionUsage 보완 케이스 ──────────────────────────────

  it("should NOT count subscription as unused when user has recent ExtensionUsage but no UserAppAccess", async () => {
    // UserAppAccess 없음 (로그인 이벤트 없음)
    mockAccessFindMany.mockResolvedValue([]);
    // 하지만 ExtensionUsage에는 브라우징 기록 있음 (이미 로그인된 상태로 사용)
    mockUsageFindMany.mockResolvedValue([
      { domain: "slack.com", userId: "user-1" },
    ]);
    mockSubFindMany.mockResolvedValue([makeSub()]);

    const result = await getUnusedApps();

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ count: 0, cost: 0 });
  });

  it("should reduce inactive count for PER_SEAT when ExtensionUsage covers missing UserAppAccess", async () => {
    mockSubFindMany.mockResolvedValue([
      makeSub({
        billingType: "PER_SEAT",
        perSeatPrice: 10000,
        assignedUsers: [
          { userId: "user-1" },
          { userId: "user-2" },
          { userId: "user-3" },
        ],
      }),
    ]);
    // user-1: UserAppAccess 있음
    mockAccessFindMany.mockResolvedValue([
      { appId: "app-1", userId: "user-1" },
    ]);
    // user-2: UserAppAccess 없지만 ExtensionUsage 있음
    // user-3: 둘 다 없음 → 미사용
    mockUsageFindMany.mockResolvedValue([
      { domain: "slack.com", userId: "user-2" },
    ]);

    const result = await getUnusedApps();

    expect(result.success).toBe(true);
    expect(result.data?.cost).toBe(10000); // user-3만 미사용 × 10000
    expect(result.data?.count).toBe(1);
  });

  it("should count subscription as unused when neither UserAppAccess nor ExtensionUsage has recent data", async () => {
    mockSubFindMany.mockResolvedValue([makeSub({ amount: 50000 })]);
    mockAccessFindMany.mockResolvedValue([]);
    mockUsageFindMany.mockResolvedValue([]); // 브라우징 기록도 없음

    const result = await getUnusedApps();

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ count: 1, cost: 50000 });
  });

  it("should not query ExtensionUsage when no app domain can be extracted", async () => {
    mockSubFindMany.mockResolvedValue([makeSub({ appWebsite: null })]);
    mockAccessFindMany.mockResolvedValue([]);

    await getUnusedApps();

    // domainToAppId가 비어있어 ExtensionUsage 쿼리 스킵
    expect(mockUsageFindMany).not.toHaveBeenCalled();
  });

  // ─── 에러 처리 ──────────────────────────────────────────────

  it("should return error state on failure", async () => {
    mockSubFindMany.mockRejectedValue(new Error("DB error"));

    const result = await getUnusedApps();

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
