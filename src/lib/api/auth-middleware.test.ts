// src/lib/api/auth-middleware.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "./auth-middleware";

describe("withApiAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("세션이 없으면 401을 반환해야 한다", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const handler = vi.fn();
    const wrappedHandler = withApiAuth(handler);

    const request = new NextRequest("http://localhost/api/test");
    const response = await wrappedHandler(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("인증이 필요합니다");
    expect(handler).not.toHaveBeenCalled();
  });

  it("user가 없으면 401을 반환해야 한다", async () => {
    vi.mocked(auth).mockResolvedValue({} as never);

    const handler = vi.fn();
    const wrappedHandler = withApiAuth(handler);

    const request = new NextRequest("http://localhost/api/test");
    const response = await wrappedHandler(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("인증이 필요합니다");
    expect(handler).not.toHaveBeenCalled();
  });

  it("organizationId가 없으면 403을 반환해야 한다", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", organizationId: null },
    } as never);

    const handler = vi.fn();
    const wrappedHandler = withApiAuth(handler);

    const request = new NextRequest("http://localhost/api/test");
    const response = await wrappedHandler(request);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("조직 정보가 필요합니다");
    expect(handler).not.toHaveBeenCalled();
  });

  it("유효한 세션이면 핸들러를 호출해야 한다", async () => {
    const mockSession = {
      user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
    };
    vi.mocked(auth).mockResolvedValue(mockSession as never);

    const handler = vi
      .fn()
      .mockResolvedValue(NextResponse.json({ success: true }));
    const wrappedHandler = withApiAuth(handler);

    const request = new NextRequest("http://localhost/api/test");
    const response = await wrappedHandler(request);

    expect(handler).toHaveBeenCalledWith(request, { session: mockSession });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it("핸들러에 세션 컨텍스트를 전달해야 한다", async () => {
    const mockSession = {
      user: {
        id: "user-123",
        organizationId: "org-456",
        role: "MEMBER",
        email: "test@example.com",
      },
    };
    vi.mocked(auth).mockResolvedValue(mockSession as never);

    const handler = vi.fn().mockImplementation(async (_req, ctx) => {
      return NextResponse.json({
        userId: ctx.session.user.id,
        orgId: ctx.session.user.organizationId,
      });
    });
    const wrappedHandler = withApiAuth(handler);

    const request = new NextRequest("http://localhost/api/test");
    const response = await wrappedHandler(request);

    const body = await response.json();
    expect(body.userId).toBe("user-123");
    expect(body.orgId).toBe("org-456");
  });
});

describe("withApiAuth - 관리자 권한 검증", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ADMIN이 아닌 사용자는 requireAdmin 옵션 시 403을 반환해야 한다", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1", role: "MEMBER" },
    } as never);

    const handler = vi.fn();
    const wrappedHandler = withApiAuth(handler, { requireAdmin: true });

    const request = new NextRequest("http://localhost/api/test");
    const response = await wrappedHandler(request);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("관리자 권한이 필요합니다");
    expect(handler).not.toHaveBeenCalled();
  });

  it("ADMIN 사용자는 requireAdmin 옵션 시 핸들러를 호출해야 한다", async () => {
    const mockSession = {
      user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
    };
    vi.mocked(auth).mockResolvedValue(mockSession as never);

    const handler = vi
      .fn()
      .mockResolvedValue(NextResponse.json({ success: true }));
    const wrappedHandler = withApiAuth(handler, { requireAdmin: true });

    const request = new NextRequest("http://localhost/api/test");
    const response = await wrappedHandler(request);

    expect(handler).toHaveBeenCalled();
    expect(response.status).toBe(200);
  });
});
