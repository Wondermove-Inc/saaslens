import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IntegrationStatusForm } from "./integration-status-form";

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

vi.mock("@refinedev/react-hook-form", () => ({
  useForm: () => ({
    refineCore: {
      onFinish: mockOnFinish,
      formLoading: mockFormLoading,
      mutationResult: mockMutationResult,
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
    control: { setValue: vi.fn() },
    formState: { errors: mockErrors, isSubmitting: mockIsSubmitting },
  }),
}));

describe("IntegrationStatusForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockErrors = {};
    mockFormLoading = false;
    mockIsSubmitting = false;
    mockMutationResult = undefined;
    mockOnFinish.mockResolvedValue({ data: { id: "int-1" } });
    mockValues = { status: "ACTIVE" };
  });

  it("상태 선택과 버튼을 렌더링한다", () => {
    render(<IntegrationStatusForm id="int-1" defaultStatus="ACTIVE" />);

    expect(screen.getAllByText(/상태/).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /저장/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /취소/ })).toBeInTheDocument();
  });

  it("성공 시 onFinish 호출 후 리다이렉트", async () => {
    const user = userEvent.setup();
    render(<IntegrationStatusForm id="int-1" defaultStatus="ACTIVE" />);

    await user.click(screen.getByRole("button", { name: /저장/ }));

    expect(mockOnFinish).toHaveBeenCalledWith({ status: "ACTIVE" });
    expect(mockRouter.push).toHaveBeenCalledWith("/integrations/int-1");
  });

  it("로딩 중이면 버튼을 비활성화한다", () => {
    mockFormLoading = true;
    render(<IntegrationStatusForm id="int-1" defaultStatus="ACTIVE" />);

    const submit = screen.getByRole("button", { name: /저장/ });
    expect(submit).toBeDisabled();
  });
});
