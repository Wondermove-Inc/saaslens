// src/actions/budget-settings.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock modules before imports
vi.mock("@/lib/db", () => ({
  prisma: {
    organization: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    cardTransaction: {
      aggregate: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/require-auth", () => ({
  requireOrganization: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { DEFAULT_BUDGET_SETTINGS } from "@/types/budget";
import {
  getBudgetSettings,
  getMonthlyBudgetForChart,
  updateBudgetSettings,
} from "./budget-settings";

describe("budget-settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getBudgetSettings", () => {
    it("should return default settings when organization has no budget settings", async () => {
      vi.mocked(requireOrganization).mockResolvedValue({
        organizationId: "org-1",
        userId: "user-1",
        role: "ADMIN",
      } as any);

      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
        domain: null,
        logoUrl: null,
        settings: {},
        googleCustomerId: null,
        googlePrimaryDomain: null,
        inactiveThresholdMinutes: 30,
        extensionAutoDeployed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await getBudgetSettings();

      expect(result).toEqual(DEFAULT_BUDGET_SETTINGS);
    });

    it("should return saved budget settings when they exist", async () => {
      vi.mocked(requireOrganization).mockResolvedValue({
        organizationId: "org-1",
        userId: "user-1",
        role: "ADMIN",
      } as any);

      const savedSettings = {
        currency: "USD",
        monthlyBudget: 10000,
        alertThreshold: 90,
      };

      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
        domain: null,
        logoUrl: null,
        settings: { budget: savedSettings },
        googleCustomerId: null,
        googlePrimaryDomain: null,
        inactiveThresholdMinutes: 30,
        extensionAutoDeployed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await getBudgetSettings();

      expect(result).toEqual(savedSettings);
    });

    it("should merge with default settings for partial budget settings", async () => {
      vi.mocked(requireOrganization).mockResolvedValue({
        organizationId: "org-1",
        userId: "user-1",
        role: "ADMIN",
      } as any);

      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
        domain: null,
        logoUrl: null,
        settings: { budget: { currency: "EUR" } },
        googleCustomerId: null,
        googlePrimaryDomain: null,
        inactiveThresholdMinutes: 30,
        extensionAutoDeployed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await getBudgetSettings();

      expect(result.currency).toBe("EUR");
      expect(result.monthlyBudget).toBe(DEFAULT_BUDGET_SETTINGS.monthlyBudget);
      expect(result.alertThreshold).toBe(
        DEFAULT_BUDGET_SETTINGS.alertThreshold
      );
    });
  });

  describe("updateBudgetSettings", () => {
    it("should update budget settings successfully for admin", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          organizationId: "org-1",
          role: "ADMIN",
          email: "admin@test.com",
        },
        expires: new Date().toISOString(),
      } as any);

      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
        domain: null,
        logoUrl: null,
        settings: {},
        googleCustomerId: null,
        googlePrimaryDomain: null,
        inactiveThresholdMinutes: 30,
        extensionAutoDeployed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(prisma.organization.update).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
        domain: null,
        logoUrl: null,
        settings: {
          budget: { currency: "USD", monthlyBudget: 5000, alertThreshold: 80 },
        },
        googleCustomerId: null,
        googlePrimaryDomain: null,
        inactiveThresholdMinutes: 30,
        extensionAutoDeployed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await updateBudgetSettings({
        currency: "USD",
        monthlyBudget: 5000,
      });

      expect(result.success).toBe(true);
      expect(prisma.organization.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "org-1" },
        })
      );
    });

    it("should fail for non-admin users", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          organizationId: "org-1",
          role: "MEMBER",
          email: "member@test.com",
        },
        expires: new Date().toISOString(),
      } as any);

      const result = await updateBudgetSettings({
        monthlyBudget: 5000,
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("관리자 권한이 필요합니다");
    });

    it("should preserve existing settings when updating", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          organizationId: "org-1",
          role: "ADMIN",
          email: "admin@test.com",
        },
        expires: new Date().toISOString(),
      } as any);

      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
        domain: null,
        logoUrl: null,
        settings: {
          notifications: { emailEnabled: true },
          budget: {
            currency: "KRW",
            monthlyBudget: 1000000,
            alertThreshold: 80,
          },
        },
        googleCustomerId: null,
        googlePrimaryDomain: null,
        inactiveThresholdMinutes: 30,
        extensionAutoDeployed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(prisma.organization.update).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
        domain: null,
        logoUrl: null,
        settings: {},
        googleCustomerId: null,
        googlePrimaryDomain: null,
        inactiveThresholdMinutes: 30,
        extensionAutoDeployed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await updateBudgetSettings({ alertThreshold: 90 });

      expect(prisma.organization.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            settings: expect.objectContaining({
              notifications: { emailEnabled: true },
              budget: expect.objectContaining({
                currency: "KRW",
                monthlyBudget: 1000000,
                alertThreshold: 90,
              }),
            }),
          }),
        })
      );
    });
  });

  describe("getMonthlyBudgetForChart", () => {
    it("should return set budget when monthlyBudget is not null", async () => {
      const budgetSettings = {
        currency: "KRW" as const,
        monthlyBudget: 5000000,
        alertThreshold: 80,
      };

      const result = await getMonthlyBudgetForChart(
        "org-1",
        new Date("2024-03-15"),
        budgetSettings
      );

      expect(result).toBe(5000000);
      expect(prisma.cardTransaction.aggregate).not.toHaveBeenCalled();
    });

    it("should return previous month card transactions sum when monthlyBudget is null", async () => {
      const budgetSettings = {
        currency: "KRW" as const,
        monthlyBudget: null,
        alertThreshold: 80,
      };

      vi.mocked(prisma.cardTransaction.aggregate).mockResolvedValue({
        _sum: { useAmt: { toNumber: () => 3500000 } },
      } as any);

      const result = await getMonthlyBudgetForChart(
        "org-1",
        new Date("2024-03-15"),
        budgetSettings
      );

      expect(result).toBe(3500000);
      expect(prisma.cardTransaction.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "org-1",
            useDt: {
              gte: "20240201",
              lte: "20240231",
            },
          }),
        })
      );
    });

    it("should return 0 when no card transactions exist for previous month", async () => {
      const budgetSettings = {
        currency: "KRW" as const,
        monthlyBudget: null,
        alertThreshold: 80,
      };

      vi.mocked(prisma.cardTransaction.aggregate).mockResolvedValue({
        _sum: { useAmt: null },
      } as any);

      const result = await getMonthlyBudgetForChart(
        "org-1",
        new Date("2024-03-15"),
        budgetSettings
      );

      expect(result).toBe(0);
    });

    it("should handle year boundary correctly (January -> December)", async () => {
      const budgetSettings = {
        currency: "KRW" as const,
        monthlyBudget: null,
        alertThreshold: 80,
      };

      vi.mocked(prisma.cardTransaction.aggregate).mockResolvedValue({
        _sum: { useAmt: { toNumber: () => 2000000 } },
      } as any);

      await getMonthlyBudgetForChart(
        "org-1",
        new Date("2024-01-15"),
        budgetSettings
      );

      expect(prisma.cardTransaction.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            useDt: {
              gte: "20231201",
              lte: "20231231",
            },
          }),
        })
      );
    });
  });
});
