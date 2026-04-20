import { createApp, getApps } from "@/actions/apps";
import * as handler from "@/app/api/v1/apps/route";
import { auth } from "@/lib/auth";
import type { AppListItem } from "@/types/app";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/actions/apps", () => ({
  getApps: vi.fn(),
  createApp: vi.fn(),
}));

const mockAuth = vi.mocked(auth);
const mockGetApps = vi.mocked(getApps);
const mockCreateApp = vi.mocked(createApp);

// 테스트용 mock 앱 데이터
const mockAppItem: AppListItem = {
  id: "app-1",
  name: "Test",
  status: "ACTIVE",
  source: "MANUAL",
  category: null,
  customLogoUrl: null,
  ownerName: null,
  ownerEmail: null,
  subscriptionCount: 0,
  userAccessCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  teams: [],
};

describe("/api/v1/apps 계약", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null as never);

    const req = new NextRequest("http://localhost/api/v1/apps");
    const res = await handler.GET(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json).toEqual({ message: "Unauthorized" });
  });

  it("GET 200 with items/total", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
    } as never);
    mockGetApps.mockResolvedValueOnce({
      items: [mockAppItem],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    const req = new NextRequest("http://localhost/api/v1/apps?page=1&limit=20");
    const res = await handler.GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveProperty("items");
    expect(json).toHaveProperty("total", 1);
  });

  it("POST 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null as never);
    const req = new NextRequest("http://localhost/api/v1/apps", {
      method: "POST",
      body: JSON.stringify({ name: "New App" }),
    });
    const res = await handler.POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json).toEqual({ message: "Unauthorized" });
  });

  it("POST 201 on success", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
    } as never);
    mockCreateApp.mockResolvedValueOnce({
      success: true,
      data: { id: "app-1" },
    } as never);

    const req = new NextRequest("http://localhost/api/v1/apps", {
      method: "POST",
      body: JSON.stringify({ name: "New App" }),
    });
    const res = await handler.POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ success: true, data: { id: "app-1" } });
  });
});
