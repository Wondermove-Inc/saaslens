// src/app/(dashboard)/reports/cost/_components/seat-analysis-section.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/actions/seat-waste-analysis", () => ({
  getSeatWasteAnalysis: vi.fn(),
}));

vi.mock("@/actions/seat-optimization", () => ({
  getSeatOptimizationSuggestions: vi.fn(),
  simulateSeatReduction: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params?.count !== undefined) return `${params.count}`;
    return key;
  },
}));

vi.mock("next/image", () => ({
  default: (props: { alt: string }) => <img alt={props.alt} />,
}));

// Mock Radix-based components to avoid dual React copy issue
vi.mock("@/components/ui/progress", () => ({
  Progress: ({ value }: { value: number }) => (
    <div role="progressbar" aria-valuenow={value} data-testid="progress" />
  ),
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: ({ orientation }: { orientation?: string }) => (
    <hr data-orientation={orientation} />
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    variant?: string;
    className?: string;
  }) => (
    <span data-testid="badge" {...props}>
      {children}
    </span>
  ),
}));

import { getSeatOptimizationSuggestions } from "@/actions/seat-optimization";
import { getSeatWasteAnalysis } from "@/actions/seat-waste-analysis";
import { SeatAnalysisSection } from "./seat-analysis-section";

const mockGetSeatWasteAnalysis = vi.mocked(getSeatWasteAnalysis);
const mockGetSeatOptimizationSuggestions = vi.mocked(
  getSeatOptimizationSuggestions
);

describe("SeatAnalysisSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show loading state initially", () => {
    mockGetSeatWasteAnalysis.mockReturnValue(new Promise(() => {}));
    mockGetSeatOptimizationSuggestions.mockReturnValue(new Promise(() => {}));

    render(<SeatAnalysisSection />);
    expect(document.querySelector(".animate-spin")).toBeTruthy();
  });

  it("should show noData message when no PER_SEAT subscriptions", async () => {
    mockGetSeatWasteAnalysis.mockResolvedValue({
      success: true,
      data: {
        summary: {
          totalMonthlyWaste: 0,
          totalAnnualWaste: 0,
          overallUtilizationRate: 0,
          appCount: 0,
          totalWastedSeats: 0,
        },
        apps: [],
      },
    });
    mockGetSeatOptimizationSuggestions.mockResolvedValue({
      success: true,
      data: {
        items: [],
        totalMonthlySavings: 0,
        totalAnnualSavings: 0,
        optimizableAppCount: 0,
      },
    });

    render(<SeatAnalysisSection />);

    await waitFor(() => {
      expect(screen.getByText("noData")).toBeInTheDocument();
    });
  });

  it("should render waste analysis KPIs when data exists", async () => {
    mockGetSeatWasteAnalysis.mockResolvedValue({
      success: true,
      data: {
        summary: {
          totalMonthlyWaste: 500000,
          totalAnnualWaste: 6000000,
          overallUtilizationRate: 72,
          appCount: 3,
          totalWastedSeats: 20,
        },
        apps: [
          {
            appId: "app1",
            appName: "Slack",
            appLogoUrl: null,
            totalSeats: 50,
            assignedSeats: 40,
            activeSeats: 30,
            inactiveSeats: 10,
            unassignedSeats: 10,
            wastedSeats: 20,
            monthlyWaste: 200000,
            annualWaste: 2400000,
            utilizationRate: 60,
            perSeatPrice: 10000,
          },
        ],
      },
    });
    mockGetSeatOptimizationSuggestions.mockResolvedValue({
      success: true,
      data: {
        items: [],
        totalMonthlySavings: 0,
        totalAnnualSavings: 0,
        optimizableAppCount: 0,
      },
    });

    render(<SeatAnalysisSection />);

    await waitFor(() => {
      expect(screen.getByText("wasteTitle")).toBeInTheDocument();
      expect(screen.getByText("Slack")).toBeInTheDocument();
      expect(screen.getByText("monthlyWaste")).toBeInTheDocument();
      expect(screen.getByText("annualWaste")).toBeInTheDocument();
    });
  });

  it("should render optimization suggestions when data exists", async () => {
    mockGetSeatWasteAnalysis.mockResolvedValue({
      success: true,
      data: {
        summary: {
          totalMonthlyWaste: 0,
          totalAnnualWaste: 0,
          overallUtilizationRate: 0,
          appCount: 0,
          totalWastedSeats: 0,
        },
        apps: [],
      },
    });
    mockGetSeatOptimizationSuggestions.mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            subscriptionId: "sub1",
            appId: "app1",
            appName: "Notion",
            appLogoUrl: null,
            currentSeats: 30,
            activeUsers: 20,
            recommendedSeats: 22,
            excessSeats: 8,
            perSeatPrice: 15000,
            monthlySavings: 120000,
            annualSavings: 1440000,
          },
        ],
        totalMonthlySavings: 120000,
        totalAnnualSavings: 1440000,
        optimizableAppCount: 1,
      },
    });

    render(<SeatAnalysisSection />);

    await waitFor(() => {
      expect(
        screen.getAllByText("optimizationTitle").length
      ).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Notion")).toBeInTheDocument();
    });
  });

  it("should handle API failure gracefully", async () => {
    mockGetSeatWasteAnalysis.mockResolvedValue({
      success: false,
      error: "Failed",
    });
    mockGetSeatOptimizationSuggestions.mockResolvedValue({
      success: false,
      error: "Failed",
    });

    render(<SeatAnalysisSection />);

    await waitFor(() => {
      expect(screen.getByText("noData")).toBeInTheDocument();
    });
  });
});
