// src/lib/validation/password.test.ts
import { describe, expect, it } from "vitest";

import { passwordSchema, validatePassword } from "./password";

describe("Password Validation", () => {
  describe("passwordSchema", () => {
    it("should accept valid password with all requirements", () => {
      const validPassword = "TestPassword123!";
      const result = passwordSchema.safeParse(validPassword);

      expect(result.success).toBe(true);
    });

    it("should reject password shorter than 8 characters", () => {
      const shortPassword = "Test1!";
      const result = passwordSchema.safeParse(shortPassword);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("8자");
      }
    });

    it("should reject password without uppercase letter", () => {
      const noUppercase = "testpassword123!";
      const result = passwordSchema.safeParse(noUppercase);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("대문자");
      }
    });

    it("should reject password without lowercase letter", () => {
      const noLowercase = "TESTPASSWORD123!";
      const result = passwordSchema.safeParse(noLowercase);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("소문자");
      }
    });

    it("should reject password without number", () => {
      const noNumber = "TestPassword!";
      const result = passwordSchema.safeParse(noNumber);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("숫자");
      }
    });

    it("should reject password without special character", () => {
      const noSpecial = "TestPassword123";
      const result = passwordSchema.safeParse(noSpecial);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("특수문자");
      }
    });

    it("should reject password longer than 72 characters", () => {
      const longPassword = "Test1!" + "a".repeat(70);
      const result = passwordSchema.safeParse(longPassword);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("72자");
      }
    });
  });

  describe("validatePassword", () => {
    it("should return success true for valid password", () => {
      const result = validatePassword("TestPassword123!");

      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it("should return errors for invalid password", () => {
      const result = validatePassword("weak");

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });
});
