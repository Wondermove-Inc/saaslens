// src/actions/organization-notification-settings.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    organization: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock next/navigation redirect
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockedAuth = auth as any;

describe("Organization Notification Settings Server Actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockRedirect.mockClear();
  });

  describe("getOrganizationNotificationSettings", () => {
    it("인증되지 않은 경우 login으로 리다이렉트해야 한다", async () => {
      mockedAuth.mockResolvedValue(null);

      const { getOrganizationNotificationSettings } =
        await import("./organization-notification-settings");
      await expect(getOrganizationNotificationSettings()).rejects.toThrow(
        "NEXT_REDIRECT:/login"
      );
    });

    it("조직 ID가 없는 사용자는 onboarding으로 리다이렉트해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: null },
        expires: "",
      });

      const { getOrganizationNotificationSettings } =
        await import("./organization-notification-settings");
      await expect(getOrganizationNotificationSettings()).rejects.toThrow(
        "NEXT_REDIRECT:/onboarding"
      );
    });

    it("조직 알림 설정을 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
        expires: "",
      });

      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: "org-1",
        settings: {
          notifications: {
            emailEnabled: true,
            renewalAlertDays: [30, 60, 90],
            offboardingAlerts: true,
            weeklyDigest: false,
            shadowITAlerts: true,
            costAnomalyAlerts: true,
            costAnomalyThreshold: 50,
          },
        },
      } as never);

      const { getOrganizationNotificationSettings } =
        await import("./organization-notification-settings");
      const result = await getOrganizationNotificationSettings();

      expect(result).toEqual({
        emailEnabled: true,
        renewalAlertDays: [30, 60, 90],
        offboardingAlerts: true,
        weeklyDigest: false,
        shadowITAlerts: true,
        costAnomalyAlerts: true,
        costAnomalyThreshold: 50,
      });
    });

    it("설정이 없으면 기본값을 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
        expires: "",
      });

      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: "org-1",
        settings: {},
      } as never);

      const { getOrganizationNotificationSettings } =
        await import("./organization-notification-settings");
      const result = await getOrganizationNotificationSettings();

      expect(result).toEqual({
        emailEnabled: true,
        renewalAlertDays: [30],
        offboardingAlerts: true,
        weeklyDigest: false,
        shadowITAlerts: true,
        costAnomalyAlerts: true,
        costAnomalyThreshold: 50,
      });
    });

    it("조직이 없으면 기본값을 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
        expires: "",
      });

      vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);

      const { getOrganizationNotificationSettings } =
        await import("./organization-notification-settings");
      const result = await getOrganizationNotificationSettings();

      expect(result).toEqual({
        emailEnabled: true,
        renewalAlertDays: [30],
        offboardingAlerts: true,
        weeklyDigest: false,
        shadowITAlerts: true,
        costAnomalyAlerts: true,
        costAnomalyThreshold: 50,
      });
    });
  });

  describe("updateOrganizationNotificationSettings", () => {
    it("인증되지 않은 경우 login으로 리다이렉트해야 한다", async () => {
      mockedAuth.mockResolvedValue(null);

      const { updateOrganizationNotificationSettings } =
        await import("./organization-notification-settings");
      await expect(
        updateOrganizationNotificationSettings({ emailEnabled: true })
      ).rejects.toThrow("NEXT_REDIRECT:/login");
    });

    it("이메일 알림 설정을 업데이트해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
        expires: "",
      });

      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: "org-1",
        settings: {
          notifications: {
            emailEnabled: false,
            renewalAlertDays: [30],
            offboardingAlerts: true,
            weeklyDigest: false,
            shadowITAlerts: true,
            costAnomalyAlerts: true,
            costAnomalyThreshold: 50,
          },
        },
      } as never);

      vi.mocked(prisma.organization.update).mockResolvedValue({
        id: "org-1",
        settings: {
          notifications: {
            emailEnabled: true,
            renewalAlertDays: [30],
            offboardingAlerts: true,
            weeklyDigest: false,
            shadowITAlerts: true,
            costAnomalyAlerts: true,
            costAnomalyThreshold: 50,
          },
        },
      } as never);

      const { updateOrganizationNotificationSettings } =
        await import("./organization-notification-settings");
      const result = await updateOrganizationNotificationSettings({
        emailEnabled: true,
      });

      expect(result.success).toBe(true);
      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: "org-1" },
        data: {
          settings: {
            notifications: {
              emailEnabled: true,
              renewalAlertDays: [30],
              offboardingAlerts: true,
              weeklyDigest: false,
              shadowITAlerts: true,
              costAnomalyAlerts: true,
              costAnomalyThreshold: 50,
            },
          },
        },
      });
    });

    it("갱신 알림 일수를 업데이트해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
        expires: "",
      });

      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: "org-1",
        settings: {
          notifications: {
            emailEnabled: true,
            renewalAlertDays: [30],
            offboardingAlerts: true,
            weeklyDigest: false,
            shadowITAlerts: true,
            costAnomalyAlerts: true,
            costAnomalyThreshold: 50,
          },
        },
      } as never);

      vi.mocked(prisma.organization.update).mockResolvedValue({
        id: "org-1",
        settings: {
          notifications: {
            emailEnabled: true,
            renewalAlertDays: [30, 60, 90],
            offboardingAlerts: true,
            weeklyDigest: false,
            shadowITAlerts: true,
            costAnomalyAlerts: true,
            costAnomalyThreshold: 50,
          },
        },
      } as never);

      const { updateOrganizationNotificationSettings } =
        await import("./organization-notification-settings");
      const result = await updateOrganizationNotificationSettings({
        renewalAlertDays: [30, 60, 90],
      });

      expect(result.success).toBe(true);
      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: "org-1" },
        data: {
          settings: {
            notifications: {
              emailEnabled: true,
              renewalAlertDays: [30, 60, 90],
              offboardingAlerts: true,
              weeklyDigest: false,
              shadowITAlerts: true,
              costAnomalyAlerts: true,
              costAnomalyThreshold: 50,
            },
          },
        },
      });
    });

    it("퇴사자 알림 설정을 업데이트해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
        expires: "",
      });

      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: "org-1",
        settings: {
          notifications: {
            emailEnabled: true,
            renewalAlertDays: [30],
            offboardingAlerts: true,
            weeklyDigest: false,
            shadowITAlerts: true,
            costAnomalyAlerts: true,
            costAnomalyThreshold: 50,
          },
        },
      } as never);

      vi.mocked(prisma.organization.update).mockResolvedValue({
        id: "org-1",
        settings: {
          notifications: {
            emailEnabled: true,
            renewalAlertDays: [30],
            offboardingAlerts: false,
            weeklyDigest: false,
            shadowITAlerts: true,
            costAnomalyAlerts: true,
            costAnomalyThreshold: 50,
          },
        },
      } as never);

      const { updateOrganizationNotificationSettings } =
        await import("./organization-notification-settings");
      const result = await updateOrganizationNotificationSettings({
        offboardingAlerts: false,
      });

      expect(result.success).toBe(true);
      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: "org-1" },
        data: {
          settings: {
            notifications: {
              emailEnabled: true,
              renewalAlertDays: [30],
              offboardingAlerts: false,
              weeklyDigest: false,
              shadowITAlerts: true,
              costAnomalyAlerts: true,
              costAnomalyThreshold: 50,
            },
          },
        },
      });
    });

    it("주간 요약 설정을 업데이트해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
        expires: "",
      });

      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: "org-1",
        settings: {
          notifications: {
            emailEnabled: true,
            renewalAlertDays: [30],
            offboardingAlerts: true,
            weeklyDigest: false,
            shadowITAlerts: true,
            costAnomalyAlerts: true,
            costAnomalyThreshold: 50,
          },
        },
      } as never);

      vi.mocked(prisma.organization.update).mockResolvedValue({
        id: "org-1",
        settings: {
          notifications: {
            emailEnabled: true,
            renewalAlertDays: [30],
            offboardingAlerts: true,
            weeklyDigest: true,
            shadowITAlerts: true,
            costAnomalyAlerts: true,
            costAnomalyThreshold: 50,
          },
        },
      } as never);

      const { updateOrganizationNotificationSettings } =
        await import("./organization-notification-settings");
      const result = await updateOrganizationNotificationSettings({
        weeklyDigest: true,
      });

      expect(result.success).toBe(true);
      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: "org-1" },
        data: {
          settings: {
            notifications: {
              emailEnabled: true,
              renewalAlertDays: [30],
              offboardingAlerts: true,
              weeklyDigest: true,
              shadowITAlerts: true,
              costAnomalyAlerts: true,
              costAnomalyThreshold: 50,
            },
          },
        },
      });
    });

    it("업데이트 후 revalidatePath를 호출해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
        expires: "",
      });

      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: "org-1",
        settings: {},
      } as never);

      vi.mocked(prisma.organization.update).mockResolvedValue({
        id: "org-1",
        settings: {
          notifications: {
            emailEnabled: false,
            renewalAlertDays: [30],
            offboardingAlerts: true,
            weeklyDigest: false,
            shadowITAlerts: true,
            costAnomalyAlerts: true,
            costAnomalyThreshold: 50,
          },
        },
      } as never);

      const { updateOrganizationNotificationSettings } =
        await import("./organization-notification-settings");
      await updateOrganizationNotificationSettings({ emailEnabled: false });

      expect(revalidatePath).toHaveBeenCalledWith("/settings/notifications");
    });

    it("Shadow IT 알림 설정을 업데이트해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
        expires: "",
      });

      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: "org-1",
        settings: {
          notifications: {
            emailEnabled: true,
            renewalAlertDays: [30],
            offboardingAlerts: true,
            weeklyDigest: false,
            shadowITAlerts: true,
            costAnomalyAlerts: true,
            costAnomalyThreshold: 50,
          },
        },
      } as never);

      vi.mocked(prisma.organization.update).mockResolvedValue({
        id: "org-1",
        settings: {
          notifications: {
            emailEnabled: true,
            renewalAlertDays: [30],
            offboardingAlerts: true,
            weeklyDigest: false,
            shadowITAlerts: false,
            costAnomalyAlerts: true,
            costAnomalyThreshold: 50,
          },
        },
      } as never);

      const { updateOrganizationNotificationSettings } =
        await import("./organization-notification-settings");
      const result = await updateOrganizationNotificationSettings({
        shadowITAlerts: false,
      });

      expect(result.success).toBe(true);
      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: "org-1" },
        data: {
          settings: {
            notifications: {
              emailEnabled: true,
              renewalAlertDays: [30],
              offboardingAlerts: true,
              weeklyDigest: false,
              shadowITAlerts: false,
              costAnomalyAlerts: true,
              costAnomalyThreshold: 50,
            },
          },
        },
      });
    });

    it("비용 이상 알림 임계값을 업데이트해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
        expires: "",
      });

      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: "org-1",
        settings: {
          notifications: {
            emailEnabled: true,
            renewalAlertDays: [30],
            offboardingAlerts: true,
            weeklyDigest: false,
            shadowITAlerts: true,
            costAnomalyAlerts: true,
            costAnomalyThreshold: 50,
          },
        },
      } as never);

      vi.mocked(prisma.organization.update).mockResolvedValue({
        id: "org-1",
        settings: {
          notifications: {
            emailEnabled: true,
            renewalAlertDays: [30],
            offboardingAlerts: true,
            weeklyDigest: false,
            shadowITAlerts: true,
            costAnomalyAlerts: true,
            costAnomalyThreshold: 100,
          },
        },
      } as never);

      const { updateOrganizationNotificationSettings } =
        await import("./organization-notification-settings");
      const result = await updateOrganizationNotificationSettings({
        costAnomalyThreshold: 100,
      });

      expect(result.success).toBe(true);
      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: "org-1" },
        data: {
          settings: {
            notifications: {
              emailEnabled: true,
              renewalAlertDays: [30],
              offboardingAlerts: true,
              weeklyDigest: false,
              shadowITAlerts: true,
              costAnomalyAlerts: true,
              costAnomalyThreshold: 100,
            },
          },
        },
      });
    });

    it("관리자가 아닌 사용자는 에러를 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "MEMBER" },
        expires: "",
      });

      const { updateOrganizationNotificationSettings } =
        await import("./organization-notification-settings");
      const result = await updateOrganizationNotificationSettings({
        emailEnabled: true,
      });

      expect(result).toEqual({
        success: false,
        message: "관리자 권한이 필요합니다",
      });
    });
  });
});
