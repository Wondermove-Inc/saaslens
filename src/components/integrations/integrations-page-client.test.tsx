import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IntegrationsPageClient } from "./integrations-page-client";

const mockUseList = vi.fn();
const mockRefetch = vi.fn();
const mockUseCan = vi.fn();

vi.mock("@refinedev/core", () => ({
  useList: (...args: unknown[]) => mockUseList(...args),
  useCan: (...args: unknown[]) => mockUseCan(...args),
}));

vi.mock("@/actions/integrations", () => ({
  deleteIntegration: vi.fn().mockResolvedValue({ success: true }),
  syncIntegrationNow: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
    back: vi.fn(),
  }),
}));

vi.mock("@/components/ui/select", () => {
  const Select = ({
    children,
    value,
    onValueChange,
    defaultValue,
  }: {
    children?: React.ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
    defaultValue?: string;
  }) => (
    <select
      value={value ?? defaultValue}
      onChange={(event) => onValueChange?.(event.target.value)}
      data-testid="select-mock"
    >
      {children}
    </select>
  );
  const SelectTrigger = ({ children }: { children?: React.ReactNode }) => (
    <>{children}</>
  );
  const SelectValue = ({ placeholder }: { placeholder?: string }) => (
    <option value="">{placeholder}</option>
  );
  const SelectContent = ({ children }: { children?: React.ReactNode }) => (
    <>{children}</>
  );
  const SelectItem = ({
    children,
    value,
  }: {
    children?: React.ReactNode;
    value: string;
  }) => <option value={value}>{children}</option>;
  return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
});

const mockIntegrations = [
  {
    id: "int-1",
    organizationId: "org-1",
    type: "GOOGLE_WORKSPACE" as const,
    status: "ACTIVE" as const,
    credentials: {},
    metadata: { domain: "example.com" },
    lastSyncAt: "2024-01-15T10:00:00Z",
    lastError: null,
    createdAt: "2023-06-01",
    updatedAt: "2024-01-15",
  },
  {
    id: "int-2",
    organizationId: "org-1",
    type: "OKTA" as const,
    status: "PENDING" as const,
    credentials: {},
    metadata: {},
    lastSyncAt: null,
    lastError: null,
    createdAt: "2024-01-10",
    updatedAt: "2024-01-10",
  },
];

describe("IntegrationsPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseList.mockReturnValue({
      query: {
        data: { data: mockIntegrations, total: mockIntegrations.length },
        isLoading: false,
        refetch: mockRefetch,
      },
      result: { data: mockIntegrations, total: mockIntegrations.length },
    });
    mockUseCan.mockReturnValue({ data: { can: true } });
  });

  it("헤더와 KPI 카드를 표시한다", () => {
    render(<IntegrationsPageClient canManage role="ADMIN" />);

    expect(screen.getByText("연동 관리")).toBeInTheDocument();
    expect(screen.getByText("전체 연동")).toBeInTheDocument();
    expect(screen.getByText("활성 연동")).toBeInTheDocument();
  });

  it("연동 목록이 없으면 안내 메시지를 보여준다", () => {
    mockUseList.mockReturnValueOnce({
      query: {
        data: { data: [], total: 0 },
        isLoading: false,
        refetch: mockRefetch,
      },
      result: { data: [], total: 0 },
    });

    render(<IntegrationsPageClient canManage role="ADMIN" />);

    expect(screen.getByText(/연동된 서비스가 없습니다/)).toBeInTheDocument();
  });

  it("연동 유형과 상태를 카드에 표시한다", () => {
    render(<IntegrationsPageClient canManage role="ADMIN" />);

    expect(
      screen.getAllByText(/Google Workspace/).length
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/활성/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Okta/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/대기/).length).toBeGreaterThanOrEqual(1);
  });

  it("관리자가 아니면 연동 추가 버튼이 비활성화된다", () => {
    mockUseCan.mockReturnValueOnce({ data: { can: false } });
    mockUseCan.mockReturnValueOnce({ data: { can: false } });
    render(<IntegrationsPageClient canManage={false} role="VIEWER" />);

    // 연동 추가는 버튼으로 렌더링됨 (PageHeader actions)
    const addButton = screen.getByRole("button", { name: /연동 추가/ });
    expect(addButton).toBeDisabled();
  });

  it("필터 입력 컨트롤이 노출된다", async () => {
    const user = userEvent.setup();
    render(<IntegrationsPageClient canManage role="ADMIN" />);

    const searchInput = screen.getByPlaceholderText(/도메인 또는 키워드 검색/);
    expect(searchInput).toBeInTheDocument();

    await user.type(searchInput, "workspace");
    expect((searchInput as HTMLInputElement).value).toBe("workspace");
  });
});
