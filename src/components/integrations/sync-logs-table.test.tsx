// src/components/integrations/sync-logs-table.test.tsx
import type { SyncLogEntry } from "@/actions/integrations";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SyncLogsTable } from "./sync-logs-table";

describe("SyncLogsTable", () => {
  const mockLogs: SyncLogEntry[] = [
    {
      id: "log-1",
      status: "SUCCESS",
      itemsFound: 10,
      itemsCreated: 2,
      itemsUpdated: 8,
      errors: null,
      startedAt: "2024-11-30T10:00:00Z",
      completedAt: "2024-11-30T10:05:00Z",
    },
    {
      id: "log-2",
      status: "PARTIAL",
      itemsFound: 5,
      itemsCreated: 1,
      itemsUpdated: 3,
      errors: [{ code: "USER_ERROR", message: "일부 사용자 동기화 실패" }],
      startedAt: "2024-11-29T10:00:00Z",
      completedAt: "2024-11-29T10:03:00Z",
    },
    {
      id: "log-3",
      status: "FAILED",
      itemsFound: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      errors: [{ code: "AUTH_ERROR", message: "인증 실패" }],
      startedAt: "2024-11-28T10:00:00Z",
      completedAt: "2024-11-28T10:00:30Z",
    },
  ];

  it("should render table headers", () => {
    render(<SyncLogsTable logs={mockLogs} />);

    expect(screen.getByText("시작 시간")).toBeInTheDocument();
    expect(screen.getByText("상태")).toBeInTheDocument();
    expect(screen.getByText("발견")).toBeInTheDocument();
    expect(screen.getByText("생성")).toBeInTheDocument();
    expect(screen.getByText("업데이트")).toBeInTheDocument();
    expect(screen.getByText("소요 시간")).toBeInTheDocument();
  });

  it("should render log entries", () => {
    render(<SyncLogsTable logs={mockLogs} />);

    // 첫 번째 로그의 통계
    expect(screen.getByText("10")).toBeInTheDocument(); // itemsFound
    expect(screen.getAllByText("2").length).toBeGreaterThan(0); // itemsCreated
    expect(screen.getByText("8")).toBeInTheDocument(); // itemsUpdated
  });

  it("should render success status badge", () => {
    render(<SyncLogsTable logs={mockLogs} />);
    expect(screen.getByText("성공")).toBeInTheDocument();
  });

  it("should render partial status badge", () => {
    render(<SyncLogsTable logs={mockLogs} />);
    expect(screen.getByText("부분 성공")).toBeInTheDocument();
  });

  it("should render failed status badge", () => {
    render(<SyncLogsTable logs={mockLogs} />);
    expect(screen.getByText("실패")).toBeInTheDocument();
  });

  it("should render empty state when no logs", () => {
    render(<SyncLogsTable logs={[]} />);
    expect(screen.getByText(/동기화 기록이 없습니다/)).toBeInTheDocument();
  });

  it("should format duration correctly", () => {
    render(<SyncLogsTable logs={mockLogs} />);
    // 5분 = 300초
    expect(screen.getByText("5분 0초")).toBeInTheDocument();
  });

  it("should show error indicator for logs with errors", () => {
    render(<SyncLogsTable logs={mockLogs} />);
    // 오류가 있는 로그에는 오류 아이콘이 표시됨
    const errorIcons = screen.getAllByTestId("error-indicator");
    expect(errorIcons.length).toBeGreaterThanOrEqual(2);
  });
});
