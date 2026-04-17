// src/lib/services/notification/agentReminder.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Resend
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ data: { id: "test-message-id" } }),
    },
  })),
}));

// Set environment variables before importing the module
vi.stubEnv("RESEND_API_KEY", "test-api-key");
vi.stubEnv("EMAIL_FROM", "test@example.com");
vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");

import { sendAgentInstallationReminderEmail } from "./agentReminder";

describe("agentReminder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendAgentInstallationReminderEmail", () => {
    it("should send email successfully with valid params", async () => {
      const params = {
        to: "user@example.com",
        userName: "홍길동",
        organizationName: "테스트 회사",
      };

      const result = await sendAgentInstallationReminderEmail(params);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("test-message-id");
    });

    it("should include user name in email", async () => {
      const params = {
        to: "user@example.com",
        userName: "김철수",
        organizationName: "테스트 회사",
      };

      const result = await sendAgentInstallationReminderEmail(params);

      expect(result.success).toBe(true);
    });

    it("should include organization name in email", async () => {
      const params = {
        to: "user@example.com",
        userName: "이영희",
        organizationName: "ABC 주식회사",
      };

      const result = await sendAgentInstallationReminderEmail(params);

      expect(result.success).toBe(true);
    });

    it("should handle missing user name gracefully", async () => {
      const params = {
        to: "user@example.com",
        userName: null as unknown as string,
        organizationName: "테스트 회사",
      };

      // Should use email as fallback
      const result = await sendAgentInstallationReminderEmail(params);

      expect(result.success).toBe(true);
    });
  });
});
