// src/lib/services/notification/email-auth.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import { sendPasswordResetEmail, sendVerificationEmail } from "./email-auth";

// Mock resend
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi
        .fn()
        .mockResolvedValue({ data: { id: "email-id" }, error: null }),
    },
  })),
}));

describe("email-auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendVerificationEmail", () => {
    it("should send verification email successfully", async () => {
      const result = await sendVerificationEmail({
        to: "test@example.com",
        token: "verification-token",
        userName: "Test User",
      });

      expect(result.success).toBe(true);
    });

    it("should send verification email without userName", async () => {
      const result = await sendVerificationEmail({
        to: "test@example.com",
        token: "verification-token",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("sendPasswordResetEmail", () => {
    it("should send password reset email successfully", async () => {
      const result = await sendPasswordResetEmail({
        to: "test@example.com",
        token: "reset-token",
        userName: "Test User",
      });

      expect(result.success).toBe(true);
    });

    it("should send password reset email without userName", async () => {
      const result = await sendPasswordResetEmail({
        to: "test@example.com",
        token: "reset-token",
      });

      expect(result.success).toBe(true);
    });
  });
});
