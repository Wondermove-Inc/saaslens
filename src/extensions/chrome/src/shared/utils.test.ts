/**
 * Utils Module Tests
 * TDD: Testing utility functions
 */

import { vi } from "vitest";
import { DEFAULT_CONFIG, ExtensionConfig, MessageType } from "./types";
import {
  generateDeviceId,
  getDomain,
  loadConfig,
  saveConfig,
  sendMessageWithRetry,
} from "./utils";

describe("Utils Module", () => {
  describe("generateDeviceId", () => {
    it("should generate a unique device ID", () => {
      const id = generateDeviceId();
      expect(id).toBeDefined();
      expect(id).toMatch(/^device_[a-z0-9]+$/);
    });

    it("should generate different IDs on each call", () => {
      const id1 = generateDeviceId();
      const id2 = generateDeviceId();
      expect(id1).not.toBe(id2);
    });

    it("should have minimum length of 10 characters", () => {
      const id = generateDeviceId();
      expect(id.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe("getDomain", () => {
    it("should extract domain from HTTPS URL with default port", () => {
      const result = getDomain("https://example.com/path");
      expect(result).toBe("https://example.com:443");
    });

    it("should extract domain from HTTP URL with default port", () => {
      const result = getDomain("http://example.com/path");
      expect(result).toBe("http://example.com:80");
    });

    it("should preserve custom port", () => {
      const result = getDomain("https://example.com:8080/path");
      expect(result).toBe("https://example.com:8080");
    });

    it("should handle URLs with query parameters", () => {
      const result = getDomain("https://example.com/path?query=value");
      expect(result).toBe("https://example.com:443");
    });

    it("should handle URLs with subdomain", () => {
      const result = getDomain("https://app.example.com/path");
      expect(result).toBe("https://app.example.com:443");
    });

    it("should return empty string for invalid URL", () => {
      const result = getDomain("not-a-valid-url");
      expect(result).toBe("");
    });

    it("should return empty string for empty input", () => {
      const result = getDomain("");
      expect(result).toBe("");
    });
  });

  describe("loadConfig", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should return default config when storage is empty", async () => {
      (chrome.storage.local.get as vi.Mock).mockImplementation(
        (_key: string, callback: (result: Record<string, unknown>) => void) => {
          callback({});
        }
      );

      const config = await loadConfig();

      expect(config.api).toBe(DEFAULT_CONFIG.api);
      expect(config.enabled).toBe(DEFAULT_CONFIG.enabled);
      expect(config.id).toBeDefined(); // Should generate new ID
    });

    it("should return stored config when available", async () => {
      const storedConfig: ExtensionConfig = {
        api: "https://api.example.com",
        id: "test-device-id",
        enabled: true,
        token: "test-token",
        locked: false,
        filters: ["example.com"],
      };

      (chrome.storage.local.get as vi.Mock).mockImplementation(
        (_key: string, callback: (result: Record<string, unknown>) => void) => {
          callback({ config: storedConfig });
        }
      );

      const config = await loadConfig();

      expect(config.api).toBe("https://api.example.com");
      expect(config.id).toBe("test-device-id");
      expect(config.token).toBe("test-token");
    });

    it("should migrate legacy deviceId to id", async () => {
      const legacyConfig = {
        api: "https://api.example.com",
        deviceId: "legacy-device-id", // Legacy field
        enabled: true,
        token: "",
        locked: false,
        filters: [],
      };

      (chrome.storage.local.get as vi.Mock).mockImplementation(
        (_key: string, callback: (result: Record<string, unknown>) => void) => {
          callback({ config: legacyConfig });
        }
      );

      const config = await loadConfig();

      expect(config.id).toBe("legacy-device-id");
    });
  });

  describe("saveConfig", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should save config to storage", async () => {
      const testConfig: ExtensionConfig = {
        api: "https://api.example.com",
        id: "test-id",
        enabled: true,
        token: "test-token",
        locked: false,
        filters: [],
      };

      (chrome.storage.local.set as vi.Mock).mockImplementation(
        (_data: Record<string, unknown>, callback: () => void) => {
          callback();
        }
      );

      await saveConfig(testConfig);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { config: testConfig },
        expect.any(Function)
      );
    });
  });

  describe("sendMessageWithRetry", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should successfully send message on first try", async () => {
      const mockResponse = { success: true, data: { test: "data" } };
      (chrome.runtime.sendMessage as vi.Mock).mockImplementation(
        (_message, callback) => {
          callback(mockResponse);
        }
      );

      const promise = sendMessageWithRetry(
        { type: MessageType.HEALTH_CHECK },
        { maxRetries: 3, baseDelayMs: 100, timeoutMs: 1000 }
      );

      // Advance timers for any pending timeouts
      vi.advanceTimersByTime(0);

      const result = await promise;

      expect(result).toEqual(mockResponse);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
    });

    it("should retry on failure and succeed", async () => {
      let callCount = 0;
      (chrome.runtime.sendMessage as vi.Mock).mockImplementation(
        (_message, callback) => {
          callCount++;
          if (callCount < 2) {
            // Simulate error on first call
            (chrome.runtime as { lastError?: { message: string } }).lastError =
              { message: "Connection failed" };
            callback(undefined);
            (chrome.runtime as { lastError?: { message: string } }).lastError =
              undefined;
          } else {
            // Success on second call
            callback({ success: true });
          }
        }
      );

      const promise = sendMessageWithRetry(
        { type: MessageType.HEALTH_CHECK },
        { maxRetries: 3, baseDelayMs: 100, timeoutMs: 5000 }
      );

      // First attempt
      await vi.advanceTimersByTimeAsync(0);

      // Retry after delay (100ms * 2^0 = 100ms)
      await vi.advanceTimersByTimeAsync(100);

      const result = await promise;

      expect(result.success).toBe(true);
      expect(callCount).toBe(2);
    });

    it("should return error after max retries exceeded", async () => {
      (chrome.runtime.sendMessage as vi.Mock).mockImplementation(
        (_message, callback) => {
          (chrome.runtime as { lastError?: { message: string } }).lastError = {
            message: "Connection failed",
          };
          callback(undefined);
          (chrome.runtime as { lastError?: { message: string } }).lastError =
            undefined;
        }
      );

      const promise = sendMessageWithRetry(
        { type: MessageType.HEALTH_CHECK },
        { maxRetries: 2, baseDelayMs: 100, timeoutMs: 5000 }
      );

      // First attempt (immediate)
      await vi.advanceTimersByTimeAsync(0);

      // Retry 1 after 100ms
      await vi.advanceTimersByTimeAsync(100);

      // Retry 2 after 200ms (100 * 2^1)
      await vi.advanceTimersByTimeAsync(200);

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toBe("Connection failed");
      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it("should timeout if response takes too long", async () => {
      (chrome.runtime.sendMessage as vi.Mock).mockImplementation(
        (_message, _callback) => {
          // Never call callback - simulates timeout
        }
      );

      const promise = sendMessageWithRetry(
        { type: MessageType.HEALTH_CHECK },
        { maxRetries: 0, baseDelayMs: 100, timeoutMs: 500 }
      );

      // Advance past timeout
      await vi.advanceTimersByTimeAsync(500);

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toContain("timeout");
    });
  });
});
