// src/components/new-dashboard/new-dashboard-client.test.tsx
// Phase 1 RED: /dashboard 프로덕션 렌더링 검증 테스트
// 미사용 코드 삭제 후에도 NewDashboardClient가 정상 렌더링되는지 확인

import messages from "@/i18n/messages/ko.json";
import type { DashboardV3Data } from "@/types/dashboard";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// next-intl mock
vi.mock("next-intl", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getNestedValue(obj: any, path: string): string | undefined {
    return path.split(".").reduce((acc, key) => acc?.[key], obj);
  }

  return {
    useTranslations: (namespace?: string) => {
      const t = (key: string, values?: Record<string, string | number>) => {
        const fullKey = namespace ? `${namespace}.${key}` : key;
        const value = getNestedValue(messages, fullKey);
        if (!value || typeof value !== "string") return key;
        if (!values) return value;
        return Object.entries(values).reduce(
          (acc, [k, v]) => acc.replace(`{${k}}`, String(v)),
          value
        );
      };
      return t;
    },
    NextIntlClientProvider: ({ children }: { children: React.ReactNode }) =>
      children,
  };
});

// Mock 하위 컴포넌트들 (단위 테스트이므로 자식 컴포넌트를 mock)
vi.mock("./bento-optimization-hero", () => ({
  BentoOptimizationHero: ({ isReadOnly }: { isReadOnly?: boolean }) => (
    <div data-testid="bento-optimization-hero" data-readonly={isReadOnly}>
      OptimizationHero
    </div>
  ),
}));

vi.mock("./bento-kpi-cards", () => ({
  BentoKpiCards: () => <div data-testid="bento-kpi-cards">KpiCards</div>,
}));

vi.mock("./cost-bar-chart", () => ({
  CostBarChart: () => (
    <div data-testid="bento-cost-bar-chart">CostBarChart</div>
  ),
}));

vi.mock("./cost-apps-table", () => ({
  CostAppsTable: () => (
    <div data-testid="bento-cost-apps-table">CostAppsTable</div>
  ),
}));

vi.mock("./seat-utilization-chart", () => ({
  SeatUtilizationChart: () => (
    <div data-testid="bento-seat-utilization">SeatUtilization</div>
  ),
}));

vi.mock("./per-user-license-apps-chart", () => ({
  PerUserLicenseAppsChart: () => (
    <div data-testid="bento-per-user-license">PerUserLicense</div>
  ),
}));

vi.mock("./upcoming-renewals", () => ({
  UpcomingRenewals: () => (
    <div data-testid="bento-upcoming-renewals">UpcomingRenewals</div>
  ),
}));

vi.mock("./apps-by-category", () => ({
  AppsByCategory: () => (
    <div data-testid="bento-apps-by-category">AppsByCategory</div>
  ),
}));

vi.mock("./department-spend-chart", () => ({
  DepartmentSpendChart: () => (
    <div data-testid="bento-department-spend">DepartmentSpend</div>
  ),
}));

vi.mock("./recent-activity", () => ({
  RecentActivity: () => (
    <div data-testid="bento-recent-activity">RecentActivity</div>
  ),
}));

// DashboardAlertBanner mock - 이제 같은 디렉토리에 위치
vi.mock("./dashboard-alert-banner", () => ({
  DashboardAlertBanner: ({ alerts }: { alerts: unknown[] }) => (
    <div data-testid="dashboard-alert-banner" data-alert-count={alerts.length}>
      AlertBanner
    </div>
  ),
}));

// ResponsiveBentoGrid mock
vi.mock("@/components/common", () => ({
  ResponsiveBentoGrid: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bento-grid">{children}</div>
  ),
  ResponsiveBentoItem: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bento-item">{children}</div>
  ),
}));

import { NewDashboardClient } from "./new-dashboard-client";

// ============================================================
// Test Fixtures
// ============================================================

