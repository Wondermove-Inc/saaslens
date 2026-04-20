// src/app/(dashboard)/reports/renewal/page.test.tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RenewalReportPage from "./page";

// Mock Server Actions
vi.mock("@/actions/dashboard", () => ({
  getRenewalReportData: vi.fn().mockResolvedValue({
    within7Days: [
      {
        id: "1",
        appName: "Slack",
        renewalDate: new Date("2024-12-05"),
        amount: 150000,
        currency: "KRW",
        daysUntilRenewal: 4,
      },
    ],
    within30Days: [
      {
        id: "2",
        appName: "Notion",
        renewalDate: new Date("2024-12-20"),
        amount: 200000,
        currency: "KRW",
        daysUntilRenewal: 19,
      },
    ],
    within90Days: [
      {
        id: "3",
        appName: "Figma",
        renewalDate: new Date("2025-02-15"),
        amount: 300000,
        currency: "KRW",
        daysUntilRenewal: 75,
      },
    ],
    totalRenewalCost: 650000,
    totalCount: 3,
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

describe("RenewalReportPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("페이지 제목을 표시해야 한다", async () => {
    const page = await RenewalReportPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByText("구독 갱신 리포트")).toBeInTheDocument();
  });

  it("뒤로가기 링크가 /reports로 연결되어야 한다", async () => {
    const page = await RenewalReportPage({ searchParams: Promise.resolve({}) });
    render(page);

    const backLink = screen.getByRole("link", { name: "" });
    expect(backLink).toHaveAttribute("href", "/reports");
  });

  it("핵심 지표를 표시해야 한다", async () => {
    const page = await RenewalReportPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByText("총 갱신 건수")).toBeInTheDocument();
    expect(screen.getByText("예상 갱신 비용")).toBeInTheDocument();
    expect(screen.getByText("7일 이내")).toBeInTheDocument();
    expect(screen.getByText("30일 이내")).toBeInTheDocument();
  });

  it("총 갱신 건수를 표시해야 한다", async () => {
    const page = await RenewalReportPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByText("3건")).toBeInTheDocument();
  });

  it("7일 이내 갱신 목록을 표시해야 한다", async () => {
    const page = await RenewalReportPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByText("7일 이내 갱신")).toBeInTheDocument();
    expect(screen.getByText("Slack")).toBeInTheDocument();
  });

  it("8-30일 갱신 목록을 표시해야 한다", async () => {
    const page = await RenewalReportPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByText("8-30일 갱신")).toBeInTheDocument();
    expect(screen.getByText("Notion")).toBeInTheDocument();
  });

  it("31-90일 갱신 목록을 표시해야 한다", async () => {
    const page = await RenewalReportPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByText("31-90일 갱신")).toBeInTheDocument();
    expect(screen.getByText("Figma")).toBeInTheDocument();
  });

  it("내보내기 버튼을 표시해야 한다", async () => {
    const page = await RenewalReportPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByTestId("export-buttons")).toBeInTheDocument();
  });
});
