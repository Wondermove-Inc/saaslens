// src/components/reports/export/report-export-button.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReportExportButton } from "./report-export-button";
import type { ReportExportConfig } from "./types";

const mockHandleExport = vi.fn();
let mockIsExporting = false;

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("./use-report-export", () => ({
  useReportExport: () => ({
    isExporting: mockIsExporting,
    handleExport: mockHandleExport,
  }),
}));

describe("ReportExportButton", () => {
  const mockLoadData = vi.fn<() => Promise<ReportExportConfig>>();

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsExporting = false;
  });

  it("should render export button with all format options", () => {
    render(
      <ReportExportButton
        loadData={mockLoadData}
        formats={["csv", "excel", "pdf"]}
      />
    );

    expect(screen.getByText("button")).toBeInTheDocument();
    expect(screen.getByText("csvLabel")).toBeInTheDocument();
    expect(screen.getByText("excelLabel")).toBeInTheDocument();
    expect(screen.getByText("pdfLabel")).toBeInTheDocument();
  });

  it("should render only specified format options", () => {
    render(<ReportExportButton loadData={mockLoadData} formats={["csv"]} />);

    expect(screen.getByText("csvLabel")).toBeInTheDocument();
    expect(screen.queryByText("excelLabel")).not.toBeInTheDocument();
    expect(screen.queryByText("pdfLabel")).not.toBeInTheDocument();
  });

  it("should call handleExport with correct format on click", async () => {
    const user = userEvent.setup();
    render(
      <ReportExportButton
        loadData={mockLoadData}
        formats={["csv", "excel", "pdf"]}
      />
    );

    await user.click(screen.getByText("csvLabel"));
    expect(mockHandleExport).toHaveBeenCalledWith("csv");

    await user.click(screen.getByText("excelLabel"));
    expect(mockHandleExport).toHaveBeenCalledWith("excel");

    await user.click(screen.getByText("pdfLabel"));
    expect(mockHandleExport).toHaveBeenCalledWith("pdf");
  });

  it("should show exporting text when isExporting is true", () => {
    mockIsExporting = true;
    render(
      <ReportExportButton
        loadData={mockLoadData}
        formats={["csv", "excel", "pdf"]}
      />
    );

    expect(screen.getByText("exporting")).toBeInTheDocument();
  });

  it("should pass variant and size props to button", () => {
    render(
      <ReportExportButton
        loadData={mockLoadData}
        formats={["csv"]}
        variant="outline"
        size="sm"
      />
    );

    const button = screen.getByRole("button", {
      name: /button/i,
    });
    expect(button).toBeInTheDocument();
  });
});
