// src/lib/services/saas-classifier.utils.ts
/**
 * SaaS Classifier 유틸리티 함수
 */

import type {
  BatchInferenceResult,
  BatchMerchantInput,
  SaaSInferenceInput,
  SaaSInferenceResult,
  SaaSInferenceUsage,
} from "./saas-classifier.types";

export function truncate(
  input: string | undefined | null,
  max = 400
): string | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  return trimmed.length > max ? `${trimmed.slice(0, max)}...` : trimmed;
}

export function sanitizeText(
  input: string | undefined | null
): string | undefined {
  if (!input) return undefined;
  // 카드번호/긴 숫자/이메일/URL은 제거하거나 마스킹
  let sanitized = input
    .replace(/\b\d{10,}\b/g, "[redacted-number]")
    .replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      "[redacted-email]"
    )
    .replace(/https?:\/\/\S+/gi, "[redacted-url]")
    .replace(/\s+/g, " ")
    .trim();

  // 제어문자 제거
  sanitized = sanitized.replace(/[\u0000-\u001F\u007F]/g, "");
  return sanitized || undefined;
}

export function buildCacheKey(input: SaaSInferenceInput): string {
  return JSON.stringify({
    merchantName: input.merchantName.trim().toLowerCase(),
    memo: input.memo?.trim().toLowerCase(),
    storeBizNo: input.storeBizNo,
    amount: input.amount,
    currency: input.currency,
  });
}

// Well-known SaaS list for LLM prompt hints
const KNOWN_SAAS_LIST = [
  // Cloud & Infrastructure
  "AWS",
  "Google Cloud",
  "Microsoft Azure",
  "Vercel",
  "Netlify",
  "Heroku",
  "DigitalOcean",
  "Cloudflare",
  "Supabase",
  "MongoDB Atlas",
  "PlanetScale",
  // Collaboration & Productivity
  "Slack",
  "Notion",
  "Google Workspace",
  "Microsoft 365",
  "Zoom",
  "Dropbox",
  "Asana",
  "Monday.com",
  "ClickUp",
  "Trello",
  "Airtable",
  "Linear",
  // Development Tools
  "GitHub",
  "GitLab",
  "Bitbucket",
  "Atlassian (Jira/Confluence)",
  "JetBrains",
  "Cursor",
  "Datadog",
  "New Relic",
  "Sentry",
  "CircleCI",
  "Docker Hub",
  // CRM & Marketing
  "Salesforce",
  "HubSpot",
  "Zendesk",
  "Intercom",
  "Mailchimp",
  "SendGrid",
  "Twilio",
  "Stripe",
  "Paddle",
  // Design & Media
  "Figma",
  "Adobe Creative Cloud",
  "Canva",
  "Miro",
  "Loom",
  "Vidyard",
  // AI Services
  "OpenAI",
  "Anthropic",
  "Midjourney",
  "Stability AI",
  "Perplexity",
  "Jasper AI",
  "Copy.ai",
  // Security & Identity
  "Okta",
  "Auth0",
  "1Password",
  "LastPass",
  "Dashlane",
  "CrowdStrike",
  "Snyk",
  // Data & Analytics
  "Snowflake",
  "Tableau",
  "Looker",
  "Mixpanel",
  "Amplitude",
  "Segment",
  // Korean SaaS
  "카카오워크",
  "네이버웍스",
  "채널톡",
  "Toss Payments",
];

// Standard category values used in UI dropdown — LLM should prefer these
const STANDARD_CATEGORIES = [
  "collaboration",
  "design",
  "ai",
  "productivity",
  "development",
  "marketing",
  "analytics",
  "security",
  "finance",
  "hr",
];

