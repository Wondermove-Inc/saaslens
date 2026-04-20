/**
 * SaaS 서비스 매칭 로직
 * 카드 거래 가맹점명을 SaaS 앱과 매칭
 */

import type { ApprovalItem, PurchaseItem } from "./types";

/** App의 필수 필드만 정의 (매칭에 필요한 최소 정보) */
export type AppForMatching = { id: string; name: string };

/** 매칭 결과 */
export interface MatchResult {
  appId: string | null;
  appName: string | null;
  confidence: number;
  matchedBy: "pattern" | "bizNo" | "exact" | null;
}

/** SaaS 벤더 패턴 */
interface SaaSPattern {
  pattern: RegExp;
  appName: string;
  confidence: number;
}

/**
 * 글로벌 SaaS 패턴 (기본 제공)
 * 가맹점명에서 SaaS 서비스를 식별하기 위한 패턴
 */
const GLOBAL_SAAS_PATTERNS: SaaSPattern[] = [
  // 클라우드 & 인프라
  { pattern: /AWS|AMAZON\s*WEB\s*SERVICES/i, appName: "AWS", confidence: 0.95 },
  {
    pattern: /GOOGLE\s*(CLOUD|GCP)|GCP/i,
    appName: "Google Cloud",
    confidence: 0.95,
  },
  {
    pattern: /MICROSOFT\s*AZURE|AZURE/i,
    appName: "Microsoft Azure",
    confidence: 0.95,
  },

  // 협업 & 생산성
  {
    pattern: /GOOGLE\s*(WORKSPACE|APPS)/i,
    appName: "Google Workspace",
    confidence: 0.95,
  },
  {
    pattern: /MICROSOFT\s*365|M365|OFFICE\s*365/i,
    appName: "Microsoft 365",
    confidence: 0.95,
  },
  { pattern: /SLACK|슬랙/i, appName: "Slack", confidence: 0.9 },
  { pattern: /NOTION|노션/i, appName: "Notion", confidence: 0.9 },
  { pattern: /FIGMA|피그마/i, appName: "Figma", confidence: 0.9 },
  { pattern: /ZOOM|줌/i, appName: "Zoom", confidence: 0.85 },
  { pattern: /DROPBOX|드롭박스/i, appName: "Dropbox", confidence: 0.9 },

  // 개발 도구
  { pattern: /GITHUB|깃허브/i, appName: "GitHub", confidence: 0.9 },
  { pattern: /GITLAB|깃랩/i, appName: "GitLab", confidence: 0.9 },
  {
    pattern: /ATLASSIAN|아틀라시안|JIRA|지라|CONFLUENCE|컨플루언스/i,
    appName: "Atlassian",
    confidence: 0.9,
  },
  { pattern: /JETBRAINS|젯브레인/i, appName: "JetBrains", confidence: 0.9 },
  { pattern: /VERCEL/i, appName: "Vercel", confidence: 0.9 },
  { pattern: /NETLIFY|네틀리파이/i, appName: "Netlify", confidence: 0.9 },
  { pattern: /HEROKU|헤로쿠/i, appName: "Heroku", confidence: 0.9 },
  { pattern: /DATADOG/i, appName: "Datadog", confidence: 0.9 },

  // CRM & 마케팅
  {
    pattern: /SALESFORCE|세일즈포스/i,
    appName: "Salesforce",
    confidence: 0.95,
  },
  { pattern: /HUBSPOT|허브스팟/i, appName: "HubSpot", confidence: 0.9 },
  { pattern: /ZENDESK|젠데스크/i, appName: "Zendesk", confidence: 0.9 },
  { pattern: /INTERCOM|인터콤/i, appName: "Intercom", confidence: 0.9 },
  { pattern: /MAILCHIMP|메일침프/i, appName: "Mailchimp", confidence: 0.9 },
  { pattern: /SENDGRID/i, appName: "SendGrid", confidence: 0.9 },

  // 디자인 & 미디어
  { pattern: /ADOBE|어도비/i, appName: "Adobe", confidence: 0.85 },
  { pattern: /CANVA|캔바/i, appName: "Canva", confidence: 0.9 },
  { pattern: /MIRO|미로/i, appName: "Miro", confidence: 0.9 },

  // 통신 & 메시징
  { pattern: /TWILIO/i, appName: "Twilio", confidence: 0.9 },

  // 보안 & 인증
  { pattern: /OKTA|옥타/i, appName: "Okta", confidence: 0.9 },
  { pattern: /AUTH0/i, appName: "Auth0", confidence: 0.9 },

  // 데이터 & 분석
  {
    pattern: /SNOWFLAKE|스노우플레이크/i,
    appName: "Snowflake",
    confidence: 0.9,
  },
  { pattern: /TABLEAU|태블로/i, appName: "Tableau", confidence: 0.9 },
  { pattern: /LOOKER/i, appName: "Looker", confidence: 0.9 },

  // 한국 서비스
  { pattern: /카카오\s*(워크|WORK)/i, appName: "카카오워크", confidence: 0.9 },
  { pattern: /네이버\s*(웍스|WORKS)/i, appName: "네이버웍스", confidence: 0.9 },
  {
    pattern: /토스\s*(페이먼츠|PAYMENTS)/i,
    appName: "토스페이먼츠",
    confidence: 0.9,
  },
];

