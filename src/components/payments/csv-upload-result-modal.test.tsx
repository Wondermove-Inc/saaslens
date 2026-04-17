// src/components/payments/csv-upload-result-modal.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CsvUploadResultModal } from "./csv-upload-result-modal";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const messages: Record<string, string> = {
      "payments.upload.resultModal.title": "Upload Complete",
      "payments.upload.resultModal.summary":
        "Total {imported} records imported, {duplicates} duplicates excluded.",
      "payments.upload.resultModal.autoMatched": "Auto Matched",
      "payments.upload.resultModal.unmatched": "Unmatched",
      "payments.upload.resultModal.cta": "View Subscriptions",
    };
    let msg = messages[key] || key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        msg = msg.replace(`{${k}}`, String(v));
      }
    }
    return msg;
  },
}));

// Mock Dialog components to avoid Radix UI / React version conflict
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogDescription: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    "data-testid"?: string;
  }) => <p {...props}>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  imported: 100,
  matched: 75,
  unmatched: 20,
  duplicates: 5,
};

describe("CsvUploadResultModal", () => {
  it("should render 2 stat cards with correct values", () => {
    render(<CsvUploadResultModal {...defaultProps} />);

    expect(screen.getByText("Auto Matched")).toBeInTheDocument();
    expect(screen.getByText("75")).toBeInTheDocument();

    expect(screen.getByText("Unmatched")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
  });

  it("should use correct color classes for each stat card", () => {
    render(<CsvUploadResultModal {...defaultProps} />);

    const cards = screen.getAllByTestId("stat-card");
    expect(cards).toHaveLength(2);

    expect(cards[0]).toHaveClass("bg-success-muted");
    expect(cards[1]).toHaveClass("bg-warning-muted");
  });

  it("should call onOpenChange(false) when CTA button is clicked", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();

    render(
      <CsvUploadResultModal {...defaultProps} onOpenChange={onOpenChange} />
    );

    const ctaButton = screen.getByRole("button", {
      name: /View Subscriptions/i,
    });
    await user.click(ctaButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("should display summary text with imported and duplicates count", () => {
    render(<CsvUploadResultModal {...defaultProps} />);

    const summary = screen.getByTestId("summary-text");
    expect(summary).toHaveTextContent("100");
    expect(summary).toHaveTextContent("5");
  });

  it("should not render when open is false", () => {
    render(<CsvUploadResultModal {...defaultProps} open={false} />);

    expect(screen.queryByText("Upload Complete")).not.toBeInTheDocument();
  });
});
