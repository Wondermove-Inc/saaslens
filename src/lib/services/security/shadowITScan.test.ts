// src/lib/services/security/shadowITScan.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Prisma mock - must be defined before imports
vi.mock("@/lib/db", () => ({
  prisma: {
    organization: {
      findMany: vi.fn(),
    },
    app: {
      findMany: vi.fn(),
    },
    cardTransaction: {
      findMany: vi.fn(),
    },
  },
}));

// Email mock
vi.mock("@/lib/services/notification/securityAlert", () => ({
  sendShadowITAlertEmail: vi.fn(),
}));

import { prisma } from "@/lib/db";
import { sendShadowITAlertEmail } from "@/lib/services/notification/securityAlert";
import { processShadowITScan } from "./shadowITScan";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockOrgFindMany = prisma.organization.findMany as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAppFindMany = prisma.app.findMany as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockCardTransactionFindMany = prisma.cardTransaction.findMany as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSendEmail = sendShadowITAlertEmail as any;

describe("shadowITScan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("processShadowITScan", () => {
    it("should return success when no organizations exist", async () => {
      mockOrgFindMany.mockResolvedValueOnce([]);

      const result = await processShadowITScan();

      expect(result.success).toBe(true);
      expect(result.processedOrganizations).toBe(0);
      expect(result.totalShadowApps).toBe(0);
      expect(result.emailsSent).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect Shadow IT apps from card transactions", async () => {
      // Setup organizations
      mockOrgFindMany.mockResolvedValueOnce([
        {
          id: "org-1",
          name: "Test Org",
          settings: {
            notifications: {
              emailEnabled: true,
              shadowITAlerts: true,
            },
          },
          users: [{ email: "admin@test.com" }],
        } as never,
      ]);

      // No approved apps
      mockAppFindMany.mockResolvedValueOnce([]);

      // Transactions with AI tool keywords
      mockCardTransactionFindMany.mockResolvedValueOnce([
        {
          useStore: "OPENAI API SUBSCRIPTION",
          createdAt: new Date("2024-01-15"),
        } as never,
        {
          useStore: "GITHUB COPILOT PRO",
          createdAt: new Date("2024-01-14"),
        } as never,
        {
          useStore: "STARBUCKS COFFEE",
          createdAt: new Date("2024-01-13"),
        } as never,
      ]);

      mockSendEmail.mockResolvedValueOnce({ success: true });

      const result = await processShadowITScan();

      expect(result.success).toBe(true);
      expect(result.processedOrganizations).toBe(1);
      expect(result.totalShadowApps).toBe(2); // OPENAI, GITHUB COPILOT
      expect(result.emailsSent).toBe(1);

      // Verify email was sent with correct data
      expect(mockSendEmail).toHaveBeenCalledWith({
        to: "admin@test.com",
        organizationName: "Test Org",
        shadowApps: expect.arrayContaining([
          expect.objectContaining({ name: "OPENAI" }),
          expect.objectContaining({ name: "GITHUB COPILOT" }),
        ]),
      });
    });

    it("should skip organization when shadowITAlerts is disabled", async () => {
      mockOrgFindMany.mockResolvedValueOnce([
        {
          id: "org-1",
          name: "Test Org",
          settings: {
            notifications: {
              emailEnabled: true,
              shadowITAlerts: false, // Disabled
            },
          },
          users: [{ email: "admin@test.com" }],
        } as never,
      ]);

      const result = await processShadowITScan();

      expect(result.success).toBe(true);
      expect(mockAppFindMany).not.toHaveBeenCalled();
      expect(mockCardTransactionFindMany).not.toHaveBeenCalled();
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("should skip organization when emailEnabled is disabled", async () => {
      mockOrgFindMany.mockResolvedValueOnce([
        {
          id: "org-1",
          name: "Test Org",
          settings: {
            notifications: {
              emailEnabled: false, // Disabled
              shadowITAlerts: true,
            },
          },
          users: [{ email: "admin@test.com" }],
        } as never,
      ]);

      const result = await processShadowITScan();

      expect(result.success).toBe(true);
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("should add error when organization has no admins", async () => {
      mockOrgFindMany.mockResolvedValueOnce([
        {
          id: "org-1",
          name: "Test Org",
          settings: {
            notifications: {
              emailEnabled: true,
              shadowITAlerts: true,
            },
          },
          users: [], // No admins
        } as never,
      ]);

      const result = await processShadowITScan();

      expect(result.success).toBe(true);
      expect(result.errors).toContain("org-1: 관리자 없음");
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("should not detect apps that are already approved", async () => {
      mockOrgFindMany.mockResolvedValueOnce([
        {
          id: "org-1",
          name: "Test Org",
          settings: {
            notifications: {
              emailEnabled: true,
              shadowITAlerts: true,
            },
          },
          users: [{ email: "admin@test.com" }],
        } as never,
      ]);

      // OpenAI is approved
      mockAppFindMany.mockResolvedValueOnce([{ name: "OpenAI" } as never]);

      // Transaction with OpenAI
      mockCardTransactionFindMany.mockResolvedValueOnce([
        {
          useStore: "OPENAI API SUBSCRIPTION",
          createdAt: new Date("2024-01-15"),
        } as never,
      ]);

      const result = await processShadowITScan();

      expect(result.success).toBe(true);
      expect(result.totalShadowApps).toBe(0); // Approved, so not shadow
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("should handle multiple transactions for same AI tool", async () => {
      mockOrgFindMany.mockResolvedValueOnce([
        {
          id: "org-1",
          name: "Test Org",
          settings: {
            notifications: {
              emailEnabled: true,
              shadowITAlerts: true,
            },
          },
          users: [{ email: "admin@test.com" }],
        } as never,
      ]);

      mockAppFindMany.mockResolvedValueOnce([]);

      // Multiple transactions for same tool
      mockCardTransactionFindMany.mockResolvedValueOnce([
        {
          useStore: "CHATGPT PLUS",
          createdAt: new Date("2024-01-15"),
        } as never,
        { useStore: "CHATGPT API", createdAt: new Date("2024-01-14") } as never,
        {
          useStore: "OPENAI CHATGPT",
          createdAt: new Date("2024-01-13"),
        } as never,
      ]);

      mockSendEmail.mockResolvedValueOnce({ success: true });

      const result = await processShadowITScan();

      expect(result.success).toBe(true);
      expect(result.totalShadowApps).toBe(2); // CHATGPT and OPENAI (different keywords)
    });

    it("should send emails to all admins", async () => {
      mockOrgFindMany.mockResolvedValueOnce([
        {
          id: "org-1",
          name: "Test Org",
          settings: {
            notifications: {
              emailEnabled: true,
              shadowITAlerts: true,
            },
          },
          users: [
            { email: "admin1@test.com" },
            { email: "admin2@test.com" },
            { email: "admin3@test.com" },
          ],
        } as never,
      ]);

      mockAppFindMany.mockResolvedValueOnce([]);
      mockCardTransactionFindMany.mockResolvedValueOnce([
        { useStore: "MIDJOURNEY", createdAt: new Date() } as never,
      ]);

      mockSendEmail.mockResolvedValue({ success: true });

      const result = await processShadowITScan();

      expect(result.success).toBe(true);
      expect(result.emailsSent).toBe(3);
      expect(mockSendEmail).toHaveBeenCalledTimes(3);
    });

    it("should handle email sending failures", async () => {
      mockOrgFindMany.mockResolvedValueOnce([
        {
          id: "org-1",
          name: "Test Org",
          settings: {
            notifications: {
              emailEnabled: true,
              shadowITAlerts: true,
            },
          },
          users: [{ email: "admin@test.com" }],
        } as never,
      ]);

      mockAppFindMany.mockResolvedValueOnce([]);
      mockCardTransactionFindMany.mockResolvedValueOnce([
        { useStore: "CLAUDE API", createdAt: new Date() } as never,
      ]);

      mockSendEmail.mockResolvedValueOnce({
        success: false,
        error: "SMTP connection failed",
      });

      const result = await processShadowITScan();

      expect(result.success).toBe(true);
      expect(result.emailsSent).toBe(0);
      expect(result.errors).toContain(
        "org-1: 이메일 발송 실패 (admin@test.com) - SMTP connection failed"
      );
    });

    it("should handle organization processing errors", async () => {
      mockOrgFindMany.mockResolvedValueOnce([
        {
          id: "org-1",
          name: "Test Org",
          settings: {
            notifications: {
              emailEnabled: true,
              shadowITAlerts: true,
            },
          },
          users: [{ email: "admin@test.com" }],
        } as never,
      ]);

      // Throw error when fetching apps
      mockAppFindMany.mockRejectedValueOnce(
        new Error("Database connection failed")
      );

      const result = await processShadowITScan();

      expect(result.success).toBe(true); // Overall success (error is per-org)
      expect(result.errors).toContain("org-1: Database connection failed");
    });

    it("should handle global errors", async () => {
      mockOrgFindMany.mockRejectedValueOnce(new Error("Global DB error"));

      const result = await processShadowITScan();

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Global DB error");
    });

    it("should process multiple organizations", async () => {
      mockOrgFindMany.mockResolvedValueOnce([
        {
          id: "org-1",
          name: "Org 1",
          settings: {
            notifications: { emailEnabled: true, shadowITAlerts: true },
          },
          users: [{ email: "admin1@test.com" }],
        } as never,
        {
          id: "org-2",
          name: "Org 2",
          settings: {
            notifications: { emailEnabled: true, shadowITAlerts: true },
          },
          users: [{ email: "admin2@test.com" }],
        } as never,
      ]);

      // Org 1: 1 shadow app
      mockAppFindMany.mockResolvedValueOnce([]);
      mockCardTransactionFindMany.mockResolvedValueOnce([
        { useStore: "PERPLEXITY", createdAt: new Date() } as never,
      ]);

      // Org 2: 2 shadow apps
      mockAppFindMany.mockResolvedValueOnce([]);
      mockCardTransactionFindMany.mockResolvedValueOnce([
        { useStore: "TABNINE", createdAt: new Date() } as never,
        { useStore: "CURSOR AI", createdAt: new Date() } as never,
      ]);

      mockSendEmail.mockResolvedValue({ success: true });

      const result = await processShadowITScan();

      expect(result.success).toBe(true);
      expect(result.processedOrganizations).toBe(2);
      expect(result.totalShadowApps).toBe(3); // 1 + 2
      expect(result.emailsSent).toBe(2);
    });

    it("should skip non-AI tool transactions", async () => {
      mockOrgFindMany.mockResolvedValueOnce([
        {
          id: "org-1",
          name: "Test Org",
          settings: {
            notifications: { emailEnabled: true, shadowITAlerts: true },
          },
          users: [{ email: "admin@test.com" }],
        } as never,
      ]);

      mockAppFindMany.mockResolvedValueOnce([]);
      mockCardTransactionFindMany.mockResolvedValueOnce([
        { useStore: "STARBUCKS COFFEE", createdAt: new Date() } as never,
        { useStore: "OFFICE DEPOT", createdAt: new Date() } as never,
        { useStore: "UBER EATS", createdAt: new Date() } as never,
      ]);

      const result = await processShadowITScan();

      expect(result.success).toBe(true);
      expect(result.totalShadowApps).toBe(0);
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("should use default settings when notifications object is missing", async () => {
      mockOrgFindMany.mockResolvedValueOnce([
        {
          id: "org-1",
          name: "Test Org",
          settings: {}, // No notifications settings
          users: [{ email: "admin@test.com" }],
        } as never,
      ]);

      mockAppFindMany.mockResolvedValueOnce([]);
      mockCardTransactionFindMany.mockResolvedValueOnce([
        { useStore: "ELEVENLABS", createdAt: new Date() } as never,
      ]);

      mockSendEmail.mockResolvedValueOnce({ success: true });

      const result = await processShadowITScan();

      // Default is enabled
      expect(result.success).toBe(true);
      expect(result.totalShadowApps).toBe(1);
      expect(result.emailsSent).toBe(1);
    });

    it("should use default settings when settings is null", async () => {
      mockOrgFindMany.mockResolvedValueOnce([
        {
          id: "org-1",
          name: "Test Org",
          settings: null,
          users: [{ email: "admin@test.com" }],
        } as never,
      ]);

      mockAppFindMany.mockResolvedValueOnce([]);
      mockCardTransactionFindMany.mockResolvedValueOnce([
        { useStore: "SYNTHESIA", createdAt: new Date() } as never,
      ]);

      mockSendEmail.mockResolvedValueOnce({ success: true });

      const result = await processShadowITScan();

      expect(result.success).toBe(true);
      expect(result.totalShadowApps).toBe(1);
      expect(mockSendEmail).toHaveBeenCalled();
    });

    it("should detect various AI tool keywords", async () => {
      mockOrgFindMany.mockResolvedValueOnce([
        {
          id: "org-1",
          name: "Test Org",
          settings: {
            notifications: { emailEnabled: true, shadowITAlerts: true },
          },
          users: [{ email: "admin@test.com" }],
        } as never,
      ]);

      mockAppFindMany.mockResolvedValueOnce([]);

      // Various AI tools
      const transactions = [
        "ANTHROPIC API",
        "DALL-E 3",
        "BARD SUBSCRIPTION",
        "GEMINI API",
        "JASPER AI",
        "NOTION AI SUBSCRIPTION",
        "GRAMMARLY PREMIUM",
        "RUNWAY ML",
        "STABILITY AI",
        "HEYGEN VIDEO",
        "DESCRIPT PRO",
        "REPLICATE API",
        "HUGGINGFACE PRO",
        "WEIGHTS AND BIASES",
      ].map((name) => ({
        useStore: name,
        createdAt: new Date(),
      }));

      mockCardTransactionFindMany.mockResolvedValueOnce(transactions as never);

      mockSendEmail.mockResolvedValueOnce({ success: true });

      const result = await processShadowITScan();

      expect(result.success).toBe(true);
      expect(result.totalShadowApps).toBeGreaterThan(0);
      expect(mockSendEmail).toHaveBeenCalled();
    });

    it("should handle unknown errors gracefully", async () => {
      mockOrgFindMany.mockResolvedValueOnce([
        {
          id: "org-1",
          name: "Test Org",
          settings: {
            notifications: { emailEnabled: true, shadowITAlerts: true },
          },
          users: [{ email: "admin@test.com" }],
        } as never,
      ]);

      // Throw non-Error object
      mockAppFindMany.mockRejectedValueOnce("Unknown error string");

      const result = await processShadowITScan();

      expect(result.success).toBe(true);
      expect(result.errors).toContain("org-1: 알 수 없는 오류");
    });

    it("should handle unknown global errors", async () => {
      mockOrgFindMany.mockRejectedValueOnce(null);

      const result = await processShadowITScan();

      expect(result.success).toBe(false);
      expect(result.errors).toContain("알 수 없는 오류");
    });
  });
});
