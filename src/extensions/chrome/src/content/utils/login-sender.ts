/**
 * Login data transmission utilities
 * Handles sending login data to the background script
 */

import { AuthType, LoginData, MessageType } from "../../shared/types";
import { getDomain } from "../../shared/utils";
import {
  detectCaptcha,
  isCaptchaSolved,
  waitForCaptchaSolution,
} from "../detectors/captcha-detector";
import { isLoginFailure, isLoginSuccess } from "../detectors/login-status";
import {
  detectedMFAType,
  formData,
  hasMFADetected,
  lastSentLogin,
  pendingLoginData,
  setFormData,
  setLastSentLogin,
  setPendingLoginData,
} from "../state";
import {
  DEBOUNCE_TIME,
  LOGIN_SUCCESS_WAIT_TIME,
  MFA_WAIT_TIME,
} from "../types";
import { getLoginConfig } from "./login-url-config";

/**
 * Storage key for multi-step login (e.g., Google)
 */
const PENDING_USERNAME_KEY = "shade_pending_username";

/**
 * Clear pending username after successful login
 */
const clearPendingUsername = (): void => {
  try {
    sessionStorage.removeItem(PENDING_USERNAME_KEY);
  } catch (e) {
    // SessionStorage not available
  }
};

/**
 * Detect authentication type based on captured data
 * Returns UPPERCASE values to match API schema (extension-api.ts)
 */
const detectAuthType = (password: string, domain: string): AuthType => {
  const hostname = new URL(
    domain.startsWith("http") ? domain : `https://${domain}`
  ).hostname;

  // OAuth providers
  if (
    hostname.includes("accounts.google.com") ||
    hostname.includes("login.microsoftonline.com") ||
    hostname.includes("login.live.com")
  ) {
    return "OAUTH";
  }

  // Magic link / Passwordless sites
  if (!password || password.length === 0) {
    // Known magic link sites
    if (
      hostname.includes("claude.ai") ||
      hostname.includes("notion.so") ||
      hostname.includes("slack.com")
    ) {
      return "MAGIC_LINK";
    }
    // Generic: no password = likely magic link
    return "MAGIC_LINK";
  }

  return "PASSWORD";
};

/**
 * Send login data immediately to the background script
 */
export const sendLoginDataImmediate = (
  domain: string,
  username: string,
  password: string,
  hasMFA: boolean,
  mfaType?: string
): void => {
  const authType = detectAuthType(password, domain);

  const loginData: Partial<LoginData> = {
    domain,
    username,
    password,
    hasMFA,
    mfaType,
    authType,
  };

  // Send message to background script
  chrome.runtime.sendMessage({
    type: MessageType.LOGIN_DETECTED,
    data: loginData,
  });

  console.log(
    "[Shade] Login data sent for domain:",
    domain,
    "authType:",
    authType
  );

  // Clear stored data for security
  setFormData("username", "");
  setFormData("password", "");

  // Clear pending username from multi-step login
  clearPendingUsername();
};

/**
 * Monitor for login success or failure after form submission
 */
export const monitorLoginResult = (
  domain: string,
  username: string,
  password: string,
  hasMFA: boolean,
  mfaType?: string
): void => {
  const startTime = Date.now();
  const initialUrl = window.location.href;

  const checkResult = (): void => {
    const elapsed = Date.now() - startTime;

    // Check if login failed
    if (isLoginFailure()) {
      console.log(
        "[Shade] Login capture complete - failure detected (data not sent to server)"
      );
      return; // Don't send data for failed logins
    }

    // Check if login succeeded
    if (isLoginSuccess(initialUrl) || window.location.href !== initialUrl) {
      sendLoginDataImmediate(domain, username, password, hasMFA, mfaType);
      return;
    }

    // Continue monitoring if time hasn't elapsed
    if (elapsed < LOGIN_SUCCESS_WAIT_TIME) {
      setTimeout(checkResult, 500); // Check every 500ms
    } else {
      // Timeout reached - assume success if no clear failure detected
      sendLoginDataImmediate(domain, username, password, hasMFA, mfaType);
    }
  };

  // Start monitoring after a brief delay to allow page to update
  setTimeout(checkResult, 1000);
};

/**
 * Check if current domain requires immediate send (2-step, redirect, etc.)
 * These login types redirect immediately after submission, so we can't wait for MFA
 */
