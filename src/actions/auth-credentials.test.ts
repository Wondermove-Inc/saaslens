// src/actions/auth-credentials.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import { registerUser } from "./auth-credentials";

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    emailVerificationToken: {
      create: vi.fn(),
    },
  },
}));

// Mock email service
vi.mock("@/lib/services/notification/email-auth", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock password utils
vi.mock("@/lib/auth/password", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed_password"),
}));

import { prisma } from "@/lib/db";

describe("auth-credentials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("registerUser", () => {
    it("should register a new user successfully", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        emailVerified: null,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue(mockUser as never);
      vi.mocked(prisma.emailVerificationToken.create).mockResolvedValue({
        id: "token-1",
        email: "test@example.com",
        token: "verification-token",
        expires: new Date(),
        createdAt: new Date(),
      } as never);

      const result = await registerUser({
        email: "test@example.com",
        password: "TestPassword123!",
        name: "Test User",
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("인증");
      expect(prisma.user.create).toHaveBeenCalled();
      expect(prisma.emailVerificationToken.create).toHaveBeenCalled();
    });

    it("should reject registration with existing email", async () => {
      const existingUser = {
        id: "user-1",
        email: "existing@example.com",
        name: "Existing User",
        passwordHash: "hashed_password",
        accounts: [],
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        existingUser as never
      );

      const result = await registerUser({
        email: "existing@example.com",
        password: "TestPassword123!",
        name: "Test User",
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("이미");
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it("should return EMAIL_EXISTS_OAUTH_GOOGLE when email is registered with Google OAuth", async () => {
      const existingUser = {
        id: "user-1",
        email: "google@example.com",
        name: "Google User",
        passwordHash: null,
        accounts: [{ provider: "google" }],
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        existingUser as never
      );

      const result = await registerUser({
        email: "google@example.com",
        password: "TestPassword123!",
        name: "Test User",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("EMAIL_EXISTS_OAUTH_GOOGLE");
      expect(result.message).toContain("Google");
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it("should return EMAIL_EXISTS_CREDENTIALS when email is registered with credentials", async () => {
      const existingUser = {
        id: "user-1",
        email: "credentials@example.com",
        name: "Credentials User",
        passwordHash: "hashed_password",
        accounts: [],
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        existingUser as never
      );

      const result = await registerUser({
        email: "credentials@example.com",
        password: "TestPassword123!",
        name: "Test User",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("EMAIL_EXISTS_CREDENTIALS");
      expect(result.message).toContain("이미 가입");
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it("should return EMAIL_EXISTS for other OAuth providers", async () => {
      const existingUser = {
        id: "user-1",
        email: "oauth@example.com",
        name: "OAuth User",
        passwordHash: null,
        accounts: [{ provider: "okta" }],
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        existingUser as never
      );

      const result = await registerUser({
        email: "oauth@example.com",
        password: "TestPassword123!",
        name: "Test User",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("EMAIL_EXISTS");
      expect(result.message).toContain("이미 사용");
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it("should reject registration with invalid email", async () => {
      const result = await registerUser({
        email: "invalid-email",
        password: "TestPassword123!",
        name: "Test User",
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("이메일");
    });

    it("should reject registration with weak password", async () => {
      const result = await registerUser({
        email: "test@example.com",
        password: "weak",
        name: "Test User",
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it("should handle FormData input", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        emailVerified: null,
      } as never);
      vi.mocked(prisma.emailVerificationToken.create).mockResolvedValue({
        id: "token-1",
        email: "test@example.com",
        token: "verification-token",
        expires: new Date(),
        createdAt: new Date(),
      } as never);

      const formData = new FormData();
      formData.set("email", "test@example.com");
      formData.set("password", "TestPassword123!");
      formData.set("name", "Test User");

      const result = await registerUser(formData);

      expect(result.success).toBe(true);
    });
  });
});
