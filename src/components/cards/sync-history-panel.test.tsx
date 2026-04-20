// src/components/cards/sync-history-panel.test.tsx
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/actions/payments/sync-history", () => ({
  getSyncHistory: vi.fn(),
}));

import { getSyncHistory } from "@/actions/payments/sync-history";
import { SyncHistoryPanel } from "./sync-history-panel";

const mockGetSyncHistory = vi.mocked(getSyncHistory);

const makeSyncHistory = (overrides = {}) => ({
  id: "sh1",
  organizationId: "org-1",
  userId: null,
  type: "CARD_SYNC" as const,
  status: "SUCCESS" as const,
  totalRecords: 10,
  successCount: 10,
  failedCount: 0,
  matchedCount: 8,
  unmatchedCount: 2,
  errorMessage: null,
  errorDetails: null,
  startedAt: new Date("2024-01-15T10:00:00Z"),
  completedAt: new Date("2024-01-15T10:01:00Z"),
  triggeredBy: "USER",
  fileName: null,
  corporateCardId: "card1",
  ...overrides,
});

describe("SyncHistoryPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("loading state", () => {
    it("should render loading skeleton while fetching", () => {
      // Never resolve
      mockGetSyncHistory.mockReturnValue(new Promise(() => {}));

      render(<SyncHistoryPanel corporateCardId="card1" />);

      const skeletons = document.querySelectorAll(
        "[data-testid='sync-history-skeleton']"
      );
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("empty state", () => {
    it("should render empty state when no history", async () => {
      mockGetSyncHistory.mockResolvedValueOnce({
        success: true,
        data: { data: [], total: 0 },
      });

      render(<SyncHistoryPanel corporateCardId="card1" />);

      await waitFor(() => {
        expect(screen.getByTestId("sync-history-empty")).toBeInTheDocument();
      });
    });
  });

  describe("with entries", () => {
    it("should render list of entries with time, type, status", async () => {
      mockGetSyncHistory.mockResolvedValueOnce({
        success: true,
        data: { data: [makeSyncHistory()], total: 1 },
      });

      render(<SyncHistoryPanel corporateCardId="card1" />);

      await waitFor(() => {
        expect(screen.getByTestId("sync-history-list")).toBeInTheDocument();
        expect(
          screen.getByTestId("sync-history-entry-sh1")
        ).toBeInTheDocument();
      });
    });

    it("should show error details for failed entries", async () => {
      mockGetSyncHistory.mockResolvedValueOnce({
        success: true,
        data: {
          data: [
            makeSyncHistory({
              id: "sh2",
              status: "FAILED",
              errorMessage: "인증 오류 발생",
            }),
          ],
          total: 1,
        },
      });

      render(<SyncHistoryPanel corporateCardId="card1" />);

      await waitFor(() => {
        expect(screen.getByText("인증 오류 발생")).toBeInTheDocument();
      });
    });
  });

  describe("더보기 button", () => {
    it("should load next page when 더보기 button clicked", async () => {
      const user = userEvent.setup();

      // First load: 10 items with 15 total (has more)
      mockGetSyncHistory.mockResolvedValueOnce({
        success: true,
        data: {
          data: Array.from({ length: 10 }, (_, i) =>
            makeSyncHistory({ id: `sh${i + 1}` })
          ),
          total: 15,
        },
      });

      // Second load: 5 more items
      mockGetSyncHistory.mockResolvedValueOnce({
        success: true,
        data: {
          data: Array.from({ length: 5 }, (_, i) =>
            makeSyncHistory({ id: `sh${i + 11}` })
          ),
          total: 15,
        },
      });

      render(<SyncHistoryPanel corporateCardId="card1" limit={10} />);

      await waitFor(() => {
        expect(
          screen.getByTestId("sync-history-load-more")
        ).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("sync-history-load-more"));

      await waitFor(() => {
        expect(mockGetSyncHistory).toHaveBeenCalledTimes(2);
      });
    });
  });
});
