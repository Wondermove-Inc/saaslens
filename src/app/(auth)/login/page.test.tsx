// src/app/(auth)/login/page.test.tsx
import messages from "@/i18n/messages/ko.json";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

// Mock next-auth before importing page
vi.mock("next-auth", () => ({
  AuthError: class AuthError extends Error {
    type: string;
    constructor(message?: string) {
      super(message);
      this.type = "CredentialsSignin";
    }
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
  signIn: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: async () => {
    const t = (key: string, values?: Record<string, string | number>) =>
      formatMessage(getMessage(key), values);
    t.raw = (key: string) => getMessage(key);
    return t;
  },
}));

// Mock LoginForm to render key fields for integration testing
vi.mock("@/components/auth/login-form", () => ({
  LoginForm: ({
    translations,
  }: {
    action: (formData: FormData) => void;
    translations: {
      email: string;
      emailPlaceholder: string;
      sendOtp: string;
      sendingOtp: string;
      resendOtp: string;
      resendCooldown: string;
      otpLabel: string;
      otpPlaceholder: string;
      submit: string;
      signingIn: string;
      changeEmail: string;
    };
  }) => (
    <form data-testid="login-credentials-form">
      <label htmlFor="mock-email">{translations.email}</label>
      <input id="mock-email" name="email" type="email" />
      <button type="button" data-testid="send-otp-btn">
        {translations.sendOtp}
      </button>
      <button type="submit">{translations.submit}</button>
    </form>
  ),
}));

import { auth } from "@/lib/auth";
import LoginPage from "./page";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockedAuth = auth as any;

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAuth.mockResolvedValue(null);
  });

  const renderLoginPage = async (searchParams: { error?: string } = {}) => {
    const ui = await LoginPage({ searchParams: Promise.resolve(searchParams) });
    render(ui);
  };

  describe("렌더링", () => {
    it("로그인 페이지가 렌더링되어야 한다", async () => {
      await renderLoginPage();
      expect(screen.getByTestId("login-page")).toBeInTheDocument();
    });

    it("로그인 제목이 표시되어야 한다", async () => {
      await renderLoginPage();
      expect(
        screen.getByRole("heading", { name: "로그인" })
      ).toBeInTheDocument();
    });

    it("로그인 설명이 표시되어야 한다", async () => {
      await renderLoginPage();
      expect(
        screen.getByText("이메일 인증 코드로 로그인하세요")
      ).toBeInTheDocument();
    });
  });

  describe("이메일/OTP 폼", () => {
    it("이메일 입력 필드가 존재해야 한다", async () => {
      await renderLoginPage();
      expect(screen.getByLabelText(/이메일/)).toBeInTheDocument();
    });

    it("OTP 발송 버튼이 존재해야 한다", async () => {
      await renderLoginPage();
      expect(screen.getByTestId("send-otp-btn")).toBeInTheDocument();
    });

    it("로그인 버튼이 존재해야 한다", async () => {
      await renderLoginPage();
      expect(
        screen.getByRole("button", { name: /로그인/i })
      ).toBeInTheDocument();
    });

    it("로그인 버튼 텍스트가 올바르게 표시되어야 한다", async () => {
      await renderLoginPage();
      expect(
        screen.getByRole("button", { name: "로그인" })
      ).toBeInTheDocument();
    });
  });

  describe("Google 로그인 버튼", () => {
    it("Google 로그인 버튼이 존재해야 한다", async () => {
      await renderLoginPage();
      expect(
        screen.getByRole("button", { name: /google/i })
      ).toBeInTheDocument();
    });

    it("버튼에 form이 연결되어 있어야 한다", async () => {
      await renderLoginPage();
      const form = screen.getByTestId("login-form");
      expect(form).toBeInTheDocument();
    });
  });

  describe("에러 메시지", () => {
    it("CredentialsSignin 에러 시 메시지를 표시해야 한다", async () => {
      await renderLoginPage({ error: "CredentialsSignin" });
      expect(
        screen.getByText("인증 코드가 올바르지 않습니다")
      ).toBeInTheDocument();
    });
  });

  describe("링크", () => {
    it("회원가입 링크가 존재하지 않아야 한다", async () => {
      await renderLoginPage();
      expect(
        screen.queryByRole("link", { name: /회원가입/ })
      ).not.toBeInTheDocument();
    });

    it("이용약관/개인정보 처리방침 문구가 표시되지 않아야 한다", async () => {
      await renderLoginPage();
      expect(screen.queryByText(/이용약관/)).not.toBeInTheDocument();
      expect(screen.queryByText(/개인정보 처리방침/)).not.toBeInTheDocument();
    });
  });
});
