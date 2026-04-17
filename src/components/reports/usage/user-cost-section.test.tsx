// src/components/reports/usage/user-cost-section.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/actions/user-cost-analysis", () => ({
  getUserCostBreakdown: vi.fn(),
  getTeamCostComparison: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("next/image", () => ({
  default: (props: { alt: string }) => <img alt={props.alt} />,
}));

// Mock Radix-based components to avoid dual React copy issue
vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    defaultValue?: string;
  }) => (
    <div data-testid="tabs" data-value={props.defaultValue}>
      {children}
    </div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tabs-list">{children}</div>
  ),
  TabsTrigger: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <button data-testid={`tab-${value}`}>{children}</button>,
  TabsContent: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <div data-testid={`tab-content-${value}`}>{children}</div>,
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

import {
  getTeamCostComparison,
  getUserCostBreakdown,
} from "@/actions/user-cost-analysis";
import { UserCostSection } from "./user-cost-section";

const mockGetUserCostBreakdown = vi.mocked(getUserCostBreakdown);
const mockGetTeamCostComparison = vi.mocked(getTeamCostComparison);

describe("UserCostSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show loading state initially", () => {
    mockGetUserCostBreakdown.mockReturnValue(new Promise(() => {}));
    mockGetTeamCostComparison.mockReturnValue(new Promise(() => {}));

    render(<UserCostSection />);
    expect(document.querySelector(".animate-spin")).toBeTruthy();
  });

  it("should return null when no data", async () => {
    mockGetUserCostBreakdown.mockResolvedValue({
      success: true,
      data: { users: [], totalMonthlyCost: 0 },
    });
    mockGetTeamCostComparison.mockResolvedValue({
      success: true,
      data: { teams: [] },
    });

    render(<UserCostSection />);

    await waitFor(() => {
      expect(document.querySelector(".animate-spin")).toBeFalsy();
    });

    expect(screen.queryByText("title")).not.toBeInTheDocument();
  });

  it("should render user cost table when data exists", async () => {
    mockGetUserCostBreakdown.mockResolvedValue({
      success: true,
      data: {
        users: [
          {
            userId: "u1",
            userName: "홍길동",
            userEmail: "hong@test.com",
            teamId: "t1",
            teamName: "Engineering",
            totalMonthlyCost: 50000,
            assignedAppCount: 3,
            activeAppCount: 2,
            subscriptions: [
              {
                subscriptionId: "s1",
                appName: "Figma",
                appLogoUrl: null,
                perSeatPrice: 25000,
                isActive: true,
              },
            ],
          },
        ],
        totalMonthlyCost: 50000,
      },
    });
    mockGetTeamCostComparison.mockResolvedValue({
      success: true,
      data: { teams: [] },
    });

    render(<UserCostSection />);

    await waitFor(() => {
      expect(screen.getByText("title")).toBeInTheDocument();
      expect(screen.getByText("홍길동")).toBeInTheDocument();
    });
  });

  it("should render team cost comparison when data exists", async () => {
    mockGetUserCostBreakdown.mockResolvedValue({
      success: true,
      data: { users: [], totalMonthlyCost: 0 },
    });
    mockGetTeamCostComparison.mockResolvedValue({
      success: true,
      data: {
        teams: [
          {
            teamId: "t1",
            teamName: "Engineering",
            memberCount: 10,
            totalMonthlyCost: 500000,
            costPerMember: 50000,
            activeRate: 80,
          },
        ],
      },
    });

    render(<UserCostSection />);

    await waitFor(() => {
      expect(screen.getByText("title")).toBeInTheDocument();
      expect(screen.getByText("Engineering")).toBeInTheDocument();
    });
  });

  it("should handle API failure gracefully", async () => {
    mockGetUserCostBreakdown.mockResolvedValue({
      success: false,
      error: "Failed",
    });
    mockGetTeamCostComparison.mockResolvedValue({
      success: false,
      error: "Failed",
    });

    render(<UserCostSection />);

    await waitFor(() => {
      expect(document.querySelector(".animate-spin")).toBeFalsy();
    });

    expect(screen.queryByText("title")).not.toBeInTheDocument();
  });
});
