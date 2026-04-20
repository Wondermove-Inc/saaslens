/**
 * Federated Authentication Detector Tests
 */

import { vi } from "vitest";
import {
  handleSamlFormSubmit,
  hookHistoryChanges,
  tryExtractUsernameFromSaml,
} from "./federated-auth";

// Mock the login sender
vi.mock("../utils/login-sender", () => ({
  sendLoginDataImmediate: vi.fn(),
}));

describe("Federated Auth Detector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  describe("tryExtractUsernameFromSaml", () => {
    it("should extract email from SAML NameID", () => {
      const samlXml =
        "<samlp:Response><saml:NameID>user@example.com</saml:NameID></samlp:Response>";
      const b64 = btoa(samlXml);
      const result = tryExtractUsernameFromSaml(b64);
      expect(result).toBe("user@example.com");
    });

    it("should extract email from SAML attribute", () => {
      const samlXml =
        '<Response><Attribute Name="email">test.user@domain.org</Attribute></Response>';
      const b64 = btoa(samlXml);
      const result = tryExtractUsernameFromSaml(b64);
      expect(result).toBe("test.user@domain.org");
    });

    it("should return undefined for invalid base64", () => {
      const result = tryExtractUsernameFromSaml("not-valid-base64!!!");
      expect(result).toBeUndefined();
    });

    it("should return undefined when no email found", () => {
      const samlXml = "<Response><Data>no email here</Data></Response>";
      const b64 = btoa(samlXml);
      const result = tryExtractUsernameFromSaml(b64);
      expect(result).toBeUndefined();
    });

    it("should handle complex email formats", () => {
      const samlXml =
        "<Response>User email: john.doe+tag@sub.example.co.uk</Response>";
      const b64 = btoa(samlXml);
      const result = tryExtractUsernameFromSaml(b64);
      expect(result).toBe("john.doe+tag@sub.example.co.uk");
    });
  });

  describe("handleSamlFormSubmit", () => {
    it("should call fallback handler when no SAML input found", () => {
      const form = document.createElement("form");
      const fallback = vi.fn();

      handleSamlFormSubmit(form, fallback);

      expect(fallback).toHaveBeenCalledWith(expect.any(Event));
    });

    it("should process SAML input when found by name", () => {
      const form = document.createElement("form");
      const input = document.createElement("input");
      input.name = "SAMLResponse";
      input.value = btoa("<NameID>saml@test.com</NameID>");
      form.appendChild(input);

      const fallback = vi.fn();
      handleSamlFormSubmit(form, fallback);

      // Should not call fallback when SAML is found
      expect(fallback).not.toHaveBeenCalled();
    });

    it("should process SAML input when found by id", () => {
      const form = document.createElement("form");
      const input = document.createElement("input");
      input.id = "mySAMLResponseInput";
      input.value = btoa("<NameID>id-saml@test.com</NameID>");
      form.appendChild(input);

      const fallback = vi.fn();
      handleSamlFormSubmit(form, fallback);

      expect(fallback).not.toHaveBeenCalled();
    });

    it("should handle empty SAML input value", () => {
      const form = document.createElement("form");
      const input = document.createElement("input");
      input.name = "SAMLResponse";
      input.value = "";
      form.appendChild(input);

      const fallback = vi.fn();
      handleSamlFormSubmit(form, fallback);

      // Should still process (not call fallback) even with empty value
      expect(fallback).not.toHaveBeenCalled();
    });
  });

  describe("hookHistoryChanges", () => {
    it("should hook history.pushState", () => {
      const originalPush = history.pushState;
      hookHistoryChanges();

      // history.pushState should be replaced
      expect(history.pushState).not.toBe(originalPush);

      // Calling pushState should work without error
      expect(() => {
        history.pushState({}, "", "#test");
      }).not.toThrow();
    });

    it("should hook history.replaceState", () => {
      const originalReplace = history.replaceState;
      hookHistoryChanges();

      // history.replaceState should be replaced
      expect(history.replaceState).not.toBe(originalReplace);

      // Calling replaceState should work without error
      expect(() => {
        history.replaceState({}, "", "#test");
      }).not.toThrow();
    });

    it("should add popstate event listener", () => {
      const addEventListenerSpy = vi.spyOn(window, "addEventListener");
      hookHistoryChanges();

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "popstate",
        expect.any(Function)
      );

      addEventListenerSpy.mockRestore();
    });

    it("should add hashchange event listener", () => {
      const addEventListenerSpy = vi.spyOn(window, "addEventListener");
      hookHistoryChanges();

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "hashchange",
        expect.any(Function)
      );

      addEventListenerSpy.mockRestore();
    });
  });
});
