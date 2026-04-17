/**
 * CAPTCHA detection utilities
 * Detects reCAPTCHA, hCaptcha, and other CAPTCHA systems
 * Used to delay login data transmission until CAPTCHA is solved
 */

/** CSS selectors for reCAPTCHA */
const RECAPTCHA_SELECTORS = [
  ".g-recaptcha",
  "[data-sitekey]",
  'iframe[src*="recaptcha"]',
  'iframe[src*="google.com/recaptcha"]',
  "#g-recaptcha",
  ".recaptcha-checkbox",
  "[data-callback]",
  "div[data-widget-uuid]", // invisible reCAPTCHA
];

/** CSS selectors for hCaptcha */
const HCAPTCHA_SELECTORS = [
  ".h-captcha",
  "[data-hcaptcha-sitekey]",
  'iframe[src*="hcaptcha"]',
  'iframe[src*="hcaptcha.com"]',
  "#h-captcha",
  ".hcaptcha-checkbox",
];

/** CSS selectors for Cloudflare Turnstile */
const TURNSTILE_SELECTORS = [
  ".cf-turnstile",
  "[data-turnstile-sitekey]",
  'iframe[src*="challenges.cloudflare.com"]',
];

/** CSS selectors for other CAPTCHAs */
const OTHER_CAPTCHA_SELECTORS = [
  // Generic CAPTCHA selectors
  '[class*="captcha"]',
  '[id*="captcha"]',
  'img[src*="captcha"]',
  'input[name*="captcha"]',
  // FunCaptcha / Arkose Labs
  "[data-pkey]",
  'iframe[src*="funcaptcha"]',
  'iframe[src*="arkoselabs"]',
  // AWS WAF CAPTCHA
  'iframe[src*="aws.amazon.com/captcha"]',
  // Custom/text CAPTCHAs
  ".captcha-image",
  ".captcha-input",
];

/** CAPTCHA types */
export type CaptchaType =
  | "recaptcha-v2"
  | "recaptcha-v3"
  | "recaptcha-enterprise"
  | "hcaptcha"
  | "turnstile"
  | "funcaptcha"
  | "other"
  | "none";

/** CAPTCHA detection result */
export interface CaptchaDetectionResult {
  detected: boolean;
  type: CaptchaType;
  solved: boolean;
  element?: Element;
}

/**
 * Detect reCAPTCHA presence and state
 */
const detectRecaptcha = (): CaptchaDetectionResult | null => {
  for (const selector of RECAPTCHA_SELECTORS) {
    const element = document.querySelector(selector);
    if (element) {
      // Check if it's solved
      const solved = isRecaptchaSolved(element);

      // Determine version
      let type: CaptchaType = "recaptcha-v2";
      if (
        element.getAttribute("data-size") === "invisible" ||
        element.classList.contains("grecaptcha-badge")
      ) {
        type = "recaptcha-v3";
      }
      if (element.getAttribute("data-recaptcha-enterprise")) {
        type = "recaptcha-enterprise";
      }

      console.log("[Shade] reCAPTCHA detected:", type, "solved:", solved);
      return { detected: true, type, solved, element };
    }
  }
  return null;
};

/**
 * Check if reCAPTCHA has been solved
 */
const isRecaptchaSolved = (element: Element): boolean => {
  // Check for visible checkmark
  const checkmark = element.querySelector(".recaptcha-checkbox-checked");
  if (checkmark) return true;

  // Check for response token in textarea
  const textarea = document.querySelector(
    'textarea[name="g-recaptcha-response"]'
  ) as HTMLTextAreaElement;
  if (textarea && textarea.value.length > 0) return true;

  // Check for invisible reCAPTCHA token in hidden input
  const hiddenInput = document.querySelector(
    'input[name="g-recaptcha-response"]'
  ) as HTMLInputElement;
  if (hiddenInput && hiddenInput.value.length > 0) return true;

  return false;
};

/**
 * Detect hCaptcha presence and state
 */