export function buildPrompt(input: SaaSInferenceInput): string {
  const lines = [
    "You are a SaaS payment classifier. Classify if a merchant is a SaaS (Software as a Service) product.",
    "",
    "Guidelines:",
    "- Use your knowledge about well-known SaaS companies and cloud services",
    "- SaaS includes: cloud software, subscription services, developer tools, AI APIs, cloud infrastructure (IaaS/PaaS)",
    "- If the merchant name matches or closely resembles a known SaaS company, classify as isSaaS: true with high confidence",
    "- Only set isSaaS: false if you're confident it's NOT a software service (e.g., retail, restaurant, physical goods)",
    "",
    "Standard categories (use one of these for the category field when possible):",
    STANDARD_CATEGORIES.join(", "),
    "",
    "Known SaaS companies (reference list, not exhaustive):",
    KNOWN_SAAS_LIST.join(", "),
    "",
    "Input data:",
    `- Merchant name: ${input.merchantName}`,
    input.memo
      ? `- Memo/description: ${input.memo}`
      : "- Memo/description: (none)",
    input.storeBizNo
      ? `- Business ID: ${input.storeBizNo}`
      : "- Business ID: (none)",
    input.amount ? `- Amount: ${input.amount}` : "- Amount: (none)",
    input.currency ? `- Currency: ${input.currency}` : "- Currency: (none)",
    "",
    "Output JSON schema:",
    '{ "isSaaS": boolean, "canonicalName": string|null, "website": string|null, "category": string|null, "confidence": number (0-1), "suggestedPatterns": [string], "reasoning": string, "pricingModel": "PER_SEAT"|"FLAT_RATE"|"USAGE_BASED"|null }',
    "",
    "pricingModel guide:",
    "- PER_SEAT: charged per user/seat (Slack, Notion, Figma, GitHub, Jira, etc.)",
    "- FLAT_RATE: fixed monthly/annual fee regardless of users",
    "- USAGE_BASED: charged by consumption (AWS, Vercel, OpenAI, Twilio, etc.)",
    "- null: if unsure about the pricing model",
    "",
    "Return ONLY the JSON object, nothing else.",
  ];

  return lines.join("\n");
}

export function parseJsonFromResponse(
  content: string
): SaaSInferenceResult | null {
  const jsonStart = content.indexOf("{");
  const jsonEnd = content.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) return null;
  const jsonText = content.slice(jsonStart, jsonEnd + 1);
  const parsed = JSON.parse(jsonText);
  const validPricingModels = ["PER_SEAT", "FLAT_RATE", "USAGE_BASED"];
  const rawPricing = parsed.pricingModel;
  const pricingModel =
    typeof rawPricing === "string" && validPricingModels.includes(rawPricing)
      ? (rawPricing as "PER_SEAT" | "FLAT_RATE" | "USAGE_BASED")
      : null;

  return {
    isSaaS: Boolean(parsed.isSaaS),
    canonicalName: parsed.canonicalName ?? null,
    website: parsed.website ?? null,
    category: parsed.category ?? null,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
    suggestedPatterns: Array.isArray(parsed.suggestedPatterns)
      ? parsed.suggestedPatterns.filter((v: unknown) => typeof v === "string")
      : [],
    reasoning:
      typeof parsed.reasoning === "string" ? parsed.reasoning : undefined,
    pricingModel,
  };
}

export function parseUsage(data: unknown): SaaSInferenceUsage | undefined {
  if (!data || typeof data !== "object") return undefined;
  const usage = (
    data as {
      usage?: {
        input_tokens?: number;
        output_tokens?: number;
      };
    }
  ).usage;
  if (!usage) return undefined;
  const promptTokens =
    typeof usage.input_tokens === "number" ? usage.input_tokens : undefined;
  const completionTokens =
    typeof usage.output_tokens === "number" ? usage.output_tokens : undefined;
  const totalTokens =
    promptTokens !== undefined || completionTokens !== undefined
      ? (promptTokens ?? 0) + (completionTokens ?? 0)
      : undefined;
  if (promptTokens === undefined && completionTokens === undefined) {
    return undefined;
  }
  return { promptTokens, completionTokens, totalTokens };
}

export function parseErrorCode(data: unknown, status: number): string {
  if (data && typeof data === "object" && "error" in data) {
    const err = (
      data as { error?: { type?: string; code?: string; message?: string } }
    ).error;
    const fromType = err?.type || err?.code;
    if (fromType) return fromType;
    if (err?.message && /context[_ ]?length/i.test(err.message))
      return "context_length_exceeded";
    if (err?.message && /rate limit/i.test(err.message)) return "rate_limit";
    if (err?.message && /overloaded/i.test(err.message)) return "overloaded";
  }
  return `http_${status}`;
}

