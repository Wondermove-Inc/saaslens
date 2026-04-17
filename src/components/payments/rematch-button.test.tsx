// src/components/payments/rematch-button.test.tsx
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock server actions
vi.mock("@/actions/payments/payment-rematch", () => ({
  rematchPaymentRecords: vi.fn(),
  rematchCardTransactions: vi.fn(),
}));

// Mock useTransition
let mockTransitionCallback: (() => void) | null = null;
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useTransition: () => {
      const [isPending, setIsPending] = actual.useState(false);
      const startTransition = (callback: () => void) => {
        setIsPending(true);
        mockTransitionCallback = async () => {
          await callback();
          setIsPending(false);
        };
      };
      return [isPending, startTransition];
    },
  };
});

import {
  rematchCardTransactions,
  rematchPaymentRecords,
} from "@/actions/payments/payment-rematch";
import { toast } from "sonner";
import { RematchButton } from "./rematch-button";

const mockRematchPaymentRecords = vi.mocked(rematchPaymentRecords);
const mockRematchCardTransactions = vi.mocked(rematchCardTransactions);
const mockToastSuccess = vi.mocked(toast.success);
const mockToastError = vi.mocked(toast.error);

describe("RematchButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransitionCallback = null;
  });

  afterEach(() => {
    cleanup();
  });

  describe("when selectedIds is empty", () => {
    it("should render disabled button", () => {
      render(<RematchButton selectedIds={[]} recordType="payment" />);

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });
  });

  describe("when records are selected", () => {
    it("should show count label when records selected", () => {
      render(
        <RematchButton
          selectedIds={["id1", "id2", "id3"]}
          recordType="payment"
        />
      );

      expect(screen.getByText(/3/)).toBeInTheDocument();
    });

    it("should not be disabled when selectedIds has entries", () => {
      render(<RematchButton selectedIds={["id1"]} recordType="payment" />);

      const button = screen.getByRole("button");
      expect(button).not.toBeDisabled();
    });
  });

  describe("on click for payment type", () => {
    it("should call rematchPaymentRecords with correct recordIds", async () => {
      mockRematchPaymentRecords.mockResolvedValueOnce({
        success: true,
        data: {
          syncHistoryId: "sync-1",
          totalProcessed: 2,
          matchedCount: 2,
          unmatchedCount: 0,
          skippedCount: 0,
          errors: [],
        },
        message: "2건 매칭 완료",
      });

      render(
        <RematchButton selectedIds={["id1", "id2"]} recordType="payment" />
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      if (mockTransitionCallback) {
        await mockTransitionCallback();
      }

      await waitFor(() => {
        expect(mockRematchPaymentRecords).toHaveBeenCalledWith(["id1", "id2"]);
      });
    });

    it("should show success toast after successful rematch", async () => {
      mockRematchPaymentRecords.mockResolvedValueOnce({
        success: true,
        data: {
          syncHistoryId: "sync-1",
          totalProcessed: 2,
          matchedCount: 2,
          unmatchedCount: 0,
          skippedCount: 0,
          errors: [],
        },
        message: "2건 매칭 완료",
      });

      render(
        <RematchButton selectedIds={["id1", "id2"]} recordType="payment" />
      );

      fireEvent.click(screen.getByRole("button"));

      if (mockTransitionCallback) {
        await mockTransitionCallback();
      }

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalled();
      });
    });

    it("should show error toast when rematch fails", async () => {
      mockRematchPaymentRecords.mockResolvedValueOnce({
        success: false,
        message: "재매칭 오류",
      });

      render(<RematchButton selectedIds={["id1"]} recordType="payment" />);

      fireEvent.click(screen.getByRole("button"));

      if (mockTransitionCallback) {
        await mockTransitionCallback();
      }

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalled();
      });
    });

    it("should call onComplete callback after completion", async () => {
      const onComplete = vi.fn();
      mockRematchPaymentRecords.mockResolvedValueOnce({
        success: true,
        data: {
          syncHistoryId: "sync-1",
          totalProcessed: 1,
          matchedCount: 1,
          unmatchedCount: 0,
          skippedCount: 0,
          errors: [],
        },
        message: "1건 매칭 완료",
      });

      render(
        <RematchButton
          selectedIds={["id1"]}
          recordType="payment"
          onComplete={onComplete}
        />
      );

      fireEvent.click(screen.getByRole("button"));

      if (mockTransitionCallback) {
        await mockTransitionCallback();
      }

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
      });
    });
  });

  describe("on click for card-transaction type", () => {
    it("should call rematchCardTransactions with correct transactionIds", async () => {
      mockRematchCardTransactions.mockResolvedValueOnce({
        success: true,
        data: {
          syncHistoryId: "sync-1",
          totalProcessed: 1,
          matchedCount: 1,
          unmatchedCount: 0,
          skippedCount: 0,
          errors: [],
        },
        message: "1건 매칭 완료",
      });

      render(
        <RematchButton selectedIds={["tx1"]} recordType="card-transaction" />
      );

      fireEvent.click(screen.getByRole("button"));

      if (mockTransitionCallback) {
        await mockTransitionCallback();
      }

      await waitFor(() => {
        expect(mockRematchCardTransactions).toHaveBeenCalledWith(["tx1"]);
      });
    });
  });
});
