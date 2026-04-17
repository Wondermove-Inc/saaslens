// src/actions/renewal-alerts.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock modules
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    renewalAlert: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    subscription: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
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

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  createRenewalAlert,
  deleteRenewalAlert,
  generateRenewalAlerts,
  getRenewalAlerts,
  markAlertAsSent,
} from "./renewal-alerts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockedAuth = auth as any;

describe("RenewalAlert Server Actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockRedirect.mockClear();
  });

  describe("getRenewalAlerts", () => {
    it("인증되지 않은 경우 /login으로 리다이렉트해야 한다", async () => {
      mockedAuth.mockResolvedValue(null);

      await expect(getRenewalAlerts()).rejects.toThrow("NEXT_REDIRECT");
      expect(mockRedirect).toHaveBeenCalledWith("/login");
    });

    it("갱신 알림 목록을 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
        expires: "",
      });

      const mockAlerts = [
        {
          id: "alert-1",
          subscriptionId: "sub-1",
          alertType: "DAYS_30",
          scheduledFor: new Date("2024-01-15"),
          sentAt: null,
          createdAt: new Date("2024-01-01"),
          subscription: {
            id: "sub-1",
            app: { name: "Slack" },
            renewalDate: new Date("2024-02-15"),
            amount: 10000,
            currency: "KRW",
          },
        },
      ];

      vi.mocked(prisma.renewalAlert.findMany).mockResolvedValue(
        mockAlerts as never
      );

      const result = await getRenewalAlerts();

      expect(result).toHaveLength(1);
      expect(result[0].alertType).toBe("DAYS_30");
      expect(result[0].subscription.app.name).toBe("Slack");
    });

    it("미발송 알림만 필터링할 수 있어야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
        expires: "",
      });

      vi.mocked(prisma.renewalAlert.findMany).mockResolvedValue([]);

      await getRenewalAlerts({ sentOnly: false });

      expect(prisma.renewalAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sentAt: null,
          }),
        })
      );
    });
  });

  describe("createRenewalAlert", () => {
    it("인증되지 않은 경우 에러를 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue(null);

      const result = await createRenewalAlert({
        subscriptionId: "sub-1",
        alertType: "DAYS_30",
        scheduledFor: new Date("2024-01-15"),
      });

      await expect(result.success).toBe(false);
    });

    it("존재하지 않는 구독이면 에러를 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
        expires: "",
      });

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);

      const result = await createRenewalAlert({
        subscriptionId: "non-existent",
        alertType: "DAYS_30",
        scheduledFor: new Date("2024-01-15"),
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("구독을 찾을 수 없습니다");
    });

    it("갱신 알림을 성공적으로 생성해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
        expires: "",
      });

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "sub-1",
        organizationId: "org-1",
      } as never);

      vi.mocked(prisma.renewalAlert.create).mockResolvedValue({
        id: "alert-1",
        subscriptionId: "sub-1",
        alertType: "DAYS_30",
        scheduledFor: new Date("2024-01-15"),
        sentAt: null,
        createdAt: new Date(),
      } as never);

      const result = await createRenewalAlert({
        subscriptionId: "sub-1",
        alertType: "DAYS_30",
        scheduledFor: new Date("2024-01-15"),
      });

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe("alert-1");
    });
  });

  describe("markAlertAsSent", () => {
    it("알림을 발송 완료로 표시해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
        expires: "",
      });

      vi.mocked(prisma.renewalAlert.findFirst).mockResolvedValue({
        id: "alert-1",
        subscriptionId: "sub-1",
        subscription: { organizationId: "org-1" },
      } as never);

      vi.mocked(prisma.renewalAlert.update).mockResolvedValue({
        id: "alert-1",
        sentAt: new Date(),
      } as never);

      const result = await markAlertAsSent("alert-1");

      expect(result.success).toBe(true);
      expect(prisma.renewalAlert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "alert-1" },
          data: expect.objectContaining({
            sentAt: expect.any(Date),
          }),
        })
      );
    });

    it("존재하지 않는 알림이면 에러를 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
        expires: "",
      });

      vi.mocked(prisma.renewalAlert.findFirst).mockResolvedValue(null);

      const result = await markAlertAsSent("non-existent");

      expect(result.success).toBe(false);
      expect(result.message).toBe("알림을 찾을 수 없습니다");
    });
  });

  describe("deleteRenewalAlert", () => {
    it("관리자가 아니면 에러를 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "MEMBER" },
        expires: "",
      });

      const result = await deleteRenewalAlert("alert-1");

      expect(result.success).toBe(false);
      expect(result.message).toBe("관리자 권한이 필요합니다");
    });

    it("갱신 알림을 삭제해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
        expires: "",
      });

      vi.mocked(prisma.renewalAlert.findFirst).mockResolvedValue({
        id: "alert-1",
        subscription: { organizationId: "org-1" },
      } as never);

      vi.mocked(prisma.renewalAlert.delete).mockResolvedValue({} as never);

      const result = await deleteRenewalAlert("alert-1");

      expect(result.success).toBe(true);
      expect(prisma.renewalAlert.delete).toHaveBeenCalledWith({
        where: { id: "alert-1" },
      });
    });
  });

  describe("generateRenewalAlerts", () => {
    it("관리자가 아니면 에러를 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "MEMBER" },
        expires: "",
      });

      const result = await generateRenewalAlerts();

      expect(result.success).toBe(false);
      expect(result.message).toBe("관리자 권한이 필요합니다");
    });

    it("갱신 예정 구독에 대해 알림을 생성해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
        expires: "",
      });

      const renewalDate = new Date();
      renewalDate.setDate(renewalDate.getDate() + 25); // 25일 후 갱신

      vi.mocked(prisma.subscription.findMany).mockResolvedValue([
        {
          id: "sub-1",
          renewalDate,
          renewalAlert30: true,
          renewalAlert60: false,
          renewalAlert90: false,
          renewalAlerts: [],
        },
      ] as never);

      vi.mocked(prisma.renewalAlert.createMany).mockResolvedValue({
        count: 1,
      } as never);

      const result = await generateRenewalAlerts();

      expect(result.success).toBe(true);
      expect(result.data?.created).toBeGreaterThanOrEqual(0);
    });
  });
});