export function buildBatchPrompt(merchants: BatchMerchantInput[]): string {
  const lines = [
    "You are a SaaS payment classifier. Classify the following merchant transactions as SaaS or non-SaaS.",
    "",
    "Guidelines:",
    "- Use your knowledge about well-known SaaS companies and cloud services",
    "- SaaS includes: cloud software, subscription services, developer tools, AI APIs, cloud infrastructure (IaaS/PaaS)",
    "- If the merchant name matches or closely resembles a known SaaS company, classify as isSaaS: true",
    "- Only set isSaaS: false if confident it's NOT a software service",
    "",
    "Standard categories (use one of these for the category field when possible):",
    STANDARD_CATEGORIES.join(", "),
    "",
    "Known SaaS companies (reference list, not exhaustive):",
    KNOWN_SAAS_LIST.join(", "),
    "",
    "Transactions to classify:",
    "",
  ];

  merchants.forEach((m, idx) => {
    lines.push(
      `${idx + 1}. [id: ${m.id}] "${m.merchantName}"${m.memo ? ` - memo: "${m.memo}"` : ""}${m.amount ? ` - amount: ${m.amount}` : ""}${m.recurrenceHint ? ` - recurrence: ${m.recurrenceHint}` : ""}`
    );
  });

  lines.push("");
  lines.push("Respond with a JSON array. Each element must have:");
  lines.push(
    '{ "id": string, "isSaaS": boolean, "canonicalName": string|null, "website": string|null, "category": string|null, "confidence": number (0-1), "suggestedPatterns": [string], "reasoning": string, "pricingModel": "PER_SEAT"|"FLAT_RATE"|"USAGE_BASED"|null }'
  );
  lines.push("");
  lines.push(
    "pricingModel: PER_SEAT (per user/seat), FLAT_RATE (fixed fee), USAGE_BASED (consumption-based), null (unsure)"
  );
  lines.push("");
  lines.push("Return ONLY the JSON array, nothing else.");

  return lines.join("\n");
}

/**
 * 잘린 JSON 배열 복구 시도
 * LLM 응답이 max_tokens로 잘린 경우, 마지막 완전한 객체까지만 파싱
 */
function repairTruncatedJsonArray(jsonText: string): unknown[] | null {
  // 마지막 완전한 '}' 찾기 → 그 뒤를 잘라서 ']' 추가
  let depth = 0;
  let lastCompleteObjEnd = -1;

  for (let i = 0; i < jsonText.length; i++) {
    const ch = jsonText[i];
    if (ch === '"') {
      // 문자열 스킵
      i++;
      while (i < jsonText.length) {
        if (jsonText[i] === "\\") {
          i++;
        } else if (jsonText[i] === '"') {
          break;
        }
        i++;
      }
      continue;
    }
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) lastCompleteObjEnd = i;
    }
  }

  if (lastCompleteObjEnd <= 0) return null;

  const repaired = jsonText.slice(0, lastCompleteObjEnd + 1) + "]";
  try {
    const parsed = JSON.parse(repaired);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* repair 실패 */
  }
  return null;
}

export function parseJsonArrayFromResponse(
  content: string
): BatchInferenceResult[] {
  const jsonStart = content.indexOf("[");
  const jsonEnd = content.lastIndexOf("]");
  if (jsonStart === -1) return [];

  const jsonText =
    jsonEnd === -1
      ? content.slice(jsonStart) // ']'가 없으면 잘린 응답
      : content.slice(jsonStart, jsonEnd + 1);

  let parsed: unknown[];
  try {
    const result = JSON.parse(jsonText);
    if (!Array.isArray(result)) return [];
    parsed = result;
  } catch {
    // JSON 파싱 실패 → 잘린 응답 복구 시도
    const repaired = repairTruncatedJsonArray(jsonText);
    if (!repaired) return [];
    console.warn(
      `[LLM Batch] 잘린 JSON 복구 성공: ${repaired.length}건 파싱됨`
    );
    parsed = repaired;
  }

  const validPricingModels = ["PER_SEAT", "FLAT_RATE", "USAGE_BASED"];

  return parsed.map((item: unknown) => {
    const obj = item as Record<string, unknown>;
    const rawPricing = obj.pricingModel;
    const pricingModel =
      typeof rawPricing === "string" && validPricingModels.includes(rawPricing)
        ? (rawPricing as "PER_SEAT" | "FLAT_RATE" | "USAGE_BASED")
        : null;

    return {
      id: String(obj.id || ""),
      inference: {
        isSaaS: Boolean(obj.isSaaS),
        canonicalName: (obj.canonicalName as string) ?? null,
        website: (obj.website as string) ?? null,
        category: (obj.category as string) ?? null,
        confidence: typeof obj.confidence === "number" ? obj.confidence : 0,
        suggestedPatterns: Array.isArray(obj.suggestedPatterns)
          ? obj.suggestedPatterns.filter((v: unknown) => typeof v === "string")
          : [],
        reasoning:
          typeof obj.reasoning === "string" ? obj.reasoning : undefined,
        pricingModel,
      },
    };
  });
}
