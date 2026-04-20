/**
 * Field Detector Tests
 */

import { vi } from "vitest";
import { isMFAField, isPasswordField, isUsernameField } from "./field-detector";

// Mock state module
vi.mock("../state", () => ({
  setMFADetected: vi.fn(),
  detectedMFAType: "",
}));

describe("Field Detector", () => {
  describe("isUsernameField", () => {
    const createInput = (
      attrs: Partial<HTMLInputElement>
    ): HTMLInputElement => {
      const input = document.createElement("input");
      Object.assign(input, attrs);
      return input;
    };

    it("should detect email type input as username", () => {
      const input = createInput({ type: "email" });
      expect(isUsernameField(input)).toBe(true);
    });

    it("should detect input with username in name attribute", () => {
      const input = createInput({ type: "text", name: "username" });
      expect(isUsernameField(input)).toBe(true);
    });

    it("should detect input with email in id attribute", () => {
      const input = createInput({ type: "text", id: "user-email" });
      expect(isUsernameField(input)).toBe(true);
    });

    it("should detect input with login in placeholder", () => {
      const input = createInput({
        type: "text",
        placeholder: "Enter your login",
      });
      expect(isUsernameField(input)).toBe(true);
    });

    it("should detect input with account in name", () => {
      const input = createInput({ type: "text", name: "account_id" });
      expect(isUsernameField(input)).toBe(true);
    });

    it("should not detect random text input as username", () => {
      const input = createInput({
        type: "text",
        name: "address",
        id: "street",
      });
      expect(isUsernameField(input)).toBe(false);
    });

    it("should not detect password input as username", () => {
      const input = createInput({ type: "password", name: "password" });
      expect(isUsernameField(input)).toBe(false);
    });
  });

  describe("isPasswordField", () => {
    it("should detect password type input", () => {
      const input = document.createElement("input");
      input.type = "password";
      expect(isPasswordField(input)).toBe(true);
    });

    it("should not detect text type input as password", () => {
      const input = document.createElement("input");
      input.type = "text";
      expect(isPasswordField(input)).toBe(false);
    });

    it("should not detect email type input as password", () => {
      const input = document.createElement("input");
      input.type = "email";
      expect(isPasswordField(input)).toBe(false);
    });
  });

  describe("isMFAField", () => {
    const createInput = (
      attrs: Record<string, string | number>
    ): HTMLInputElement => {
      const input = document.createElement("input");
      Object.entries(attrs).forEach(([key, value]) => {
        if (key === "className") {
          input.className = String(value);
        } else if (key === "maxLength") {
          input.maxLength = Number(value);
        } else if (key === "type") {
          input.type = String(value);
        } else if (key === "name") {
          input.name = String(value);
        } else if (key === "id") {
          input.id = String(value);
        } else if (key === "placeholder") {
          input.placeholder = String(value);
        } else if (key === "autocomplete") {
          input.setAttribute("autocomplete", String(value));
        } else if (key === "inputMode") {
          input.inputMode = String(value);
        }
      });
      return input;
    };

    it("should detect number input with totp in name", () => {
      const input = createInput({ type: "number", name: "totp_code" });
      expect(isMFAField(input)).toBe(true);
    });

    it("should detect tel input with otp in id", () => {
      const input = createInput({ type: "tel", id: "otp-input" });
      expect(isMFAField(input)).toBe(true);
    });

    it("should detect text input with mfa in class", () => {
      const input = createInput({ type: "text", className: "mfa-code-input" });
      expect(isMFAField(input)).toBe(true);
    });

    it("should detect text input with verification in placeholder", () => {
      const input = createInput({
        type: "text",
        placeholder: "Enter verification code",
      });
      expect(isMFAField(input)).toBe(true);
    });

    it("should detect text input with one-time-code autocomplete", () => {
      const input = createInput({
        type: "text",
        autocomplete: "one-time-code",
      });
      expect(isMFAField(input)).toBe(true);
    });

    it("should detect text input with numeric inputMode", () => {
      const input = createInput({ type: "text", inputMode: "numeric" });
      expect(isMFAField(input)).toBe(true);
    });

    it("should detect text input with maxLength 6", () => {
      const input = createInput({ type: "text", maxLength: 6 });
      expect(isMFAField(input)).toBe(true);
    });

    it("should not detect regular text input as MFA", () => {
      const input = createInput({ type: "text", name: "address" });
      expect(isMFAField(input)).toBe(false);
    });
  });
});