/**
 * 카드 거래를 SaaS 앱과 매칭
 * @param transaction 거래 내역
 * @param apps 조직의 등록된 앱 목록
 * @param customPatterns 조직별 커스텀 패턴 (선택)
 */
export function matchTransactionToApp(
  transaction: ApprovalItem | PurchaseItem,
  apps: AppForMatching[],
  customPatterns?: { pattern: string; appId: string }[]
): MatchResult {
  const merchantName = transaction.useStore;

  // 1. 커스텀 패턴으로 매칭 (가장 높은 우선순위)
  if (customPatterns) {
    for (const { pattern, appId } of customPatterns) {
      const regex = new RegExp(pattern, "i");
      if (regex.test(merchantName)) {
        const app = apps.find((a) => a.id === appId);
        if (app) {
          return {
            appId: app.id,
            appName: app.name,
            confidence: 1.0,
            matchedBy: "pattern",
          };
        }
      }
    }
  }

  // 2. 앱 이름으로 정확히 매칭
  for (const app of apps) {
    if (merchantName.toLowerCase().includes(app.name.toLowerCase())) {
      return {
        appId: app.id,
        appName: app.name,
        confidence: 0.85,
        matchedBy: "exact",
      };
    }
  }

  // 3. 글로벌 SaaS 패턴으로 매칭
  for (const { pattern, appName, confidence } of GLOBAL_SAAS_PATTERNS) {
    if (pattern.test(merchantName)) {
      // 매칭된 패턴명으로 앱 찾기
      const app = apps.find(
        (a) => a.name.toLowerCase() === appName.toLowerCase()
      );
      if (app) {
        return {
          appId: app.id,
          appName: app.name,
          confidence,
          matchedBy: "pattern",
        };
      }
      // 앱이 없어도 SaaS로 인식됨을 알림
      return {
        appId: null,
        appName: appName,
        confidence,
        matchedBy: "pattern",
      };
    }
  }

  // 매칭 실패
  return {
    appId: null,
    appName: null,
    confidence: 0,
    matchedBy: null,
  };
}

/**
 * 여러 거래를 일괄 매칭
 * @param transactions 거래 내역 목록
 * @param apps 조직의 등록된 앱 목록
 * @param customPatterns 커스텀 패턴
 */
export function batchMatchTransactions(
  transactions: (ApprovalItem | PurchaseItem)[],
  apps: AppForMatching[],
  customPatterns?: { pattern: string; appId: string }[]
): Map<string, MatchResult> {
  const results = new Map<string, MatchResult>();

  for (const transaction of transactions) {
    const key = `${transaction.apprNo}_${transaction.useDt}`;
    const result = matchTransactionToApp(transaction, apps, customPatterns);
    results.set(key, result);
  }

  return results;
}

/**
 * 거래 내역에서 SaaS 후보 추출
 * (앱으로 등록되지 않은 SaaS 발견용)
 */
export function extractSaaSCandidates(
  transactions: (ApprovalItem | PurchaseItem)[]
): { name: string; count: number; totalAmount: number }[] {
  const candidates = new Map<string, { count: number; totalAmount: number }>();

  for (const transaction of transactions) {
    const merchantName = transaction.useStore;

    // 글로벌 패턴과 매칭되는지 확인
    for (const { pattern, appName } of GLOBAL_SAAS_PATTERNS) {
      if (pattern.test(merchantName)) {
        const existing = candidates.get(appName) || {
          count: 0,
          totalAmount: 0,
        };
        existing.count += 1;
        existing.totalAmount += parseInt(transaction.useAmt) || 0;
        candidates.set(appName, existing);
        break;
      }
    }
  }

  return Array.from(candidates.entries())
    .map(([name, data]) => ({
      name,
      count: data.count,
      totalAmount: data.totalAmount,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);
}
