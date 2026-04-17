// src/components/apps/app-edit-form.test.tsx
import type { AppDetail } from "@/types/app";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppEditForm } from "./app-edit-form";

vi.mock("@/components/ui/select", () => {
  const Select = ({
    children,
    value,
    onValueChange,
    disabled,
  }: {
    children?: React.ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
  }) => (
    <select
      data-testid="select-mock"
      value={value ?? ""}
      onChange={(event) => onValueChange?.(event.target.value)}
      disabled={disabled}
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

const mockRouter = {
  push: vi.fn(),
  back: vi.fn(),
};

let mockValues: Record<string, string>;
const mockOnFinish = vi.fn();
let mockErrors: Record<string, { message: string }>;
let mockFormLoading = false;
let mockIsSubmitting = false;
let mockMutationResult: Record<string, unknown> | undefined;

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

vi.mock("react-hook-form", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-hook-form")>();
  return {
    ...actual,
    Controller: ({
      name,
      render,
    }: {
      name: string;
      render: (props: unknown) => React.ReactElement;
    }) =>
      render({
        field: {
          name,
          value: mockValues[name],
          onChange: (value: string) => {
            mockValues[name] = value;
          },
        },
      }),
  };
});

vi.mock("@refinedev/react-hook-form", () => ({
  useForm: (options?: { defaultValues?: Record<string, string> }) => {
    mockValues = { ...(options?.defaultValues ?? {}) };
    return {
      refineCore: {
        onFinish: mockOnFinish,
        formLoading: mockFormLoading,
        mutationResult: mockMutationResult,
      },
      handleSubmit: (cb: (values: Record<string, string>) => unknown) => () =>
        cb({ ...mockValues } as Record<string, string>),
      register: (name: string) => ({
        name,
        defaultValue: mockValues[name] ?? "",
        onChange: (event: { target: { value: string } }) => {
          mockValues[name] = event.target.value;
        },
        onBlur: vi.fn(),
        ref: vi.fn(),
      }),
      control: {},
      setValue: (name: string, value: unknown) => {
        mockValues[name] = value as string;
      },
      formState: { errors: mockErrors, isSubmitting: mockIsSubmitting },
    };
  },
}));

const mockApp: AppDetail = {
  id: "app-1",
  name: "Slack",
  status: "ACTIVE",
  source: "MANUAL",
  category: "Collaboration",
  catalogId: null,
  customLogoUrl: "https://example.com/slack.png",
  catalogLogoUrl: null,
  customWebsite: "https://slack.com",
  notes: "팀 커뮤니케이션 도구",
  tags: ["chat", "team"],
  riskScore: null,
  discoveredAt: null,
  ownerName: "홍길동",
  ownerEmail: "hong@test.com",
  subscriptionCount: 2,
  userAccessCount: 10,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-02"),
  teams: [],
};

describe("AppEditForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValues = {};
    mockErrors = {};
    mockFormLoading = false;
    mockIsSubmitting = false;
    mockMutationResult = undefined;
    mockOnFinish.mockResolvedValue({ data: { id: "app-1" } });
  });

  it("기존 앱 정보로 폼이 채워져야 한다", () => {
    mockValues = {
      name: mockApp.name,
      status: mockApp.status,
      category: mockApp.category ?? "",
      customLogoUrl: mockApp.customLogoUrl ?? "",
      customWebsite: mockApp.customWebsite ?? "",
      notes: mockApp.notes ?? "",
      tags: mockApp.tags.join(", "),
    };
    render(<AppEditForm app={mockApp} />);

    expect(screen.getByDisplayValue("Slack")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Collaboration")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("https://example.com/slack.png")
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://slack.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("chat, team")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("팀 커뮤니케이션 도구")
    ).toBeInTheDocument();
  });

  it("저장 버튼과 취소 버튼이 있어야 한다", () => {
    render(<AppEditForm app={mockApp} />);

    expect(screen.getByRole("button", { name: /저장/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /취소/ })).toBeInTheDocument();
  });

  it("상태 선택 필드가 있어야 한다", () => {
    mockValues = {
      name: mockApp.name,
      status: mockApp.status,
      category: mockApp.category ?? "",
      customLogoUrl: mockApp.customLogoUrl ?? "",
      customWebsite: mockApp.customWebsite ?? "",
      notes: mockApp.notes ?? "",
      tags: mockApp.tags.join(", "),
    };
    render(<AppEditForm app={mockApp} />);

    expect(screen.getByTestId("select-mock")).toBeInTheDocument();
  });

  it("취소 버튼 클릭시 이전 페이지로 이동해야 한다", async () => {
    const user = userEvent.setup();
    render(<AppEditForm app={mockApp} />);

    const cancelButton = screen.getByRole("button", { name: /취소/ });
    await user.click(cancelButton);

    expect(mockRouter.back).toHaveBeenCalled();
  });

  it("폼 제출 성공 시 앱 상세 페이지로 이동해야 한다", async () => {
    const user = userEvent.setup();
    render(<AppEditForm app={mockApp} />);

    const submitButton = screen.getByRole("button", { name: /저장/ });
    await user.click(submitButton);

    await vi.waitFor(() => {
      expect(mockOnFinish).toHaveBeenCalled();
    });

    await vi.waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith("/apps/app-1");
    });
  });

  it("서버 에러 발생 시 에러 메시지를 표시해야 한다", async () => {
    mockOnFinish.mockRejectedValueOnce(new Error("앱을 찾을 수 없습니다"));

    const user = userEvent.setup();
    render(<AppEditForm app={mockApp} />);

    const submitButton = screen.getByRole("button", { name: /저장/ });
    await user.click(submitButton);

    await vi.waitFor(() => {
      expect(screen.getByText("앱을 찾을 수 없습니다")).toBeInTheDocument();
    });
  });

  it("모든 폼 필드가 올바른 name 속성을 가져야 한다", () => {
    mockValues = {
      name: mockApp.name,
      status: mockApp.status,
      category: mockApp.category ?? "",
      customLogoUrl: mockApp.customLogoUrl ?? "",
      customWebsite: mockApp.customWebsite ?? "",
      notes: mockApp.notes ?? "",
      tags: mockApp.tags.join(", "),
    };
    render(<AppEditForm app={mockApp} />);

    expect(screen.getByLabelText(/앱 이름/)).toHaveAttribute("name", "name");
    expect(screen.getByLabelText(/카테고리/)).toHaveAttribute(
      "name",
      "category"
    );
    expect(screen.getByLabelText(/로고 URL/)).toHaveAttribute(
      "name",
      "customLogoUrl"
    );
    expect(screen.getByLabelText(/웹사이트/)).toHaveAttribute(
      "name",
      "customWebsite"
    );
    expect(screen.getByLabelText(/태그/)).toHaveAttribute("name", "tags");
    expect(screen.getByLabelText(/메모/)).toHaveAttribute("name", "notes");
  });
});
