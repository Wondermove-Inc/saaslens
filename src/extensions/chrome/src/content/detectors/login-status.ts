/**
 * Login status detection
 * Determines whether a login attempt succeeded or failed
 * Enhanced with multilingual support and AI SaaS patterns
 */

/** Error message patterns indicating login failure (English) */
const ERROR_PATTERNS_EN = [
  "invalid",
  "incorrect",
  "wrong",
  "failed",
  "error",
  "denied",
  "unauthorized",
  "authentication failed",
  "login failed",
  "bad credentials",
  "invalid username",
  "invalid password",
  "account locked",
  "too many attempts",
  "not found",
  "doesn't exist",
  "couldn't find",
  "unable to sign",
  "sign in failed",
  "verify your identity",
  "check your email",
  "check your password",
  "try again",
  "expired",
  "suspended",
  "disabled",
  "blocked",
  "rate limit",
  "captcha required",
];

/** Error message patterns (Korean) */
const ERROR_PATTERNS_KO = [
  "올바르지 않",
  "잘못된",
  "실패",
  "오류",
  "일치하지 않",
  "인증 실패",
  "로그인 실패",
  "비밀번호가 틀",
  "계정이 잠",
  "존재하지 않",
  "찾을 수 없",
  "다시 시도",
  "만료",
  "차단",
  "일시 정지",
  "비활성화",
  "제한",
  "확인해 주세요",
];

/** Combined error patterns */
const ERROR_PATTERNS = [...ERROR_PATTERNS_EN, ...ERROR_PATTERNS_KO];

/** CSS selectors for error elements */
const ERROR_SELECTORS = [
  '[class*="error"]',
  '[class*="invalid"]',
  '[class*="fail"]',
  '[class*="warning"]',
  '[id*="error"]',
  '[id*="invalid"]',
  '[id*="fail"]',
  ".alert-danger",
  ".alert-error",
  ".alert-warning",
  ".error-message",
  ".login-error",
  ".auth-error",
  '[role="alert"]',
  '[aria-live="polite"]',
  '[aria-live="assertive"]',
  // AI SaaS specific error selectors
  '[data-testid*="error"]',
  '[data-test*="error"]',
  ".toast-error",
  ".notification-error",
  ".snackbar-error",
];

/** CSS selectors for success elements */
const SUCCESS_SELECTORS = [
  '[class*="welcome"]',
  '[class*="dashboard"]',
  '[class*="success"]',
  '[id*="welcome"]',
  '[id*="dashboard"]',
  '[id*="success"]',
  ".alert-success",
  ".success-message",
  ".login-success",
  ".toast-success",
  ".notification-success",
];

/** CSS selectors indicating logged-in state */
const LOGGED_IN_SELECTORS = [
  'a[href*="logout"]',
  'a[href*="signout"]',
  'a[href*="sign-out"]',
  'a[href*="log-out"]',
  'button[onclick*="logout"]',
  'button[onclick*="signout"]',
  '[class*="user-menu"]',
  '[class*="profile-menu"]',
  '[class*="account-menu"]',
  '[class*="user-avatar"]',
  '[class*="user-profile"]',
  '[class*="user-dropdown"]',
  '[data-testid*="logout"]',
  '[data-testid*="signout"]',
  '[data-testid*="user-menu"]',
  // AI SaaS specific selectors
  '[class*="workspace-switcher"]',
  '[class*="team-switcher"]',
  '[class*="org-switcher"]',
];

/** CSS selectors for authenticated UI elements */
const AUTH_UI_SELECTORS = [
  '[class*="avatar"]',
  '[class*="profile-pic"]',
  '[class*="user-icon"]',
  '[class*="account-icon"]',
  '[class*="logged-in"]',
  '[data-testid*="avatar"]',
  '[data-testid*="user"]',
  '[data-testid*="profile"]',
  'img[alt*="profile"]',
  'img[alt*="avatar"]',
  'img[alt*="user"]',
  // AI SaaS specific UI elements
  '[class*="chat-container"]',
  '[class*="conversation-list"]',
  '[class*="workspace-view"]',
  '[class*="project-list"]',
  '[class*="canvas-container"]',
  '[class*="editor-container"]',
];

