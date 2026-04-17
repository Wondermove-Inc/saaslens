import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IntegrationDetailClient } from "./integration-detail-client";

const mockUseShow = vi.fn();
const fetchSpy = vi.fn();
const mockRouter = { push: vi.fn(), back: vi.fn() };

vi.stubGlobal("fetch", fetchSpy);

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

vi.mock("@/actions/integrations", () => ({
  deleteIntegration: vi.fn(),
  getSyncLogs: vi.fn().mockResolvedValue([]),
}));

vi.mock("@refinedev/core", () => ({
  useShow: (...args: unknown[]) => mockUseShow(...args),
}));

vi.mock("@/components/integrations/integration-detail-card", () => ({
  IntegrationDetailCard: ({ integration }: { integration: { id: string } }) => (
    <div data-testid="detail-card">{integration.id}</div>
  ),
}));

vi.mock("@/components/integrations/integration-settings-form", () => ({
  IntegrationSettingsForm: ({ integrationId }: { integrationId: string }) => (
    <div data-testid="settings-form">{integrationId}</div>
  ),
}));

vi.mock("@/components/integrations/sync-logs-table", () => ({
  SyncLogsTable: ({ logs }: { logs: unknown[] }) => (
    <div data-testid="sync-logs">{logs.length}</div>
  ),
}));

describe("IntegrationDetailClient", () => {
  it("로딩 상태를 표시한다", async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: async () => ({ logs: [] }) });
    mockUseShow.mockReturnValue({
      query: { data: undefined, isLoading: true },
    });

    await act(async () => {
      render(<IntegrationDetailClient id="int-1" canManage />);
    });

    expect(screen.getByText(/연동을 불러오는 중/)).toBeInTheDocument();
  });

  it("데이터가 없으면 안내 메시지를 표시한다", async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: async () => ({ logs: [] }) });
    mockUseShow.mockReturnValue({
      query: { data: undefined, isLoading: false },
    });

    await act(async () => {
      render(<IntegrationDetailClient id="int-1" canManage />);
    });

    expect(screen.getByText(/연동을 찾을 수 없습니다/)).toBeInTheDocument();
  });

  it("상세/설정/로그 컴포넌트를 렌더링한다", async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: async () => ({ logs: [] }) });
    mockUseShow.mockReturnValue({
      query: {
        data: {
          data: {
            id: "int-1",
            metadata: {},
            type: "GOOGLE_WORKSPACE",
            status: "ACTIVE",
            lastSyncAt: null,
            lastError: null,
            syncCount: 0,
            createdAt: "",
            updatedAt: "",
          },
        },
        isLoading: false,
      },
    });

    await act(async () => {
      render(<IntegrationDetailClient id="int-1" canManage />);
    });

    expect(screen.getByTestId("detail-card")).toHaveTextContent("int-1");
    expect(screen.getByTestId("settings-form")).toHaveTextContent("int-1");
    expect(screen.getByTestId("sync-logs")).toBeInTheDocument();
  });
});
