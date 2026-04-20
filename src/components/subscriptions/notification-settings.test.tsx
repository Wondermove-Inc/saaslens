// src/components/subscriptions/notification-settings.test.tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationSettings } from "./notification-settings";

describe("NotificationSettings", () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("기본 알림 설정을 렌더링해야 한다", () => {
    render(
      <NotificationSettings
        subscriptionId="sub-1"
        renewalAlert30={true}
        renewalAlert60={false}
        renewalAlert90={false}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText("알림 설정")).toBeInTheDocument();
    expect(screen.getByText("30일 전 알림")).toBeInTheDocument();
    expect(screen.getByText("60일 전 알림")).toBeInTheDocument();
    expect(screen.getByText("90일 전 알림")).toBeInTheDocument();
  });

  it("활성화된 알림을 체크 상태로 표시해야 한다", () => {
    render(
      <NotificationSettings
        subscriptionId="sub-1"
        renewalAlert30={true}
        renewalAlert60={true}
        renewalAlert90={false}
        onChange={mockOnChange}
      />
    );

    const switches = screen.getAllByRole("switch");
    expect(switches[0]).toHaveAttribute("aria-checked", "true"); // 30일
    expect(switches[1]).toHaveAttribute("aria-checked", "true"); // 60일
    expect(switches[2]).toHaveAttribute("aria-checked", "false"); // 90일
  });

  it("스위치 클릭 시 onChange를 호출해야 한다", async () => {
    render(
      <NotificationSettings
        subscriptionId="sub-1"
        renewalAlert30={true}
        renewalAlert60={false}
        renewalAlert90={false}
        onChange={mockOnChange}
      />
    );

    const switches = screen.getAllByRole("switch");

    // 60일 알림 활성화
    fireEvent.click(switches[1]);

    expect(mockOnChange).toHaveBeenCalledWith("renewalAlert60", true);
  });

  it("비활성화된 알림을 활성화할 수 있어야 한다", async () => {
    render(
      <NotificationSettings
        subscriptionId="sub-1"
        renewalAlert30={false}
        renewalAlert60={false}
        renewalAlert90={false}
        onChange={mockOnChange}
      />
    );

    const switches = screen.getAllByRole("switch");

    // 30일 알림 활성화
    fireEvent.click(switches[0]);

    expect(mockOnChange).toHaveBeenCalledWith("renewalAlert30", true);
  });

  it("활성화된 알림을 비활성화할 수 있어야 한다", async () => {
    render(
      <NotificationSettings
        subscriptionId="sub-1"
        renewalAlert30={true}
        renewalAlert60={false}
        renewalAlert90={false}
        onChange={mockOnChange}
      />
    );

    const switches = screen.getAllByRole("switch");

    // 30일 알림 비활성화
    fireEvent.click(switches[0]);

    expect(mockOnChange).toHaveBeenCalledWith("renewalAlert30", false);
  });

  it("disabled 상태일 때 스위치를 비활성화해야 한다", () => {
    render(
      <NotificationSettings
        subscriptionId="sub-1"
        renewalAlert30={true}
        renewalAlert60={false}
        renewalAlert90={false}
        onChange={mockOnChange}
        disabled={true}
      />
    );

    const switches = screen.getAllByRole("switch");
    switches.forEach((sw) => {
      expect(sw).toBeDisabled();
    });
  });

  it("알림 설명을 표시해야 한다", () => {
    render(
      <NotificationSettings
        subscriptionId="sub-1"
        renewalAlert30={true}
        renewalAlert60={false}
        renewalAlert90={false}
        onChange={mockOnChange}
      />
    );

    expect(
      screen.getByText(/갱신일 30일 전에 이메일 알림/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/갱신일 60일 전에 이메일 알림/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/갱신일 90일 전에 이메일 알림/)
    ).toBeInTheDocument();
  });
});
