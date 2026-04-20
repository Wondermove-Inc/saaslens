// src/app/(dashboard)/reports/audit/_components/export-buttons.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExportButtons } from "./export-buttons";

const mockGetAuditLogExportData = vi.fn();
const mockGenerateCSV = vi.fn();
const originalAnchorClick = HTMLAnchorElement.prototype.click;

vi.mock("@/actions/audit", () => ({
  getAuditLogExportData: (...args: unknown[]) =>
    mockGetAuditLogExportData(...args),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("@/lib/services/export/csv", () => ({
  generateCSV: (...args: unknown[]) => mockGenerateCSV(...args),
}));

vi.mock("@/lib/services/export/excel", () => ({
  generateExcelWorkbook: vi.fn(),
  workbookToBlob: vi.fn(),
}));

vi.mock("@/lib/services/export/pdf", () => ({
  generatePDFReport: vi.fn(),
  downloadPDF: vi.fn(),
}));

describe("Audit ExportButtons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateCSV.mockReturnValue("csv");
    mockGetAuditLogExportData.mockResolvedValue([
      {
        id: "log-1",
        action: "CREATE",
        entityType: "App",
        entityId: "app-1",
        userName: "Admin",
        userEmail: "admin@example.com",
        teamName: "Team A",
        changes: null,
        metadata: null,
        ipAddress: "127.0.0.1",
        userAgent: "test",
        createdAt: new Date().toISOString(),
      },
    ]);

    global.URL.createObjectURL = vi.fn(() => "blob:mock");
    global.URL.revokeObjectURL = vi.fn();
    HTMLAnchorElement.prototype.click = vi.fn();
  });

  afterEach(() => {
    HTMLAnchorElement.prototype.click = originalAnchorClick;
  });

  it("renders export menu and triggers CSV export", async () => {
    const user = userEvent.setup();
    render(<ExportButtons filters={{ action: "CREATE" }} />);

    const csvButton = screen.getByRole("button", { name: /CSV/i });
    await user.click(csvButton);

    await waitFor(() => {
      expect(mockGetAuditLogExportData).toHaveBeenCalledWith(
        expect.objectContaining({ action: "CREATE" })
      );
      expect(mockGenerateCSV).toHaveBeenCalled();
    });
  });
});
