// src/app/(dashboard)/settings/budget/page.test.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock modules
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/actions/budget-settings", () => ({
  getBudgetSettings: vi.fn(),
}));

class RedirectError extends Error {
  url: string;
  constructor(url: string) {
    super(`Redirect to ${url}`);
    this.url = url;
  }
}

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new RedirectError(url);
  }),
}));

// Mock the BudgetSettingsForm component
vi.mock("@/components/settings/budget-settings-form", () => ({
  BudgetSettingsForm: ({ initialSettings }: { initialSettings: unknown }) => (
    <div data-testid="budget-settings-form">
      BudgetSettingsForm: {JSON.stringify(initialSettings)}
    </div>
  ),
}));

import { getBudgetSettings } from "@/actions/budget-settings";
import { auth } from "@/lib/auth";
import { DEFAULT_BUDGET_SETTINGS } from "@/types/budget";
import { redirect } from "next/navigation";
import BudgetSettingsPage from "./page";

describe("BudgetSettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should redirect to login if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    await expect(BudgetSettingsPage()).rejects.toThrow("Redirect to /login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("should redirect to onboarding if no organization", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: "user-1",
        organizationId: null,
        role: "ADMIN",
        email: "test@test.com",
      },
      expires: new Date().toISOString(),
    } as any);

    await expect(BudgetSettingsPage()).rejects.toThrow(
      "Redirect to /onboarding"
    );
    expect(redirect).toHaveBeenCalledWith("/onboarding");
  });

  it("should render page with budget settings form", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: "user-1",
        organizationId: "org-1",
        role: "ADMIN",
        email: "admin@test.com",
      },
      expires: new Date().toISOString(),
    } as any);

    vi.mocked(getBudgetSettings).mockResolvedValue(DEFAULT_BUDGET_SETTINGS);

    const page = await BudgetSettingsPage();
    render(page);

    expect(screen.getByTestId("budget-settings-form")).toBeInTheDocument();
  });

  it("should pass initial settings to form", async () => {
    const customSettings = {
      currency: "USD" as const,
      monthlyBudget: 10000,
      alertThreshold: 90,
    };

    vi.mocked(auth).mockResolvedValue({
      user: {
        id: "user-1",
        organizationId: "org-1",
        role: "ADMIN",
        email: "admin@test.com",
      },
      expires: new Date().toISOString(),
    } as any);

    vi.mocked(getBudgetSettings).mockResolvedValue(customSettings);

    const page = await BudgetSettingsPage();
    render(page);

    expect(screen.getByTestId("budget-settings-form")).toHaveTextContent(
      JSON.stringify(customSettings)
    );
  });
});
