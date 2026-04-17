import * as costAnalytics from "@/actions/cost-analytics";
import * as dashboard from "@/actions/dashboard";
import * as departmentInsights from "@/actions/department-insights";
import * as discoveryInsights from "@/actions/discovery-insights";
import * as pendingConfirmations from "@/actions/pending-confirmations";
import * as securityInsights from "@/actions/security-insights";
import * as handler from "@/app/api/v1/dashboard/summary/route";
import * as requireAuth from "@/lib/auth/require-auth";
import * as unifiedPayment from "@/lib/services/payment/unified-payment";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// NextRequest mock 생성 헬퍼
function createMockRequest(searchParams?: Record<string, string>): NextRequest {
  const url = new URL("http://localhost/api/v1/dashboard/summary");
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return {
    nextUrl: url,
  } as NextRequest;
}

// Mock all dependencies
vi.mock("@/lib/auth/require-auth", () => ({
  requireOrganization: vi.fn(),
}));

vi.mock("@/actions/dashboard", () => ({
  getDashboardStats: vi.fn(),
  getAppsByCategory: vi.fn(),
  getUpcomingRenewals: vi.fn(),
  getRecentActivity: vi.fn(),
}));

vi.mock("@/actions/cost-analytics", () => ({
  getCostStatistics: vi.fn(),
  getTopCostApps: vi.fn(),
  getMonthlyCostTrend: vi.fn(),
}));

vi.mock("@/actions/discovery-insights", () => ({
  getDiscoveryInsights: vi.fn(),
}));

vi.mock("@/actions/security-insights", () => ({
  getSecurityInsights: vi.fn(),
}));

vi.mock("@/actions/department-insights", () => ({
  getDepartmentInsights: vi.fn(),
}));

vi.mock("@/actions/pending-confirmations", () => ({
  getPendingConfirmations: vi.fn(),
}));

vi.mock("@/lib/services/payment/unified-payment", () => ({
  getUnifiedUnmatchedCount: vi.fn(),
}));

const mockRequireOrganization = vi.mocked(requireAuth.requireOrganization);
const mockGetDashboardStats = vi.mocked(dashboard.getDashboardStats);
const mockGetAppsByCategory = vi.mocked(dashboard.getAppsByCategory);
const mockGetUpcomingRenewals = vi.mocked(dashboard.getUpcomingRenewals);
const mockGetRecentActivity = vi.mocked(dashboard.getRecentActivity);
const mockGetCostStatistics = vi.mocked(costAnalytics.getCostStatistics);
const mockGetTopCostApps = vi.mocked(costAnalytics.getTopCostApps);
const mockGetMonthlyCostTrend = vi.mocked(costAnalytics.getMonthlyCostTrend);
const mockGetDiscoveryInsights = vi.mocked(
  discoveryInsights.getDiscoveryInsights
);
const mockGetSecurityInsights = vi.mocked(securityInsights.getSecurityInsights);
const mockGetDepartmentInsights = vi.mocked(
  departmentInsights.getDepartmentInsights
);
const mockGetPendingConfirmations = vi.mocked(
  pendingConfirmations.getPendingConfirmations
);
const mockGetUnifiedUnmatchedCount = vi.mocked(
  unifiedPayment.getUnifiedUnmatchedCount
);

