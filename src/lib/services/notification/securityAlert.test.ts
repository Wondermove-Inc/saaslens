// src/lib/services/notification/securityAlert.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Resend
const mockSend = vi.fn();
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: mockSend,
    },
  })),
}));

// Set environment variable
vi.stubEnv("RESEND_API_KEY", "test-api-key");

import {
  sendCostAnomalyAlertEmail,
  sendShadowITAlertEmail,
  type CostAnomalyAlertParams,
  type ShadowITAlertParams,
} from "./securityAlert";

describe("securityAlert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({ data: { id: "msg-123" }, error: null });
  });

  describe("sendShadowITAlertEmail", () => {
    const validParams: ShadowITAlertParams = {
      to: "admin@example.com",
      organizationName: "테스트 조직",
      shadowApps: [
        {
          name: "Unknown App 1",
          detectedAt: new Date("2025-01-01"),
          source: "card",
        },
        {
          name: "Unknown App 2",
          detectedAt: new Date("2025-01-02"),
          source: "sso",
        },
      ],
    };

    it("should send Shadow IT alert email successfully", async () => {
      const result = await sendShadowITAlertEmail(validParams);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("msg-123");
      expect(mockSend).toHaveBeenCalledOnce();
    });

    it("should include correct subject with app count", async () => {
      await sendShadowITAlertEmail(validParams);

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.subject).toContain("Shadow IT");
      expect(callArgs.subject).toContain("2건");
    });

    it("should include all shadow apps in email body", async () => {
      await sendShadowITAlertEmail(validParams);

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain("Unknown App 1");
      expect(callArgs.html).toContain("Unknown App 2");
    });

    it("should handle Resend API error", async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: { message: "API Error" },
      });

      const result = await sendShadowITAlertEmail(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe("API Error");
    });

    it("should handle exception", async () => {
      mockSend.mockRejectedValue(new Error("Network error"));

      const result = await sendShadowITAlertEmail(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });
  });

  describe("sendCostAnomalyAlertEmail", () => {
    const validParams: CostAnomalyAlertParams = {
      to: "admin@example.com",
      organizationName: "테스트 조직",
      appName: "Notion",
      previousCost: 100000,
      currentCost: 180000,
      percentageIncrease: 80,
      currency: "KRW",
      period: "2025년 1월",
    };

    it("should send cost anomaly alert email successfully", async () => {
      const result = await sendCostAnomalyAlertEmail(validParams);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("msg-123");
      expect(mockSend).toHaveBeenCalledOnce();
    });

    it("should include correct subject with app name and percentage", async () => {
      await sendCostAnomalyAlertEmail(validParams);

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.subject).toContain("비용 이상");
      expect(callArgs.subject).toContain("Notion");
      expect(callArgs.subject).toContain("80%");
    });

    it("should include cost comparison in email body", async () => {
      await sendCostAnomalyAlertEmail(validParams);

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain("₩100,000"); // Previous cost
      expect(callArgs.html).toContain("₩180,000"); // Current cost
      expect(callArgs.html).toContain("80%");
    });

    it("should handle Resend API error", async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: { message: "API Error" },
      });

      const result = await sendCostAnomalyAlertEmail(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe("API Error");
    });

    it("should mark as critical when increase >= 100%", async () => {
      const criticalParams = {
        ...validParams,
        currentCost: 250000,
        percentageIncrease: 150,
      };

      await sendCostAnomalyAlertEmail(criticalParams);

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.subject).toContain("🚨");
    });
  });
});