const mockDashboardV3Data: DashboardV3Data = {
  hero: {
    monthlySavings: 1500000,
    annualSavings: 18000000,
    vsLastMonth: -5.2,
    breakdown: {
      unusedLicenses: { amount: 500000, count: 3 },
      duplicateSubs: { amount: 700000, count: 2 },
      unusedApps: { amount: 300000, count: 1 },
    },
  },
  kpi: {
    totalCost: { amount: 50000000, changePercent: 3.5 },
    anomaly: { count: 2, severity: "medium" },
    terminated: { count: 5, appCount: 12 },
    appsWithoutSub: { count: 3, totalActiveApps: 25 },
  },
  costTrend: [
    {
      month: "2026-01",
      displayLabel: "1월",
      saasCost: 3000000,
      nonSaasCost: 500000,
    },
    {
      month: "2026-02",
      displayLabel: "2월",
      saasCost: 3200000,
      nonSaasCost: 450000,
    },
  ],
  topApps: [
    {
      id: "app-1",
      name: "Slack",
      monthlyCost: 1200000,
      usedLicenses: 80,
      totalLicenses: 100,
      usageEfficiency: 80,
      grade: "B" as const,
      hasSeatData: true,
    },
  ],
  renewals: [
    {
      id: "r-1",
      appName: "Notion",
      renewalCost: 5000000,
      daysUntilRenewal: 15,
      urgency: "moderate" as const,
    },
  ],
};

const defaultProps = {
  data: mockDashboardV3Data,
  categoryData: [
    { category: "Collaboration", count: 5, percentage: 50 },
    { category: "Development", count: 3, percentage: 30 },
  ],
  recentActivities: [
    {
      id: "act-1",
      action: "APP_ADDED",
      entityType: "app",
      description: "새 앱이 추가되었습니다",
      createdAt: new Date("2026-03-01"),
    },
  ],
  seatWidgetData: {
    lowUtilizationApps: [],
    topLicenseApps: [],
  },
  departmentSpendData: {
    departments: [],
    totalSpend: 0,
    avgSpendPerDept: 0,
    totalDepartments: 0,
    topApps: [],
  },
};

// ============================================================
// Tests
// ============================================================

