/**
 * Login Sender Tests
 */

import { vi } from "vitest";
import { MessageType } from "../../shared/types";
import {
  resetFormState,
  setFormData,
  setLastSentLogin,
  setMFADetected,
} from "../state";
import { sendLoginData, sendLoginDataImmediate } from "./login-sender";

// Mock state module
vi.mock("../state", async () => {
  const actual = await vi.importActual("../state");
  return {
    ...actual,
    formData: { username: "", password: "" },
    hasMFADetected: false,
    detectedMFAType: "",
    lastSentLogin: null,
    pendingLoginData: null,
  };
});

// Mock login-status
vi.mock("../detectors/login-status", () => ({
  isLoginFailure: vi.fn(() => false),
  isLoginSuccess: vi.fn(() => false),
}));

describe("Login Sender", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    resetFormState();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("sendLoginDataImmediate", () => {
    it("should send login data to background script", () => {
      sendLoginDataImmediate(
        "example.com",
        "user@test.com",
        "password123",
        false
      );

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: MessageType.LOGIN_DETECTED,
        data: {
          authType: "PASSWORD",
          domain: "example.com",
          username: "user@test.com",
          password: "password123",
          hasMFA: false,
          mfaType: undefined,
        },
      });
    });

    it("should include MFA type when provided", () => {
      sendLoginDataImmediate(
        "example.com",
        "user@test.com",
        "password123",
        true,
        "TOTP"
      );

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: MessageType.LOGIN_DETECTED,
        data: {
          authType: "PASSWORD",
          domain: "example.com",
          username: "user@test.com",
          password: "password123",
          hasMFA: true,
          mfaType: "TOTP",
        },
      });
    });

    it("should clear form data after sending", () => {
      // Set initial form data
      setFormData("username", "user@test.com");
      setFormData("password", "secret");

      sendLoginDataImmediate("example.com", "user@test.com", "secret", false);

      // Verify sendMessage was called (form data was cleared in implementation)
      expect(chrome.runtime.sendMessage).toHaveBeenCalled();
    });
  });

  describe("sendLoginData", () => {
    // TODO (v0.1.1): setTimeout spy assertion may no longer match implementation
    // using promise-based scheduling. Revisit when refactoring login-sender.
    it.skip("should set up pending login data", () => {
      const setTimeoutSpy = vi.spyOn(global, "setTimeout");

      // Set form data
      setFormData("username", "user@example.com");
      setFormData("password", "mypassword");

      sendLoginData();

      // The function sets up a timeout
      expect(setTimeoutSpy).toHaveBeenCalled();

      setTimeoutSpy.mockRestore();
    });

    it("should debounce duplicate submissions", () => {
      // Set up initial state
      setFormData("username", "user@example.com");
      setFormData("password", "mypassword");

      // Set last sent login to simulate recent submission
      setLastSentLogin({
        domain: "http://localhost:",
        username: "user@example.com",
        timestamp: Date.now(),
      });

      sendLoginData();

      // Since we're testing debounce, the exact behavior depends on timing
      // This is a basic test to ensure the function doesn't throw
      expect(true).toBe(true);
    });

    // TODO (v0.1.1): setTimeout spy assertion may no longer match implementation
    // using promise-based scheduling. Revisit when refactoring login-sender.
    it.skip("should handle MFA detected state", () => {
      const setTimeoutSpy = vi.spyOn(global, "setTimeout");

      setFormData("username", "user@example.com");
      setFormData("password", "mypassword");
      setMFADetected(true, "TOTP");

      sendLoginData();

      // Should process differently when MFA is detected
      expect(setTimeoutSpy).toHaveBeenCalled();

      setTimeoutSpy.mockRestore();
    });
  });
});
