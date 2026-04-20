/**
 * Multi-step login handler
 * Manages username persistence across page navigations for 2-step login flows
 * (Google, Slack, Microsoft, Okta, etc.)
 */

/** Storage keys for multi-step login data */
const STORAGE_KEYS = {
  USERNAME: "shade_multi_step_username",
  DOMAIN: "shade_multi_step_domain",
  TIMESTAMP: "shade_multi_step_timestamp",
  STEP: "shade_multi_step_step",
} as const;

/** Multi-step login expiration time (10 minutes) */
const MULTI_STEP_EXPIRATION_MS = 10 * 60 * 1000;

/** Login step types */
export type LoginStep = "username" | "password" | "mfa" | "complete";

/** Multi-step login data structure */
export interface MultiStepLoginData {
  username: string;
  domain: string;
  timestamp: number;
  step: LoginStep;
}

/**
 * Known multi-step login domains
 * These domains use separate pages for username and password
 */
const KNOWN_MULTI_STEP_DOMAINS = [
  "google.com",
  "accounts.google.com",
  "slack.com",
  "login.microsoftonline.com",
  "okta.com",
  "auth0.com",
  "onelogin.com",
  "id.atlassian.com",
  "sso.", // Generic SSO subdomain pattern
];

/**
 * Check if current domain uses multi-step login
 */
export const isMultiStepLoginDomain = (): boolean => {
  const hostname = window.location.hostname.toLowerCase();
  return KNOWN_MULTI_STEP_DOMAINS.some(
    (domain) => hostname.includes(domain) || hostname.endsWith(domain)
  );
};

/**
 * Save username for multi-step login flow
 */
export const saveMultiStepUsername = (username: string): void => {
  if (!username) return;

  try {
    const domain = window.location.hostname;
    const timestamp = Date.now();

    sessionStorage.setItem(STORAGE_KEYS.USERNAME, username);
    sessionStorage.setItem(STORAGE_KEYS.DOMAIN, domain);
    sessionStorage.setItem(STORAGE_KEYS.TIMESTAMP, timestamp.toString());
    sessionStorage.setItem(STORAGE_KEYS.STEP, "username");

    console.log("[Shade] Saved multi-step username for:", domain);
  } catch (e) {
    // sessionStorage not available (iframe restrictions, etc.)
    console.warn("[Shade] Could not save multi-step username:", e);
  }
};

/**
 * Update the current login step
 */
export const updateMultiStepLoginStep = (step: LoginStep): void => {
  try {
    sessionStorage.setItem(STORAGE_KEYS.STEP, step);
    console.log("[Shade] Updated multi-step login step to:", step);
  } catch (e) {
    // sessionStorage not available
  }
};

/**
 * Get stored multi-step login data
 * Returns null if data is expired or not found
 */
export const getMultiStepLoginData = (): MultiStepLoginData | null => {
  try {
    const username = sessionStorage.getItem(STORAGE_KEYS.USERNAME);
    const domain = sessionStorage.getItem(STORAGE_KEYS.DOMAIN);
    const timestampStr = sessionStorage.getItem(STORAGE_KEYS.TIMESTAMP);
    const step = sessionStorage.getItem(STORAGE_KEYS.STEP) as LoginStep;

    if (!username || !domain || !timestampStr) {
      return null;
    }

    const timestamp = parseInt(timestampStr, 10);
    const now = Date.now();

    // Check if data is expired
    if (now - timestamp > MULTI_STEP_EXPIRATION_MS) {
      console.log("[Shade] Multi-step login data expired, clearing...");
      clearMultiStepLoginData();
      return null;
    }

    // Verify domain matches (allow subdomain variations)
    const currentHostname = window.location.hostname.toLowerCase();
    const storedDomain = domain.toLowerCase();

    // Check if domains are related (same root domain)
    const isRelatedDomain =
      currentHostname === storedDomain ||
      currentHostname.endsWith("." + storedDomain) ||
      storedDomain.endsWith("." + currentHostname) ||
      getRootDomain(currentHostname) === getRootDomain(storedDomain);

    if (!isRelatedDomain) {
      console.log(
        "[Shade] Multi-step login domain mismatch:",
        currentHostname,
        "vs",
        storedDomain
      );
      return null;
    }

    return {
      username,
      domain,
      timestamp,
      step: step || "username",
    };
  } catch (e) {
    return null;
  }
};

/**
 * Clear multi-step login data (after successful login)
 */
export const clearMultiStepLoginData = (): void => {
  try {
    sessionStorage.removeItem(STORAGE_KEYS.USERNAME);
    sessionStorage.removeItem(STORAGE_KEYS.DOMAIN);
    sessionStorage.removeItem(STORAGE_KEYS.TIMESTAMP);
    sessionStorage.removeItem(STORAGE_KEYS.STEP);
    console.log("[Shade] Cleared multi-step login data");
  } catch (e) {
    // sessionStorage not available
  }
};

/**
 * Get root domain from hostname
 * e.g., "accounts.google.com" -> "google.com"
 */
const getRootDomain = (hostname: string): string => {
  const parts = hostname.split(".");
  if (parts.length <= 2) return hostname;
  return parts.slice(-2).join(".");
};

/**
 * Hook for URL changes to detect navigation in 2-step flows
 */
export const setupNavigationListener = (onNavigate: () => void): void => {
  // Listen for history changes (pushState, replaceState)
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    console.log("[Shade] pushState detected, checking for login fields...");
    setTimeout(onNavigate, 100);
  };

  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    console.log("[Shade] replaceState detected, checking for login fields...");
    setTimeout(onNavigate, 100);
  };

  // Listen for popstate (back/forward navigation)
  window.addEventListener("popstate", () => {
    console.log("[Shade] popstate detected, checking for login fields...");
    setTimeout(onNavigate, 100);
  });

  // Listen for hash changes
  window.addEventListener("hashchange", () => {
    console.log("[Shade] hashchange detected, checking for login fields...");
    setTimeout(onNavigate, 100);
  });

  console.log(
    "[Shade] Navigation listeners set up for multi-step login detection"
  );
};

/**
 * Attempt to restore username from multi-step login data
 * Returns the username if found and valid, null otherwise
 */
export const restoreMultiStepUsername = (): string | null => {
  const data = getMultiStepLoginData();

  if (data && data.step === "username") {
    console.log(
      "[Shade] Restoring username from multi-step login:",
      data.username
    );
    updateMultiStepLoginStep("password");
    return data.username;
  }

  return null;
};

/**
 * Check if we're on a password step of a multi-step login
 */
export const isPasswordStep = (): boolean => {
  const data = getMultiStepLoginData();
  return data !== null && data.step === "password";
};

/**
 * Check if we're on an MFA step of a multi-step login
 */
export const isMFAStep = (): boolean => {
  const data = getMultiStepLoginData();
  return data !== null && data.step === "mfa";
};
