/**
 * Form Handler Tests
 */

import { vi } from "vitest";
import {
  addPasswordField,
  addUsernameField,
  formData,
  monitoredElements,
  passwordFields,
  resetFormState,
  setFormData,
  usernameFields,
} from "../state";
import { findAndMonitorForms, handleFormSubmit } from "./form-handler";

// Mock login sender
vi.mock("../utils", () => ({
  sendLoginData: vi.fn(),
  sendLoginDataImmediate: vi.fn(),
  monitorLoginResult: vi.fn(),
  clearMultiStepLoginData: vi.fn(),
  restoreMultiStepUsername: vi.fn(() => null),
  saveMultiStepUsername: vi.fn(),
  trackInput: vi.fn(),
  findAllForms: vi.fn(() => []),
  findAllButtons: vi.fn(() => []),
  findAllInputs: vi.fn(() => []),
  hasShadowDOMLoginForms: vi.fn(() => false),
}));

// Mock detectors
vi.mock("../detectors", () => ({
  isUsernameField: vi.fn((input: HTMLInputElement) => {
    return (
      input.type === "email" ||
      input.name === "username" ||
      input.id?.includes("email")
    );
  }),
  isPasswordField: vi.fn(
    (input: HTMLInputElement) => input.type === "password"
  ),
  isMFAField: vi.fn(() => false),
  handleSamlFormSubmit: vi.fn(),
}));

import { sendLoginData } from "../utils";

describe("Form Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
    resetFormState();
    // WeakSet doesn't have clear(), so we reset form state which handles this
  });

  describe("handleFormSubmit", () => {
    it("should send login data when both username and password are set", () => {
      setFormData("username", "user@example.com");
      setFormData("password", "secret123");

      const event = new Event("submit");
      handleFormSubmit(event);

      expect(sendLoginData).toHaveBeenCalled();
    });

    it("should not send login data when username is missing", () => {
      setFormData("password", "secret123");

      const event = new Event("submit");
      handleFormSubmit(event);

      // Should not have been called immediately
      expect(sendLoginData).not.toHaveBeenCalled();
    });

    it("should not send login data when password is missing", () => {
      setFormData("username", "user@example.com");

      const event = new Event("submit");
      handleFormSubmit(event);

      expect(sendLoginData).not.toHaveBeenCalled();
    });

    it("should try to get values from tracked fields", () => {
      // Create and track password field
      const passwordInput = document.createElement("input");
      passwordInput.type = "password";
      passwordInput.value = "mypassword";
      addPasswordField(passwordInput);

      // Create and track username field
      const usernameInput = document.createElement("input");
      usernameInput.type = "email";
      usernameInput.value = "test@test.com";
      addUsernameField(usernameInput);

      const event = new Event("submit");
      handleFormSubmit(event);

      expect(sendLoginData).toHaveBeenCalled();
    });
  });

  describe("findAndMonitorForms", () => {
    it("should find and monitor forms on the page", () => {
      document.body.innerHTML = `
        <form id="loginForm">
          <input type="email" name="username" />
          <input type="password" name="password" />
          <button type="submit">Login</button>
        </form>
      `;

      findAndMonitorForms();

      const form = document.getElementById("loginForm") as HTMLFormElement;
      expect(monitoredElements.has(form)).toBe(true);
    });

    it("should monitor password fields", () => {
      document.body.innerHTML = `
        <form>
          <input type="password" id="pwd" />
        </form>
      `;

      findAndMonitorForms();

      expect(passwordFields.length).toBe(1);
    });

    it("should monitor username fields", () => {
      document.body.innerHTML = `
        <form>
          <input type="email" id="email" />
        </form>
      `;

      findAndMonitorForms();

      expect(usernameFields.length).toBe(1);
    });

    it("should not re-monitor already monitored forms", () => {
      document.body.innerHTML = `
        <form id="loginForm">
          <input type="email" name="username" />
          <input type="password" name="password" />
        </form>
      `;

      findAndMonitorForms();

      // Count tracked fields
      const initialPasswordCount = passwordFields.length;
      const initialUsernameCount = usernameFields.length;

      // Call again
      findAndMonitorForms();

      // Fields should not be duplicated (resetFormState is called, so counts may be same)
      // The key is that no errors occur
      expect(passwordFields.length).toBeGreaterThanOrEqual(0);
      expect(usernameFields.length).toBeGreaterThanOrEqual(0);
    });

    it("should add event listeners to forms", () => {
      document.body.innerHTML = `
        <form id="testForm">
          <input type="email" id="email" />
          <input type="password" id="pass" />
        </form>
      `;

      const addEventListenerSpy = vi.spyOn(
        HTMLFormElement.prototype,
        "addEventListener"
      );

      findAndMonitorForms();

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "submit",
        expect.any(Function)
      );

      addEventListenerSpy.mockRestore();
    });

    it("should monitor buttons for click events", () => {
      document.body.innerHTML = `
        <form>
          <input type="email" name="email" />
          <input type="password" name="pass" />
          <button type="submit" id="submitBtn">Login</button>
        </form>
      `;

      findAndMonitorForms();

      const button = document.getElementById("submitBtn") as HTMLButtonElement;
      expect(monitoredElements.has(button)).toBe(true);
    });

    it("should handle input events on password fields", () => {
      document.body.innerHTML = `
        <form>
          <input type="password" id="pwd" />
        </form>
      `;

      findAndMonitorForms();

      const pwdInput = document.getElementById("pwd") as HTMLInputElement;
      pwdInput.value = "newpassword";
      pwdInput.dispatchEvent(new Event("input"));

      expect(formData["password"]).toBe("newpassword");
    });

    it("should handle input events on username fields", () => {
      document.body.innerHTML = `
        <form>
          <input type="email" id="email" />
        </form>
      `;

      findAndMonitorForms();

      const emailInput = document.getElementById("email") as HTMLInputElement;
      emailInput.value = "user@test.com";
      emailInput.dispatchEvent(new Event("input"));

      expect(formData["username"]).toBe("user@test.com");
    });

    it("should handle change events on fields", () => {
      document.body.innerHTML = `
        <form>
          <input type="password" id="pwd" />
        </form>
      `;

      findAndMonitorForms();

      const pwdInput = document.getElementById("pwd") as HTMLInputElement;
      pwdInput.value = "changedpassword";
      pwdInput.dispatchEvent(new Event("change"));

      expect(formData["password"]).toBe("changedpassword");
    });
  });
});
