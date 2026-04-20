/**
 * Integration Tests for Extension ↔ Backend Communication
 * Tests the complete flow from login detection to backend submission
 */

import { vi } from "vitest";
import { chromeMock } from "./setup";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import modules after mocking
import {
  addPendingLogin,
  handleLoginDetected,
  loadSWState,
  removePendingLogin,
  saveSWState,
  sha,
} from "../background/index";
import { DEFAULT_CONFIG, ExtensionConfig } from "../shared/types";
import {
  getDomain,
  loadConfig,
  saveConfig,
  sendToBackend,
} from "../shared/utils";

describe("Integration Tests: Extension ↔ Backend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();

    // Default config mock
    chromeMock.storage.local.get.mockImplementation(
      (key: string, callback: (result: Record<string, unknown>) => void) => {
        const config: ExtensionConfig = {
          ...DEFAULT_CONFIG,
          api: "https://api.example.com",
          token: "test-token-123",
          id: "test-device-id",
          enabled: true,
        };
        callback({ config });
      }
    );

    // Session storage mock for SW state
    chromeMock.storage.session.get.mockResolvedValue({});
    chromeMock.storage.session.set.mockResolvedValue(undefined);
  });

  describe("sendToBackend", () => {
    it("should send POST request with correct headers and body", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ status: "success" }),
      });

      const data = {
        domain: "example.com",
        username: "testuser",
        hash: "abc123",
        device_id: "device-123",
      };

      const response = await sendToBackend(
        "/api/creds/register",
        data,
        "https://api.example.com"
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/api/creds/register",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: "Bearer test-token-123",
          }),
          body: JSON.stringify(data),
        })
      );
      expect(response.ok).toBe(true);
    });

    it("should handle network errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const data = { domain: "example.com", username: "test" };

      await expect(
        sendToBackend("/api/test", data, "https://api.example.com")
      ).rejects.toThrow("Network error");
    });

    it("should handle server errors (5xx)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ error: "Server error" }),
      });

      const response = await sendToBackend(
        "/api/test",
        {},
        "https://api.example.com"
      );

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
    });

    it("should handle authentication errors (401)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ error: "Invalid token" }),
      });

      const response = await sendToBackend(
        "/api/test",
        {},
        "https://api.example.com"
      );

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });
  });

  describe("handleLoginDetected", () => {
    it("should send login data to backend with hashed password", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          status: "success",
          hibp: { checked: true, breached: false, breach_count: 0 },
        }),
      });

      const loginData = {
        domain: "https://login.example.com",
        username: "testuser@example.com",
        password: "testpassword123",
      };

      await handleLoginDetected(
        loginData,
        "https://api.example.com",
        "device-123",
        []
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://api.example.com/api/creds/register");

      const body = JSON.parse(options.body);
      expect(body.domain).toBe("https://login.example.com");
      expect(body.username).toBe("testuser@example.com");
      expect(body.hash).toBeDefined();
      expect(body.hash.length).toBe(128); // SHA-512 hash length
      expect(body.device_id).toBe("device-123");
    });

    it("should refuse to send to insecure endpoints", async () => {
      const loginData = {
        domain: "https://login.example.com",
        username: "testuser",
        password: "password",
      };

      // HTTP endpoint (not localhost)
      await handleLoginDetected(
        loginData,
        "http://insecure.example.com",
        "device-123",
        []
      );

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should allow localhost for development", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ status: "success", hibp: { checked: false } }),
      });

      const loginData = {
        domain: "https://login.example.com",
        username: "testuser",
        password: "password",
      };

      await handleLoginDetected(
        loginData,
        "http://localhost:8080",
        "device-123",
        []
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should filter logins based on username filters", async () => {
      const loginData = {
        domain: "https://login.example.com",
        username: "external@gmail.com",
        password: "password",
      };

      // Filter only allows @example.com usernames
      await handleLoginDetected(
        loginData,
        "https://api.example.com",
        "device-123",
        ["@example.com"]
      );

      // Should not send because username doesn't match filter
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should send login when username matches filter", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ status: "success", hibp: { checked: false } }),
      });

      const loginData = {
        domain: "https://login.example.com",
        username: "user@example.com",
        password: "password",
      };

      await handleLoginDetected(
        loginData,
        "https://api.example.com",
        "device-123",
        ["@example.com"]
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("SHA Hash Function", () => {
    it("should generate consistent SHA-512 hashes", async () => {
      const input = "testpassword123";
      const hash1 = await sha("SHA-512", input);
      const hash2 = await sha("SHA-512", input);

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(128); // SHA-512 = 512 bits = 128 hex chars
    });

    it("should generate different hashes for different inputs", async () => {
      const hash1 = await sha("SHA-512", "password1");
      const hash2 = await sha("SHA-512", "password2");

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("HIBP Response Handling", () => {
    it("should handle breached password response", async () => {
      const notificationCreateSpy = chromeMock.notifications.create;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          status: "success",
          hibp: {
            checked: true,
            breached: true,
            breach_count: 5,
          },
        }),
      });

      const loginData = {
        domain: "https://login.example.com",
        username: "testuser",
        password: "password123",
      };

      await handleLoginDetected(
        loginData,
        "https://api.example.com",
        "device-123",
        []
      );

      // Verify notification was created for breached password
      expect(notificationCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "basic",
          title: "Password Security Warning!",
          message: expect.stringContaining("5 data breach"),
        })
      );
    });

    it("should not show notification for non-breached password", async () => {
      const notificationCreateSpy = chromeMock.notifications.create;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          status: "success",
          hibp: {
            checked: true,
            breached: false,
            breach_count: 0,
          },
        }),
      });

      const loginData = {
        domain: "https://login.example.com",
        username: "testuser",
        password: "securePa$$w0rd!",
      };

      await handleLoginDetected(
        loginData,
        "https://api.example.com",
        "device-123",
        []
      );

      expect(notificationCreateSpy).not.toHaveBeenCalled();
    });
  });
});