const detectHcaptcha = (): CaptchaDetectionResult | null => {
  for (const selector of HCAPTCHA_SELECTORS) {
    const element = document.querySelector(selector);
    if (element) {
      const solved = isHcaptchaSolved();
      console.log("[Shade] hCaptcha detected, solved:", solved);
      return { detected: true, type: "hcaptcha", solved, element };
    }
  }
  return null;
};

/**
 * Check if hCaptcha has been solved
 */
const isHcaptchaSolved = (): boolean => {
  // Check for response token
  const textarea = document.querySelector(
    'textarea[name="h-captcha-response"]'
  ) as HTMLTextAreaElement;
  if (textarea && textarea.value.length > 0) return true;

  // Check for success indicator
  const successIcon = document.querySelector(".hcaptcha-success");
  if (successIcon) return true;

  return false;
};

/**
 * Detect Cloudflare Turnstile presence and state
 */
const detectTurnstile = (): CaptchaDetectionResult | null => {
  for (const selector of TURNSTILE_SELECTORS) {
    const element = document.querySelector(selector);
    if (element) {
      const solved = isTurnstileSolved();
      console.log("[Shade] Turnstile detected, solved:", solved);
      return { detected: true, type: "turnstile", solved, element };
    }
  }
  return null;
};

/**
 * Check if Turnstile has been solved
 */
const isTurnstileSolved = (): boolean => {
  const input = document.querySelector(
    'input[name="cf-turnstile-response"]'
  ) as HTMLInputElement;
  return input !== null && input.value.length > 0;
};

/**
 * Detect other/generic CAPTCHAs
 */
const detectOtherCaptcha = (): CaptchaDetectionResult | null => {
  for (const selector of OTHER_CAPTCHA_SELECTORS) {
    const element = document.querySelector(selector);
    if (element) {
      // Skip if it's one of the known types we already detected
      if (
        RECAPTCHA_SELECTORS.some((s) => element.matches(s)) ||
        HCAPTCHA_SELECTORS.some((s) => element.matches(s)) ||
        TURNSTILE_SELECTORS.some((s) => element.matches(s))
      ) {
        continue;
      }

      console.log("[Shade] Generic CAPTCHA detected");
      return { detected: true, type: "other", solved: false, element };
    }
  }
  return null;
};

/**
 * Main CAPTCHA detection function
 * Returns detection result with type and solved state
 */
export const detectCaptcha = (): CaptchaDetectionResult => {
  // Check for specific CAPTCHA types in order of popularity
  const recaptcha = detectRecaptcha();
  if (recaptcha) return recaptcha;

  const hcaptcha = detectHcaptcha();
  if (hcaptcha) return hcaptcha;

  const turnstile = detectTurnstile();
  if (turnstile) return turnstile;

  const other = detectOtherCaptcha();
  if (other) return other;

  // No CAPTCHA detected
  return { detected: false, type: "none", solved: true };
};

/**
 * Check if CAPTCHA is present on the page
 */
export const hasCaptcha = (): boolean => {
  return detectCaptcha().detected;
};

/**
 * Check if CAPTCHA has been solved
 */
export const isCaptchaSolved = (): boolean => {
  const result = detectCaptcha();
  return !result.detected || result.solved;
};

/**
 * Wait for CAPTCHA to be solved
 * Returns a promise that resolves when CAPTCHA is solved or timeout
 */
export const waitForCaptchaSolution = (
  timeoutMs: number = 60000
): Promise<boolean> => {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const checkSolved = (): void => {
      if (isCaptchaSolved()) {
        console.log("[Shade] CAPTCHA solved or not present");
        resolve(true);
        return;
      }

      if (Date.now() - startTime > timeoutMs) {
        console.log("[Shade] CAPTCHA solution timeout");
        resolve(false);
        return;
      }

      // Check every 500ms
      setTimeout(checkSolved, 500);
    };

    checkSolved();
  });
};

/**
 * Observe CAPTCHA state changes
 */
export const observeCaptchaChanges = (
  callback: (solved: boolean) => void
): MutationObserver => {
  const observer = new MutationObserver(() => {
    const solved = isCaptchaSolved();
    callback(solved);
  });

  // Observe the entire document for CAPTCHA state changes
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["value", "class", "style"],
  });

  return observer;
};
