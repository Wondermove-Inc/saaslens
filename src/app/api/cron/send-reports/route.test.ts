// src/app/api/cron/send-reports/route.test.ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  prisma: {
    reportSchedule: {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock("@/lib/services/report/email-sender", () => ({
  sendReportEmail: vi.fn().mockResolvedValue(undefined),
}));

describe("Send Reports Cron API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment
    process.env.CRON_SECRET = "test-secret";
  });

  it("인증 헤더가 없으면 401을 반환해야 한다", async () => {
    const request = new NextRequest("http://localhost/api/cron/send-reports");

    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("인증 헤더가 잘못되면 401을 반환해야 한다", async () => {
    const request = new NextRequest("http://localhost/api/cron/send-reports", {
      headers: {
        authorization: "Bearer wrong-secret",
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("인증이 성공하면 스케줄을 처리해야 한다", async () => {
    const request = new NextRequest("http://localhost/api/cron/send-reports", {
      headers: {
        authorization: "Bearer test-secret",
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.processed).toBe(0);
  });

  it("CRON_SECRET이 설정되지 않으면 401을 반환해야 한다", async () => {
    delete process.env.CRON_SECRET;

    const request = new NextRequest("http://localhost/api/cron/send-reports", {
      headers: {
        authorization: "Bearer test-secret",
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(401);
  });
});
