/**
 * Login Button Detector
 * 로그인 버튼 클릭 → OAuth 리다이렉트 패턴 감지
 *
 * Gemini, Perplexity 등 메인 페이지에 로그인 폼 없이
 * 로그인 버튼으로 OAuth 페이지로 이동하는 서비스 대응
 */

import { getDomain } from "../../shared/utils";
import { sendLoginDataImmediate } from "../utils/login-sender";

/**
 * 로그인 버튼 텍스트 패턴
 */
const LOGIN_BUTTON_PATTERNS = {
  en: ["sign in", "log in", "login", "get started", "try for free"],
  ko: ["로그인", "로그인하기", "시작하기", "무료로 시작"],
};

/**
 * OAuth Provider URL 패턴
 */
const OAUTH_PROVIDER_PATTERNS = [
  "accounts.google.com",
  "login.microsoftonline.com",
  "github.com/login/oauth",
  "auth.atlassian.com",
  "login.salesforce.com",
  "id.atlassian.com",
  "appleid.apple.com",
  "facebook.com/login",
  "api.twitter.com/oauth",
  "auth0.com",
  ".okta.com",
  "sso.",
];

/**
 * OAuth 버튼 타입 서비스 설정
 */
export const OAUTH_BUTTON_CONFIG: Record<
  string,
  {
    buttonSelector?: string;
    buttonText?: string[];
    expectedOAuthProvider?: string;
  }
> = {
  "gemini.google.com": {
    buttonText: ["Sign in"],
    expectedOAuthProvider: "accounts.google.com",
  },
  "bard.google.com": {
    buttonText: ["Sign in"],
    expectedOAuthProvider: "accounts.google.com",
  },
  "perplexity.ai": {
    buttonText: ["Sign in", "Log in"],
    buttonSelector: 'button[data-testid*="login"], a[href*="login"]',
  },
  "you.com": {
    buttonText: ["Sign in", "Log in"],
  },
  "huggingface.co": {
    buttonText: ["Sign In", "Log In"],
    buttonSelector: 'a[href="/login"]',
  },
  "midjourney.com": {
    buttonText: ["Sign In"],
    expectedOAuthProvider: "discord.com",
  },
};

/**
 * 로그인 버튼 찾기
 */
function findLoginButtons(): HTMLElement[] {
  const buttons: HTMLElement[] = [];
  const allPatterns = [
    ...LOGIN_BUTTON_PATTERNS.en,
    ...LOGIN_BUTTON_PATTERNS.ko,
  ];

  // 버튼과 링크 검색
  const elements = document.querySelectorAll('button, a, [role="button"]');

  for (const el of elements) {
    const element = el as HTMLElement;
    const text = (element.textContent || "").trim().toLowerCase();
    const ariaLabel = (element.getAttribute("aria-label") || "").toLowerCase();
    const href = element.getAttribute("href") || "";

    // 텍스트 또는 aria-label에 로그인 패턴 포함 여부
    const hasLoginPattern = allPatterns.some(
      (pattern) => text.includes(pattern) || ariaLabel.includes(pattern)
    );

    // href에 login/signin 포함 여부
    const hasLoginHref =
      href.includes("login") ||
      href.includes("signin") ||
      href.includes("auth");

    if (hasLoginPattern || hasLoginHref) {
      // 가시성 확인
      if (isElementVisible(element)) {
        buttons.push(element);
      }
    }
  }

  return buttons;
}

/**
 * 요소 가시성 확인
 */
function isElementVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * URL이 OAuth Provider인지 확인
 */
function isOAuthProviderUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return OAUTH_PROVIDER_PATTERNS.some((pattern) => lowerUrl.includes(pattern));
}

/**
 * OAuth 리다이렉트 감지를 위한 네비게이션 감시 설정
 */
function setupOAuthRedirectWatcher(originDomain: string): void {
  // 이미 설정된 경우 스킵
  if ((window as any).__shadeOAuthWatcher) return;
  (window as any).__shadeOAuthWatcher = true;

  console.log("[Shade] OAuth redirect watcher enabled for:", originDomain);

  // beforeunload 이벤트로 페이지 이탈 감지
  window.addEventListener("beforeunload", () => {
    // 세션 스토리지에 원본 도메인 저장
    try {
      sessionStorage.setItem(
        "__shade_oauth_origin",
        JSON.stringify({
          domain: originDomain,
          timestamp: Date.now(),
        })
      );
    } catch {
      // 스토리지 접근 실패 무시
    }
  });
}

/**
 * OAuth 콜백 페이지인지 확인
 */
