// src/app/(auth)/signup/page.test.tsx
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

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
  signIn: vi.fn(),
}));

// Mock registerUser action
vi.mock("@/actions/auth-credentials", () => ({
  registerUser: vi.fn(),
}));

vi.mock("next-intl/server", () => ({
  getTranslations:
    async () => (key: string, values?: Record<string, string | number>) =>
      formatMessage(getMessage(key), values),
}));

import SignupPage from "./page";

describe("SignupPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render signup form", async () => {
    render(await SignupPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("회원가입")).toBeInTheDocument();
    expect(screen.getByLabelText(/이름/)).toBeInTheDocument();
    expect(screen.getByLabelText(/이메일/)).toBeInTheDocument();
    expect(screen.getByLabelText(/비밀번호/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /가입/i })).toBeInTheDocument();
  });

  it("should have link to login page", async () => {
    render(await SignupPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText(/이미 계정이 있으신가요/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /로그인/ })).toHaveAttribute(
      "href",
      "/login"
    );
  });

  it("should have Google OAuth button", async () => {
    render(await SignupPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText(/Google로 계속하기/)).toBeInTheDocument();
  });

  describe("error handling", () => {
    it("should display Google login button when EMAIL_EXISTS_OAUTH_GOOGLE error", async () => {
      render(
        await SignupPage({
          searchParams: Promise.resolve({ error: "EMAIL_EXISTS_OAUTH_GOOGLE" }),
        })
      );

      expect(
        screen.getByText(/이미 Google 계정으로 가입되어 있습니다/)
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Google로 로그인/ })
      ).toBeInTheDocument();
    });

    it("should display login link when EMAIL_EXISTS_CREDENTIALS error", async () => {
      render(
        await SignupPage({
          searchParams: Promise.resolve({ error: "EMAIL_EXISTS_CREDENTIALS" }),
        })
      );

      expect(screen.getByText(/이미 가입된 이메일/)).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /로그인하러 가기/ })
      ).toHaveAttribute("href", "/login");
    });

    it("should display generic error message for unknown error code", async () => {
      render(
        await SignupPage({
          searchParams: Promise.resolve({ error: "UNKNOWN_ERROR" }),
        })
      );

      expect(screen.getByText(/오류가 발생/)).toBeInTheDocument();
    });

    it("should display generic error for EMAIL_EXISTS", async () => {
      render(
        await SignupPage({
          searchParams: Promise.resolve({ error: "EMAIL_EXISTS" }),
        })
      );

      expect(screen.getByText(/이미 사용 중인 이메일/)).toBeInTheDocument();
    });
  });
});
