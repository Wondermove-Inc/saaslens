// src/providers/auth-provider.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authProvider } from "./auth-provider";

const mockSignIn = vi.fn();
const mockSignOut = vi.fn();
const mockFetch = vi.fn();

vi.mock("@/lib/auth", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signOut: () => mockSignOut(),
}));

describe("authProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
  });

  describe("login", () => {
    it("signIn을 호출하고 성공을 반환한다", async () => {
      mockSignIn.mockResolvedValueOnce(undefined);

      const result = await authProvider.login?.({
        providerName: "google",
        email: "test@example.com",
        password: "password",
      });

      expect(mockSignIn).toHaveBeenCalledWith("google", {
        email: "test@example.com",
        password: "password",
      });
      expect(result).toEqual({
        success: true,
        redirectTo: "/",
      });
    });
  });

  describe("logout", () => {
    it("signOut을 호출하고 로그인 페이지로 리디렉션한다", async () => {
      mockSignOut.mockResolvedValueOnce(undefined);

      const result = await authProvider.logout?.({});

      expect(mockSignOut).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        redirectTo: "/login",
      });
    });
  });

  describe("check", () => {
    it("세션이 있으면 인증됨을 반환한다", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: "user-1" } }),
      });

      const result = await authProvider.check?.({});

      expect(mockFetch).toHaveBeenCalledWith("/api/auth/session", {
        credentials: "include",
      });
      expect(result).toEqual({
        authenticated: true,
      });
    });

    it("세션이 없으면 인증 안됨과 리디렉션을 반환한다", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => null,
      });

      const result = await authProvider.check?.({});

      expect(mockFetch).toHaveBeenCalled();
      expect(result).toEqual({
        authenticated: false,
        redirectTo: "/login",
      });
    });
  });

  describe("getIdentity", () => {
    it("세션 사용자 정보를 반환한다", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: {
            id: "user-1",
            email: "user@test.com",
            name: "Tester",
            role: "ADMIN",
            organizationId: "org-1",
          },
        }),
      });

      const result = await authProvider.getIdentity?.({});

      expect(result).toEqual({
        id: "user-1",
        email: "user@test.com",
        name: "Tester",
        role: "ADMIN",
        organizationId: "org-1",
      });
    });
  });

  describe("getPermissions", () => {
    it("세션 사용자 역할을 반환한다", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { role: "ADMIN" } }),
      });

      const result = await authProvider.getPermissions?.({});

      expect(result).toBe("ADMIN");
    });
  });

  describe("onError", () => {
    it("로그아웃과 로그인 페이지 리디렉션을 반환한다", async () => {
      const result = await authProvider.onError?.(new Error("test error"));

      expect(result).toEqual({
        logout: true,
        redirectTo: "/login",
      });
    });
  });
});