function checkOAuthCallback(): boolean {
  try {
    const stored = sessionStorage.getItem("__shade_oauth_origin");
    if (!stored) return false;

    const { domain, timestamp } = JSON.parse(stored);
    const currentDomain = getDomain(window.location.href);

    // 5분 이내이고 같은 도메인으로 돌아온 경우
    if (Date.now() - timestamp < 5 * 60 * 1000 && currentDomain === domain) {
      // OAuth 성공 파라미터 확인
      const url = new URL(window.location.href);
      const hasOAuthSuccess =
        url.searchParams.has("code") ||
        url.searchParams.has("access_token") ||
        url.searchParams.has("id_token") ||
        url.hash.includes("access_token") ||
        url.hash.includes("id_token");

      if (hasOAuthSuccess) {
        console.log("[Shade] OAuth callback detected for:", domain);
        sessionStorage.removeItem("__shade_oauth_origin");
        return true;
      }
    }
  } catch {
    // 파싱 실패 무시
  }

  return false;
}

/**
 * 로그인 버튼 클릭 이벤트 리스너 설정
 */
function setupLoginButtonListeners(
  buttons: HTMLElement[],
  originDomain: string
): void {
  for (const button of buttons) {
    // 이미 리스너가 설정된 경우 스킵
    if ((button as any).__shadeLoginListener) continue;
    (button as any).__shadeLoginListener = true;

    button.addEventListener(
      "click",
      (event) => {
        console.log(
          "[Shade] Login button clicked:",
          button.textContent?.trim()
        );

        // OAuth 리다이렉트 감시 설정
        setupOAuthRedirectWatcher(originDomain);

        // 클릭 후 짧은 지연 후 URL 변화 확인
        setTimeout(() => {
          const currentUrl = window.location.href;
          if (isOAuthProviderUrl(currentUrl)) {
            console.log("[Shade] Redirected to OAuth provider");
          }
        }, 100);
      },
      { capture: true }
    );
  }
}

/**
 * 현재 페이지에 로그인 버튼이 있는지 감지하고 모니터링 설정
 */
export function detectAndMonitorLoginButtons(): {
  found: boolean;
  buttonCount: number;
  isOAuthButtonType: boolean;
} {
  const hostname = window.location.hostname;
  const domain = getDomain(window.location.href);

  // OAuth 콜백 체크
  if (checkOAuthCallback()) {
    // OAuth 성공 로그인 이벤트 전송
    sendLoginDataImmediate(domain, "", "", false, undefined);
    return { found: true, buttonCount: 0, isOAuthButtonType: true };
  }

  // OAuth 버튼 타입 서비스 설정 확인
  const config = OAUTH_BUTTON_CONFIG[hostname];

  let buttons: HTMLElement[] = [];

  if (config) {
    console.log("[Shade] OAuth button type service detected:", hostname);

    // 설정된 셀렉터로 버튼 찾기
    if (config.buttonSelector) {
      const elements = document.querySelectorAll(config.buttonSelector);
      buttons = Array.from(elements) as HTMLElement[];
    }

    // 설정된 텍스트로 버튼 찾기
    if (config.buttonText && buttons.length === 0) {
      const allElements = document.querySelectorAll(
        'button, a, [role="button"]'
      );
      for (const el of allElements) {
        const element = el as HTMLElement;
        const text = (element.textContent || "").trim().toLowerCase();

        if (config.buttonText.some((t) => text.includes(t.toLowerCase()))) {
          if (isElementVisible(element)) {
            buttons.push(element);
          }
        }
      }
    }
  } else {
    // 일반 로그인 버튼 검색
    buttons = findLoginButtons();
  }

  if (buttons.length > 0) {
    console.log(`[Shade] Found ${buttons.length} login button(s)`);
    setupLoginButtonListeners(buttons, domain);
    return {
      found: true,
      buttonCount: buttons.length,
      isOAuthButtonType: !!config,
    };
  }

  return { found: false, buttonCount: 0, isOAuthButtonType: false };
}

/**
 * OAuth Provider 페이지에서의 로그인 감지
 * accounts.google.com 등에서 직접 로그인 이벤트 감지
 */
export function detectOAuthProviderLogin(): void {
  const hostname = window.location.hostname;

  // Google OAuth
  if (hostname.includes("accounts.google.com")) {
    console.log("[Shade] On Google OAuth page");

    // 이메일 입력 필드 모니터링
    const emailInput = document.querySelector(
      'input[type="email"], #identifierId'
    ) as HTMLInputElement;
    if (emailInput) {
      console.log("[Shade] Found Google email input");
      // 이미 값이 있으면 2-step 감지
      if (emailInput.value) {
        console.log("[Shade] Google account detected (pre-filled)");
      }
    }
  }

  // Microsoft OAuth
  if (
    hostname.includes("login.microsoftonline.com") ||
    hostname.includes("login.live.com")
  ) {
    console.log("[Shade] On Microsoft OAuth page");

    const emailInput = document.querySelector(
      'input[type="email"], input[name="loginfmt"]'
    ) as HTMLInputElement;
    if (emailInput) {
      console.log("[Shade] Found Microsoft email input");
    }
  }
}
