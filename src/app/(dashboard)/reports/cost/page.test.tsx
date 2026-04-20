// src/app/(dashboard)/reports/cost-analysis/page.test.tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CostAnalysisPage from "./page";

// Mock Server Actions
vi.mock("@/actions/cost-analytics", () => ({
  getCostStatistics: vi.fn().mockResolvedValue({
    success: true,
    data: {
      statistics: {
        totalCost: 1500000,
        monthlyAverage: 500000,
        costChange: 15.5,
        transactionCount: 25,
        currency: "KRW",
        periodStart: new Date("2024-11-01"),
        periodEnd: new Date("2024-11-30"),
      },
    },
  }),
  getMonthlyCostTrend: vi.fn().mockResolvedValue({
    success: true,
    data: {
      trends: [
        {
          month: "2024-06",
          displayLabel: "2024년 6월",
          totalCost: 400000,
          transactionCount: 5,
        },
        {
          month: "2024-07",
          displayLabel: "2024년 7월",
          totalCost: 450000,
          transactionCount: 6,
        },
        {
          month: "2024-08",
          displayLabel: "2024년 8월",
          totalCost: 480000,
          transactionCount: 7,
        },
      ],
      averageCost: 443333,
    },
  }),
  getTopCostApps: vi.fn().mockResolvedValue({
    success: true,
    data: {
      apps: [
        {
          appId: "1",
          appName: "Slack",
          totalCost: 500000,
          percentage: 33.3,
          transactionCount: 10,
        },
        {
          appId: "2",
          appName: "Notion",
          totalCost: 300000,
          percentage: 20.0,
          transactionCount: 8,
        },
      ],
      totalCost: 1500000,
    },
  }),
  detectCostAnomalies: vi.fn().mockResolvedValue({
    success: true,
    data: {
      anomalies: [
        {
          appId: "3",
          appName: "Figma",
          currentCost: 200000,
          previousCost: 100000,
          changeRate: 100,
          severity: "medium" as const,
          message: "전월 대비 100% 증가",
        },
      ],
      hasAnomalies: true,
    },
  }),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

// Mock ExportButtons
vi.mock("./_components/export-buttons", () => ({
  ExportButtons: () => <div data-testid="export-buttons">Export Buttons</div>,
}));

// 차트 컴포넌트는 리사이즈/ResponsiveContainer 의존성이 있어 테스트에서 간단히 모킹
vi.mock("./_components/monthly-trend-chart", () => ({
  MonthlyTrendChart: ({
    initialData,
  }: {
    initialData: { displayLabel: string }[];
  }) => (
    <div data-testid="monthly-trend-chart">
      <div>월별 비용 추세</div>
      {initialData.map((item) => (
        <div key={item.displayLabel}>{item.displayLabel}</div>
      ))}
    </div>
  ),
}));

describe("CostAnalysisPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("페이지 제목을 표시해야 한다", async () => {
    const page = await CostAnalysisPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByText("비용 분석 리포트")).toBeInTheDocument();
  });

  it("뒤로가기 링크가 /reports로 연결되어야 한다", async () => {
    const page = await CostAnalysisPage({ searchParams: Promise.resolve({}) });
    render(page);

    const backLink = screen.getByRole("link", { name: "" });
    expect(backLink).toHaveAttribute("href", "/reports");
  });

  it("핵심 지표를 표시해야 한다", async () => {
    const page = await CostAnalysisPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByText("총 비용")).toBeInTheDocument();
    expect(screen.getByText("월 평균 비용")).toBeInTheDocument();
    expect(screen.getByText("결제 건수")).toBeInTheDocument();
    expect(screen.getByText("이상 감지")).toBeInTheDocument();
  });

  it("월별 비용 추세 섹션을 표시해야 한다", async () => {
    const page = await CostAnalysisPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByText("월별 비용 추세")).toBeInTheDocument();
    expect(screen.getByText("2024년 6월")).toBeInTheDocument();
    expect(screen.getByText("2024년 7월")).toBeInTheDocument();
  });

  it("앱별 비용 분포를 표시해야 한다", async () => {
    const page = await CostAnalysisPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByText("앱별 비용 분포")).toBeInTheDocument();
    expect(screen.getByText("Slack")).toBeInTheDocument();
    expect(screen.getByText("Notion")).toBeInTheDocument();
  });

  it("비용 이상 감지 섹션을 표시해야 한다", async () => {
    const page = await CostAnalysisPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByText("비용 이상 감지")).toBeInTheDocument();
    expect(screen.getByText("Figma")).toBeInTheDocument();
    expect(screen.getByText("+100%")).toBeInTheDocument();
  });

  it("내보내기 버튼을 표시해야 한다", async () => {
    const page = await CostAnalysisPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByTestId("export-buttons")).toBeInTheDocument();
  });
});
