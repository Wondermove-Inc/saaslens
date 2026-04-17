/**
 * Tests for Content Script Injector
 * Phase 2 Implementation - Dynamic Content Script Injection
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { chromeMock } from "../test/setup";
import {
  ContentScriptInjector,
  ContentScriptInjectorState,
  getContentScriptInjector,
  INJECTOR_STORAGE_KEY,
  resetContentScriptInjector,
} from "./content-script-injector";

describe("ContentScriptInjector", () => {
  let injector: ContentScriptInjector;

  beforeEach(() => {
    vi.clearAllMocks();
    resetContentScriptInjector();

    // Default storage mock - no existing state
    chromeMock.storage.local.get.mockResolvedValue({});
    chromeMock.storage.local.set.mockResolvedValue(undefined);
    chromeMock.scripting.getRegisteredContentScripts.mockResolvedValue([]);

    injector = new ContentScriptInjector();
  });

  describe("constructor", () => {
    it("should create instance with default state", () => {
      expect(injector.getRegisteredCount()).toBe(0);
      expect(injector.getRegisteredDomains()).toEqual([]);
    });
  });

  describe("initialize", () => {
    it("should load state from storage", async () => {
      const savedState: ContentScriptInjectorState = {
        registeredDomains: { "example.com": 123456789 },
        lastUpdated: 123456789,
      };

      chromeMock.storage.local.get.mockResolvedValueOnce({
        [INJECTOR_STORAGE_KEY]: savedState,
      });
      chromeMock.scripting.getRegisteredContentScripts.mockResolvedValueOnce([
        { id: "login-capture-example.com" },
      ]);

      await injector.initialize();

      expect(injector.getRegisteredCount()).toBe(1);
      expect(injector.isRegistered("example.com")).toBe(true);
    });

    it("should sync with Chrome on initialization", async () => {
      // State has domain that Chrome doesn't have
      const savedState: ContentScriptInjectorState = {
        registeredDomains: { "orphan.com": 123456789 },
        lastUpdated: 123456789,
      };

      chromeMock.storage.local.get.mockResolvedValueOnce({
        [INJECTOR_STORAGE_KEY]: savedState,
      });
      chromeMock.scripting.getRegisteredContentScripts.mockResolvedValueOnce(
        []
      );

      await injector.initialize();

      // Orphan domain should be removed from state
      expect(injector.isRegistered("orphan.com")).toBe(false);
    });

    it("should only initialize once", async () => {
      await injector.initialize();
      await injector.initialize();

      // getRegisteredContentScripts should only be called once
      expect(
        chromeMock.scripting.getRegisteredContentScripts
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe("registerDomain", () => {
    beforeEach(async () => {
      await injector.initialize();
    });

    it("should register a new domain", async () => {
      const result = await injector.registerDomain("naver.com");

      expect(result).toBe(true);
      expect(chromeMock.scripting.registerContentScripts).toHaveBeenCalledWith([
        expect.objectContaining({
          id: "login-capture-naver.com",
          matches: ["*://*.naver.com/*", "*://naver.com/*"],
          js: ["content.js"],
          runAt: "document_idle",
        }),
      ]);
      expect(injector.isRegistered("naver.com")).toBe(true);
    });

    it("should normalize domain (remove protocol and path)", async () => {
      await injector.registerDomain("https://example.com/path");

      expect(chromeMock.scripting.registerContentScripts).toHaveBeenCalledWith([
        expect.objectContaining({
          id: "login-capture-example.com",
        }),
      ]);
    });

    it("should normalize domain (remove wildcard prefix)", async () => {
      await injector.registerDomain("*.example.com");

      expect(chromeMock.scripting.registerContentScripts).toHaveBeenCalledWith([
        expect.objectContaining({
          id: "login-capture-example.com",
        }),
      ]);
    });

    it("should update timestamp for already registered domain", async () => {
      await injector.registerDomain("example.com");
      const firstCallCount =
        chromeMock.scripting.registerContentScripts.mock.calls.length;

      await injector.registerDomain("example.com");

      // Should not call registerContentScripts again
      expect(chromeMock.scripting.registerContentScripts).toHaveBeenCalledTimes(
        firstCallCount
      );
    });

    it("should save state after registration", async () => {
      await injector.registerDomain("example.com");

      expect(chromeMock.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          [INJECTOR_STORAGE_KEY]: expect.objectContaining({
            registeredDomains: expect.objectContaining({
              "example.com": expect.any(Number),
            }),
          }),
        })
      );
    });

    it("should handle registration failure gracefully", async () => {
      chromeMock.scripting.registerContentScripts.mockRejectedValueOnce(
        new Error("Failed")
      );

      const result = await injector.registerDomain("fail.com");

      expect(result).toBe(false);
      expect(injector.isRegistered("fail.com")).toBe(false);
    });
  });

  describe("unregisterDomain", () => {
    beforeEach(async () => {
      await injector.initialize();
      await injector.registerDomain("example.com");
    });

    it("should unregister an existing domain", async () => {
      const result = await injector.unregisterDomain("example.com");

      expect(result).toBe(true);
      expect(
        chromeMock.scripting.unregisterContentScripts
      ).toHaveBeenCalledWith({
        ids: ["login-capture-example.com"],
      });
      expect(injector.isRegistered("example.com")).toBe(false);
    });

    it("should return false for non-registered domain", async () => {
      const result = await injector.unregisterDomain("nonexistent.com");

      expect(result).toBe(false);
      expect(
        chromeMock.scripting.unregisterContentScripts
      ).not.toHaveBeenCalled();
    });
  });

  describe("LRU Eviction", () => {
    beforeEach(async () => {
      await injector.initialize();
    });

    it("should evict least recently used domain when limit is reached", async () => {
      // Register 100 domains to reach the limit
      for (let i = 0; i < 100; i++) {
        await injector.registerDomain(`domain${i}.com`);
      }

      expect(injector.getRegisteredCount()).toBe(100);

      // Register one more domain - should evict the oldest
      await injector.registerDomain("new-domain.com");

      expect(injector.getRegisteredCount()).toBe(100);
      expect(injector.isRegistered("new-domain.com")).toBe(true);
      // domain0 was registered first and should be evicted
      expect(injector.isRegistered("domain0.com")).toBe(false);
    });
  });

  describe("syncWithWhitelist", () => {
    beforeEach(async () => {
      await injector.initialize();
    });

    it("should register all domains from whitelist", async () => {
      const domains = ["example.com", "test.com", "naver.com"];

      await injector.syncWithWhitelist(domains);

      expect(injector.getRegisteredCount()).toBe(3);
      expect(injector.isRegistered("example.com")).toBe(true);
      expect(injector.isRegistered("test.com")).toBe(true);
      expect(injector.isRegistered("naver.com")).toBe(true);
    });

    it("should unregister domains not in whitelist", async () => {
      await injector.registerDomain("old.com");
      expect(injector.isRegistered("old.com")).toBe(true);

      await injector.syncWithWhitelist(["new.com"]);

      expect(injector.isRegistered("old.com")).toBe(false);
      expect(injector.isRegistered("new.com")).toBe(true);
    });

    it("should limit to 100 domains", async () => {
      const domains = Array.from({ length: 150 }, (_, i) => `domain${i}.com`);

      await injector.syncWithWhitelist(domains);

      expect(injector.getRegisteredCount()).toBe(100);
    });
  });

  describe("injectIntoExistingTabs", () => {
    beforeEach(async () => {
      await injector.initialize();
    });

    it("should inject script into existing tabs for domain", async () => {
      chromeMock.tabs.query.mockResolvedValue([
        { id: 1, url: "https://example.com/page" },
        { id: 2, url: "https://sub.example.com/other" },
      ]);

      const count = await injector.injectIntoExistingTabs("example.com");

      expect(count).toBe(4); // 2 tabs * 2 patterns
      expect(chromeMock.scripting.executeScript).toHaveBeenCalledWith({
        target: { tabId: 1 },
        files: ["content.js"],
      });
    });

    it("should handle tabs without id", async () => {
      chromeMock.tabs.query.mockResolvedValue([
        { url: "https://example.com/page" }, // no id
      ]);

      const count = await injector.injectIntoExistingTabs("example.com");

      expect(count).toBe(0);
      expect(chromeMock.scripting.executeScript).not.toHaveBeenCalled();
    });

    it("should handle injection failure gracefully", async () => {
      chromeMock.tabs.query.mockResolvedValue([
        { id: 1, url: "https://example.com" },
      ]);
      chromeMock.scripting.executeScript.mockRejectedValue(
        new Error("Cannot inject")
      );

      const count = await injector.injectIntoExistingTabs("example.com");

      // Should not throw, just return 0
      expect(count).toBe(0);
    });
  });

  describe("unregisterAll", () => {
    beforeEach(async () => {
      await injector.initialize();
      await injector.registerDomain("a.com");
      await injector.registerDomain("b.com");
    });

    it("should unregister all domains", async () => {
      await injector.unregisterAll();

      expect(
        chromeMock.scripting.unregisterContentScripts
      ).toHaveBeenCalledWith({
        ids: expect.arrayContaining([
          "login-capture-a.com",
          "login-capture-b.com",
        ]),
      });
      expect(injector.getRegisteredCount()).toBe(0);
    });
  });

  describe("reset", () => {
    beforeEach(async () => {
      await injector.initialize();
      await injector.registerDomain("example.com");
    });

    it("should reset state and unregister all scripts", async () => {
      await injector.reset();

      expect(injector.getRegisteredCount()).toBe(0);
      expect(chromeMock.scripting.unregisterContentScripts).toHaveBeenCalled();
    });
  });
});

describe("getContentScriptInjector", () => {
  beforeEach(() => {
    resetContentScriptInjector();
    chromeMock.storage.local.get.mockResolvedValue({});
    chromeMock.storage.local.set.mockResolvedValue(undefined);
    chromeMock.scripting.getRegisteredContentScripts.mockResolvedValue([]);
  });

  it("should return singleton instance", async () => {
    const injector1 = await getContentScriptInjector();
    const injector2 = await getContentScriptInjector();

    expect(injector1).toBe(injector2);
  });

  it("should initialize on first call", async () => {
    await getContentScriptInjector();

    expect(chromeMock.scripting.getRegisteredContentScripts).toHaveBeenCalled();
  });
});
