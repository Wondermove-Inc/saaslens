// src/components/subscriptions/subscription-detail-seat-card.test.tsx
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/actions/subscriptions/subscription-seat-management", () => ({
  getSubscriptionSeatDetails: vi.fn(),
  assignUserToSubscription: vi.fn(),
  removeUserFromSubscription: vi.fn(),
}));

vi.mock("@/actions/users-read", () => ({
  getUsers: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => {
    const t = (key: string, params?: Record<string, unknown>) => {
      if (key === "remaining") return `${params?.count ?? 0} seats remaining`;
      const translations: Record<string, string> = {
        title: "Seat Allocation",
        badge: "Per Seat",
        usage: "In use",
        "summary.assigned": "Assigned",
        "summary.unassigned": "Unassigned",
        "summary.inactive": "Inactive (30d+)",
        "table.user": "User",
        "table.lastUsedAt": "Last Used",
        "table.actions": "Actions",
        "table.never": "Never used",
        "table.inactive": "Inactive",
        addUser: "Add User",
        addUserTitle: "Add Seat User",
        addUserDescription: "Assign a user to this subscription",
        searchUsers: "Search users...",
        noUsersFound: "No users found",
        removeUser: "Remove",
        assignSuccess: "User assigned",
        removeSuccess: "User removed",
        noUsers: "No users assigned",
        loading: "Loading seat info...",
      };
      return translations[key] ?? key;
    };
    return t;
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock radix-ui based shadcn components to avoid dual React copy
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/progress", () => ({
  Progress: ({ value }: { value: number }) => (
    <div role="progressbar" aria-valuenow={value} data-testid="progress" />
  ),
}));

import { getSubscriptionSeatDetails } from "@/actions/subscriptions/subscription-seat-management";
import { render, screen, waitFor } from "@testing-library/react";
import { SubscriptionDetailSeatCard } from "./subscription-detail-seat-card";

const mockGetSeatDetails = vi.mocked(getSubscriptionSeatDetails);

describe("SubscriptionDetailSeatCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render nothing for non-PER_SEAT with no totalLicenses", () => {
    const { container } = render(
      <SubscriptionDetailSeatCard
        subscriptionId="sub-1"
        totalLicenses={null}
        usedLicenses={null}
        billingType="FLAT_RATE"
        perSeatPrice={null}
      />
    );
    expect(container.innerHTML).toBe("");
  });

  it("should render simple progress for non-PER_SEAT with totalLicenses", () => {
    render(
      <SubscriptionDetailSeatCard
        subscriptionId="sub-1"
        totalLicenses={10}
        usedLicenses={7}
        billingType="FLAT_RATE"
        perSeatPrice={null}
      />
    );
    expect(screen.getByText("7 / 10")).toBeInTheDocument();
  });

  it("should render loading state initially for PER_SEAT", () => {
    mockGetSeatDetails.mockImplementation(
      () => new Promise(() => {}) // never resolves
    );

    render(
      <SubscriptionDetailSeatCard
        subscriptionId="sub-1"
        totalLicenses={10}
        usedLicenses={5}
        billingType="PER_SEAT"
        perSeatPrice={15000}
      />
    );
    expect(screen.getByText("Loading seat info...")).toBeInTheDocument();
  });

  it("should render seat details with user table after loading", async () => {
    mockGetSeatDetails.mockResolvedValue({
      success: true,
      data: {
        assignedUsers: [
          {
            id: "user-1",
            name: "Active User",
            email: "active@test.com",
            assignedAt: new Date("2025-01-01"),
            assignedBy: "admin-1",
            lastUsedAt: new Date(),
            isInactive: false,
          },
          {
            id: "user-2",
            name: "Inactive User",
            email: "inactive@test.com",
            assignedAt: new Date("2025-01-01"),
            assignedBy: "admin-1",
            lastUsedAt: new Date("2025-01-01"),
            isInactive: true,
          },
        ],
        totalSeats: 10,
        usedSeats: 2,
        unassignedSeats: 8,
        inactiveSeats: 1,
      },
    });

    render(
      <SubscriptionDetailSeatCard
        subscriptionId="sub-1"
        totalLicenses={10}
        usedLicenses={2}
        billingType="PER_SEAT"
        perSeatPrice={15000}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Seat Allocation")).toBeInTheDocument();
    });

    expect(screen.getByText("Per Seat")).toBeInTheDocument();
    expect(screen.getByText("2 / 10 Seat")).toBeInTheDocument();
    expect(screen.getByText("Active User")).toBeInTheDocument();
    expect(screen.getByText("Inactive User")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("should show 'no users' when empty", async () => {
    mockGetSeatDetails.mockResolvedValue({
      success: true,
      data: {
        assignedUsers: [],
        totalSeats: 5,
        usedSeats: 0,
        unassignedSeats: 5,
        inactiveSeats: 0,
      },
    });

    render(
      <SubscriptionDetailSeatCard
        subscriptionId="sub-1"
        totalLicenses={5}
        usedLicenses={0}
        billingType="PER_SEAT"
        perSeatPrice={10000}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("No users assigned")).toBeInTheDocument();
    });
  });
});
