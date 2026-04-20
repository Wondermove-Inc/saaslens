/**
 * Enhanced Form Detector
 * 실패한 SaaS들의 로그인 폼 감지를 위한 향상된 로직
 */

import { getLoginConfig, LoginConfig } from "./login-url-config";
import { deepQuerySelector, deepQuerySelectorAll } from "./shadow-dom";

// 텍스트 기반 셀렉터를 위한 헬퍼 (contains 미지원 대체)
function findElementByText(
  text: string,
  tagNames: string[] = ["button", "a"]
): HTMLElement | null {
  const lowerText = text.toLowerCase();

  for (const tagName of tagNames) {
    const elements = document.querySelectorAll(tagName);
    for (const el of elements) {
      const elementText = (el.textContent || "").toLowerCase();
      if (elementText.includes(lowerText)) {
        return el as HTMLElement;
      }
    }
  }

  return null;
}

/**
 * 요소가 나타날 때까지 대기
 */
async function waitForElement(
  selector: string,
  timeout: number = 10000,
  root: Document | ShadowRoot = document
): Promise<HTMLElement | null> {
  const startTime = Date.now();
  const checkInterval = 500;

  while (Date.now() - startTime < timeout) {
    // 일반 DOM 검색
    let element = root.querySelector(selector) as HTMLElement;
    if (element) return element;

    // Shadow DOM 검색
    element = deepQuerySelector(selector, root as Document) as HTMLElement;
    if (element) return element;

    // 대기
    await new Promise((resolve) => setTimeout(resolve, checkInterval));
  }

  return null;
}

/**
 * 모달 트리거 버튼 클릭
 */
