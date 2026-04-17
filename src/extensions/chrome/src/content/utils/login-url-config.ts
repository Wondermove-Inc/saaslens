/**
 * Login URL Configuration
 * 실패한 SaaS 서비스들의 로그인 감지를 위한 설정
 */

export interface LoginConfig {
  /** 실제 로그인이 이루어지는 URL 패턴 */
  loginUrlPatterns?: string[];
  /** 로그인 폼 렌더링 대기 셀렉터 */
  waitForSelector?: string;
  /** 로그인 폼 표시를 위해 클릭해야 하는 버튼 */
  clickBeforeLogin?: string;
  /** 로그인 타입 */
  type:
    | "redirect"
    | "spa"
    | "modal"
    | "shadow-dom"
    | "oauth-button"
    | "2-step"
    | "standard";
  /** 추가 대기 시간 (ms) */
  extraWaitTime?: number;
  /** OAuth Provider (oauth-button 타입용) */
  oauthProvider?: string;
  /** 커스텀 셀렉터 */
  selectors?: {
    email?: string;
    password?: string;
    submit?: string;
  };
}

/**
 * 도메인별 로그인 설정
 * 테스트에서 실패한 15개 서비스 + 특수 케이스
 */
export const LOGIN_CONFIG: Record<string, LoginConfig> = {
  // ============================================
  // 리다이렉트 기반 로그인 (6개)
  // ============================================

  // ChatGPT - Auth0로 리다이렉트
  "chat.openai.com": {
    loginUrlPatterns: ["auth0.openai.com", "auth.openai.com"],
    waitForSelector: 'input[name="email"], input[name="username"]',
    type: "redirect",
    extraWaitTime: 3000,
    selectors: {
      email: 'input[name="email"], input[name="username"]',
      password: 'input[name="password"]',
      submit: 'button[type="submit"], button[name="action"]',
    },
  },

  // Auth0 OpenAI 도메인 직접 처리
  "auth0.openai.com": {
    waitForSelector: 'input[name="email"], input[name="username"]',
    type: "standard",
    selectors: {
      email: 'input[name="email"], input[name="username"]',
      password: 'input[name="password"]',
      submit: 'button[type="submit"]',
    },
  },

  // Auth OpenAI 도메인 (새로운 인증 URL)
  "auth.openai.com": {
    waitForSelector:
      'input[type="email"], input[name="email"], input[name="username"]',
    type: "2-step",
    extraWaitTime: 2000,
    selectors: {
      email: 'input[type="email"], input[name="email"], input[name="username"]',
      password: 'input[type="password"], input[name="password"]',
      submit: 'button[type="submit"]',
    },
  },

  // Claude - OAuth 중심, 이메일 로그인 버튼 필요
  "claude.ai": {
    clickBeforeLogin:
      'button:contains("email"), a:contains("email"), [data-testid*="email"]',
    waitForSelector: 'input[type="email"]',
    type: "modal",
    extraWaitTime: 2000,
    selectors: {
      email: 'input[type="email"]',
      submit: 'button[type="submit"]',
    },
  },

  // Okta - Sign-In Widget
  "login.okta.com": {
    waitForSelector: '#okta-sign-in, input[name="identifier"]',
    type: "redirect",
    extraWaitTime: 3000,
    selectors: {
      email:
        '#okta-signin-username, input[name="identifier"], input[name="username"]',
      password:
        '#okta-signin-password, input[name="credentials.passcode"], input[type="password"]',
      submit: '#okta-signin-submit, button[type="submit"]',
    },
  },

  // Buffer
  "login.buffer.com": {
    loginUrlPatterns: ["account.buffer.com"],
    waitForSelector: 'input[type="email"]',
    type: "redirect",
    extraWaitTime: 2000,
  },

  "account.buffer.com": {
    waitForSelector: 'input[type="email"]',
    type: "standard",
    selectors: {
      email: 'input[type="email"], input[name="email"]',
      password: 'input[type="password"]',
      submit: 'button[type="submit"]',
    },
  },

  // n8n
  "app.n8n.cloud": {
    loginUrlPatterns: ["app.n8n.cloud/signin", "app.n8n.cloud/login"],
    waitForSelector: 'input[type="email"]',
    type: "redirect",
    extraWaitTime: 2000,
    selectors: {
      email: 'input[type="email"]',
      password: 'input[type="password"]',
      submit: 'button[data-test-id="signin-button"], button[type="submit"]',
    },
  },

  // DataRobot
  "app.datarobot.com": {
    waitForSelector: 'input[name="email"], input[type="email"], #email',
    type: "redirect",
    extraWaitTime: 3000,
    selectors: {
      email: 'input[name="email"], #email, input[type="email"]',
      password: 'input[name="password"], #password, input[type="password"]',
      submit: 'button[type="submit"]',
    },
  },

  // ============================================
  // 동적 SPA 로딩 (5개)
  // ============================================

  // Zendesk
  "www.zendesk.com": {
    waitForSelector: 'input[type="email"], input[name="email"]',
    type: "spa",
    extraWaitTime: 5000,
    selectors: {
      email: 'input[type="email"], input[name="email"]',
      password: 'input[type="password"], input[name="password"]',
      submit: 'button[type="submit"], input[type="submit"]',
    },
  },

  // Copy.AI
  "app.copy.ai": {
    waitForSelector: 'input[type="email"]',
    type: "spa",
    extraWaitTime: 4000,
    selectors: {
      email: 'input[type="email"], input[placeholder*="email" i]',
      password: 'input[type="password"]',
    },
  },

  // Consensus
  "consensus.app": {
    clickBeforeLogin:
      'button:contains("Sign in"), a:contains("Sign in"), [data-testid*="signin"]',
    waitForSelector: 'input[type="email"]',
    type: "spa",
    extraWaitTime: 3000,
  },

  // Pitch
  "app.pitch.com": {
    waitForSelector: 'input[type="email"]',
    type: "spa",
    extraWaitTime: 4000,
    selectors: {
      email: 'input[type="email"]',
      password: 'input[type="password"]',
      submit: 'button[type="submit"]',
    },
  },

  // Drift
  "app.drift.com": {
    waitForSelector: 'input[type="email"], input[formcontrolname="email"]',
    type: "spa",
    extraWaitTime: 4000,
    selectors: {
      email: 'input[type="email"], input[formcontrolname="email"]',
      password: 'input[type="password"], input[formcontrolname="password"]',
      submit: 'button[type="submit"]',
    },
  },

  // ============================================
  // 모달/팝업 기반 (3개)
  // ============================================

  // Gamma
  "gamma.app": {
    clickBeforeLogin:
      'button:contains("Sign in"), a:contains("Sign in"), [data-testid*="signin"]',
    waitForSelector:
      '[role="dialog"] input[type="email"], .modal input[type="email"]',
    type: "modal",
    extraWaitTime: 2000,
    selectors: {
      email: 'input[type="email"]',
    },
  },

  // Tome
  "tome.app": {
    clickBeforeLogin:
      'button:contains("Log in"), a:contains("Log in"), [data-testid*="login"]',
    waitForSelector: 'input[type="email"]',
    type: "modal",
    extraWaitTime: 2000,
  },

  // Ideogram
  "ideogram.ai": {
    clickBeforeLogin:
      'button:contains("Sign in"), a:contains("Sign in"),[data-testid*="signin"]',
    waitForSelector: '[role="dialog"], .modal',
    type: "modal",
    extraWaitTime: 2000,
  },

  // ============================================
  // Shadow DOM (2개)
  // ============================================

  // Vercel v0
  "v0.dev": {
    waitForSelector: 'input[type="email"]',
    type: "shadow-dom",
    extraWaitTime: 3000,
  },

  // Cursor - Shadow DOM 기반 로그인
  "cursor.sh": {
    waitForSelector: 'input[type="email"], input[name="email"]',
    type: "shadow-dom",
    extraWaitTime: 3000,
    selectors: {
      email: 'input[type="email"], input[name="email"]',
      password: 'input[type="password"]',
      submit: 'button[type="submit"]',
    },
  },

  "cursor.com": {
    waitForSelector: 'input[type="email"], input[name="email"]',
    type: "shadow-dom",
    extraWaitTime: 3000,
    selectors: {
      email: 'input[type="email"], input[name="email"]',
      password: 'input[type="password"]',
      submit: 'button[type="submit"]',
    },
  },

  // ============================================
  // OAuth 버튼 → 리다이렉트 (3개)
  // ============================================

  // Gemini - Google OAuth만 지원
  "gemini.google.com": {
    clickBeforeLogin: 'a[href*="signin"], button:contains("Sign in")',
    type: "oauth-button",
    oauthProvider: "accounts.google.com",
    extraWaitTime: 2000,
  },

  "bard.google.com": {
    clickBeforeLogin: 'a[href*="signin"], button:contains("Sign in")',
    type: "oauth-button",
    oauthProvider: "accounts.google.com",
    extraWaitTime: 2000,
  },

  // Perplexity
  "www.perplexity.ai": {
    clickBeforeLogin: 'button:contains("Sign in"), a:contains("Sign in")',
    type: "oauth-button",
    extraWaitTime: 2000,
  },

  // ============================================
  // 2-Step 로그인 (2개)
  // ============================================

  // Microsoft - 이메일 → 비밀번호 2단계
  "login.live.com": {
    waitForSelector: 'input[type="email"], input[name="loginfmt"]',
    type: "2-step",
    extraWaitTime: 2000,
    selectors: {
      email: 'input[type="email"], input[name="loginfmt"]',
      password: 'input[type="password"], input[name="passwd"]',
      submit: 'input[type="submit"], button[type="submit"]',
    },
  },

  "login.microsoftonline.com": {
    waitForSelector: 'input[type="email"], input[name="loginfmt"]',
    type: "2-step",
    extraWaitTime: 2000,
    selectors: {
      email: 'input[type="email"], input[name="loginfmt"]',
      password: 'input[type="password"], input[name="passwd"]',
      submit: 'input[type="submit"], button[type="submit"]',
    },
  },

  // GitHub - 일반 로그인 폼 (Shadow DOM 아님)
  "github.com": {
    waitForSelector: 'input[name="login"], input[id="login_field"]',
    type: "standard",
    extraWaitTime: 1000,
    selectors: {
      email: 'input[name="login"], input[id="login_field"]',
      password: 'input[name="password"], input[id="password"]',
      submit: 'input[type="submit"], button[type="submit"]',
    },
  },
};

