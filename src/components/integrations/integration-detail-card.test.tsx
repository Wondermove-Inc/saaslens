// src/components/integrations/integration-detail-card.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  IntegrationDetailCard,
  type IntegrationDetailProps,
} from "./integration-detail-card";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
  }),
}));

// Mock Server Actions
vi.mock("@/actions/integrations", () => ({
  syncIntegrationNow: vi.fn(),
  updateIntegrationStatus: vi.fn(),
}));

describe("IntegrationDetailCard", () => {
  const mockIntegration: IntegrationDetailProps = {
    id: "int-1",
    type: "GOOGLE_WORKSPACE",
    status: "ACTIVE",
    lastSyncAt: "2024-11-30T10:00:00Z",
    lastError: null,
    syncCount: 5,
    lastSyncResult: {
      status: "SUCCESS",
      itemsFound: 10,
      itemsCreated: 2,
      itemsUpdated: 8,
      errors: [],
    },
    metadata: {
      domain: "example.com",
      autoSync: true,
      syncInterval: "daily" as const,
    },
    createdAt: "2024-11-01T10:00:00Z",
    updatedAt: "2024-11-30T10:00:00Z",
  };

  it("should render integration type name", () => {
    render(<IntegrationDetailCard integration={mockIntegration} />);
    expect(screen.getByText("Google Workspace")).toBeInTheDocument();
  });

  it("should render active status badge", () => {
    render(<IntegrationDetailCard integration={mockIntegration} />);
    expect(screen.getByText("활성")).toBeInTheDocument();
  });

  it("should render pending status badge", () => {
    render(
      <IntegrationDetailCard
        integration={{ ...mockIntegration, status: "PENDING" }}
      />
    );
    expect(screen.getByText("대기")).toBeInTheDocument();
  });

  it("should render error status badge", () => {
    render(
      <IntegrationDetailCard
        integration={{ ...mockIntegration, status: "ERROR" }}
      />
    );
    expect(screen.getByText("오류")).toBeInTheDocument();
  });

  it("should render disconnected status badge", () => {
    render(
      <IntegrationDetailCard
        integration={{ ...mockIntegration, status: "DISCONNECTED" }}
      />
    );
    expect(screen.getByText("연결 끊김")).toBeInTheDocument();
  });

  it("should render last sync time", () => {
    render(<IntegrationDetailCard integration={mockIntegration} />);
    // "마지막 동기화"와 "마지막 동기화 결과" 두 개가 있으므로 getAllBy 사용
    const syncTexts = screen.getAllByText(/마지막 동기화/);
    expect(syncTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("should render sync statistics", () => {
    render(<IntegrationDetailCard integration={mockIntegration} />);
    expect(screen.getByText("총 동기화 횟수")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("should render last sync result when available", () => {
    render(<IntegrationDetailCard integration={mockIntegration} />);
    expect(screen.getByText("발견")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("생성")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("업데이트")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("should render sync button", () => {
    render(<IntegrationDetailCard integration={mockIntegration} />);
    expect(screen.getByRole("button", { name: /동기화/i })).toBeInTheDocument();
  });

  it("관리 권한이 없으면 동기화 버튼을 비활성화한다", () => {
    render(
      <IntegrationDetailCard integration={mockIntegration} canManage={false} />
    );
    expect(screen.getByRole("button", { name: /동기화/i })).toBeDisabled();
  });

  it("should render sync button for non-active integrations", () => {
    render(
      <IntegrationDetailCard
        integration={{ ...mockIntegration, status: "PENDING" }}
      />
    );
    // 현재 컴포넌트는 PENDING 상태에서도 동기화 버튼을 표시함
    const syncButton = screen.getByRole("button", { name: /동기화/i });
    expect(syncButton).toBeInTheDocument();
  });

  it("should render domain from metadata if available", () => {
    render(<IntegrationDetailCard integration={mockIntegration} />);
    expect(screen.getByText("example.com")).toBeInTheDocument();
  });
});
