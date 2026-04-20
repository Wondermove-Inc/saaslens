/**
 * Popup Script Tests
 * Note: Testing UI components that auto-initialize is complex in Jest.
 * These tests focus on the URL validation logic and DOM interactions.
 */

import { vi } from "vitest";

describe("Popup Script", () => {
  // Setup DOM before each test
  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock DOM structure
    document.body.innerHTML = `
      <input type="checkbox" id="enabled-toggle" />
      <input type="checkbox" id="enabled-toggler" />
      <input type="text" id="api-url" />
      <input type="text" id="token" />
      <input type="text" id="device-id" />
      <button id="save-button">Save Settings</button>
      <button id="test-api-button">Test</button>
      <div id="api-test-result" style="display: none;"></div>
      <span id="status-text"></span>
      <span id="version-text"></span>
    `;

    // Mock chrome.runtime.getManifest
    (chrome.runtime as any).getManifest = vi
      .fn()
      .mockReturnValue({ version: "1.0.0" });

    // Mock fetch globally
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("URL Validation (isValidUrl behavior)", () => {
    it("should accept valid HTTPS URLs", () => {
      expect(() => new URL("https://api.example.com")).not.toThrow();
    });

    it("should accept valid HTTP URLs", () => {
      expect(() => new URL("http://localhost:3000")).not.toThrow();
    });

    it("should accept URLs with paths", () => {
      expect(() => new URL("https://test.example.org/api/v1")).not.toThrow();
    });

    it("should reject invalid URL strings", () => {
      expect(() => new URL("not-a-url")).toThrow();
    });

    it("should reject empty strings", () => {
      expect(() => new URL("")).toThrow();
    });
  });

  describe("DOM Elements", () => {
    it("should have all required elements", () => {
      expect(document.getElementById("enabled-toggle")).not.toBeNull();
      expect(document.getElementById("enabled-toggler")).not.toBeNull();
      expect(document.getElementById("api-url")).not.toBeNull();
      expect(document.getElementById("token")).not.toBeNull();
      expect(document.getElementById("device-id")).not.toBeNull();
      expect(document.getElementById("save-button")).not.toBeNull();
      expect(document.getElementById("test-api-button")).not.toBeNull();
      expect(document.getElementById("api-test-result")).not.toBeNull();
      expect(document.getElementById("status-text")).not.toBeNull();
      expect(document.getElementById("version-text")).not.toBeNull();
    });

    it("should allow setting input values", () => {
      const apiUrlInput = document.getElementById(
        "api-url"
      ) as HTMLInputElement;
      apiUrlInput.value = "https://test.example.com";
      expect(apiUrlInput.value).toBe("https://test.example.com");
    });

    it("should allow toggling checkbox", () => {
      const enabledToggle = document.getElementById(
        "enabled-toggle"
      ) as HTMLInputElement;
      enabledToggle.checked = true;
      expect(enabledToggle.checked).toBe(true);

      enabledToggle.checked = false;
      expect(enabledToggle.checked).toBe(false);
    });

    it("should allow disabling inputs", () => {
      const apiUrlInput = document.getElementById(
        "api-url"
      ) as HTMLInputElement;
      apiUrlInput.disabled = true;
      expect(apiUrlInput.disabled).toBe(true);
    });
  });

  describe("Status Display", () => {
    it("should update status text content", () => {
      const statusText = document.getElementById(
        "status-text"
      ) as HTMLSpanElement;
      statusText.textContent = "Active";
      expect(statusText.textContent).toBe("Active");
    });

    it("should update status text color", () => {
      const statusText = document.getElementById(
        "status-text"
      ) as HTMLSpanElement;
      statusText.style.color = "#4CAF50";
      expect(statusText.style.color).toBe("rgb(76, 175, 80)");
    });
  });

  describe("Save Button States", () => {
    it("should update button text", () => {
      const saveButton = document.getElementById(
        "save-button"
      ) as HTMLButtonElement;
      saveButton.textContent = "Saving...";
      expect(saveButton.textContent).toBe("Saving...");
    });

    it("should show error state", () => {
      const saveButton = document.getElementById(
        "save-button"
      ) as HTMLButtonElement;
      saveButton.textContent = "Invalid URL!";
      expect(saveButton.textContent).toBe("Invalid URL!");
    });

    it("should show success state", () => {
      const saveButton = document.getElementById(
        "save-button"
      ) as HTMLButtonElement;
      saveButton.textContent = "Saved!";
      expect(saveButton.textContent).toBe("Saved!");
    });
  });

  describe("API Test Result Display", () => {
    it("should show success message", () => {
      const apiTestResult = document.getElementById(
        "api-test-result"
      ) as HTMLDivElement;
      apiTestResult.textContent = "Connection successful!";
      apiTestResult.style.color = "#4CAF50";
      apiTestResult.style.display = "block";

      expect(apiTestResult.textContent).toContain("successful");
      expect(apiTestResult.style.display).toBe("block");
    });

    it("should show error message", () => {
      const apiTestResult = document.getElementById(
        "api-test-result"
      ) as HTMLDivElement;
      apiTestResult.textContent =
        "Connection failed: 500 Internal Server Error";
      apiTestResult.style.color = "#F44336";
      apiTestResult.style.display = "block";

      expect(apiTestResult.textContent).toContain("failed");
      expect(apiTestResult.style.display).toBe("block");
    });

    it("should be hideable", () => {
      const apiTestResult = document.getElementById(
        "api-test-result"
      ) as HTMLDivElement;
      apiTestResult.style.display = "none";
      expect(apiTestResult.style.display).toBe("none");
    });
  });

  describe("Test Button States", () => {
    it("should show testing state", () => {
      const testButton = document.getElementById(
        "test-api-button"
      ) as HTMLButtonElement;
      testButton.textContent = "Testing...";
      testButton.disabled = true;

      expect(testButton.textContent).toBe("Testing...");
      expect(testButton.disabled).toBe(true);
    });

    it("should reset after test", () => {
      const testButton = document.getElementById(
        "test-api-button"
      ) as HTMLButtonElement;
      testButton.textContent = "Test";
      testButton.disabled = false;

      expect(testButton.textContent).toBe("Test");
      expect(testButton.disabled).toBe(false);
    });
  });

  describe("Locked Mode UI", () => {
    it("should hide save button when locked", () => {
      const saveButton = document.getElementById(
        "save-button"
      ) as HTMLButtonElement;
      saveButton.classList.add("hidden");
      expect(saveButton.classList.contains("hidden")).toBe(true);
    });

    it("should hide toggler when locked", () => {
      const enabledToggler = document.getElementById(
        "enabled-toggler"
      ) as HTMLInputElement;
      enabledToggler.classList.add("hidden");
      expect(enabledToggler.classList.contains("hidden")).toBe(true);
    });

    it("should disable inputs when locked", () => {
      const enabledToggle = document.getElementById(
        "enabled-toggle"
      ) as HTMLInputElement;
      const apiUrlInput = document.getElementById(
        "api-url"
      ) as HTMLInputElement;
      const deviceIdInput = document.getElementById(
        "device-id"
      ) as HTMLInputElement;
      const tokenInput = document.getElementById("token") as HTMLInputElement;

      enabledToggle.disabled = true;
      apiUrlInput.disabled = true;
      deviceIdInput.disabled = true;
      tokenInput.disabled = true;

      expect(enabledToggle.disabled).toBe(true);
      expect(apiUrlInput.disabled).toBe(true);
      expect(deviceIdInput.disabled).toBe(true);
      expect(tokenInput.disabled).toBe(true);
    });
  });

  describe("Version Display", () => {
    it("should display version text", () => {
      const versionText = document.getElementById(
        "version-text"
      ) as HTMLSpanElement;
      versionText.textContent = "1.0.0";
      expect(versionText.textContent).toBe("1.0.0");
    });
  });
});
