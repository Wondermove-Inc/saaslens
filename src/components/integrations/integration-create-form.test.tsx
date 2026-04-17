import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IntegrationCreateForm } from "./integration-create-form";

const mockRouter = {
  push: vi.fn(),
  back: vi.fn(),
};

let mockValues: Record<string, string>;
const mockOnFinish = vi.fn();
let mockErrors: Record<string, { message: string }>;
let mockFormLoading = false;
let mockIsSubmitting = false;

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
  useForm: () => ({
    refineCore: {
      onFinish: mockOnFinish,
      formLoading: mockFormLoading,
    },
    handleSubmit: (cb: (values: Record<string, string>) => unknown) => () =>
      cb({ ...mockValues }),
    register: (name: string) => ({
      name,
      onChange: (event: { target: { value: string } }) => {
        mockValues[name] = event.target.value;
      },
      onBlur: vi.fn(),
      ref: vi.fn(),
      defaultValue: mockValues[name] ?? "",
    }),
    control: {},
    formState: { errors: mockErrors, isSubmitting: mockIsSubmitting },
  }),
}));

describe("IntegrationCreateForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValues = {
      type: "GOOGLE_WORKSPACE",
      domain: "",
      adminEmail: "",
      serviceAccountEmail: "",
      privateKey: "",
    };
    mockErrors = {};
    mockFormLoading = false;
    mockIsSubmitting = false;
    mockOnFinish.mockResolvedValue({ data: { id: "int-1" } });
  });

  it("입력 필드와 버튼을 렌더링한다", () => {
    render(<IntegrationCreateForm />);

    expect(screen.getByLabelText(/연동 유형/)).toBeInTheDocument();
    expect(screen.getByLabelText(/도메인/)).toBeInTheDocument();
    expect(screen.getByLabelText(/관리자 이메일/)).toBeInTheDocument();
    expect(screen.getByLabelText(/서비스 계정 이메일/)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/서비스 계정 Private Key/)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /생성/ })).toBeInTheDocument();
  });

  it("성공 시 onFinish를 호출하고 리다이렉트한다", async () => {
    const user = userEvent.setup();
    render(<IntegrationCreateForm />);

    await user.type(screen.getByLabelText(/도메인/), "example.com");
    await user.click(screen.getByRole("button", { name: /생성/ }));

    expect(mockOnFinish).toHaveBeenCalled();
    expect(mockRouter.push).toHaveBeenCalledWith("/integrations");
  });

  it("로딩 중이면 버튼을 비활성화한다", async () => {
    mockFormLoading = true;
    const user = userEvent.setup();
    render(<IntegrationCreateForm />);

    const submit = screen.getByRole("button", { name: /생성/ });
    await user.click(submit);

    expect(submit).toBeDisabled();
  });
});
