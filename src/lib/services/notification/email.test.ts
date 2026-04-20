// src/lib/services/notification/email.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock send function - must be hoisted
const mockSend = vi.fn();

// Mock Resend - vitest hoists vi.mock calls
vi.mock("resend", () => {
  return {
    Resend: class MockResend {
      emails = {
        send: (...args: unknown[]) => mockSend(...args),
      };
    },
  };
});

// Import after mocking
import {
  EmailConfig,
  sendRenewalAlertEmail,
  sendTerminatedUserAlertEmail,
  sendWelcomeEmail,
} from "./email";

describe("Email Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 테스트 환경에서 RESEND_API_KEY 설정 (lazy init을 위해 필요)
    process.env.RESEND_API_KEY = "test-api-key";
    // Default successful response
    mockSend.mockResolvedValue({ data: { id: "email-123" }, error: null });
  });

  describe("sendRenewalAlertEmail", () => {
    it("30일 전 갱신 알림 이메일을 발송해야 한다", async () => {
      const result = await sendRenewalAlertEmail({
        to: "admin@example.com",
        appName: "Slack",
        renewalDate: new Date("2024-02-15"),
        daysUntilRenewal: 30,
        amount: 100000,
        currency: "KRW",
        organizationName: "테스트 조직",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("email-123");
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("60일 전 갱신 알림 이메일을 발송해야 한다", async () => {
      const result = await sendRenewalAlertEmail({
        to: "admin@example.com",
        appName: "Notion",
        renewalDate: new Date("2024-03-15"),
        daysUntilRenewal: 60,
        amount: 50000,
        currency: "KRW",
        organizationName: "테스트 조직",
      });

      expect(result.success).toBe(true);
    });

    it("90일 전 갱신 알림 이메일을 발송해야 한다", async () => {
      const result = await sendRenewalAlertEmail({
        to: "admin@example.com",
        appName: "Figma",
        renewalDate: new Date("2024-04-15"),
        daysUntilRenewal: 90,
        amount: 200000,
        currency: "KRW",
        organizationName: "테스트 조직",
      });

      expect(result.success).toBe(true);
    });

    it("이메일 발송 실패 시 에러를 반환해야 한다", async () => {
      // Override mock for this test
      mockSend.mockResolvedValueOnce({
        data: null,
        error: { message: "발송 실패" },
      });

      const result = await sendRenewalAlertEmail({
        to: "admin@example.com",
        appName: "Slack",
        renewalDate: new Date("2024-02-15"),
        daysUntilRenewal: 30,
        amount: 100000,
        currency: "KRW",
        organizationName: "테스트 조직",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("발송 실패");
    });

    it("예외 발생 시 에러를 반환해야 한다", async () => {
      mockSend.mockRejectedValueOnce(new Error("네트워크 오류"));

      const result = await sendRenewalAlertEmail({
        to: "admin@example.com",
        appName: "Slack",
        renewalDate: new Date("2024-02-15"),
        daysUntilRenewal: 30,
        amount: 100000,
        currency: "KRW",
        organizationName: "테스트 조직",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("네트워크 오류");
    });
  });

  describe("sendWelcomeEmail", () => {
    it("환영 이메일을 발송해야 한다", async () => {
      const result = await sendWelcomeEmail({
        to: "newuser@example.com",
        userName: "홍길동",
        organizationName: "테스트 조직",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("email-123");
    });

    it("환영 이메일 발송 실패 시 에러를 반환해야 한다", async () => {
      mockSend.mockResolvedValueOnce({
        data: null,
        error: { message: "이메일 발송 실패" },
      });

      const result = await sendWelcomeEmail({
        to: "newuser@example.com",
        userName: "홍길동",
        organizationName: "테스트 조직",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("이메일 발송 실패");
    });
  });

  describe("sendTerminatedUserAlertEmail", () => {
    it("퇴사자 미회수 계정 알림 이메일을 발송해야 한다", async () => {
      const result = await sendTerminatedUserAlertEmail({
        to: "admin@example.com",
        terminatedUserName: "김퇴사",
        terminatedUserEmail: "kim@example.com",
        unrevokedApps: ["Slack", "Notion", "Figma"],
        terminatedAt: new Date("2024-01-10"),
        organizationName: "테스트 조직",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("email-123");
    });

    it("여러 앱 목록을 포함해야 한다", async () => {
      const apps = ["Slack", "Notion", "Figma", "Zoom", "GitHub"];

      const result = await sendTerminatedUserAlertEmail({
        to: "admin@example.com",
        terminatedUserName: "김퇴사",
        terminatedUserEmail: "kim@example.com",
        unrevokedApps: apps,
        terminatedAt: new Date("2024-01-10"),
        organizationName: "테스트 조직",
      });

      expect(result.success).toBe(true);
    });

    it("퇴사자 알림 발송 실패 시 에러를 반환해야 한다", async () => {
      mockSend.mockResolvedValueOnce({
        data: null,
        error: { message: "알림 발송 실패" },
      });

      const result = await sendTerminatedUserAlertEmail({
        to: "admin@example.com",
        terminatedUserName: "김퇴사",
        terminatedUserEmail: "kim@example.com",
        unrevokedApps: ["Slack"],
        terminatedAt: new Date("2024-01-10"),
        organizationName: "테스트 조직",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("알림 발송 실패");
    });
  });

  describe("EmailConfig", () => {
    it("기본 설정값이 있어야 한다", () => {
      expect(EmailConfig.fromEmail).toBeDefined();
      expect(EmailConfig.fromName).toBeDefined();
    });

    it("from 주소를 올바르게 포맷해야 한다", () => {
      expect(EmailConfig.from).toContain(EmailConfig.fromName);
      expect(EmailConfig.from).toContain(EmailConfig.fromEmail);
    });
  });
});
