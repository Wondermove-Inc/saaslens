// src/components/settings/budget-settings-form.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BudgetSettings, DEFAULT_BUDGET_SETTINGS } from "@/types/budget";
import { BudgetSettingsForm } from "./budget-settings-form";

// Mock server action
vi.mock("@/actions/budget-settings", () => ({
  updateBudgetSettings: vi.fn(),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { updateBudgetSettings } from "@/actions/budget-settings";
import { toast } from "sonner";

describe("BudgetSettingsForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render with default settings", () => {
    render(<BudgetSettingsForm initialSettings={DEFAULT_BUDGET_SETTINGS} />);

    // 통화 선택 확인
    expect(screen.getByText("통화 단위")).toBeInTheDocument();

    // 자동 설정 토글 확인
    expect(screen.getByText("전월 지출 기준 자동 설정")).toBeInTheDocument();

    // 저장 버튼 확인
    expect(screen.getByRole("button", { name: /저장/i })).toBeInTheDocument();
  });

  it("should render with custom settings", () => {
    const customSettings: BudgetSettings = {
      currency: "USD",
      monthlyBudget: 5000,
      alertThreshold: 90,
    };

    render(<BudgetSettingsForm initialSettings={customSettings} />);

    // 월별 예산 입력 필드가 표시되어야 함 (자동 설정 해제)
    expect(screen.getByLabelText(/월별 예산/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/월별 예산/i)).toHaveValue("5,000");
  });

  it("should toggle auto budget mode", async () => {
    const user = userEvent.setup();

    render(<BudgetSettingsForm initialSettings={DEFAULT_BUDGET_SETTINGS} />);

    // 초기에는 자동 설정이 켜져 있음 (monthlyBudget: null)
    const toggle = screen.getByRole("switch");
    expect(toggle).toBeChecked();

    // 토글을 끄면 예산 입력 필드가 나타남
    await user.click(toggle);

    expect(toggle).not.toBeChecked();
    expect(screen.getByLabelText(/월별 예산/i)).toBeInTheDocument();
  });

  it("should call updateBudgetSettings on form submit", async () => {
    const user = userEvent.setup();
    vi.mocked(updateBudgetSettings).mockResolvedValue({ success: true });

    const settings: BudgetSettings = {
      currency: "KRW",
      monthlyBudget: 1000000,
      alertThreshold: 80,
    };

    render(<BudgetSettingsForm initialSettings={settings} />);

    const saveButton = screen.getByRole("button", { name: /저장/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(updateBudgetSettings).toHaveBeenCalled();
    });

    expect(toast.success).toHaveBeenCalledWith("예산 설정이 저장되었습니다");
  });

  it("should show error toast on update failure", async () => {
    const user = userEvent.setup();
    vi.mocked(updateBudgetSettings).mockResolvedValue({
      success: false,
      message: "관리자 권한이 필요합니다",
    });

    render(<BudgetSettingsForm initialSettings={DEFAULT_BUDGET_SETTINGS} />);

    const saveButton = screen.getByRole("button", { name: /저장/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("관리자 권한이 필요합니다");
    });
  });

  it("should format currency input correctly", async () => {
    const user = userEvent.setup();

    const settings: BudgetSettings = {
      currency: "KRW",
      monthlyBudget: 0,
      alertThreshold: 80,
    };

    render(<BudgetSettingsForm initialSettings={settings} />);

    const input = screen.getByLabelText(/월별 예산/i);

    // 숫자 입력
    await user.clear(input);
    await user.type(input, "1000000");

    // 포맷팅된 값 확인 (1,000,000)
    expect(input).toHaveValue("1,000,000");
  });

  it("should display current budget status", () => {
    const settings: BudgetSettings = {
      currency: "KRW",
      monthlyBudget: null,
      alertThreshold: 80,
    };

    render(<BudgetSettingsForm initialSettings={settings} />);

    // 자동 설정 상태 메시지 확인
    expect(
      screen.getByText(/전월 카드 매입 승인 내역을 기준으로 예산이 설정됩니다/i)
    ).toBeInTheDocument();
  });
});
