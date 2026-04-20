/**
 * Federated authentication detection
 * Handles OAuth, OIDC, and SAML login flows
 */

import { getDomain } from "../../shared/utils";
import { sendLoginDataImmediate } from "../utils/login-sender";

/**
 * Base64 URL decode utility for JWT parsing
 */
const base64UrlDecode = (str: string): string => {
  try {
    const pad = "=".repeat((4 - (str.length % 4)) % 4);
    const base64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
    const decoded = atob(base64);
    const bytes = Uint8Array.from(decoded, (c) => c.charCodeAt(0));
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(bytes);
  } catch {
    return "";
  }
};

/**
 * Try to extract username from an ID token (JWT)
 */
const tryExtractUsernameFromIdToken = (idToken: string): string | undefined => {
  try {
    const parts = idToken.split(".");
    if (parts.length < 2) return undefined;
    const payloadJson = base64UrlDecode(parts[1]);
    const payload = JSON.parse(payloadJson);
    return (
      payload.email ||
      payload.preferred_username ||
      payload.upn ||
      payload.name ||
      payload.sub
    );
  } catch {
    return undefined;
  }
};

/**
 * Try to extract username from SAML response
 */
export const tryExtractUsernameFromSaml = (b64: string): string | undefined => {
  try {
    const xml = atob(b64);
    // Naive regex for NameID or email-like content
    const nameIdMatch = xml.match(/<\/?NameID[^>]*>([^<]+)<\/NameID>/i);
    if (nameIdMatch && nameIdMatch[1]) return nameIdMatch[1];
    const mailAttr = xml.match(/(\w[\w.+-]*@[\w.-]+\.[A-Za-z]{2,})/);
    if (mailAttr && mailAttr[1]) return mailAttr[1];
    return undefined;
  } catch {
    return undefined;
  }
};

/**
 * Detect federated authentication from URL parameters
 * Handles OAuth2 authorization code, implicit flow, and SAML
 */
export const detectFederatedFromLocation = (): void => {
  try {
    const url = new URL(window.location.href);
    const domain = getDomain(window.location.href);

    // Query params
    const code = url.searchParams.get("code");
    const samlResponseQP = url.searchParams.get("SAMLResponse");

    // Hash params (implicit flow)
    const hash = url.hash.startsWith("#") ? url.hash.substring(1) : url.hash;
    const hashParams = new URLSearchParams(hash);
    const accessToken = hashParams.get("access_token");
    const idToken = hashParams.get("id_token");

    // ID token present - extract username from JWT
    if (idToken) {
      const username = tryExtractUsernameFromIdToken(idToken) || "";
      sendLoginDataImmediate(domain, username, "", false, undefined);
      return;
    }

    // Access token present (OAuth2 implicit flow)
    if (accessToken) {
      sendLoginDataImmediate(domain, "", "", false, undefined);
      return;
    }

    // Authorization code present (OAuth2 code flow)
    if (code) {
      sendLoginDataImmediate(domain, "", "", false, undefined);
      return;
    }

    // SAML response in URL (rare but possible)
    if (samlResponseQP) {
      sendLoginDataImmediate(domain, "", "", false, undefined);
      return;
    }
  } catch {
    // Ignore errors
  }
};

/**
 * Handle SAML form submission
 */
export const handleSamlFormSubmit = (
  form: HTMLFormElement,
  fallbackHandler: (event: Event) => void
): void => {
  const samlInput = form.querySelector(
    'input[name="SAMLResponse"], input[id*="SAMLResponse"]'
  ) as HTMLInputElement | null;

  if (samlInput) {
    const domain = getDomain(window.location.href);
    const username = samlInput.value
      ? tryExtractUsernameFromSaml(samlInput.value) || ""
      : "";
    sendLoginDataImmediate(domain, username, "", false, undefined);
  } else {
    fallbackHandler(new Event("submit"));
  }
};

/**
 * Hook browser history changes to detect OAuth/OIDC redirects
 */
export const hookHistoryChanges = (): void => {
  const origPush = history.pushState.bind(history);
  const origReplace = history.replaceState.bind(history);

  history.pushState = function (
    data: unknown,
    unused: string,
    url?: string | URL | null
  ): void {
    origPush(data, unused, url);
    setTimeout(detectFederatedFromLocation, 0);
  };

  history.replaceState = function (
    data: unknown,
    unused: string,
    url?: string | URL | null
  ): void {
    origReplace(data, unused, url);
    setTimeout(detectFederatedFromLocation, 0);
  };

  window.addEventListener("popstate", () =>
    setTimeout(detectFederatedFromLocation, 0)
  );
  window.addEventListener("hashchange", () =>
    setTimeout(detectFederatedFromLocation, 0)
  );
};
