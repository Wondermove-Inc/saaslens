// src/components/integrations/integration-settings-form.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IntegrationSettingsForm } from "./integration-settings-form";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

// Mock Server Actions
const mockUpdateIntegrationSettings = vi.fn();
vi.mock("@/actions/integrations", () => ({
  updateIntegrationSettings: (...args: unknown[]) =>
    mockUpdateIntegrationSettings(...args),
}));

describe("IntegrationSettingsForm", () => {
  const defaultProps = {
    integrationId: "int-1",
    initialSettings: {
      autoSync: true,
      syncInterval: "daily" as const,
      syncUsers: true,
      syncApps: false,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render form fields", () => {
    render(<IntegrationSettingsForm {...defaultProps} />);

    expect(screen.getByText("자동 동기화")).toBeInTheDocument();
    expect(screen.getByText("동기화 주기")).toBeInTheDocument();
    expect(screen.getByText("사용자 동기화")).toBeInTheDocument();
    expect(screen.getByText("앱 동기화")).toBeInTheDocument();
  });

  it("should render initial values", () => {
    render(<IntegrationSettingsForm {...defaultProps} />);

    // 자동 동기화 스위치가 켜져 있어야 함
    const autoSyncSwitch = screen.getByRole("switch", { name: /자동 동기화/i });
    expect(autoSyncSwitch).toBeChecked();

    // 사용자 동기화 스위치가 켜져 있어야 함
    const syncUsersSwitch = screen.getByRole("switch", {
      name: /사용자 동기화/i,
    });
    expect(syncUsersSwitch).toBeChecked();

    // 앱 동기화 스위치가 꺼져 있어야 함
    const syncAppsSwitch = screen.getByRole("switch", { name: /앱 동기화/i });
    expect(syncAppsSwitch).not.toBeChecked();
  });

  it("should call updateIntegrationSettings on save", async () => {
    mockUpdateIntegrationSettings.mockResolvedValue({ success: true });
    const user = userEvent.setup();

    render(<IntegrationSettingsForm {...defaultProps} />);

    const saveButton = screen.getByRole("button", { name: /저장/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateIntegrationSettings).toHaveBeenCalledWith("int-1", {
        autoSync: true,
        syncInterval: "daily",
        syncUsers: true,
        syncApps: false,
      });
    });
  });

  it("should toggle autoSync setting", async () => {
    mockUpdateIntegrationSettings.mockResolvedValue({ success: true });
    const user = userEvent.setup();

    render(<IntegrationSettingsForm {...defaultProps} />);

    const autoSyncSwitch = screen.getByRole("switch", { name: /자동 동기화/i });
    await user.click(autoSyncSwitch);

    const saveButton = screen.getByRole("button", { name: /저장/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateIntegrationSettings).toHaveBeenCalledWith(
        "int-1",
        expect.objectContaining({
          autoSync: false,
        })
      );
    });
  });

  it("should show loading state when saving", async () => {
    mockUpdateIntegrationSettings.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ success: true }), 100)
        )
    );
    const user = userEvent.setup();

    render(<IntegrationSettingsForm {...defaultProps} />);

    const saveButton = screen.getByRole("button", { name: /저장/i });
    await user.click(saveButton);

    expect(screen.getByText(/저장 중/i)).toBeInTheDocument();
  });

  it("should render disabled state when disabled prop is true", () => {
    render(<IntegrationSettingsForm {...defaultProps} disabled />);

    const saveButton = screen.getByRole("button", { name: /저장/i });
    expect(saveButton).toBeDisabled();
  });
});
