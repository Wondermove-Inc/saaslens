// src/lib/services/cost/costAnomalyScan.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Prisma mock - must be defined before vi.mock
vi.mock("@/lib/db", () => ({
  prisma: {
    organization: {
      findMany: vi.fn(),
    },
    cardTransaction: {
      groupBy: vi.fn(),
    },
    app: {
      findMany: vi.fn(),
    },
  },
}));

// Email mock
vi.mock("@/lib/services/notification/securityAlert", () => ({
  sendCostAnomalyAlertEmail: vi.fn(),
}));

import { prisma } from "@/lib/db";
import { sendCostAnomalyAlertEmail } from "@/lib/services/notification/securityAlert";
import { processCostAnomalyScan } from "./costAnomalyScan";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockOrgFindMany = prisma.organization.findMany as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockTxGroupBy = prisma.cardTransaction.groupBy as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAppFindMany = prisma.app.findMany as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSendEmail = sendCostAnomalyAlertEmail as any;

describe("costAnomalyScan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("processCostAnomalyScan", () => {
    it("should return success when no organizations exist", async () => {
      mockOrgFindMany.mockResolvedValueOnce([]);

      const result = await processCostAnomalyScan();

      expect(result.success).toBe(true);
      expect(result.processedOrganizations).toBe(0);
      expect(result.anomaliesFound).toBe(0);
      expect(result.emailsSent).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect cost anomalies exceeding threshold", async () => {
      mockOrgFindMany.mockResolvedValueOnce([
        {
          id: "org-1",
          name: "Test Org",
          settings: {
            notifications: {
              emailEnabled: true,
              costAnomalyAlerts: true,
              costAnomalyThreshold: 50, // 50% threshold
            },
          },
          users: [{ email: "admin@test.com" }],
        } as never,
      ]);

      // Current month costs
      mockTxGroupBy.mockResolvedValueOnce([
        { matchedAppId: "app-1", _sum: { useAmt: 150000 } }, // 150% increase
      ] as never);

      // Previous month costs
      mockTxGroupBy.mockResolvedValueOnce([
        { matchedAppId: "app-1", _sum: { useAmt: 100000 } },
      ] as never);

      // App names
      mockAppFindMany.mockResolvedValueOnce([
        { id: "app-1", name: "Slack" },
      ] as never);

      mockSendEmail.mockResolvedValueOnce({ success: true });

      const result = await processCostAnomalyScan();

      expect(result.success).toBe(true);
      expect(result.processedOrganizations).toBe(1);
      expect(result.anomaliesFound).toBe(1);
      expect(result.emailsSent).toBe(1);

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "admin@test.com",
          organizationName: "Test Org",
          appName: "Slack",
          previousCost: 100000,
          currentCost: 150000,
          percentageIncrease: 50,
          currency: "KRW",
        })
      );
    });

    it("should not detect anomaly when increase is below threshold", async () => {
      mockOrgFindMany.mockResolvedValueOnce([
        {
          id: "org-1",
          name: "Test Org",
          settings: {
            notifications: {
              emailEnabled: true,
              costAnomalyAlerts: true,
              costAnomalyThreshold: 50,
            },
          },
          users: [{ email: "admin@test.com" }],
        } as never,
      ]);

      // Current month: 130000 (30% increase - below 50% threshold)
      mockTxGroupBy.mockResolvedValueOnce([
        { matchedAppId: "app-1", _sum: { useAmt: 130000 } },
      ] as never);

      // Previous month: 100000
      mockTxGroupBy.mockResolvedValueOnce([
        { matchedAppId: "app-1", _sum: { useAmt: 100000 } },
      ] as never);

      mockAppFindMany.mockResolvedValueOnce([
        { id: "app-1", name: "Slack" },
      ] as never);

      const result = await processCostAnomalyScan();

      expect(result.success).toBe(true);
      expect(result.anomaliesFound).toBe(0);
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("should skip organization when costAnomalyAlerts is disabled", async () => {
      mockOrgFindMany.mockResolvedValueOnce([
        {
          id: "org-1",
          name: "Test Org",
          settings: {
            notifications: {
              emailEnabled: true,
              costAnomalyAlerts: false, // Disabled
            },
          },
          users: [{ email: "admin@test.com" }],
        } as never,
      ]);

      const result = await processCostAnomalyScan();

      expect(result.success).toBe(true);
      expect(mockTxGroupBy).not.toHaveBeenCalled();
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
              costAnomalyAlerts: true,
            },
          },
          users: [{ email: "admin@test.com" }],
        } as never,
      ]);

      const result = await processCostAnomalyScan();

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
              costAnomalyAlerts: true,
            },
          },
          users: [], // No admins
        } as never,
      ]);

      const result = await processCostAnomalyScan();

      expect(result.success).toBe(true);
      expect(result.errors).toContain("org-1: 관리자 없음");
    });

    it("should skip apps with no previous month cost (new apps)", async () => {
      mockOrgFindMany.mockResolvedValueOnce([
        {
          id: "org-1",
          name: "Test Org",
          settings: {
            notifications: {
              emailEnabled: true,
              costAnomalyAlerts: true,
              costAnomalyThreshold: 50,
            },
          },
          users: [{ email: "admin@test.com" }],
        } as never,
      ]);

      // Current month has new app
      mockTxGroupBy.mockResolvedValueOnce([
        { matchedAppId: "new-app", _sum: { useAmt: 50000 } },
      ] as never);

      // No previous month data for this app
      mockTxGroupBy.mockResolvedValueOnce([] as never);

      mockAppFindMany.mockResolvedValueOnce([
        { id: "new-app", name: "New Service" },
      ] as never);

      const result = await processCostAnomalyScan();

      expect(result.success).toBe(true);
      expect(result.anomaliesFound).toBe(0);
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("should send emails to all admins for each anomaly", async () => {
      mockOrgFindMany.mockResolvedValueOnce([
        {
          id: "org-1",
          name: "Test Org",
          settings: {
            notifications: {
              emailEnabled: true,
              costAnomalyAlerts: true,
              costAnomalyThreshold: 50,
            },
          },
          users: [{ email: "admin1@test.com" }, { email: "admin2@test.com" }],
        } as never,
      ]);

      // 2 apps with anomalies
      mockTxGroupBy.mockResolvedValueOnce([
        { matchedAppId: "app-1", _sum: { useAmt: 200000 } }, // 100% increase
        { matchedAppId: "app-2", _sum: { useAmt: 180000 } }, // 80% increase
      ] as never);

      mockTxGroupBy.mockResolvedValueOnce([
        { matchedAppId: "app-1", _sum: { useAmt: 100000 } },
        { matchedAppId: "app-2", _sum: { useAmt: 100000 } },
      ] as never);

      mockAppFindMany.mockResolvedValueOnce([
        { id: "app-1", name: "Slack" },
        { id: "app-2", name: "Notion" },
      ] as never);

      mockSendEmail.mockResolvedValue({ success: true });

      const result = await processCostAnomalyScan();

      expect(result.success).toBe(true);
      expect(result.anomaliesFound).toBe(2);
      // 2 anomalies x 2 admins = 4 emails
      expect(result.emailsSent).toBe(4);
      expect(mockSendEmail).toHaveBeenCalledTimes(4);
    });

    it("should handle email sending failures", async () => {
      mockOrgFindMany.mockResolvedValueOnce([
        {
          id: "org-1",
          name: "Test Org",
          settings: {
            notifications: {
              emailEnabled: true,
              costAnomalyAlerts: true,
              costAnomalyThreshold: 50,
            },
          },
          users: [{ email: "admin@test.com" }],
        } as never,
      ]);

      mockTxGroupBy.mockResolvedValueOnce([
        { matchedAppId: "app-1", _sum: { useAmt: 160000 } },
      ] as never);

      mockTxGroupBy.mockResolvedValueOnce([
        { matchedAppId: "app-1", _sum: { useAmt: 100000 } },
      ] as never);

      mockAppFindMany.mockResolvedValueOnce([
        { id: "app-1", name: "Slack" },
      ] as never);

      mockSendEmail.mockResolvedValueOnce({
        success: false,
        error: "SMTP error",
      });

      const result = await processCostAnomalyScan();

      expect(result.success).toBe(true);
      expect(result.emailsSent).toBe(0);
      expect(result.errors).toContain(
        "org-1/app-1: 이메일 발송 실패 (admin@test.com) - SMTP error"
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
              costAnomalyAlerts: true,
            },
          },
          users: [{ email: "admin@test.com" }],
        } as never,
      ]);

      // Throw error on groupBy
      mockTxGroupBy.mockRejectedValueOnce(new Error("Database timeout"));

      const result = await processCostAnomalyScan();

      expect(result.success).toBe(true);
      expect(result.errors).toContain("org-1: Database timeout");
    });

    it("should handle global errors", async () => {
      mockOrgFindMany.mockRejectedValueOnce(new Error("Connection refused"));

      const result = await processCostAnomalyScan();

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Connection refused");
    });

    it("should use default threshold (50%) when not specified", async () => {
      mockOrgFindMany.mockResolvedValueOnce([
        {
          id: "org-1",
          name: "Test Org",
          settings: {
            notifications: {
              emailEnabled: true,
              costAnomalyAlerts: true,
              // No costAnomalyThreshold specified
            },
          },
          users: [{ email: "admin@test.com" }],
        } as never,
      ]);

      // Exactly 50% increase (threshold boundary)
      mockTxGroupBy.mockResolvedValueOnce([
        { matchedAppId: "app-1", _sum: { useAmt: 150000 } },
      ] as never);

      mockTxGroupBy.mockResolvedValueOnce([
        { matchedAppId: "app-1", _sum: { useAmt: 100000 } },
      ] as never);

      mockAppFindMany.mockResolvedValueOnce([
        { id: "app-1", name: "Slack" },
      ] as never);

      mockSendEmail.mockResolvedValueOnce({ success: true });

      const result = await processCostAnomalyScan();

      expect(result.anomaliesFound).toBe(1);
      expect(mockSendEmail).toHaveBeenCalled();
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

      mockTxGroupBy.mockResolvedValueOnce([
        { matchedAppId: "app-1", _sum: { useAmt: 200000 } },
      ] as never);

      mockTxGroupBy.mockResolvedValueOnce([
        { matchedAppId: "app-1", _sum: { useAmt: 100000 } },
      ] as never);

      mockAppFindMany.mockResolvedValueOnce([
        { id: "app-1", name: "Slack" },
      ] as never);

      mockSendEmail.mockResolvedValueOnce({ success: true });

      const result = await processCostAnomalyScan();

      // Default is enabled
      expect(result.success).toBe(true);
      expect(result.anomaliesFound).toBe(1);
      expect(mockSendEmail).toHaveBeenCalled();
    });

    it("should process multiple organizations independently", async () => {
      mockOrgFindMany.mockResolvedValueOnce([
        {
          id: "org-1",
          name: "Org 1",
          settings: {
            notifications: { emailEnabled: true, costAnomalyAlerts: true },
          },
          users: [{ email: "admin1@test.com" }],
        } as never,
        {
          id: "org-2",
          name: "Org 2",
          settings: {
            notifications: { emailEnabled: true, costAnomalyAlerts: true },
          },
          users: [{ email: "admin2@test.com" }],
        } as never,
      ]);

      // Org 1: anomaly
      mockTxGroupBy
        .mockResolvedValueOnce([
          { matchedAppId: "app-1", _sum: { useAmt: 200000 } },
        ] as never)
        .mockResolvedValueOnce([
          { matchedAppId: "app-1", _sum: { useAmt: 100000 } },
        ] as never);
      mockAppFindMany.mockResolvedValueOnce([
        { id: "app-1", name: "App1" },
      ] as never);

      // Org 2: no anomaly
      mockTxGroupBy
        .mockResolvedValueOnce([
          { matchedAppId: "app-2", _sum: { useAmt: 110000 } },
        ] as never)
        .mockResolvedValueOnce([
          { matchedAppId: "app-2", _sum: { useAmt: 100000 } },
        ] as never);
      mockAppFindMany.mockResolvedValueOnce([
        { id: "app-2", name: "App2" },
      ] as never);

      mockSendEmail.mockResolvedValue({ success: true });

      const result = await processCostAnomalyScan();

      expect(result.processedOrganizations).toBe(2);
      expect(result.anomaliesFound).toBe(1); // Only org-1
      expect(result.emailsSent).toBe(1);
    });

    it("should handle null matchedAppId in current month", async () => {
      mockOrgFindMany.mockResolvedValueOnce([
        {
          id: "org-1",
          name: "Test Org",
          settings: {
            notifications: { emailEnabled: true, costAnomalyAlerts: true },
          },
          users: [{ email: "admin@test.com" }],
        } as never,
      ]);

      // Current month with null matchedAppId
      mockTxGroupBy.mockResolvedValueOnce([
        { matchedAppId: null, _sum: { useAmt: 50000 } },
        { matchedAppId: "app-1", _sum: { useAmt: 200000 } },
      ] as never);

      mockTxGroupBy.mockResolvedValueOnce([
        { matchedAppId: "app-1", _sum: { useAmt: 100000 } },
      ] as never);

      mockAppFindMany.mockResolvedValueOnce([
        { id: "app-1", name: "Slack" },
      ] as never);

      mockSendEmail.mockResolvedValueOnce({ success: true });

      const result = await processCostAnomalyScan();

      expect(result.anomaliesFound).toBe(1);
    });

    it("should use 'unknown app' for apps not found in database", async () => {
      mockOrgFindMany.mockResolvedValueOnce([
        {
          id: "org-1",
          name: "Test Org",
          settings: {
            notifications: { emailEnabled: true, costAnomalyAlerts: true },
          },
          users: [{ email: "admin@test.com" }],
        } as never,
      ]);

      mockTxGroupBy.mockResolvedValueOnce([
        { matchedAppId: "unknown-app", _sum: { useAmt: 200000 } },
      ] as never);

      mockTxGroupBy.mockResolvedValueOnce([
        { matchedAppId: "unknown-app", _sum: { useAmt: 100000 } },
      ] as never);

      // App not found
      mockAppFindMany.mockResolvedValueOnce([] as never);

      mockSendEmail.mockResolvedValueOnce({ success: true });

      const result = await processCostAnomalyScan();

      expect(result.anomaliesFound).toBe(1);
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          appName: "알 수 없는 앱",
        })
      );
    });

    it("should handle zero current cost", async () => {
      mockOrgFindMany.mockResolvedValueOnce([
        {
          id: "org-1",
          name: "Test Org",
          settings: {
            notifications: { emailEnabled: true, costAnomalyAlerts: true },
          },
          users: [{ email: "admin@test.com" }],
        } as never,
      ]);

      // Zero current cost (cost decreased)
      mockTxGroupBy.mockResolvedValueOnce([
        { matchedAppId: "app-1", _sum: { useAmt: 0 } },
      ] as never);

      mockTxGroupBy.mockResolvedValueOnce([
        { matchedAppId: "app-1", _sum: { useAmt: 100000 } },
      ] as never);

      mockAppFindMany.mockResolvedValueOnce([
        { id: "app-1", name: "Slack" },
      ] as never);

      const result = await processCostAnomalyScan();

      // -100% change, not an anomaly (we only detect increases)
      expect(result.anomaliesFound).toBe(0);
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("should handle unknown errors gracefully", async () => {
      mockOrgFindMany.mockResolvedValueOnce([
        {
          id: "org-1",
          name: "Test Org",
          settings: {
            notifications: { emailEnabled: true, costAnomalyAlerts: true },
          },
          users: [{ email: "admin@test.com" }],
        } as never,
      ]);

      // Throw non-Error object
      mockTxGroupBy.mockRejectedValueOnce("String error");

      const result = await processCostAnomalyScan();

      expect(result.success).toBe(true);
      expect(result.errors).toContain("org-1: 알 수 없는 오류");
    });

    it("should handle unknown global errors", async () => {
      mockOrgFindMany.mockRejectedValueOnce(null);

      const result = await processCostAnomalyScan();

      expect(result.success).toBe(false);
      expect(result.errors).toContain("알 수 없는 오류");
    });

    it("should handle null useAmt sums", async () => {
      mockOrgFindMany.mockResolvedValueOnce([
        {
          id: "org-1",
          name: "Test Org",
          settings: {
            notifications: { emailEnabled: true, costAnomalyAlerts: true },
          },
          users: [{ email: "admin@test.com" }],
        } as never,
      ]);

      mockTxGroupBy.mockResolvedValueOnce([
        { matchedAppId: "app-1", _sum: { useAmt: null } },
      ] as never);

      mockTxGroupBy.mockResolvedValueOnce([
        { matchedAppId: "app-1", _sum: { useAmt: 100000 } },
      ] as never);

      mockAppFindMany.mockResolvedValueOnce([
        { id: "app-1", name: "Slack" },
      ] as never);

      const result = await processCostAnomalyScan();

      // null converts to 0, so -100% change (not an anomaly)
      expect(result.anomaliesFound).toBe(0);
    });
  });
});
