// src/lib/middleware/cron-auth.test.ts
import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withCronAuth } from "./cron-auth";

describe("withCronAuth", () => {
  const mockHandler = vi
    .fn()
    .mockResolvedValue(NextResponse.json({ success: true }, { status: 200 }));

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "test-secret");
    vi.stubEnv("NODE_ENV", "production");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("Authorization 헤더가 없으면 401을 반환해야 한다", async () => {
    const handler = withCronAuth(mockHandler);
    const request = new NextRequest("http://localhost/api/cron/test");

    const response = await handler(request);

    expect(response.status).toBe(401);
    expect(mockHandler).not.toHaveBeenCalled();
    const body = await response.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("CRON_SECRET이 설정되지 않으면 401을 반환해야 한다", async () => {
    delete process.env.CRON_SECRET;
    const handler = withCronAuth(mockHandler);
    const request = new NextRequest("http://localhost/api/cron/test", {
      headers: { authorization: "Bearer any-token" },
    });

    const response = await handler(request);

    expect(response.status).toBe(401);
    expect(mockHandler).not.toHaveBeenCalled();
    const body = await response.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("잘못된 토큰이면 401을 반환해야 한다", async () => {
    const handler = withCronAuth(mockHandler);
    const request = new NextRequest("http://localhost/api/cron/test", {
      headers: { authorization: "Bearer wrong-secret" },
    });

    const response = await handler(request);

    expect(response.status).toBe(401);
    expect(mockHandler).not.toHaveBeenCalled();
    const body = await response.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("올바른 토큰이면 핸들러를 호출해야 한다", async () => {
    const handler = withCronAuth(mockHandler);
    const request = new NextRequest("http://localhost/api/cron/test", {
      headers: { authorization: "Bearer test-secret" },
    });

    const response = await handler(request);

    expect(response.status).toBe(200);
    expect(mockHandler).toHaveBeenCalledWith(request);
    const body = await response.json();
    expect(body).toEqual({ success: true });
  });

  describe("skipInDevelopment 옵션", () => {
    it("개발 환경 + skipInDevelopment=true면 인증 없이 통과", async () => {
      vi.stubEnv("NODE_ENV", "development");
      const handler = withCronAuth(mockHandler, { skipInDevelopment: true });
      const request = new NextRequest("http://localhost/api/cron/test");

      const response = await handler(request);

      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalled();
    });

    it("개발 환경 + skipInDevelopment=false면 인증 필요", async () => {
      vi.stubEnv("NODE_ENV", "development");
      const handler = withCronAuth(mockHandler, { skipInDevelopment: false });
      const request = new NextRequest("http://localhost/api/cron/test");

      const response = await handler(request);

      expect(response.status).toBe(401);
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it("production + skipInDevelopment=true면 인증 필요", async () => {
      vi.stubEnv("NODE_ENV", "production");
      const handler = withCronAuth(mockHandler, { skipInDevelopment: true });
      const request = new NextRequest("http://localhost/api/cron/test");

      const response = await handler(request);

      expect(response.status).toBe(401);
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });
});
