// src/actions/subscriptions.test.ts
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSubscription,
  deleteSubscription,
  getSubscription,
  getSubscriptions,
  updateSubscription,
} from "./subscriptions";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  prisma: {
    subscription: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    app: {
      findFirst: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock next/navigation redirect - Next.js redirect error has a digest property
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    const error = new Error(`NEXT_REDIRECT:${url}`);
    (error as Error & { digest: string }).digest = `NEXT_REDIRECT:${url}`;
    throw error;
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockedAuth = auth as any;

describe("Subscriptions Server Actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockRedirect.mockClear();
  });

  describe("getSubscriptions", () => {
    it("인증되지 않은 경우 login으로 리다이렉트해야 한다", async () => {
      mockedAuth.mockResolvedValue(null);

      await expect(getSubscriptions()).rejects.toThrow("NEXT_REDIRECT:/login");

      expect(mockRedirect).toHaveBeenCalledWith("/login");
    });

    it("organizationId가 없는 경우 onboarding으로 리다이렉트해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: null },
        expires: "",
      });

      await expect(getSubscriptions()).rejects.toThrow(
        "NEXT_REDIRECT:/onboarding"
      );

      expect(mockRedirect).toHaveBeenCalledWith("/onboarding");
    });

    it("구독 목록을 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
        expires: "",
      });

      const mockSubscriptions = [
        {
          id: "sub-1",
          appId: "app-1",
          status: "ACTIVE",
          billingCycle: "MONTHLY",
          amount: 10000,
          currency: "KRW",
          startDate: new Date("2024-01-01"),
          renewalDate: new Date("2024-02-01"),
          autoRenewal: true,
          app: {
            id: "app-1",
            name: "Slack",
            customLogoUrl: null,
            catalog: { logoUrl: "https://example.com/slack.png" },
          },
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        },
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(
        mockSubscriptions as never
      );
      vi.mocked(prisma.subscription.count).mockResolvedValue(1);

      const result = await getSubscriptions();

      expect(result.items).toHaveLength(1);
      expect(result.items[0].appName).toBe("Slack");
      expect(result.total).toBe(1);
    });

    it("필터 조건으로 구독을 조회해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
        expires: "",
      });

      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);
      vi.mocked(prisma.subscription.count).mockResolvedValue(0);

      await getSubscriptions({
        filter: { status: "ACTIVE", billingCycle: "MONTHLY" },
      });

      expect(prisma.subscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "org-1",
            status: "ACTIVE",
            billingCycle: "MONTHLY",
          }),
        })
      );
    });
  });

  describe("getSubscription", () => {
    it("구독 상세 정보를 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
        expires: "",
      });

      const mockSubscription = {
        id: "sub-1",
        appId: "app-1",
        status: "ACTIVE",
        billingCycle: "MONTHLY",
        amount: 10000,
        currency: "KRW",
        startDate: new Date("2024-01-01"),
        renewalDate: new Date("2024-02-01"),
        notes: "테스트 메모",
        app: {
          id: "app-1",
          name: "Slack",
          customLogoUrl: "https://example.com/custom.png",
          catalog: null,
        },
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(
        mockSubscription as never
      );

      const result = await getSubscription("sub-1");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("sub-1");
      expect(result?.appName).toBe("Slack");
    });

    it("존재하지 않는 구독은 null을 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
        expires: "",
      });

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);

      const result = await getSubscription("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("createSubscription", () => {
    it("인증되지 않은 경우 login으로 리다이렉트해야 한다", async () => {
      mockedAuth.mockResolvedValue(null);

      const formData = new FormData();
      formData.append("appId", "app-1");
      formData.append("amount", "10000");
      formData.append("billingCycle", "MONTHLY");
      formData.append("startDate", "2024-01-01");

      await expect(
        createSubscription({ success: false }, formData)
      ).rejects.toThrow("NEXT_REDIRECT:/login");

      expect(mockRedirect).toHaveBeenCalledWith("/login");
    });

    it("필수 필드가 없으면 에러를 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
        expires: "",
      });

      const formData = new FormData();
      formData.append("appId", "app-1");

      const result = await createSubscription({ success: false }, formData);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it("앱이 존재하지 않으면 에러를 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
        expires: "",
      });

      vi.mocked(prisma.app.findFirst).mockResolvedValue(null);

      const formData = new FormData();
      formData.append("appId", "non-existent");
      formData.append("amount", "10000");
      formData.append("billingCycle", "MONTHLY");
      formData.append("startDate", "2024-01-01");

      const result = await createSubscription({ success: false }, formData);

      expect(result.success).toBe(false);
      expect(result.message).toBe("앱을 찾을 수 없습니다");
    });

    it("구독을 성공적으로 생성해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
        expires: "",
      });

      vi.mocked(prisma.app.findFirst).mockResolvedValue({
        id: "app-1",
        name: "Slack",
        organizationId: "org-1",
      } as never);

      vi.mocked(prisma.subscription.create).mockResolvedValue({
        id: "sub-1",
        appId: "app-1",
        status: "ACTIVE",
      } as never);

      const formData = new FormData();
      formData.append("appId", "app-1");
      formData.append("amount", "10000");
      formData.append("billingCycle", "MONTHLY");
      formData.append("startDate", "2024-01-01");

      const result = await createSubscription({ success: false }, formData);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe("sub-1");
      expect(prisma.subscription.create).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith("/subscriptions");
    });
  });

  describe("updateSubscription", () => {
    it("인증되지 않은 경우 login으로 리다이렉트해야 한다", async () => {
      mockedAuth.mockResolvedValue(null);

      const formData = new FormData();
      formData.append("amount", "20000");

      await expect(
        updateSubscription("sub-1", { success: false }, formData)
      ).rejects.toThrow("NEXT_REDIRECT:/login");

      expect(mockRedirect).toHaveBeenCalledWith("/login");
    });

    it("구독이 존재하지 않으면 에러를 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
        expires: "",
      });

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);

      const formData = new FormData();
      formData.append("amount", "20000");
      formData.append("billingCycle", "MONTHLY");
      formData.append("startDate", "2024-01-01");

      const result = await updateSubscription(
        "non-existent",
        { success: false },
        formData
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe("구독을 찾을 수 없습니다");
    });

    it("구독 정보를 성공적으로 수정해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
        expires: "",
      });

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "sub-1",
        appId: "app-1",
        organizationId: "org-1",
        status: "ACTIVE",
      } as never);

      vi.mocked(prisma.subscription.update).mockResolvedValue({
        id: "sub-1",
        amount: 20000,
      } as never);

      const formData = new FormData();
      formData.append("amount", "20000");
      formData.append("billingCycle", "MONTHLY");
      formData.append("startDate", "2024-01-01");

      const result = await updateSubscription(
        "sub-1",
        { success: false },
        formData
      );

      expect(result.success).toBe(true);
      expect(prisma.subscription.update).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe("deleteSubscription", () => {
    it("인증되지 않은 경우 login으로 리다이렉트해야 한다", async () => {
      mockedAuth.mockResolvedValue(null);

      await expect(deleteSubscription("sub-1")).rejects.toThrow(
        "NEXT_REDIRECT:/login"
      );

      expect(mockRedirect).toHaveBeenCalledWith("/login");
    });

    it("구독이 존재하지 않으면 에러를 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
        expires: "",
      });

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);

      const result = await deleteSubscription("non-existent");

      expect(result.success).toBe(false);
      expect(result.message).toBe("구독을 찾을 수 없습니다");
    });

    it("구독을 성공적으로 삭제해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
        expires: "",
      });

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "sub-1",
        appId: "app-1",
        organizationId: "org-1",
        app: { name: "Slack" },
      } as never);

      vi.mocked(prisma.subscription.delete).mockResolvedValue({
        id: "sub-1",
      } as never);

      const result = await deleteSubscription("sub-1");

      expect(result.success).toBe(true);
      expect(prisma.subscription.delete).toHaveBeenCalledWith({
        where: { id: "sub-1" },
      });
      expect(prisma.auditLog.create).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith("/subscriptions");
    });
  });

  describe("getRenewalCalendar", () => {
    it("should redirect when not authenticated", async () => {
      mockedAuth.mockResolvedValue(null);

      const { getRenewalCalendar } = await import("./subscriptions");
      await expect(getRenewalCalendar(2024, 12)).rejects.toThrow(
        "NEXT_REDIRECT:/login"
      );
    });

    it("should return calendar data grouped by date", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
        expires: "",
      });

      const mockSubscriptions = [
        {
          id: "sub-1",
          appId: "app-1",
          app: { name: "Slack", logo: null },
          planName: "Pro",
          amount: { toNumber: () => 10000 },
          currency: "KRW",
          renewalDate: new Date("2024-12-15"),
          status: "ACTIVE",
        },
        {
          id: "sub-2",
          appId: "app-2",
          app: { name: "Notion", logo: "https://notion.so/logo.png" },
          planName: "Team",
          amount: { toNumber: () => 20000 },
          currency: "KRW",
          renewalDate: new Date("2024-12-15"),
          status: "ACTIVE",
        },
        {
          id: "sub-3",
          appId: "app-3",
          app: { name: "Figma", logo: null },
          planName: null,
          amount: { toNumber: () => 15000 },
          currency: "KRW",
          renewalDate: new Date("2024-12-25"),
          status: "ACTIVE",
        },
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(
        mockSubscriptions as never
      );

      const { getRenewalCalendar } = await import("./subscriptions");
      const result = await getRenewalCalendar(2024, 12);

      expect(result.year).toBe(2024);
      expect(result.month).toBe(12);
      expect(result.renewals["2024-12-15"]).toHaveLength(2);
      expect(result.renewals["2024-12-25"]).toHaveLength(1);
      expect(result.renewals["2024-12-15"][0].appName).toBe("Slack");
    });

    it("should filter by date range for the month", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
        expires: "",
      });

      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      const { getRenewalCalendar } = await import("./subscriptions");
      await getRenewalCalendar(2024, 12);

      expect(prisma.subscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "org-1",
            renewalDate: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        })
      );
    });
  });

  describe("getRenewalsByDate", () => {
    it("should redirect when not authenticated", async () => {
      mockedAuth.mockResolvedValue(null);

      const { getRenewalsByDate } = await import("./subscriptions");
      await expect(getRenewalsByDate("2024-12-15")).rejects.toThrow(
        "NEXT_REDIRECT:/login"
      );
    });

    it("should return renewals for specific date", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
        expires: "",
      });

      const mockSubscriptions = [
        {
          id: "sub-1",
          appId: "app-1",
          app: { name: "Slack", logo: null },
          planName: "Pro",
          amount: { toNumber: () => 10000 },
          currency: "KRW",
          renewalDate: new Date("2024-12-15"),
          status: "ACTIVE",
        },
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(
        mockSubscriptions as never
      );

      const { getRenewalsByDate } = await import("./subscriptions");
      const result = await getRenewalsByDate("2024-12-15");

      expect(result.date).toBe("2024-12-15");
      expect(result.renewals).toHaveLength(1);
      expect(result.renewals[0].appName).toBe("Slack");
    });
  });
});
