// src/services/subscription.service.test.ts
// TDD RED → GREEN: Subscription 서비스 레이어 테스트
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    app: {
      findFirst: vi.fn(),
    },
    subscription: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";
import {
  createSubscription,
  deleteSubscription,
  updateSubscription,
  type SubscriptionServiceContext,
} from "./subscription.service";

const mockCtx: SubscriptionServiceContext = {
  organizationId: "org-1",
  userId: "user-1",
  role: "ADMIN",
};

describe("SubscriptionService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // ==================== createSubscription ====================
  describe("createSubscription", () => {
    it("정상적으로 구독을 생성해야 한다", async () => {
      vi.mocked(prisma.app.findFirst).mockResolvedValue({
        id: "app-1",
        name: "Slack",
        organizationId: "org-1",
      } as never);
      vi.mocked(prisma.subscription.create).mockResolvedValue({
        id: "sub-new",
        appId: "app-1",
      } as never);

      const result = await createSubscription(mockCtx, {
        appId: "app-1",
        billingCycle: "MONTHLY",
        amount: "20000",
        startDate: "2026-04-01",
      });

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe("sub-new");
      expect(prisma.subscription.create).toHaveBeenCalledOnce();
      expect(prisma.auditLog.create).toHaveBeenCalledOnce();
    });

    it("존재하지 않는 앱이면 실패해야 한다", async () => {
      vi.mocked(prisma.app.findFirst).mockResolvedValue(null);

      const result = await createSubscription(mockCtx, {
        appId: "nonexistent",
        billingCycle: "MONTHLY",
        amount: "20000",
        startDate: "2026-04-01",
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("앱을 찾을 수 없습니다");
    });

    it("VIEWER 권한이면 실패해야 한다", async () => {
      const viewerCtx = { ...mockCtx, role: "VIEWER" };

      const result = await createSubscription(viewerCtx, {
        appId: "app-1",
        billingCycle: "MONTHLY",
        amount: "20000",
        startDate: "2026-04-01",
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("권한");
    });

    it("선택 필드를 포함하여 생성해야 한다", async () => {
      vi.mocked(prisma.app.findFirst).mockResolvedValue({
        id: "app-1",
        name: "Slack",
        organizationId: "org-1",
      } as never);
      vi.mocked(prisma.subscription.create).mockResolvedValue({
        id: "sub-new",
        appId: "app-1",
      } as never);

      const result = await createSubscription(mockCtx, {
        appId: "app-1",
        billingCycle: "YEARLY",
        billingType: "PER_SEAT",
        amount: "240000",
        currency: "USD",
        startDate: "2026-04-01",
        endDate: "2027-03-31",
        totalLicenses: 50,
        autoRenewal: false,
        notes: "연간 계약",
      });

      expect(result.success).toBe(true);
      expect(prisma.subscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            billingCycle: "YEARLY",
            billingType: "PER_SEAT",
            amount: 240000,
            currency: "USD",
            totalLicenses: 50,
            autoRenewal: false,
            notes: "연간 계약",
          }),
        })
      );
    });
  });

  // ==================== updateSubscription ====================
  describe("updateSubscription", () => {
    it("정상적으로 구독을 수정해야 한다", async () => {
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "sub-1",
        appId: "app-1",
        status: "ACTIVE",
        billingCycle: "MONTHLY",
        billingType: "FLAT_RATE",
        amount: 20000,
        currency: "KRW",
        organizationId: "org-1",
      } as never);
      vi.mocked(prisma.subscription.update).mockResolvedValue({
        id: "sub-1",
        amount: 25000,
      } as never);

      const result = await updateSubscription(mockCtx, "sub-1", {
        amount: "25000",
      });

      expect(result.success).toBe(true);
      expect(prisma.subscription.update).toHaveBeenCalledOnce();
    });

    it("존재하지 않는 구독이면 실패해야 한다", async () => {
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);

      const result = await updateSubscription(mockCtx, "nonexistent", {
        amount: "25000",
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("찾을 수 없습니다");
    });

    it("ADMIN이 아니면 실패해야 한다", async () => {
      const memberCtx = { ...mockCtx, role: "MEMBER" };

      const result = await updateSubscription(memberCtx, "sub-1", {
        amount: "25000",
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("권한");
    });

    it("상태 변경이 가능해야 한다", async () => {
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "sub-1",
        appId: "app-1",
        status: "ACTIVE",
        organizationId: "org-1",
      } as never);
      vi.mocked(prisma.subscription.update).mockResolvedValue({
        id: "sub-1",
        status: "CANCELLED",
      } as never);

      const result = await updateSubscription(mockCtx, "sub-1", {
        status: "CANCELLED",
      });

      expect(result.success).toBe(true);
      expect(prisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "CANCELLED",
          }),
        })
      );
    });
  });

  // ==================== deleteSubscription ====================
  describe("deleteSubscription", () => {
    it("정상적으로 구독을 삭제해야 한다", async () => {
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "sub-1",
        organizationId: "org-1",
        app: { name: "Slack" },
      } as never);

      const result = await deleteSubscription(mockCtx, "sub-1");

      expect(result.success).toBe(true);
      expect(prisma.subscription.delete).toHaveBeenCalledWith({
        where: { id: "sub-1" },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledOnce();
    });

    it("존재하지 않는 구독이면 실패해야 한다", async () => {
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);

      const result = await deleteSubscription(mockCtx, "nonexistent");

      expect(result.success).toBe(false);
      expect(result.message).toContain("찾을 수 없습니다");
    });

    it("ADMIN이 아니면 실패해야 한다", async () => {
      const memberCtx = { ...mockCtx, role: "MEMBER" };

      const result = await deleteSubscription(memberCtx, "sub-1");

      expect(result.success).toBe(false);
      expect(result.message).toContain("권한");
    });
  });
});
