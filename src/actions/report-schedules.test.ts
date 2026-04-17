// src/actions/report-schedules.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock modules
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    reportSchedule: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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
  createReportSchedule,
  deleteReportSchedule,
  getReportSchedule,
  getReportSchedules,
  updateReportSchedule,
} from "./report-schedules";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockedAuth = auth as any;

describe("ReportSchedule Server Actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockRedirect.mockClear();
  });

  describe("getReportSchedules", () => {
    it("인증되지 않은 경우 /login으로 리다이렉트해야 한다", async () => {
      mockedAuth.mockResolvedValue(null);

      await expect(getReportSchedules()).rejects.toThrow("NEXT_REDIRECT");
      expect(mockRedirect).toHaveBeenCalledWith("/login");
    });

    it("리포트 일정 목록을 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
        expires: "",
      });

      const mockSchedules = [
        {
          id: "schedule-1",
          organizationId: "org-1",
          reportType: "COST_ANALYSIS",
          format: "PDF",
          frequency: "WEEKLY",
          dayOfWeek: 1,
          hour: 9,
          timezone: "Asia/Seoul",
          recipients: ["user@example.com"],
          isActive: true,
          lastSentAt: null,
          nextSendAt: new Date("2024-01-15T09:00:00"),
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        },
      ];

      vi.mocked(prisma.reportSchedule.findMany).mockResolvedValue(
        mockSchedules as never
      );

      const result = await getReportSchedules();

      expect(result).toHaveLength(1);
      expect(result[0].reportType).toBe("COST_ANALYSIS");
      expect(result[0].recipients).toContain("user@example.com");
    });
  });

  describe("getReportSchedule", () => {
    it("개별 리포트 일정을 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
        expires: "",
      });

      vi.mocked(prisma.reportSchedule.findFirst).mockResolvedValue({
        id: "schedule-1",
        organizationId: "org-1",
        reportType: "RENEWAL",
        format: "EXCEL",
      } as never);

      const result = await getReportSchedule("schedule-1");

      expect(result).not.toBeNull();
      expect(result?.reportType).toBe("RENEWAL");
    });

    it("존재하지 않는 일정은 null을 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
        expires: "",
      });

      vi.mocked(prisma.reportSchedule.findFirst).mockResolvedValue(null);

      const result = await getReportSchedule("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("createReportSchedule", () => {
    it("관리자가 아니면 에러를 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "MEMBER" },
        expires: "",
      });

      const result = await createReportSchedule({
        reportType: "COST_ANALYSIS",
        format: "PDF",
        frequency: "WEEKLY",
        dayOfWeek: 1,
        hour: 9,
        recipients: ["user@example.com"],
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("관리자 권한이 필요합니다");
    });

    it("리포트 일정을 성공적으로 생성해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
        expires: "",
      });

      vi.mocked(prisma.reportSchedule.create).mockResolvedValue({
        id: "schedule-1",
        organizationId: "org-1",
        reportType: "COST_ANALYSIS",
        format: "PDF",
        frequency: "WEEKLY",
        dayOfWeek: 1,
        hour: 9,
        recipients: ["user@example.com"],
        isActive: true,
      } as never);

      const result = await createReportSchedule({
        reportType: "COST_ANALYSIS",
        format: "PDF",
        frequency: "WEEKLY",
        dayOfWeek: 1,
        hour: 9,
        recipients: ["user@example.com"],
      });

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe("schedule-1");
    });

    it("수신자가 비어있으면 에러를 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
        expires: "",
      });

      const result = await createReportSchedule({
        reportType: "COST_ANALYSIS",
        format: "PDF",
        frequency: "WEEKLY",
        dayOfWeek: 1,
        hour: 9,
        recipients: [],
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("수신자를 지정해야 합니다");
    });
  });

  describe("updateReportSchedule", () => {
    it("리포트 일정을 수정해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
        expires: "",
      });

      vi.mocked(prisma.reportSchedule.findFirst).mockResolvedValue({
        id: "schedule-1",
        organizationId: "org-1",
      } as never);

      vi.mocked(prisma.reportSchedule.update).mockResolvedValue({
        id: "schedule-1",
        hour: 10,
      } as never);

      const result = await updateReportSchedule("schedule-1", {
        hour: 10,
      });

      expect(result.success).toBe(true);
      expect(prisma.reportSchedule.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "schedule-1" },
          data: expect.objectContaining({ hour: 10 }),
        })
      );
    });

    it("존재하지 않는 일정은 에러를 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
        expires: "",
      });

      vi.mocked(prisma.reportSchedule.findFirst).mockResolvedValue(null);

      const result = await updateReportSchedule("non-existent", {
        hour: 10,
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("리포트 일정을 찾을 수 없습니다");
    });
  });

  describe("deleteReportSchedule", () => {
    it("관리자가 아니면 에러를 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "MEMBER" },
        expires: "",
      });

      const result = await deleteReportSchedule("schedule-1");

      expect(result.success).toBe(false);
      expect(result.message).toBe("관리자 권한이 필요합니다");
    });

    it("리포트 일정을 삭제해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
        expires: "",
      });

      vi.mocked(prisma.reportSchedule.findFirst).mockResolvedValue({
        id: "schedule-1",
        organizationId: "org-1",
      } as never);

      vi.mocked(prisma.reportSchedule.delete).mockResolvedValue({} as never);

      const result = await deleteReportSchedule("schedule-1");

      expect(result.success).toBe(true);
      expect(prisma.reportSchedule.delete).toHaveBeenCalledWith({
        where: { id: "schedule-1" },
      });
    });
  });
});