describe("/api/v1/dashboard/summary 계약", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET redirect when unauthenticated", async () => {
    // requireOrganization throws NEXT_REDIRECT on auth failure
    const redirectError = new Error("NEXT_REDIRECT");
    redirectError.message = "NEXT_REDIRECT";
    (redirectError as unknown as { digest: string }).digest =
      "NEXT_REDIRECT;replace;/login";
    mockRequireOrganization.mockRejectedValueOnce(redirectError);

    await expect(handler.GET(createMockRequest())).rejects.toThrow(
      "NEXT_REDIRECT"
    );
  });

  it("GET 200 with dashboard summary data", async () => {
    mockRequireOrganization.mockResolvedValueOnce({
      session: {
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      },
      organizationId: "org-1",
      userId: "user-1",
      role: "ADMIN",
    } as never);

    // Mock all dashboard data
    mockGetDashboardStats.mockResolvedValueOnce({
      totalApps: 10,
      activeApps: 8,
      totalSpend: 50000,
    } as never);

    mockGetCostStatistics.mockResolvedValueOnce({
      success: true,
      data: { statistics: { totalCost: 50000 } },
    } as never);

    mockGetTopCostApps.mockResolvedValueOnce({
      success: true,
      data: { apps: [] },
    } as never);

    mockGetMonthlyCostTrend.mockResolvedValueOnce({
      success: true,
      data: { trends: [], averageCost: 0 },
    } as never);

    mockGetUnifiedUnmatchedCount.mockResolvedValueOnce({
      cardCount: 0,
      csvCount: 0,
      total: 0,
    });

    mockGetAppsByCategory.mockResolvedValueOnce([]);
    mockGetUpcomingRenewals.mockResolvedValueOnce([]);
    mockGetDiscoveryInsights.mockResolvedValueOnce({} as never);
    mockGetRecentActivity.mockResolvedValueOnce([]);
    mockGetSecurityInsights.mockResolvedValueOnce({} as never);
    mockGetDepartmentInsights.mockResolvedValueOnce({
      totalDepartments: 0,
      departments: [],
      topApps: [],
    });
    mockGetPendingConfirmations.mockResolvedValueOnce({
      success: true,
      data: { items: [], total: 0 },
    } as never);

    const res = await handler.GET(createMockRequest({ preset: "30d" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveProperty("stats");
    expect(json).toHaveProperty("costStats");
    expect(json).toHaveProperty("topApps");
    expect(json).toHaveProperty("monthlyTrend");
    expect(json).toHaveProperty("discovery");
    expect(json).toHaveProperty("security");
  });

  it("GET handles failed cost analytics gracefully", async () => {
    mockRequireOrganization.mockResolvedValueOnce({
      session: {
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      },
      organizationId: "org-1",
      userId: "user-1",
      role: "ADMIN",
    } as never);

    mockGetDashboardStats.mockResolvedValueOnce({
      totalApps: 0,
      activeApps: 0,
      totalSpend: 0,
    } as never);

    // Simulate failed cost analytics
    mockGetCostStatistics.mockResolvedValueOnce({
      success: false,
      error: "Database error",
    } as never);

    mockGetTopCostApps.mockResolvedValueOnce({
      success: false,
      error: "Database error",
    } as never);

    mockGetMonthlyCostTrend.mockResolvedValueOnce({
      success: false,
      error: "Database error",
    } as never);

    mockGetUnifiedUnmatchedCount.mockResolvedValueOnce({
      cardCount: 0,
      csvCount: 0,
      total: 0,
    });

    mockGetAppsByCategory.mockResolvedValueOnce([]);
    mockGetUpcomingRenewals.mockResolvedValueOnce([]);
    mockGetDiscoveryInsights.mockResolvedValueOnce({} as never);
    mockGetRecentActivity.mockResolvedValueOnce([]);
    mockGetSecurityInsights.mockResolvedValueOnce({} as never);
    mockGetDepartmentInsights.mockResolvedValueOnce({
      totalDepartments: 0,
      departments: [],
      topApps: [],
    });
    mockGetPendingConfirmations.mockResolvedValueOnce({
      success: false,
    } as never);

    const res = await handler.GET(createMockRequest({ preset: "7d" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    // Should fallback to null/empty values
    expect(json.costStats).toBeNull();
    expect(json.topApps).toEqual([]);
    expect(json.monthlyTrend).toEqual([]);
  });

  it("GET with custom date range params", async () => {
    mockRequireOrganization.mockResolvedValueOnce({
      session: {
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      },
      organizationId: "org-1",
      userId: "user-1",
      role: "ADMIN",
    } as never);

    mockGetDashboardStats.mockResolvedValueOnce({} as never);
    mockGetCostStatistics.mockResolvedValueOnce({
      success: true,
      data: { statistics: {} },
    } as never);
    mockGetTopCostApps.mockResolvedValueOnce({
      success: true,
      data: { apps: [] },
    } as never);
    mockGetMonthlyCostTrend.mockResolvedValueOnce({
      success: true,
      data: { trends: [], averageCost: 0 },
    } as never);
    mockGetUnifiedUnmatchedCount.mockResolvedValueOnce({ total: 0 } as never);
    mockGetAppsByCategory.mockResolvedValueOnce([]);
    mockGetUpcomingRenewals.mockResolvedValueOnce([]);
    mockGetDiscoveryInsights.mockResolvedValueOnce({} as never);
    mockGetRecentActivity.mockResolvedValueOnce([]);
    mockGetSecurityInsights.mockResolvedValueOnce({} as never);
    mockGetDepartmentInsights.mockResolvedValueOnce({} as never);
    mockGetPendingConfirmations.mockResolvedValueOnce({
      success: true,
      data: { items: [], total: 0 },
    } as never);

    const res = await handler.GET(
      createMockRequest({
        preset: "custom",
        startDate: "2025-01-01T00:00:00.000Z",
        endDate: "2025-01-15T00:00:00.000Z",
      })
    );

    expect(res.status).toBe(200);
    // getCostStatistics should be called with date range
    expect(mockGetCostStatistics).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      })
    );
  });
});