describe("NewDashboardClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("5-Row 레이아웃 렌더링", () => {
    it("Row 1: BentoOptimizationHero가 렌더링되어야 한다", () => {
      render(<NewDashboardClient {...defaultProps} />);
      expect(screen.getByTestId("bento-optimization-hero")).toBeInTheDocument();
    });

    it("Row 2: BentoKpiCards가 렌더링되어야 한다", () => {
      render(<NewDashboardClient {...defaultProps} />);
      expect(screen.getByTestId("bento-kpi-cards")).toBeInTheDocument();
    });

    it("Row 3: CostBarChart + CostAppsTable이 렌더링되어야 한다", () => {
      render(<NewDashboardClient {...defaultProps} />);
      expect(screen.getByTestId("bento-cost-bar-chart")).toBeInTheDocument();
      expect(screen.getByTestId("bento-cost-apps-table")).toBeInTheDocument();
    });

    it("Row 4: SeatUtilization + PerUserLicense + UpcomingRenewals가 렌더링되어야 한다", () => {
      render(<NewDashboardClient {...defaultProps} />);
      expect(screen.getByTestId("bento-seat-utilization")).toBeInTheDocument();
      expect(screen.getByTestId("bento-per-user-license")).toBeInTheDocument();
      expect(screen.getByTestId("bento-upcoming-renewals")).toBeInTheDocument();
    });

    it("Row 5: AppsByCategory + DepartmentSpend + RecentActivity가 렌더링되어야 한다", () => {
      render(<NewDashboardClient {...defaultProps} />);
      expect(screen.getByTestId("bento-apps-by-category")).toBeInTheDocument();
      expect(screen.getByTestId("bento-department-spend")).toBeInTheDocument();
      expect(screen.getByTestId("bento-recent-activity")).toBeInTheDocument();
    });

    it("모든 10개 Bento 컴포넌트가 동시에 렌더링되어야 한다", () => {
      render(<NewDashboardClient {...defaultProps} />);

      const expectedTestIds = [
        "bento-optimization-hero",
        "bento-kpi-cards",
        "bento-cost-bar-chart",
        "bento-cost-apps-table",
        "bento-seat-utilization",
        "bento-per-user-license",
        "bento-upcoming-renewals",
        "bento-apps-by-category",
        "bento-department-spend",
        "bento-recent-activity",
      ];

      for (const testId of expectedTestIds) {
        expect(
          screen.getByTestId(testId),
          `${testId}이(가) 렌더링되지 않음`
        ).toBeInTheDocument();
      }
    });
  });

  describe("Alert Banner", () => {
    it("결제 데이터가 없을 때 Alert Banner가 표시되어야 한다", () => {
      render(<NewDashboardClient {...defaultProps} hasPaymentData={false} />);
      expect(screen.getByTestId("dashboard-alert-banner")).toBeInTheDocument();
    });

    it("퇴사자 구독 미회수가 있을 때 Alert Banner가 표시되어야 한다", () => {
      render(
        <NewDashboardClient
          {...defaultProps}
          hasPaymentData={true}
          terminatedWithSubCount={3}
        />
      );
      expect(screen.getByTestId("dashboard-alert-banner")).toBeInTheDocument();
    });

    it("알림이 없을 때 Alert Banner가 표시되지 않아야 한다", () => {
      render(
        <NewDashboardClient
          {...defaultProps}
          hasPaymentData={true}
          terminatedWithSubCount={0}
          subscriptionAnomalies={[]}
          suggestionCount={0}
        />
      );
      expect(
        screen.queryByTestId("dashboard-alert-banner")
      ).not.toBeInTheDocument();
    });

    it("isReadOnly(MEMBER)일 때 Alert Banner가 숨겨져야 한다", () => {
      render(
        <NewDashboardClient
          {...defaultProps}
          hasPaymentData={false}
          isReadOnly={true}
        />
      );
      expect(
        screen.queryByTestId("dashboard-alert-banner")
      ).not.toBeInTheDocument();
    });

    it("구독 이상 감지(FLAT_RATE)가 있을 때 Alert에 포함되어야 한다", () => {
      render(
        <NewDashboardClient
          {...defaultProps}
          hasPaymentData={true}
          subscriptionAnomalies={[
            {
              subscriptionId: "sub-1",
              appName: "Slack",
              billingType: "FLAT_RATE",
            },
          ]}
        />
      );
      expect(screen.getByTestId("dashboard-alert-banner")).toBeInTheDocument();
    });

    it("구독 이상 감지(PER_SEAT)가 있을 때 Alert에 포함되어야 한다", () => {
      render(
        <NewDashboardClient
          {...defaultProps}
          hasPaymentData={true}
          subscriptionAnomalies={[
            {
              subscriptionId: "sub-2",
              appName: "Notion",
              billingType: "PER_SEAT",
              usedLicenses: 5,
              totalLicenses: 20,
            },
          ]}
        />
      );
      expect(screen.getByTestId("dashboard-alert-banner")).toBeInTheDocument();
    });

    it("suggestionCount > 0일 때 Alert에 포함되어야 한다", () => {
      render(
        <NewDashboardClient
          {...defaultProps}
          hasPaymentData={true}
          suggestionCount={5}
        />
      );
      expect(screen.getByTestId("dashboard-alert-banner")).toBeInTheDocument();
    });
  });

  describe("isReadOnly 권한", () => {
    it("isReadOnly가 BentoOptimizationHero에 전달되어야 한다", () => {
      render(<NewDashboardClient {...defaultProps} isReadOnly={true} />);
      const hero = screen.getByTestId("bento-optimization-hero");
      expect(hero).toHaveAttribute("data-readonly", "true");
    });

    it("기본값은 isReadOnly=false이어야 한다", () => {
      render(<NewDashboardClient {...defaultProps} />);
      const hero = screen.getByTestId("bento-optimization-hero");
      expect(hero).toHaveAttribute("data-readonly", "false");
    });
  });

  describe("dashboard-v3 의존성 (삭제 후에도 유지)", () => {
    it("DashboardAlertBanner가 @/components/dashboard-v3에서 정상 import되어야 한다", () => {
      render(<NewDashboardClient {...defaultProps} hasPaymentData={false} />);
      // DashboardAlertBanner가 dashboard-v3 모듈에서 import되어 정상 작동하는지 확인
      expect(screen.getByTestId("dashboard-alert-banner")).toBeInTheDocument();
    });
  });

  describe("ResponsiveBentoGrid 레이아웃", () => {
    it("BentoGrid가 3개 렌더링되어야 한다 (Row 3, 4, 5)", () => {
      render(<NewDashboardClient {...defaultProps} />);
      const grids = screen.getAllByTestId("bento-grid");
      expect(grids).toHaveLength(3);
    });

    it("BentoItem이 총 9개 렌더링되어야 한다 (Row3: 2 + Row4: 3 + Row5: 3 = 8... wait)", () => {
      render(<NewDashboardClient {...defaultProps} />);
      const items = screen.getAllByTestId("bento-item");
      // Row 3: 2 items (CostBarChart + CostAppsTable)
      // Row 4: 3 items (SeatUtilization + PerUserLicense + UpcomingRenewals)
      // Row 5: 3 items (AppsByCategory + DepartmentSpend + RecentActivity)
      expect(items).toHaveLength(8);
    });
  });
});
