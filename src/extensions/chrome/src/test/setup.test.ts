/**
 * Test Setup Verification
 * TDD: RED -> GREEN -> REFACTOR
 */

describe("Test Environment", () => {
  describe("Chrome API Mock", () => {
    it("should have chrome object available", () => {
      expect(chrome).toBeDefined();
    });

    it("should have chrome.runtime available", () => {
      expect(chrome.runtime).toBeDefined();
      expect(chrome.runtime.sendMessage).toBeDefined();
    });

    it("should have chrome.storage available", () => {
      expect(chrome.storage).toBeDefined();
      expect(chrome.storage.local).toBeDefined();
      expect(chrome.storage.session).toBeDefined();
    });

    it("should have chrome.tabs available", () => {
      expect(chrome.tabs).toBeDefined();
      expect(chrome.tabs.query).toBeDefined();
    });

    it("should have chrome.alarms available", () => {
      expect(chrome.alarms).toBeDefined();
      expect(chrome.alarms.create).toBeDefined();
    });
  });

  describe("Mock Function Behavior", () => {
    it("should track sendMessage calls", () => {
      chrome.runtime.sendMessage({ type: "TEST" });
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: "TEST" });
    });

    it("should reset mocks between tests", () => {
      // This should be fresh due to beforeEach in setup.ts
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
    });
  });
});