/**
 * 현재 도메인의 로그인 설정 가져오기
 */
export function getLoginConfig(hostname: string): LoginConfig | null {
  // 정확한 매칭
  if (LOGIN_CONFIG[hostname]) {
    return LOGIN_CONFIG[hostname];
  }

  // www 제거 후 매칭
  const withoutWww = hostname.replace(/^www\./, "");
  if (LOGIN_CONFIG[withoutWww]) {
    return LOGIN_CONFIG[withoutWww];
  }

  // 서브도메인 패턴 매칭 (예: *.okta.com)
  const parts = hostname.split(".");
  if (parts.length >= 3) {
    // tenant.okta.com -> okta.com 체크
    const baseDomain = parts.slice(-2).join(".");
    if (hostname.includes(".okta.") || hostname.endsWith(".okta.com")) {
      return LOGIN_CONFIG["login.okta.com"];
    }
  }

  return null;
}

/**
 * 리다이렉트 URL인지 확인
 */
export function isRedirectLoginUrl(url: string): boolean {
  const hostname = new URL(url).hostname;

  for (const config of Object.values(LOGIN_CONFIG)) {
    if (config.loginUrlPatterns) {
      for (const pattern of config.loginUrlPatterns) {
        if (hostname.includes(pattern) || url.includes(pattern)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * 모든 설정된 도메인 목록
 */
export function getAllConfiguredDomains(): string[] {
  return Object.keys(LOGIN_CONFIG);
}
