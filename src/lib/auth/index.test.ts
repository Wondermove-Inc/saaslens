// src/lib/auth/index.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// NextAuth 모듈 mock
vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    handlers: { GET: vi.fn(), POST: vi.fn() },
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));

// Prisma mock
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// PrismaAdapter mock
vi.mock("@auth/prisma-adapter", () => ({
  PrismaAdapter: vi.fn(() => ({})),
}));

// Google provider mock
vi.mock("next-auth/providers/google", () => ({
  default: vi.fn(() => ({ id: "google", name: "Google" })),
}));

describe("NextAuth 설정", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("exports", () => {
    it("auth, signIn, signOut, handlers를 export해야 한다", async () => {
      const authModule = await import("./index");

      expect(authModule.auth).toBeDefined();
      expect(authModule.signIn).toBeDefined();
      expect(authModule.signOut).toBeDefined();
      expect(authModule.handlers).toBeDefined();
    });

    it("handlers는 GET과 POST를 포함해야 한다", async () => {
      const { handlers } = await import("./index");

      expect(handlers).toHaveProperty("GET");
      expect(handlers).toHaveProperty("POST");
    });
  });

  describe("설정 구조", () => {
    it("NextAuth가 올바른 설정으로 호출되어야 한다", async () => {
      const NextAuth = (await import("next-auth")).default;

      // 모듈 재로드를 위해 캐시 클리어
      vi.resetModules();
      await import("./index");

      expect(NextAuth).toHaveBeenCalled();
      const config = vi.mocked(NextAuth).mock
        .calls[0]?.[0] as unknown as Record<string, unknown>;

      // adapter 설정 확인
      expect(config).toHaveProperty("adapter");

      // providers 설정 확인
      expect(config).toHaveProperty("providers");
      expect(Array.isArray(config?.providers)).toBe(true);

      // callbacks 설정 확인
      expect(config).toHaveProperty("callbacks");
      const callbacks = config?.callbacks as Record<string, unknown>;
      expect(callbacks).toHaveProperty("session");

      // pages 설정 확인
      expect(config).toHaveProperty("pages");
      const pages = config?.pages as Record<string, unknown>;
      expect(pages?.signIn).toBe("/login");
    });
  });
});
