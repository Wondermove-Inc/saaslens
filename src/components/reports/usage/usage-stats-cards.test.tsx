// src/components/reports/usage/usage-stats-cards.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UsageStatsCards } from "./usage-stats-cards";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "reports.usage.stats.activeUsers.title": "Active Users",
      "reports.usage.stats.totalApps.title": "Total Apps",
      "reports.usage.stats.unusedApps.title": "Unused Apps",
      "reports.usage.stats.averageUsageRate.title": "Average Usage Rate",
    };
    return translations[key] || key;
  },
}));

describe("UsageStatsCards", () => {
  const mockSummary = {
    totalActiveUsers: 150,
    totalApps: 25,
    unusedAppsCount: 3,
    averageUsageRate: 78.5,
  };

  it("should render 4 KPI cards with correct titles", () => {
    render(<UsageStatsCards summary={mockSummary} />);

    expect(screen.getByText("Active Users")).toBeInTheDocument();
    expect(screen.getByText("Total Apps")).toBeInTheDocument();
    expect(screen.getByText("Unused Apps")).toBeInTheDocument();
    expect(screen.getByText("Average Usage Rate")).toBeInTheDocument();
  });

  it("should display formatted values", () => {
    render(<UsageStatsCards summary={mockSummary} />);

    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("78.5%")).toBeInTheDocument();
  });

  it("should apply Dashboard style pattern to Card", () => {
    const { container } = render(<UsageStatsCards summary={mockSummary} />);

    // Check that Card has Dashboard style classes
    const cards = container.querySelectorAll('[class*="bg-card"]');
    expect(cards.length).toBeGreaterThan(0);

    // Check for border-none class
    const borderlessCards = container.querySelectorAll(
      '[class*="border-none"]'
    );
    expect(borderlessCards.length).toBeGreaterThan(0);
  });

  it("should not render CardContent wrapper", () => {
    const { container } = render(<UsageStatsCards summary={mockSummary} />);

    // CardContent should not exist in new pattern
    const cardContents = container.querySelectorAll('[class*="CardContent"]');
    expect(cardContents.length).toBe(0);
  });

  it("should use text-primary for titles", () => {
    const { container } = render(<UsageStatsCards summary={mockSummary} />);

    const titles = container.querySelectorAll('[class*="text-primary"]');
    expect(titles.length).toBeGreaterThanOrEqual(4);
  });

  it("should use text-2xl font-medium for values", () => {
    const { container } = render(<UsageStatsCards summary={mockSummary} />);

    const values = container.querySelectorAll('[class*="text-2xl"]');
    expect(values.length).toBeGreaterThanOrEqual(4);
  });

  it("should handle zero values correctly", () => {
    const zeroSummary = {
      totalActiveUsers: 0,
      totalApps: 0,
      unusedAppsCount: 0,
      averageUsageRate: 0,
    };

    render(<UsageStatsCards summary={zeroSummary} />);

    // Should render "0" values
    const zeroValues = screen.getAllByText("0");
    expect(zeroValues.length).toBeGreaterThanOrEqual(3); // At least 3 zero values

    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("should handle large numbers with locale formatting", () => {
    const largeSummary = {
      totalActiveUsers: 1234567,
      totalApps: 999,
      unusedAppsCount: 50,
      averageUsageRate: 95.3,
    };

    render(<UsageStatsCards summary={largeSummary} />);

    // toLocaleString() should format large numbers
    expect(screen.getByText("1,234,567")).toBeInTheDocument();
    expect(screen.getByText("999")).toBeInTheDocument();
  });
});