/** CSS selectors for navigation items only visible when logged in */
const AUTH_NAV_SELECTORS = [
  '[class*="nav"] a[href*="settings"]',
  '[class*="nav"] a[href*="profile"]',
  '[class*="nav"] a[href*="account"]',
  '[class*="nav"] a[href*="billing"]',
  '[class*="sidebar"] a[href*="dashboard"]',
  '[class*="sidebar"] a[href*="projects"]',
  '[role="navigation"] [class*="user"]',
  // AI SaaS specific navigation
  '[class*="nav"] a[href*="chat"]',
  '[class*="nav"] a[href*="conversations"]',
  '[class*="nav"] a[href*="workspace"]',
  '[class*="nav"] a[href*="teams"]',
];

/** Regex for authentication cookie patterns */
const AUTH_COOKIE_PATTERN =
  /(?:^|;\s*)(session|auth|token|jwt|sid|logged_in|user_session|access_token|refresh_token|_identity|JSESSIONID|PHPSESSID|ASP\.NET_SessionId|__session|_session|cf_clearance)=/i;

/** Regex for dashboard URL patterns - expanded for AI SaaS */
const DASHBOARD_URL_PATTERN =
  /\/(dashboard|home|app|console|main|workspace|portal|account|profile|my|overview|inbox|feed|chat|c\/|conversation|project|canvas|editor|new|create|generate|studio)/i;

/** Regex for login/auth URL patterns (used to detect we're still on login page) */
const LOGIN_URL_PATTERN =
  /\/(login|signin|sign-in|auth|authenticate|sso|oauth|connect|session)/i;

/**
 * Check if the current page indicates a login failure
 * Enhanced with better error detection and false positive reduction
 */
export const isLoginFailure = (): boolean => {
  // Check for common error message patterns in error-styled elements
  for (const selector of ERROR_SELECTORS) {
    const elements = document.querySelectorAll(selector);
    for (const element of Array.from(elements)) {
      // Skip hidden elements
      if (!isElementVisible(element)) {
        continue;
      }

      const text = element.textContent?.toLowerCase() || "";

      // Must be a reasonable length (not just "error" class on a container)
      if (text.length > 5 && text.length < 500) {
        if (
          ERROR_PATTERNS.some((pattern) => text.includes(pattern.toLowerCase()))
        ) {
          console.log(
            "[Shade] Login failure detected:",
            text.substring(0, 100)
          );
          return true;
        }
      }
    }
  }

  // Check for specific error input styling
  const inputs = document.querySelectorAll(
    'input[type="password"], input[type="email"], input[type="text"]'
  );
  for (const input of Array.from(inputs)) {
    if (
      input.classList.contains("error") ||
      input.classList.contains("invalid") ||
      input.classList.contains("is-invalid") ||
      input.classList.contains("has-error") ||
      input.getAttribute("aria-invalid") === "true"
    ) {
      console.log("[Shade] Login failure detected: input marked as invalid");
      return true;
    }
  }

  // Check for HTTP error status in URL (some sites redirect to error pages)
  const urlParams = new URLSearchParams(window.location.search);
  if (
    urlParams.get("error") ||
    urlParams.get("error_code") ||
    urlParams.get("errorCode")
  ) {
    console.log("[Shade] Login failure detected: error in URL params");
    return true;
  }

  return false;
};

/**
 * Check if an element is visible
 */
const isElementVisible = (element: Element): boolean => {
  const style = window.getComputedStyle(element);
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0" &&
    (element as HTMLElement).offsetParent !== null
  );
};

/**
 * Check if the current page indicates a login success
 * Enhanced with cookie detection, URL pattern matching, and form disappearance detection
 */
