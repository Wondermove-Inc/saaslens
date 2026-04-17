// src/components/reports/export/use-report-export.test.ts
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReportExportConfig } from "./types";
import { useReportExport } from "./use-report-export";

const mockDownloadCSV = vi.fn();
const mockGenerateCSV = vi.fn().mockReturnValue("csv-content");
const mockGenerateExcelWorkbook = vi.fn().mockResolvedValue({ wb: true });
const mockAddWorksheetToWorkbook = vi.fn();
const mockDownloadExcel = vi.fn().mockResolvedValue(undefined);
const mockGeneratePDFReport = vi.fn().mockResolvedValue(new ArrayBuffer(8));
const mockDownloadPDF = vi.fn();

vi.mock("@/lib/services/export/csv", () => ({
  generateCSV: (...args: unknown[]) => mockGenerateCSV(...args),
  downloadCSV: (...args: unknown[]) => mockDownloadCSV(...args),
}));

vi.mock("@/lib/services/export/excel", () => ({
  generateExcelWorkbook: (...args: unknown[]) =>
    mockGenerateExcelWorkbook(...args),
  addWorksheetToWorkbook: (...args: unknown[]) =>
    mockAddWorksheetToWorkbook(...args),
  downloadExcel: (...args: unknown[]) => mockDownloadExcel(...args),
}));

vi.mock("@/lib/services/export/pdf", () => ({
  generatePDFReport: (...args: unknown[]) => mockGeneratePDFReport(...args),
  downloadPDF: (...args: unknown[]) => mockDownloadPDF(...args),
}));

describe("useReportExport", () => {
  const mockConfig: ReportExportConfig = {
    csv: {
      sheets: [
        {
          filename: "test-report.csv",
          columns: [{ key: "name", header: "Name" }],
          data: [{ name: "Test" }],
        },
      ],
    },
    excel: {
      filename: "test-report.xlsx",
      sheets: [
        {
          sheetName: "Sheet1",
          columns: [{ key: "name", header: "Name" }],
          data: [{ name: "Test" }],
        },
      ],
    },
    pdf: {
      filename: "test-report.pdf",
      title: "Test Report",
      sections: [
        {
          type: "keyValue",
          title: "Summary",
          items: [{ label: "Total", value: "100" }],
        },
      ],
    },
  };

  const mockLoadData = vi.fn().mockResolvedValue(mockConfig);

  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadData.mockResolvedValue(mockConfig);
  });

  it("should initialize with isExporting false", () => {
    const { result } = renderHook(() =>
      useReportExport({ loadData: mockLoadData })
    );
    expect(result.current.isExporting).toBe(false);
  });

  it("should export CSV by generating and downloading each sheet", async () => {
    const { result } = renderHook(() =>
      useReportExport({ loadData: mockLoadData })
    );

    await act(async () => {
      await result.current.handleExport("csv");
    });

    expect(mockLoadData).toHaveBeenCalledOnce();
    expect(mockGenerateCSV).toHaveBeenCalledWith(
      mockConfig.csv!.sheets[0].columns,
      mockConfig.csv!.sheets[0].data,
      { includeBOM: true }
    );
    expect(mockDownloadCSV).toHaveBeenCalledWith(
      "csv-content",
      "test-report.csv"
    );
    expect(result.current.isExporting).toBe(false);
  });

  it("should export CSV with multiple sheets", async () => {
    const multiSheetConfig: ReportExportConfig = {
      csv: {
        sheets: [
          {
            filename: "summary.csv",
            columns: [{ key: "label", header: "Label" }],
            data: [{ label: "A" }],
          },
          {
            filename: "details.csv",
            columns: [{ key: "name", header: "Name" }],
            data: [{ name: "B" }],
          },
        ],
      },
    };
    mockLoadData.mockResolvedValue(multiSheetConfig);

    const { result } = renderHook(() =>
      useReportExport({ loadData: mockLoadData })
    );

    await act(async () => {
      await result.current.handleExport("csv");
    });

    expect(mockGenerateCSV).toHaveBeenCalledTimes(2);
    expect(mockDownloadCSV).toHaveBeenCalledTimes(2);
  });

  it("should export Excel with first sheet as workbook, rest added", async () => {
    const multiSheetExcel: ReportExportConfig = {
      excel: {
        filename: "report.xlsx",
        sheets: [
          {
            sheetName: "Summary",
            columns: [{ key: "a", header: "A" }],
            data: [{ a: 1 }],
          },
          {
            sheetName: "Details",
            columns: [{ key: "b", header: "B" }],
            data: [{ b: 2 }],
          },
        ],
      },
    };
    mockLoadData.mockResolvedValue(multiSheetExcel);

    const { result } = renderHook(() =>
      useReportExport({ loadData: mockLoadData })
    );

    await act(async () => {
      await result.current.handleExport("excel");
    });

    expect(mockGenerateExcelWorkbook).toHaveBeenCalledWith(
      multiSheetExcel.excel!.sheets[0]
    );
    expect(mockAddWorksheetToWorkbook).toHaveBeenCalledWith(
      { wb: true },
      multiSheetExcel.excel!.sheets[1]
    );
    expect(mockDownloadExcel).toHaveBeenCalledWith({ wb: true }, "report.xlsx");
    expect(result.current.isExporting).toBe(false);
  });

  it("should export PDF with sections", async () => {
    const { result } = renderHook(() =>
      useReportExport({ loadData: mockLoadData })
    );

    await act(async () => {
      await result.current.handleExport("pdf");
    });

    expect(mockGeneratePDFReport).toHaveBeenCalledWith({
      title: "Test Report",
      subtitle: undefined,
      organizationName: "SaaS Management Platform",
      generatedAt: expect.any(Date),
      sections: mockConfig.pdf!.sections,
    });
    expect(mockDownloadPDF).toHaveBeenCalledWith(
      expect.any(ArrayBuffer),
      "test-report.pdf"
    );
  });

  it("should set isExporting during export and reset after", async () => {
    let resolveLoad: (v: ReportExportConfig) => void;
    mockLoadData.mockReturnValue(
      new Promise<ReportExportConfig>((r) => {
        resolveLoad = r;
      })
    );

    const { result } = renderHook(() =>
      useReportExport({ loadData: mockLoadData })
    );

    let exportPromise: Promise<void>;
    act(() => {
      exportPromise = result.current.handleExport("csv");
    });

    expect(result.current.isExporting).toBe(true);

    await act(async () => {
      resolveLoad!(mockConfig);
      await exportPromise;
    });

    expect(result.current.isExporting).toBe(false);
  });

  it("should reset isExporting on error", async () => {
    mockLoadData.mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() =>
      useReportExport({ loadData: mockLoadData })
    );

    await act(async () => {
      await result.current.handleExport("csv");
    });

    expect(result.current.isExporting).toBe(false);
  });

  it("should no-op when format config is missing", async () => {
    mockLoadData.mockResolvedValue({});

    const { result } = renderHook(() =>
      useReportExport({ loadData: mockLoadData })
    );

    await act(async () => {
      await result.current.handleExport("csv");
    });

    expect(mockGenerateCSV).not.toHaveBeenCalled();
    expect(result.current.isExporting).toBe(false);
  });
});
