// src/lib/services/payment/merchant-matcher.constants.ts

// 카드사/결제대행 프리픽스
export const PAYMENT_PREFIXES = [
  "PP*", // PayPal
  "PAYPAL*",
  "GOOGLE*",
  "APPLE*",
  "SQ*", // Square
  "STRIPE*",
  "PADDLE*",
  "FASTSPRING*",
];

// 국가 코드 서픽스
export const COUNTRY_CODES = [
  "US",
  "USA",
  "KR",
  "KOR",
  "JP",
  "JPN",
  "UK",
  "GB",
  "DE",
  "FR",
  "AU",
  "CA",
  "SG",
  "HK",
];

// 사업자 접미사
export const BUSINESS_SUFFIXES = [
  "INC",
  "INCORPORATED",
  "LLC",
  "LTD",
  "LIMITED",
  "CORP",
  "CORPORATION",
  "CO",
  "COMPANY",
  "GmbH",
  "AG",
  "SA",
  "PTE",
  "BV",
  "NV",
  "AS",
  "AB",
  "주식회사",
  "유한회사",
  "유한책임회사",
];

// 글로벌 SaaS 패턴 (Layer 1용)
export const GLOBAL_SAAS_PATTERNS: Array<{
  pattern: RegExp;
  appName: string;
  confidence: number;
}> = [
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
  { pattern: /CURSOR|커서/i, appName: "Cursor", confidence: 0.9 },
  {
    pattern: /ATLASSIAN|아틀라시안|JIRA|지라|CONFLUENCE|컨플루언스/i,
    appName: "Atlassian",
    confidence: 0.9,
  },
  { pattern: /JETBRAINS|젯브레인/i, appName: "JetBrains", confidence: 0.9 },
  { pattern: /VERCEL/i, appName: "Vercel", confidence: 0.9 },
  { pattern: /NETLIFY|네틀리파이/i, appName: "Netlify", confidence: 0.9 },
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
  // 디자인 & 미디어
  { pattern: /ADOBE|어도비/i, appName: "Adobe", confidence: 0.85 },
  { pattern: /CANVA|캔바/i, appName: "Canva", confidence: 0.9 },
  { pattern: /MIRO|미로/i, appName: "Miro", confidence: 0.9 },
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
  // 한국 서비스
  { pattern: /카카오\s*(워크|WORK)/i, appName: "카카오워크", confidence: 0.9 },
  { pattern: /네이버\s*(웍스|WORKS)/i, appName: "네이버웍스", confidence: 0.9 },
];
