import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DashboardAlertItem } from "./dashboard-alert-banner";
import { DashboardAlertBanner } from "./dashboard-alert-banner";

// Mock next-intl with params support
vi.mock("next-intl", () => ({
  useTranslations:
    () => (key: string, params?: Record<string, string | number>) => {
      if (!params) return key;
      return Object.entries(params).reduce(
        (str, [k, v]) => str.replace(`{${k}}`, String(v)),
        key
      );
    },
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const baseAlert: DashboardAlertItem = {
  id: "no-payment-data",
  severity: "info",
  titleKey: "noPaymentData.title",
  messageKey: "noPaymentData.message",
  href: "/payments",
};

const warningAlert: DashboardAlertItem = {
  id: "terminated-with-subscriptions",
  severity: "warning",
  titleKey: "terminatedWithSub.title",
  messageKey: "terminatedWithSub.message",
  href: "/users/offboarded",
};

describe("DashboardAlertBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render alert banner with title and message", () => {
    render(<DashboardAlertBanner alerts={[baseAlert]} />);

    expect(screen.getByText("noPaymentData.title")).toBeInTheDocument();
    expect(screen.getByText("noPaymentData.message")).toBeInTheDocument();
  });

  it("should render a link when href is provided", () => {
    render(<DashboardAlertBanner alerts={[baseAlert]} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/payments");
  });

  it("should not render when alerts array is empty", () => {
    const { container } = render(<DashboardAlertBanner alerts={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it("should render multiple alerts", () => {
    const alerts: DashboardAlertItem[] = [baseAlert, warningAlert];

    render(<DashboardAlertBanner alerts={alerts} />);

    expect(screen.getByText("noPaymentData.title")).toBeInTheDocument();
    expect(screen.getByText("terminatedWithSub.title")).toBeInTheDocument();
  });

  it("should render warning alert with correct link", () => {
    render(<DashboardAlertBanner alerts={[warningAlert]} />);

    expect(screen.getByText("terminatedWithSub.title")).toBeInTheDocument();
    expect(screen.getByText("terminatedWithSub.message")).toBeInTheDocument();

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/users/offboarded");
  });

  it("should not have dismiss buttons", () => {
    render(<DashboardAlertBanner alerts={[baseAlert, warningAlert]} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("should render without link when href is not provided", () => {
    const alertNoHref: DashboardAlertItem = {
      id: "test-alert",
      severity: "info",
      titleKey: "test.title",
      messageKey: "test.message",
    };

    render(<DashboardAlertBanner alerts={[alertNoHref]} />);

    expect(screen.getByText("test.title")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("should interpolate titleParams into titleKey", () => {
    const alertWithParams: DashboardAlertItem = {
      id: "sub-anomaly-1",
      severity: "warning",
      titleKey: "Subscription: {appName}",
      messageKey: "No users assigned",
      titleParams: { appName: "Slack" },
      href: "/subscriptions/sub-1/edit",
    };

    render(<DashboardAlertBanner alerts={[alertWithParams]} />);

    expect(screen.getByText("Subscription: Slack")).toBeInTheDocument();
  });

  it("should interpolate messageParams into messageKey", () => {
    const alertWithParams: DashboardAlertItem = {
      id: "sub-anomaly-2",
      severity: "info",
      titleKey: "Unused Seats: {appName}",
      messageKey: "Using {usedLicenses} of {totalLicenses} seats",
      titleParams: { appName: "Notion" },
      messageParams: { usedLicenses: 3, totalLicenses: 10 },
      href: "/subscriptions/sub-2/edit",
    };

    render(<DashboardAlertBanner alerts={[alertWithParams]} />);

    expect(screen.getByText("Unused Seats: Notion")).toBeInTheDocument();
    expect(screen.getByText("Using 3 of 10 seats")).toBeInTheDocument();
  });
});
