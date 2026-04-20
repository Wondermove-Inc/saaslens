// src/components/reports/reports-sidebar.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReportsSidebar } from "./reports-sidebar";

let mockPathname = "/reports/cost";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("ReportsSidebar", () => {
  it("should render all 7 report menu items", () => {
    render(<ReportsSidebar />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(7);
  });

  it("should render links with correct hrefs", () => {
    render(<ReportsSidebar />);
    const expectedHrefs = [
      "/reports/cost",
      "/reports/renewal",
      "/reports/usage",
      "/reports/browsing-usage",
      "/reports/registered-app-usage",
      "/reports/block-events",
      "/reports/audit",
    ];
    const links = screen.getAllByRole("link");
    links.forEach((link, index) => {
      expect(link).toHaveAttribute("href", expectedHrefs[index]);
    });
  });

  it("should highlight active route", () => {
    mockPathname = "/reports/cost";
    render(<ReportsSidebar />);
    const costLink = screen.getByRole("link", { name: /cost/i });
    expect(costLink.className).toContain("bg-accent");
  });

  it("should render description for each menu item", () => {
    render(<ReportsSidebar />);
    expect(
      screen.getByText("sidebar.menu.reports.costDescription")
    ).toBeInTheDocument();
    expect(
      screen.getByText("sidebar.menu.reports.auditDescription")
    ).toBeInTheDocument();
  });
});