async function clickLoginTrigger(config: LoginConfig): Promise<boolean> {
  if (!config.clickBeforeLogin) return false;

  // :contains() 같은 비표준 셀렉터 처리
  const selectors = config.clickBeforeLogin.split(",").map((s) => s.trim());

  for (const selector of selectors) {
    let element: HTMLElement | null = null;

    // 텍스트 기반 셀렉터 처리
    if (selector.includes(":contains(")) {
      const match = selector.match(/:contains\(["']?(.+?)["']?\)/);
      if (match) {
        const text = match[1];
        const tagMatch = selector.match(/^(\w+):/);
        const tags = tagMatch ? [tagMatch[1]] : ["button", "a"];
        element = findElementByText(text, tags);
      }
    } else {
      // 표준 셀렉터
      element = document.querySelector(selector) as HTMLElement;
    }

    if (element && element.offsetParent !== null) {
      console.log("[Shade] Clicking login trigger:", selector);
      element.click();
      // 모달 렌더링 대기
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return true;
    }
  }

  return false;
}

/**
 * 향상된 로그인 폼 감지
 */
export async function detectLoginFormEnhanced(): Promise<{
  found: boolean;
  type: string;
  fields: {
    email?: HTMLInputElement;
    password?: HTMLInputElement;
    submit?: HTMLElement;
  };
}> {
  const hostname = window.location.hostname;
  const config = getLoginConfig(hostname);

  console.log(
    "[Shade] Enhanced detection for:",
    hostname,
    config ? `(type: ${config.type})` : "(no config)"
  );

  const result = {
    found: false,
    type: "standard",
    fields: {} as {
      email?: HTMLInputElement;
      password?: HTMLInputElement;
      submit?: HTMLElement;
    },
  };

  // 설정이 있는 경우 향상된 감지 수행
  if (config) {
    result.type = config.type;

    // 1. 모달 트리거 클릭 필요한 경우
    if (config.clickBeforeLogin) {
      const clicked = await clickLoginTrigger(config);
      console.log("[Shade] Login trigger clicked:", clicked);
    }

    // 2. 추가 대기 시간
    if (config.extraWaitTime) {
      console.log("[Shade] Extra wait time:", config.extraWaitTime);
      await new Promise((resolve) => setTimeout(resolve, config.extraWaitTime));
    }

    // 3. 특정 셀렉터 대기
    if (config.waitForSelector) {
      console.log("[Shade] Waiting for selector:", config.waitForSelector);
      const element = await waitForElement(config.waitForSelector, 10000);
      if (element) {
        console.log("[Shade] Wait selector found");
      }
    }

    // 4. Shadow DOM 타입인 경우 깊은 탐색
    if (config.type === "shadow-dom") {
      return detectInShadowDOM(config);
    }

    // 5. 커스텀 셀렉터로 필드 찾기
    if (config.selectors) {
      if (config.selectors.email) {
        result.fields.email = document.querySelector(
          config.selectors.email
        ) as HTMLInputElement;
      }
      if (config.selectors.password) {
        result.fields.password = document.querySelector(
          config.selectors.password
        ) as HTMLInputElement;
      }
      if (config.selectors.submit) {
        result.fields.submit = document.querySelector(
          config.selectors.submit
        ) as HTMLElement;
      }
    }
  }

  // 설정이 없거나 커스텀 셀렉터로 못 찾은 경우 일반 감지
  if (!result.fields.email) {
    result.fields.email = findEmailField();
  }
  if (!result.fields.password) {
    result.fields.password = findPasswordField();
  }
  if (!result.fields.submit) {
    result.fields.submit = findSubmitButton();
  }

  result.found = !!(result.fields.email || result.fields.password);

  console.log("[Shade] Enhanced detection result:", {
    found: result.found,
    type: result.type,
    hasEmail: !!result.fields.email,
    hasPassword: !!result.fields.password,
  });

  return result;
}

/**
 * Shadow DOM 내 로그인 폼 감지
 */
async function detectInShadowDOM(config: LoginConfig): Promise<{
  found: boolean;
  type: string;
  fields: {
    email?: HTMLInputElement;
    password?: HTMLInputElement;
    submit?: HTMLElement;
  };
}> {
  const result = {
    found: false,
    type: "shadow-dom",
    fields: {} as {
      email?: HTMLInputElement;
      password?: HTMLInputElement;
      submit?: HTMLElement;
    },
  };

  // 이메일 필드 찾기
  const emailSelectors = [
    'input[type="email"]',
    'input[name="email"]',
    'input[autocomplete="email"]',
    'input[autocomplete="username"]',
  ];

  for (const selector of emailSelectors) {
    const element = deepQuerySelector(selector) as HTMLInputElement;
    if (element) {
      result.fields.email = element;
      break;
    }
  }

  // 비밀번호 필드 찾기
  const passwordSelectors = [
    'input[type="password"]',
    'input[name="password"]',
    'input[autocomplete="current-password"]',
  ];

  for (const selector of passwordSelectors) {
    const element = deepQuerySelector(selector) as HTMLInputElement;
    if (element) {
      result.fields.password = element;
      break;
    }
  }

  // 제출 버튼 찾기
  const submitSelectors = [
    'button[type="submit"]',
    'input[type="submit"]',
    'button:contains("Sign in")',
    'button:contains("Log in")',
  ];

  for (const selector of submitSelectors) {
    if (selector.includes(":contains(")) {
      // Shadow DOM 내 텍스트 기반 검색
      const buttons = deepQuerySelectorAll("button");
      const match = selector.match(/:contains\(["']?(.+?)["']?\)/);
      if (match) {
        const text = match[1].toLowerCase();
        for (const btn of buttons) {
          if ((btn.textContent || "").toLowerCase().includes(text)) {
            result.fields.submit = btn as HTMLElement;
            break;
          }
        }
      }
    } else {
      const element = deepQuerySelector(selector) as HTMLElement;
      if (element) {
        result.fields.submit = element;
        break;
      }
    }
    if (result.fields.submit) break;
  }

  result.found = !!(result.fields.email || result.fields.password);
  return result;
}

/**
 * 이메일/사용자명 필드 찾기
 */
function findEmailField(): HTMLInputElement | undefined {
  const selectors = [
    'input[type="email"]',
    'input[name="email"]',
    'input[name="username"]',
    'input[name="identifier"]',
    'input[autocomplete="email"]',
    'input[autocomplete="username"]',
    'input[id*="email" i]',
    'input[id*="user" i]',
    'input[placeholder*="email" i]',
    'input[placeholder*="이메일" i]',
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector) as HTMLInputElement;
    if (element && isVisible(element)) {
      return element;
    }
  }

  return undefined;
}

/**
 * 비밀번호 필드 찾기
 */
function findPasswordField(): HTMLInputElement | undefined {
  const element = document.querySelector(
    'input[type="password"]'
  ) as HTMLInputElement;
  if (element && isVisible(element)) {
    return element;
  }
  return undefined;
}

/**
 * 제출 버튼 찾기
 */
function findSubmitButton(): HTMLElement | undefined {
  const selectors = [
    'button[type="submit"]',
    'input[type="submit"]',
    'button[name="submit"]',
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector) as HTMLElement;
    if (element && isVisible(element)) {
      return element;
    }
  }

  // 텍스트 기반 검색
  const buttonTexts = [
    "Sign in",
    "Log in",
    "Login",
    "Submit",
    "로그인",
    "로그인하기",
  ];
  const buttons = document.querySelectorAll("button");

  for (const btn of buttons) {
    const text = (btn.textContent || "").trim().toLowerCase();
    for (const searchText of buttonTexts) {
      if (text.includes(searchText.toLowerCase())) {
        if (isVisible(btn as HTMLElement)) {
          return btn as HTMLElement;
        }
      }
    }
  }

  return undefined;
}

/**
 * 요소 가시성 확인
 */
function isVisible(element: HTMLElement): boolean {
  if (!element) return false;

  const style = window.getComputedStyle(element);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.opacity === "0"
  ) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * 동적 폼 로딩 감지 및 재시도
 */
export function setupDynamicFormObserver(callback: () => void): void {
  // 폼이나 입력 필드가 추가되면 콜백 실행
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            // 폼이나 입력 필드가 추가되었는지 확인
            if (
              node.tagName === "FORM" ||
              node.tagName === "INPUT" ||
              node.querySelector("form") ||
              node.querySelector('input[type="password"]') ||
              node.querySelector('input[type="email"]')
            ) {
              console.log("[Shade] Dynamic form detected");
              callback();
              return;
            }
          }
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // 10초 후 자동 해제
  setTimeout(() => {
    observer.disconnect();
  }, 10000);
}
