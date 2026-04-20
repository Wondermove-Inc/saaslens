import { createSubscription, getSubscriptions } from "@/actions/subscriptions";
import * as handler from "@/app/api/v1/subscriptions/route";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/actions/subscriptions", () => ({
  getSubscriptions: vi.fn(),
  createSubscription: vi.fn(),
}));

const mockAuth = vi.mocked(auth);
const mockGetSubscriptions = vi.mocked(getSubscriptions);
const mockCreateSubscription = vi.mocked(createSubscription);

describe("/api/v1/subscriptions 계약", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("GET 401 when unauthenticated", async () => {
      mockAuth.mockResolvedValueOnce(null as never);

      const req = new NextRequest("http://localhost/api/v1/subscriptions");
      const res = await handler.GET(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json).toEqual({ message: "Unauthorized" });
    });

    it("GET 200 with items/total", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);
      mockGetSubscriptions.mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      const req = new NextRequest(
        "http://localhost/api/v1/subscriptions?page=1&limit=20"
      );
      const res = await handler.GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toHaveProperty("items");
      expect(json).toHaveProperty("total", 0);
    });

    it("GET applies filter params correctly", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);
      mockGetSubscriptions.mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      const req = new NextRequest(
        "http://localhost/api/v1/subscriptions?status=ACTIVE&billingCycle=MONTHLY&search=test"
      );
      await handler.GET(req);

      expect(mockGetSubscriptions).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            status: "ACTIVE",
            billingCycle: "MONTHLY",
            search: "test",
          }),
        })
      );
    });
  });

  describe("POST", () => {
    it("POST 401 when unauthenticated", async () => {
      mockAuth.mockResolvedValueOnce(null as never);

      const req = new NextRequest("http://localhost/api/v1/subscriptions", {
        method: "POST",
        body: JSON.stringify({ name: "New Subscription" }),
      });
      const res = await handler.POST(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json).toEqual({ message: "Unauthorized" });
    });

    it("POST 200 on success", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);
      mockCreateSubscription.mockResolvedValueOnce({
        success: true,
        data: { id: "sub-1" },
      } as never);

      const req = new NextRequest("http://localhost/api/v1/subscriptions", {
        method: "POST",
        body: JSON.stringify({ appId: "app-1", cost: 100 }),
      });
      const res = await handler.POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual({ success: true, data: { id: "sub-1" } });
    });

    it("POST 400 on validation error", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);
      mockCreateSubscription.mockResolvedValueOnce({
        success: false,
        error: "Validation failed",
      } as never);

      const req = new NextRequest("http://localhost/api/v1/subscriptions", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const res = await handler.POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
    });
  });
});
