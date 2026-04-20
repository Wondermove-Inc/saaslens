// src/lib/services/notification/renewalAlert.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    subscription: {
      findMany: vi.fn(),
    },
    renewalAlert: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

// Mock email service
vi.mock("./email", () => ({
  sendRenewalAlertEmail: vi
    .fn()
    .mockResolvedValue({ success: true, messageId: "msg-123" }),
}));

import { prisma } from "@/lib/db";
import { sendRenewalAlertEmail } from "./email";
import {
  findUpcomingRenewals,
  processRenewalAlerts,
  sendRenewalAlert,
} from "./renewalAlert";

describe("Renewal Alert Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("findUpcomingRenewals", () => {
    it("30일 내 갱신 예정 구독을 찾아야 한다", async () => {
      const mockSubscriptions = [
        {
          id: "sub-1",
          renewalDate: new Date("2024-02-14"), // 30일 후
          renewalAlert30: true,
          app: { name: "Slack" },
          organization: { id: "org-1", name: "테스트 조직" },
          amount: 100000,
          currency: "KRW",
        },
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(
        mockSubscriptions as never
      );

      const result = await findUpcomingRenewals(30);

      expect(result).toHaveLength(1);
      expect(result[0].app.name).toBe("Slack");
    });

    it("알림 비활성화된 구독은 제외해야 한다", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([] as never);

      const result = await findUpcomingRenewals(30);

      expect(result).toHaveLength(0);
    });

    it("60일 내 갱신 예정 구독을 찾아야 한다", async () => {
      const mockSubscriptions = [
        {
          id: "sub-2",
          renewalDate: new Date("2024-03-14"), // 58일 후
          renewalAlert60: true,
          app: { name: "Notion" },
          organization: { id: "org-1", name: "테스트 조직" },
          amount: 50000,
          currency: "KRW",
        },
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(
        mockSubscriptions as never
      );

      const result = await findUpcomingRenewals(60);

      expect(result).toHaveLength(1);
    });

    it("90일 내 갱신 예정 구독을 찾아야 한다", async () => {
      const mockSubscriptions = [
        {
          id: "sub-3",
          renewalDate: new Date("2024-04-14"), // 89일 후
          renewalAlert90: true,
          app: { name: "Figma" },
          organization: { id: "org-1", name: "테스트 조직" },
          amount: 200000,
          currency: "KRW",
        },
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(
        mockSubscriptions as never
      );

      const result = await findUpcomingRenewals(90);

      expect(result).toHaveLength(1);
    });
  });

  describe("sendRenewalAlert", () => {
    it("관리자에게 갱신 알림을 발송해야 한다", async () => {
      const subscription = {
        id: "sub-1",
        renewalDate: new Date("2024-02-14"),
        app: { name: "Slack" },
        organization: { id: "org-1", name: "테스트 조직" },
        amount: 100000,
        currency: "KRW",
      };

      const admins = [
        { email: "admin1@example.com" },
        { email: "admin2@example.com" },
      ];

      vi.mocked(prisma.user.findMany).mockResolvedValue(admins as never);
      vi.mocked(prisma.renewalAlert.findFirst).mockResolvedValue(null as never);
      vi.mocked(prisma.renewalAlert.upsert).mockResolvedValue({
        id: "alert-1",
      } as never);

      const result = await sendRenewalAlert(subscription as never, 30);

      expect(sendRenewalAlertEmail).toHaveBeenCalledTimes(2);
      expect(result.sent).toBe(2);
      expect(result.failed).toBe(0);
    });

    it("이미 발송된 알림은 건너뛰어야 한다", async () => {
      const subscription = {
        id: "sub-1",
        renewalDate: new Date("2024-02-14"),
        app: { name: "Slack" },
        organization: { id: "org-1", name: "테스트 조직" },
        amount: 100000,
        currency: "KRW",
      };

      vi.mocked(prisma.renewalAlert.findFirst).mockResolvedValue({
        id: "alert-1",
        sentAt: new Date("2024-01-14"),
      } as never);

      const result = await sendRenewalAlert(subscription as never, 30);

      expect(sendRenewalAlertEmail).not.toHaveBeenCalled();
      expect(result.sent).toBe(0);
      expect(result.skipped).toBe(true);
    });
  });

  describe("processRenewalAlerts", () => {
    it("30/60/90일 갱신 알림을 모두 처리해야 한다", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([] as never);

      const result = await processRenewalAlerts();

      expect(prisma.subscription.findMany).toHaveBeenCalledTimes(3);
      expect(result).toHaveProperty("processedAt");
      expect(result).toHaveProperty("alerts");
    });

    it("발송 결과를 집계해야 한다", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([] as never);

      const result = await processRenewalAlerts();

      expect(result.alerts).toEqual({
        days30: { found: 0, sent: 0 },
        days60: { found: 0, sent: 0 },
        days90: { found: 0, sent: 0 },
      });
    });
  });
});