export const isLoginSuccess = (initialUrl?: string): boolean => {
  const currentUrl = window.location.href;
  const currentPath = window.location.pathname;

  // 0. If we're still on a login URL, we probably haven't succeeded yet
  if (LOGIN_URL_PATTERN.test(currentPath)) {
    // But check for success indicators anyway (some SPAs stay on same URL)
    const hasSuccessIndicator = SUCCESS_SELECTORS.some(
      (selector) => document.querySelector(selector) !== null
    );
    if (!hasSuccessIndicator) {
      return false;
    }
  }

  // 1. Check for visible success elements on the page
  for (const selector of SUCCESS_SELECTORS) {
    const elements = document.querySelectorAll(selector);
    for (const element of Array.from(elements)) {
      if (isElementVisible(element)) {
        console.log("[Shade] Login success detected: success element found");
        return true;
      }
    }
  }

  // 2. Check for logout buttons or user menus (indicates successful login)
  for (const selector of LOGGED_IN_SELECTORS) {
    const element = document.querySelector(selector);
    if (element && isElementVisible(element)) {
      console.log("[Shade] Login success detected: logged-in UI found");
      return true;
    }
  }

  // 3. Check for authentication cookies
  try {
    if (AUTH_COOKIE_PATTERN.test(document.cookie)) {
      // Only consider it success if we also have URL change or UI elements
      const hasUIChange = AUTH_UI_SELECTORS.some((s) =>
        document.querySelector(s)
      );
      const hasUrlChange = initialUrl && currentUrl !== initialUrl;
      if (hasUIChange || hasUrlChange) {
        console.log(
          "[Shade] Login success detected: auth cookie + UI/URL change"
        );
        return true;
      }
    }
  } catch {
    // Cookie access might be restricted, continue with other checks
  }

  // 4. Check for URL change to dashboard/home pattern
  if (initialUrl && currentUrl !== initialUrl) {
    if (DASHBOARD_URL_PATTERN.test(currentPath)) {
      console.log("[Shade] Login success detected: redirected to dashboard");
      return true;
    }

    // URL changed away from login page
    if (
      LOGIN_URL_PATTERN.test(new URL(initialUrl).pathname) &&
      !LOGIN_URL_PATTERN.test(currentPath)
    ) {
      console.log("[Shade] Login success detected: left login page");
      return true;
    }
  }

  // 5. Check for login form disappearance + authenticated UI elements (SPA support)
  const passwordFieldExists = document.querySelector('input[type="password"]');
  if (!passwordFieldExists) {
    for (const selector of AUTH_UI_SELECTORS) {
      const element = document.querySelector(selector);
      if (element && isElementVisible(element)) {
        console.log(
          "[Shade] Login success detected: password field gone + auth UI"
        );
        return true;
      }
    }
  }

  // 6. Check for navigation menu items that only appear when logged in
  for (const selector of AUTH_NAV_SELECTORS) {
    const element = document.querySelector(selector);
    if (element && isElementVisible(element)) {
      console.log("[Shade] Login success detected: auth nav items found");
      return true;
    }
  }

  return false;
};

/**
 * Get confidence level of login result (for future use)
 * Returns a score from 0-100
 */
export const getLoginSuccessConfidence = (): number => {
  let score = 0;

  // Check various indicators and add to score
  for (const selector of LOGGED_IN_SELECTORS) {
    if (document.querySelector(selector)) score += 20;
  }

  for (const selector of AUTH_UI_SELECTORS) {
    if (document.querySelector(selector)) score += 10;
  }

  for (const selector of AUTH_NAV_SELECTORS) {
    if (document.querySelector(selector)) score += 15;
  }

  if (DASHBOARD_URL_PATTERN.test(window.location.pathname)) score += 25;

  try {
    if (AUTH_COOKIE_PATTERN.test(document.cookie)) score += 15;
  } catch {
    // Ignore cookie access errors
  }

  const passwordField = document.querySelector('input[type="password"]');
  if (!passwordField) score += 15;

  return Math.min(score, 100);
};
