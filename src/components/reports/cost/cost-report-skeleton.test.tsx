// src/app/(dashboard)/reports/cost/_components/cost-report-skeleton.test.tsx
import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock shadcn/ui components
vi.mock("@/components/ui/card", () => ({
  Card: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
  CardHeader: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="card-header" className={className}>
      {children}
    </div>
  ),
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

import {
  ChartCardSkeleton,
  CostReportPageSkeleton,
  FilterBarSkeleton,
  KpiCardsSkeleton,
  SeatAnalysisSkeleton,
  TableCardSkeleton,
} from "./cost-report-skeleton";

describe("KpiCardsSkeleton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render 4 skeleton cards", () => {
    render(<KpiCardsSkeleton />);

    const cards = screen.getAllByTestId("card");
    expect(cards).toHaveLength(4);
  });

  it("should apply transition-all styling", () => {
    render(<KpiCardsSkeleton />);

    const cards = screen.getAllByTestId("card");
    cards.forEach((card) => {
      expect(card.className).toContain("transition-all");
    });
  });
});

describe("ChartCardSkeleton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render with min-h-[450px]", () => {
    render(<ChartCardSkeleton />);

    const card = screen.getByTestId("card");
    expect(card.className).toContain("min-h-[450px]");
  });

  it("should include chart area skeleton", () => {
    render(<ChartCardSkeleton />);

    const skeletons = screen.getAllByTestId("skeleton");
    // Should have header skeleton and chart area skeleton
    expect(skeletons.length).toBeGreaterThanOrEqual(2);
  });
});

describe("TableCardSkeleton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render default 5 rows", () => {
    render(<TableCardSkeleton />);

    const card = screen.getByTestId("card");
    const cardContent = screen.getByTestId("card-content");

    // Count skeleton rows
    const skeletons = screen.getAllByTestId("skeleton");
    // 5 rows with multiple skeletons per row (icon, name, badge, amount)
    expect(skeletons.length).toBeGreaterThanOrEqual(5);
  });

  it("should render custom row count when prop provided", () => {
    render(<TableCardSkeleton rowCount={3} />);

    const card = screen.getByTestId("card");
    expect(card).toBeTruthy();

    // With 3 rows, should have fewer skeletons than default
    const skeletons = screen.getAllByTestId("skeleton");
    // 3 rows should have less skeletons than default 5 rows
    expect(skeletons.length).toBeLessThan(20); // Assuming ~4 skeletons per row
  });
});

describe("FilterBarSkeleton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render team and user select skeletons", () => {
    render(<FilterBarSkeleton />);

    const skeletons = screen.getAllByTestId("skeleton");
    // Should have at least 2 skeletons (team select + user select)
    expect(skeletons.length).toBeGreaterThanOrEqual(2);
  });

  it("should have appropriate height for select inputs", () => {
    render(<FilterBarSkeleton />);

    const skeletons = screen.getAllByTestId("skeleton");
    skeletons.forEach((skeleton) => {
      // Select inputs should have h-9 class
      expect(skeleton.className).toMatch(/h-9|h-10/);
    });
  });
});

describe("SeatAnalysisSkeleton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render waste and optimization sections", () => {
    render(<SeatAnalysisSkeleton />);

    const cards = screen.getAllByTestId("card");
    // Should have at least 2 cards (waste section + optimization section)
    expect(cards.length).toBeGreaterThanOrEqual(2);
  });

  it("should include table skeletons in both sections", () => {
    render(<SeatAnalysisSkeleton />);

    const skeletons = screen.getAllByTestId("skeleton");
    // Both sections have tables with multiple rows
    expect(skeletons.length).toBeGreaterThan(10);
  });
});

describe("CostReportPageSkeleton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should compose all skeleton components", () => {
    render(<CostReportPageSkeleton />);

    const cards = screen.getAllByTestId("card");
    // Should include:
    // - 4 KPI cards
    // - 1-2 Chart cards
    // - 1-2 Table cards
    // - Seat analysis cards
    expect(cards.length).toBeGreaterThanOrEqual(8);
  });

  it("should include FilterBarSkeleton", () => {
    render(<CostReportPageSkeleton />);

    const skeletons = screen.getAllByTestId("skeleton");
    // Should have filter bar skeletons + all other skeletons
    expect(skeletons.length).toBeGreaterThan(20);
  });

  it("should maintain proper spacing with space-y-4", () => {
    const { container } = render(<CostReportPageSkeleton />);

    const mainDiv = container.firstChild as HTMLElement;
    expect(mainDiv.className).toContain("space-y-4");
  });
});
