// src/lib/services/category-normalizer.test.ts
import { describe, expect, it } from "vitest";

import {
  APP_CATEGORIES,
  CATEGORY_ALIAS_MAP,
  normalizeCategory,
} from "./category-normalizer";

describe("category-normalizer", () => {
  describe("APP_CATEGORIES", () => {
    it("should have exactly 10 standard categories", () => {
      expect(APP_CATEGORIES).toHaveLength(10);
    });

    it("should contain all expected categories", () => {
      const expected = [
        "collaboration",
        "design",
        "ai",
        "productivity",
        "development",
        "marketing",
        "analytics",
        "security",
        "finance",
        "hr",
      ];
      expect(APP_CATEGORIES).toEqual(expected);
    });
  });

  describe("CATEGORY_ALIAS_MAP", () => {
    it("should map all alias keys to valid standard categories", () => {
      const standardSet = new Set(APP_CATEGORIES);
      for (const [, value] of Object.entries(CATEGORY_ALIAS_MAP)) {
        expect(standardSet.has(value)).toBe(true);
      }
    });
  });

  describe("normalizeCategory", () => {
    it("should return null for null input", () => {
      expect(normalizeCategory(null)).toBeNull();
    });

    it("should return null for undefined input", () => {
      expect(
        normalizeCategory(undefined as unknown as string | null)
      ).toBeNull();
    });

    it("should return null for empty string", () => {
      expect(normalizeCategory("")).toBeNull();
    });

    it("should return null for whitespace-only string", () => {
      expect(normalizeCategory("   ")).toBeNull();
    });

    it("should return standard category as-is", () => {
      for (const cat of APP_CATEGORIES) {
        expect(normalizeCategory(cat)).toBe(cat);
      }
    });

    it("should normalize standard category with different casing", () => {
      expect(normalizeCategory("Collaboration")).toBe("collaboration");
      expect(normalizeCategory("DESIGN")).toBe("design");
      expect(normalizeCategory("AI")).toBe("ai");
    });

    // Alias mapping tests
    it('should map "Communication" to "collaboration"', () => {
      expect(normalizeCategory("Communication")).toBe("collaboration");
    });

    it('should map "Messaging" to "collaboration"', () => {
      expect(normalizeCategory("Messaging")).toBe("collaboration");
    });

    it('should map "Video Conferencing" to "collaboration"', () => {
      expect(normalizeCategory("Video Conferencing")).toBe("collaboration");
    });

    it('should map "Developer Tools" to "development"', () => {
      expect(normalizeCategory("Developer Tools")).toBe("development");
    });

    it('should map "DevOps" to "development"', () => {
      expect(normalizeCategory("DevOps")).toBe("development");
    });

    it('should map "CI/CD" to "development"', () => {
      expect(normalizeCategory("CI/CD")).toBe("development");
    });

    it('should map "AI/ML" to "ai"', () => {
      expect(normalizeCategory("AI/ML")).toBe("ai");
    });

    it('should map "Generative AI" to "ai"', () => {
      expect(normalizeCategory("Generative AI")).toBe("ai");
    });

    it('should map "Design Tools" to "design"', () => {
      expect(normalizeCategory("Design Tools")).toBe("design");
    });

    it('should map "UI/UX" to "design"', () => {
      expect(normalizeCategory("UI/UX")).toBe("design");
    });

    it('should map "Project Management" to "productivity"', () => {
      expect(normalizeCategory("Project Management")).toBe("productivity");
    });

    it('should map "CRM" to "marketing"', () => {
      expect(normalizeCategory("CRM")).toBe("marketing");
    });

    it('should map "Business Intelligence" to "analytics"', () => {
      expect(normalizeCategory("Business Intelligence")).toBe("analytics");
    });

    it('should map "Cybersecurity" to "security"', () => {
      expect(normalizeCategory("Cybersecurity")).toBe("security");
    });

    it('should map "Password Manager" to "security"', () => {
      expect(normalizeCategory("Password Manager")).toBe("security");
    });

    it('should map "Accounting" to "finance"', () => {
      expect(normalizeCategory("Accounting")).toBe("finance");
    });

    it('should map "Human Resources" to "hr"', () => {
      expect(normalizeCategory("Human Resources")).toBe("hr");
    });

    it('should map "Recruitment" to "hr"', () => {
      expect(normalizeCategory("Recruitment")).toBe("hr");
    });

    // Case-insensitive alias mapping
    it("should handle alias mapping case-insensitively", () => {
      expect(normalizeCategory("communication")).toBe("collaboration");
      expect(normalizeCategory("DEVELOPER TOOLS")).toBe("development");
      expect(normalizeCategory("ai/ml")).toBe("ai");
    });

    // Unknown/custom categories pass-through
    it("should return original value for unmapped custom category", () => {
      expect(normalizeCategory("Custom Category")).toBe("Custom Category");
    });

    it("should return original value for unknown category", () => {
      expect(normalizeCategory("Education")).toBe("Education");
    });

    // Trimming
    it("should trim whitespace before matching", () => {
      expect(normalizeCategory("  collaboration  ")).toBe("collaboration");
      expect(normalizeCategory("  Communication  ")).toBe("collaboration");
    });
  });
});
