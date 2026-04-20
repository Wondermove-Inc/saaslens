/**
 * State Management Tests
 */

import {
  addMFAField,
  addPasswordField,
  addUsernameField,
  detectedMFAType,
  formData,
  hasMFADetected,
  lastSentLogin,
  mfaFields,
  monitoredElements,
  passwordFields,
  pendingLoginData,
  resetFormState,
  setFormData,
  setLastSentLogin,
  setMFADetected,
  setPendingLoginData,
  usernameFields,
} from "./state";

describe("State Management", () => {
  beforeEach(() => {
    // Reset state before each test
    resetFormState();
    setLastSentLogin(null);
    setPendingLoginData(null);
  });

  describe("resetFormState", () => {
    it("should clear all form-related state", () => {
      // Set some state
      setFormData("username", "test@example.com");
      setFormData("password", "secret123");
      setMFADetected(true, "TOTP");

      const input = document.createElement("input");
      addPasswordField(input);
      addUsernameField(input);
      addMFAField(input);

      // Reset
      resetFormState();

      // Verify
      expect(formData["username"]).toBeUndefined();
      expect(formData["password"]).toBeUndefined();
      expect(passwordFields.length).toBe(0);
      expect(usernameFields.length).toBe(0);
      expect(mfaFields.length).toBe(0);
      expect(hasMFADetected).toBe(false);
      expect(detectedMFAType).toBe("");
    });
  });

  describe("setFormData", () => {
    it("should set form data for given key", () => {
      setFormData("username", "john@example.com");
      expect(formData["username"]).toBe("john@example.com");
    });

    it("should update existing form data", () => {
      setFormData("password", "old");
      setFormData("password", "new");
      expect(formData["password"]).toBe("new");
    });
  });

  describe("setMFADetected", () => {
    it("should set MFA detection state", () => {
      setMFADetected(true, "TOTP");
      expect(hasMFADetected).toBe(true);
      expect(detectedMFAType).toBe("TOTP");
    });

    it("should clear MFA detection state", () => {
      setMFADetected(true, "TOTP");
      setMFADetected(false, "");
      expect(hasMFADetected).toBe(false);
      expect(detectedMFAType).toBe("");
    });
  });

  describe("setLastSentLogin", () => {
    it("should set last sent login data", () => {
      const loginData = {
        domain: "example.com",
        username: "user@test.com",
        timestamp: Date.now(),
      };
      setLastSentLogin(loginData);
      expect(lastSentLogin).toEqual(loginData);
    });

    it("should clear last sent login data", () => {
      setLastSentLogin({
        domain: "example.com",
        username: "user@test.com",
        timestamp: Date.now(),
      });
      setLastSentLogin(null);
      expect(lastSentLogin).toBeNull();
    });
  });

  describe("setPendingLoginData", () => {
    it("should set pending login data", () => {
      const pending = {
        domain: "example.com",
        username: "user@test.com",
        password: "secret",
        timestamp: Date.now(),
      };
      setPendingLoginData(pending);
      expect(pendingLoginData).toEqual(pending);
    });

    it("should clear pending login data", () => {
      setPendingLoginData({
        domain: "example.com",
        username: "user@test.com",
        password: "secret",
        timestamp: Date.now(),
      });
      setPendingLoginData(null);
      expect(pendingLoginData).toBeNull();
    });
  });

  describe("field tracking", () => {
    it("should add password field", () => {
      const input = document.createElement("input");
      input.type = "password";
      addPasswordField(input);
      expect(passwordFields).toContain(input);
    });

    it("should add username field", () => {
      const input = document.createElement("input");
      input.type = "email";
      addUsernameField(input);
      expect(usernameFields).toContain(input);
    });

    it("should add MFA field", () => {
      const input = document.createElement("input");
      input.type = "text";
      addMFAField(input);
      expect(mfaFields).toContain(input);
    });

    it("should track multiple fields", () => {
      const pwd1 = document.createElement("input");
      const pwd2 = document.createElement("input");
      addPasswordField(pwd1);
      addPasswordField(pwd2);
      expect(passwordFields.length).toBe(2);
    });
  });

  describe("monitoredElements", () => {
    it("should track monitored elements", () => {
      const form = document.createElement("form");
      monitoredElements.add(form);
      expect(monitoredElements.has(form)).toBe(true);
    });

    it("should not have untracked elements", () => {
      const form = document.createElement("form");
      expect(monitoredElements.has(form)).toBe(false);
    });
  });
});
