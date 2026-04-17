// src/components/integrations/integration-edit-client.test.tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IntegrationEditClient } from "./integration-edit-client";

const mockUseShow = vi.fn();

vi.mock("@refinedev/core", () => ({
  useShow: (...args: unknown[]) => mockUseShow(...args),
}));

// Mock IntegrationStatusForm
vi.mock("@/components/integrations/integration-status-form", () => ({
  IntegrationStatusForm: ({
    id,
    defaultStatus,
  }: {
    id: string;
    defaultStatus: string;
  }) => (
    <div data-testid="status-form">
      ID: {id}, Status: {defaultStatus}
    </div>
  ),
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

const mockIntegrationData = {
  id: "int-1",
  name: "Google Workspace",
  provider: "GOOGLE_WORKSPACE",
  status: "ACTIVE",
};

describe("IntegrationEditClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseShow.mockReturnValue({
      query: {
        data: { data: mockIntegrationData },
        isLoading: false,
      },
    });
  });

  it("연동 수정 페이지를 렌더링한다", () => {
    render(<IntegrationEditClient id="int-1" />);

    expect(screen.getByText("연동 상태 수정")).toBeInTheDocument();
    expect(screen.getByText(/연동 상태를 업데이트합니다/)).toBeInTheDocument();
  });

  it("로딩 중이면 로딩 상태를 표시한다", () => {
    mockUseShow.mockReturnValueOnce({
      query: { data: undefined, isLoading: true },
    });

    render(<IntegrationEditClient id="int-1" />);

    expect(screen.getByText(/연동 정보를 불러오는 중/)).toBeInTheDocument();
  });

  it("IntegrationStatusForm에 올바른 props를 전달한다", () => {
    render(<IntegrationEditClient id="int-1" />);

    const form = screen.getByTestId("status-form");
    expect(form).toHaveTextContent("ID: int-1");
    expect(form).toHaveTextContent("Status: ACTIVE");
  });

  it("데이터가 없을 때 기본 상태는 PENDING이다", () => {
    mockUseShow.mockReturnValueOnce({
      query: { data: { data: {} }, isLoading: false },
    });

    render(<IntegrationEditClient id="int-1" />);

    const form = screen.getByTestId("status-form");
    expect(form).toHaveTextContent("Status: PENDING");
  });

  it("상세 페이지로 돌아가는 링크가 있다", () => {
    render(<IntegrationEditClient id="int-1" />);

    const backLink = screen.getByRole("link");
    expect(backLink).toHaveAttribute("href", "/integrations/int-1");
  });

  it("useShow를 올바른 파라미터로 호출한다", () => {
    render(<IntegrationEditClient id="int-123" />);

    expect(mockUseShow).toHaveBeenCalledWith({
      resource: "integrations",
      id: "int-123",
      queryOptions: {
        enabled: true,
      },
    });
  });
});