describe("Service Worker State Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chromeMock.storage.session.get.mockResolvedValue({});
    chromeMock.storage.session.set.mockResolvedValue(undefined);
  });

  describe("loadSWState / saveSWState", () => {
    it("should return default state when no stored state exists", async () => {
      chromeMock.storage.session.get.mockResolvedValueOnce({});

      const state = await loadSWState();

      expect(state.pendingLogins).toEqual([]);
      expect(state.configLoaded).toBe(false);
      expect(state.initTimestamp).toBeDefined();
    });

    it("should load existing state from storage", async () => {
      const existingState = {
        pendingLogins: [
          { id: "1", loginData: {}, timestamp: Date.now(), retryCount: 0 },
        ],
        configLoaded: true,
        initTimestamp: 12345,
        lastApiSuccess: 67890,
      };

      chromeMock.storage.session.get.mockResolvedValueOnce({
        swState: existingState,
      });

      const state = await loadSWState();

      expect(state.pendingLogins.length).toBe(1);
      expect(state.configLoaded).toBe(true);
      expect(state.lastApiSuccess).toBe(67890);
    });

    it("should save state to session storage", async () => {
      await saveSWState({ configLoaded: true, lastApiSuccess: Date.now() });

      expect(chromeMock.storage.session.set).toHaveBeenCalled();
    });
  });

  describe("Pending Login Queue", () => {
    it("should add pending login to queue", async () => {
      chromeMock.storage.session.get.mockResolvedValue({
        swState: {
          pendingLogins: [],
          configLoaded: false,
          initTimestamp: Date.now(),
        },
      });

      const loginData = { domain: "test.com", username: "user" };
      const id = await addPendingLogin(loginData);

      expect(id).toBeDefined();
      expect(chromeMock.storage.session.set).toHaveBeenCalled();
    });

    it("should remove pending login from queue", async () => {
      const pendingLogin = {
        id: "test-id",
        loginData: {},
        timestamp: Date.now(),
        retryCount: 0,
      };
      chromeMock.storage.session.get.mockResolvedValue({
        swState: {
          pendingLogins: [pendingLogin],
          configLoaded: true,
          initTimestamp: Date.now(),
        },
      });

      await removePendingLogin("test-id");

      expect(chromeMock.storage.session.set).toHaveBeenCalled();
    });
  });
});

