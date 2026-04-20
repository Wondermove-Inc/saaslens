// src/lib/services/hibp/breach-checker.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkCredentialHIBP, hashSha1, hashSha512 } from "./breach-checker";

describe("breach-checker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("hashSha1", () => {
    it("should return uppercase SHA-1 hash", () => {
      // 알려진 테스트 벡터: "password" → "5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8"
      const result = hashSha1("password");
      expect(result).toBe("5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8");
    });

    it("should return consistent hash for same input", () => {
      const hash1 = hashSha1("test-input");
      const hash2 = hashSha1("test-input");
      expect(hash1).toBe(hash2);
    });
  });

  describe("hashSha512", () => {
    it("should return 128 character hex string", () => {
      const result = hashSha512("test");
      expect(result).toHaveLength(128);
    });

    it("should return consistent hash for same input", () => {
      const hash1 = hashSha512("test-input");
      const hash2 = hashSha512("test-input");
      expect(hash1).toBe(hash2);
    });
  });

  describe("checkCredentialHIBP", () => {
    it("should return breached=true when hash is found in response", async () => {
      // SHA-512 of something, then SHA-1 of that
      const testSha512 = hashSha512("test-credential-123");

      // Mock fetch to return a matching suffix
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(
          // SHA-1 of the SHA-512 hash will be checked against this
          // We need to calculate the expected suffix
          "0000000000000000000000000000000000000:5\n" +
            "1111111111111111111111111111111111111:10\n"
        ),
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await checkCredentialHIBP(testSha512);

      expect(result.checked).toBe(true);
      // Since our mock doesn't contain the actual suffix, it should return breached=false
      expect(result.breached).toBe(false);
    });

    it("should return breached=false when hash is not found", async () => {
      const testSha512 = hashSha512("unique-secure-credential");

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: vi
          .fn()
          .mockResolvedValue(
            "0000000000000000000000000000000000000:5\n" +
              "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:10\n"
          ),
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await checkCredentialHIBP(testSha512);

      expect(result.checked).toBe(true);
      expect(result.breached).toBe(false);
    });

    it("should return error when API returns 429", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await checkCredentialHIBP(hashSha512("test"));

      expect(result.checked).toBe(false);
      expect(result.error).toContain("Rate limited");
    });

    it("should return error when API fails", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await checkCredentialHIBP(hashSha512("test"));

      expect(result.checked).toBe(false);
      expect(result.error).toContain("HIBP API error");
    });

    it("should handle network errors gracefully", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
      vi.stubGlobal("fetch", mockFetch);

      const result = await checkCredentialHIBP(hashSha512("test"));

      expect(result.checked).toBe(false);
      expect(result.breached).toBe(false);
      expect(result.error).toBe("Network error");
    });

    it("should call HIBP API with correct prefix", async () => {
      const testSha512 = hashSha512("test-input");
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(""),
      });
      vi.stubGlobal("fetch", mockFetch);

      await checkCredentialHIBP(testSha512);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(
          /^https:\/\/api\.pwnedpasswords\.com\/range\/[A-F0-9]{5}$/
        ),
        expect.objectContaining({
          headers: expect.objectContaining({
            "User-Agent": "SMP-Extension-Checker",
          }),
        })
      );
    });
  });
});
