// src/components/devices/fleetdm-install-guide.test.tsx
import messages from "@/i18n/messages/ko.json";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { FleetDMInstallGuide } from "./fleetdm-install-guide";

const renderWithProvider = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="ko" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe("FleetDMInstallGuide", () => {
  describe("렌더링", () => {
    it("should render title", () => {
      renderWithProvider(<FleetDMInstallGuide />);

      expect(screen.getByText("FleetDM 에이전트 설치")).toBeInTheDocument();
    });

    it("should render OS tabs", () => {
      renderWithProvider(<FleetDMInstallGuide />);

      expect(screen.getByRole("tab", { name: /macos/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /windows/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /linux/i })).toBeInTheDocument();
    });

    it("should show macOS content by default", () => {
      renderWithProvider(<FleetDMInstallGuide />);

      expect(screen.getByText(/Homebrew/)).toBeInTheDocument();
    });
  });

  describe("탭 전환", () => {
    it("should have Windows tab available", () => {
      renderWithProvider(<FleetDMInstallGuide />);

      const windowsTab = screen.getByRole("tab", { name: /windows/i });
      // Windows 탭이 클릭 가능한 상태
      expect(windowsTab).not.toBeDisabled();
    });

    it("should have Linux tab available", () => {
      renderWithProvider(<FleetDMInstallGuide />);

      const linuxTab = screen.getByRole("tab", { name: /linux/i });
      // Linux 탭이 클릭 가능한 상태
      expect(linuxTab).not.toBeDisabled();
    });

    it("should have macOS tab selected by default", () => {
      renderWithProvider(<FleetDMInstallGuide />);

      const macosTab = screen.getByRole("tab", { name: /macos/i });
      expect(macosTab).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("다운로드 링크", () => {
    it("should have download link", () => {
      renderWithProvider(<FleetDMInstallGuide />);

      // 다운로드 페이지 링크 확인
      const downloadLink = screen.getByRole("link", {
        name: /공식 다운로드 페이지/,
      });
      expect(downloadLink).toHaveAttribute(
        "href",
        expect.stringContaining("fleetdm.com")
      );
    });
  });

  describe("복사 기능", () => {
    it("should have copy button for install command", () => {
      renderWithProvider(<FleetDMInstallGuide />);

      const copyButtons = screen.getAllByRole("button");
      // 복사 버튼이 존재하는지 확인
      expect(copyButtons.length).toBeGreaterThan(0);
    });
  });

  describe("onClose 콜백", () => {
    it("should call onClose when close button is clicked", () => {
      const onClose = vi.fn();
      renderWithProvider(<FleetDMInstallGuide onClose={onClose} />);

      const closeButton = screen.getByRole("button", { name: /닫기/i });
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