describe("Config Persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should save and load configuration correctly", async () => {
    const testConfig: ExtensionConfig = {
      ...DEFAULT_CONFIG,
      api: "https://custom-api.example.com",
      token: "custom-token",
      id: "custom-device-id",
      enabled: true,
      locked: false,
      filters: ["@company.com"],
    };

    // Mock storage.local.set
    chromeMock.storage.local.set.mockImplementation(
      (_data: unknown, callback?: () => void) => {
        if (callback) callback();
      }
    );

    // Mock storage.local.get to return saved config
    chromeMock.storage.local.get.mockImplementation(
      (_key: string, callback: (result: Record<string, unknown>) => void) => {
        callback({ config: testConfig });
      }
    );

    await saveConfig(testConfig);
    const loadedConfig = await loadConfig();

    expect(loadedConfig.api).toBe("https://custom-api.example.com");
    expect(loadedConfig.token).toBe("custom-token");
    expect(loadedConfig.id).toBe("custom-device-id");
    expect(loadedConfig.filters).toContain("@company.com");
  });

  it("should generate device ID if not present", async () => {
    chromeMock.storage.local.get.mockImplementation(
      (_key: string, callback: (result: Record<string, unknown>) => void) => {
        callback({ config: { ...DEFAULT_CONFIG, id: "" } });
      }
    );
    chromeMock.storage.local.set.mockImplementation(
      (_data: unknown, callback?: () => void) => {
        if (callback) callback();
      }
    );

    const config = await loadConfig();

    expect(config.id).toBeDefined();
    expect(config.id.startsWith("device_")).toBe(true);
  });
});

describe("Domain Extraction", () => {
  it("should extract domain with protocol and port", () => {
    expect(getDomain("https://login.example.com/auth")).toBe(
      "https://login.example.com:443"
    );
    expect(getDomain("http://localhost:8080/test")).toBe(
      "http://localhost:8080"
    );
    expect(getDomain("https://api.example.com:3000/endpoint")).toBe(
      "https://api.example.com:3000"
    );
  });

  it("should handle invalid URLs", () => {
    expect(getDomain("not-a-url")).toBe("");
    expect(getDomain("")).toBe("");
  });
});

describe("End-to-End Flow Simulation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();

    // Setup default mocks
    chromeMock.storage.local.get.mockImplementation(
      (_key: string, callback: (result: Record<string, unknown>) => void) => {
        callback({
          config: {
            ...DEFAULT_CONFIG,
            api: "https://api.example.com",
            token: "test-token",
            id: "device-123",
            enabled: true,
          },
        });
      }
    );
    chromeMock.storage.session.get.mockResolvedValue({
      swState: {
        pendingLogins: [],
        configLoaded: true,
        initTimestamp: Date.now(),
      },
    });
    chromeMock.storage.session.set.mockResolvedValue(undefined);
  });

  it("should complete full login detection → backend submission flow", async () => {
    // Mock successful backend response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        status: "success",
        message: "Login data stored successfully",
        hibp: { checked: true, breached: false, breach_count: 0 },
      }),
    });

    // Simulate login detection
    const loginData = {
      domain: "https://accounts.google.com",
      username: "user@gmail.com",
      password: "mySecurePassword123!",
    };

    await handleLoginDetected(
      loginData,
      "https://api.example.com",
      "device-123",
      []
    );

    // Verify the complete flow
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.example.com/api/creds/register");

    const body = JSON.parse(options.body);
    expect(body.domain).toBe("https://accounts.google.com");
    expect(body.username).toBe("user@gmail.com");
    expect(body.hash).toBeDefined();
    expect(body.hash).not.toBe("mySecurePassword123!"); // Password should be hashed
    expect(body.device_id).toBe("device-123");
    expect(body.captured_time).toBeDefined();
  });

  it("should handle backend failure and queue for retry", async () => {
    // First call fails
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const loginData = {
      domain: "https://login.example.com",
      username: "user@example.com",
      password: "password123",
    };

    // This should not throw - error is caught internally
    await handleLoginDetected(
      loginData,
      "https://api.example.com",
      "device-123",
      []
    );

    // Backend was called but failed
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
