import { createIntegration, getIntegrations } from "@/actions/integrations";
import * as handler from "@/app/api/v1/integrations/route";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/actions/integrations", () => ({
  getIntegrations: vi.fn(),
  createIntegration: vi.fn(),
}));

const mockAuth = vi.mocked(auth);
const mockGetIntegrations = vi.mocked(getIntegrations);
const mockCreateIntegration = vi.mocked(createIntegration);

describe("/api/v1/integrations 계약", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("GET 401 when unauthenticated", async () => {
      mockAuth.mockResolvedValueOnce(null as never);

      const req = new NextRequest("http://localhost/api/v1/integrations");
      const res = await handler.GET(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json).toEqual({ error: "인증이 필요합니다" });
    });

    it("GET 403 when organizationId missing", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "user-1", role: "ADMIN" },
      } as never);

      const req = new NextRequest("http://localhost/api/v1/integrations");
      const res = await handler.GET(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json).toEqual({ error: "조직 정보가 필요합니다" });
    });

    it("GET 200 with items/total", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);
      mockGetIntegrations.mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      const req = new NextRequest(
        "http://localhost/api/v1/integrations?page=1&limit=20"
      );
      const res = await handler.GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toHaveProperty("items");
      expect(json).toHaveProperty("total", 0);
    });
  });

  describe("POST", () => {
    it("POST 401 when unauthenticated", async () => {
      mockAuth.mockResolvedValueOnce(null as never);

      const req = new NextRequest("http://localhost/api/v1/integrations", {
        method: "POST",
        body: JSON.stringify({ type: "GOOGLE_WORKSPACE" }),
      });
      const res = await handler.POST(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json).toEqual({ error: "인증이 필요합니다" });
    });

    it("POST 403 when not admin", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "user-1", organizationId: "org-1", role: "MEMBER" },
      } as never);

      const req = new NextRequest("http://localhost/api/v1/integrations", {
        method: "POST",
        body: JSON.stringify({ type: "GOOGLE_WORKSPACE" }),
      });
      const res = await handler.POST(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json).toEqual({ error: "관리자 권한이 필요합니다" });
    });

    it("POST 200 on success", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);
      mockCreateIntegration.mockResolvedValueOnce({
        success: true,
        data: { id: "int-1" },
      } as never);

      const req = new NextRequest("http://localhost/api/v1/integrations", {
        method: "POST",
        body: JSON.stringify({
          type: "GOOGLE_WORKSPACE",
          credentials: {
            serviceAccountEmail: "service@project.iam.gserviceaccount.com",
            privateKey:
              "-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----",
            adminEmail: "admin@example.com",
          },
        }),
      });
      const res = await handler.POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual({ success: true, data: { id: "int-1" } });
    });
  });
});