const shouldSendImmediately = (): boolean => {
  const hostname = window.location.hostname;
  const loginConfig = getLoginConfig(hostname);

  if (!loginConfig) {
    return false;
  }

  // These login types redirect to another page immediately after submission
  const immediateTypes = ["2-step", "redirect", "oauth-button"];
  return immediateTypes.includes(loginConfig.type);
};

/**
 * Send login data with delay to check for MFA and CAPTCHA
 * For 2-step/redirect logins, sends immediately to prevent data loss on page navigation
 */
export const sendLoginData = async (): Promise<void> => {
  const domain = getDomain(window.location.href);
  const username = formData["username"];
  const password = formData["password"];
  const currentTime = Date.now();

  // Debug log for testing - confirms form data was captured
  console.log("[Shade] sendLoginData called:", {
    domain,
    hasUsername: !!username,
    hasPassword: !!password,
    usernameLength: username?.length || 0,
  });

  // Skip if no username
  if (!username || username.length === 0) {
    console.log("[Shade] No username captured, skipping send");
    return;
  }

  // Check if this is a duplicate submission
  if (
    lastSentLogin &&
    lastSentLogin.domain === domain &&
    lastSentLogin.username === username &&
    currentTime - lastSentLogin.timestamp < DEBOUNCE_TIME
  ) {
    console.log("[Shade] Duplicate submission detected, skipping");
    return;
  }

  // For 2-step, redirect, or oauth-button logins, send immediately
  // These page types redirect immediately after form submission, so MFA wait would cause data loss
  if (shouldSendImmediately()) {
    console.log(
      "[Shade] 2-step/redirect login detected - sending data IMMEDIATELY"
    );
    sendLoginDataImmediate(domain, username, password || "", false);
    setLastSentLogin({ domain, username, timestamp: currentTime });
    return;
  }

  // Magic Link services often trigger false positive CAPTCHA detection
  // Skip CAPTCHA check for these services as they don't typically use reCAPTCHA
  const MAGIC_LINK_SERVICES = [
    "claude.ai",
    "notion.so",
    "slack.com",
    "linear.app",
    "figma.com",
  ];
  const hostname = window.location.hostname;
  const isMagicLinkService = MAGIC_LINK_SERVICES.some((service) =>
    hostname.includes(service)
  );

  // Check for CAPTCHA and wait if present (skip for Magic Link services)
  if (!isMagicLinkService) {
    const captchaResult = detectCaptcha();
    if (captchaResult.detected && !captchaResult.solved) {
      console.log(
        "[Shade] CAPTCHA detected, waiting for solution...",
        captchaResult.type
      );

      // Wait for CAPTCHA to be solved (up to 2 minutes)
      const captchaSolved = await waitForCaptchaSolution(120000);

      if (!captchaSolved) {
        console.log("[Shade] CAPTCHA timeout - will retry on next submission");
        return;
      }

      console.log("[Shade] CAPTCHA solved, proceeding with login data");
    }
  } else {
    console.log("[Shade] Magic Link service detected, skipping CAPTCHA check");
  }

  // If MFA is already detected on current page, monitor for success before sending
  if (hasMFADetected) {
    monitorLoginResult(domain, username, password, true, detectedMFAType);
    setLastSentLogin({ domain, username, timestamp: currentTime });
    return;
  }

  // Cancel any existing pending login
  if (pendingLoginData && pendingLoginData.timeoutId) {
    clearTimeout(pendingLoginData.timeoutId);
  }

  // Set up delayed sending to wait for potential MFA
  const timeoutId = window.setTimeout(async () => {
    // Re-check CAPTCHA before final send (skip for Magic Link services)
    if (!isMagicLinkService && !isCaptchaSolved()) {
      console.log("[Shade] CAPTCHA still pending, waiting...");
      const solved = await waitForCaptchaSolution(60000);
      if (!solved) {
        console.log("[Shade] CAPTCHA not solved in time, aborting");
        setPendingLoginData(null);
        return;
      }
    }

    const finalHasMFA = hasMFADetected;
    const finalMFAType = finalHasMFA ? detectedMFAType : undefined;

    // Monitor for login success before sending data
    monitorLoginResult(domain, username, password, finalHasMFA, finalMFAType);

    setLastSentLogin({ domain, username, timestamp: currentTime });
    setPendingLoginData(null);
  }, MFA_WAIT_TIME);

  setPendingLoginData({
    domain,
    username,
    password,
    timestamp: currentTime,
    timeoutId,
  });
};
