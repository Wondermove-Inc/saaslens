// src/components/common/v2-coming-soon.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { V2ComingSoon } from "./v2-coming-soon";

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

describe("V2ComingSoon", () => {
  describe("렌더링", () => {
    it("should render Coming Soon title", () => {
      render(<V2ComingSoon feature="테스트 기능" />);

      expect(screen.getByText("Coming Soon")).toBeInTheDocument();
    });

    it("should render feature name", () => {
      render(<V2ComingSoon feature="칸반 보드" />);

      expect(screen.getByText("칸반 보드")).toBeInTheDocument();
    });

    it("should render default description when not provided", () => {
      render(<V2ComingSoon feature="테스트 기능" />);

      expect(
        screen.getByText("이 기능은 V2 버전에서 제공될 예정입니다.")
      ).toBeInTheDocument();
    });

    it("should render custom description when provided", () => {
      render(
        <V2ComingSoon feature="테스트 기능" description="커스텀 설명입니다." />
      );

      expect(screen.getByText("커스텀 설명입니다.")).toBeInTheDocument();
    });

    it("should render dashboard navigation button", () => {
      render(<V2ComingSoon feature="테스트 기능" />);

      const button = screen.getByRole("link", { name: "대시보드로 이동" });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute("href", "/dashboard");
    });
  });

  describe("아이콘", () => {
    it("should render Construction icon", () => {
      render(<V2ComingSoon feature="테스트 기능" />);

      // Construction 아이콘이 있는 컨테이너 확인
      const iconContainer = document.querySelector(".rounded-full");
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe("스타일", () => {
    it("should center content vertically", () => {
      const { container } = render(<V2ComingSoon feature="테스트 기능" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("flex");
      expect(wrapper).toHaveClass("flex-col");
      expect(wrapper).toHaveClass("items-center");
      expect(wrapper).toHaveClass("justify-center");
    });
  });
});
