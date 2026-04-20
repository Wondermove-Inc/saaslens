// src/app/(auth)/invite/[token]/page.test.tsx
import { acceptInvitation } from "@/actions/invitations";
import messages from "@/i18n/messages/ko.json";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import InviteAcceptPage from "./page";

const getMessage = (key: string): string => {
  return key.split(".").reduce((acc, part) => {
    if (typeof acc === "object" && acc !== null && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return key;
  }, messages as unknown) as string;
};

const formatMessage = (
  template: string,
  values?: Record<string, string | number>
) => {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_, token) =>
    values[token] !== undefined ? String(values[token]) : `{${token}}`
  );
};

vi.mock("@/actions/invitations", () => ({
  acceptInvitation: vi.fn(),
}));

vi.mock("next-intl/server", () => ({
  getTranslations:
    async () => (key: string, values?: Record<string, string | number>) =>
      formatMessage(getMessage(key), values),
}));

describe("InviteAcceptPage", () => {
  it("성공 메시지를 표시해야 한다", async () => {
    vi.mocked(acceptInvitation).mockResolvedValue({
      success: true,
      message: "초대가 수락되었습니다",
    });

    const page = await InviteAcceptPage({
      params: Promise.resolve({ token: "token-1" }),
    });
    render(page);

    expect(screen.getByText(/초대를 수락했습니다/)).toBeInTheDocument();
  });

  it("실패 시 에러 메시지를 표시해야 한다", async () => {
    vi.mocked(acceptInvitation).mockResolvedValue({
      success: false,
      message: "초대가 만료되었습니다",
    });

    const page = await InviteAcceptPage({
      params: Promise.resolve({ token: "token-1" }),
    });
    render(page);

    expect(screen.getByText(/초대가 만료되었습니다/)).toBeInTheDocument();
    expect(screen.getByText(/로그인 페이지로 이동/)).toBeInTheDocument();
  });
});
