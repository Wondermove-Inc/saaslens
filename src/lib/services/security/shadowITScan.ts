// src/lib/services/security/shadowITScan.ts
import { prisma } from "@/lib/db";
import { sendShadowITAlertEmail } from "@/lib/services/notification/securityAlert";

// 조직 설정 타입
interface OrganizationSettings {
  notifications?: {
    emailEnabled?: boolean;
    shadowITAlerts?: boolean;
  };
}

// AI 도구 키워드 DB (Shadow IT 탐지용)
const AI_TOOL_KEYWORDS = [
  // AI/LLM 서비스
  "OPENAI",
  "CHATGPT",
  "GPT",
  "ANTHROPIC",
  "CLAUDE",
  "MIDJOURNEY",
  "DALLE",
  "BARD",
  "GEMINI",
  // AI 코딩 도구
  "GITHUB COPILOT",
  "COPILOT",
  "TABNINE",
  "CODEIUM",
  "CURSOR",
  // AI 생산성 도구
  "JASPER",
  "NOTION AI",
  "GRAMMARLY",
  "PERPLEXITY",
  "COPY.AI",
  "WRITESONIC",
  // AI 미디어 도구
  "SYNTHESIA",
  "RUNWAY",
  "STABILITY",
  "ELEVENLABS",
  "HEYGEN",
  "DESCRIPT",
  // 기타 AI 도구
  "REPLICATE",
  "HUGGINGFACE",
  "WEIGHTS & BIASES",
  "WANDB",
];

// 스캔 결과 타입
export interface ShadowITScanResult {
  success: boolean;
  processedAt: Date;
  processedOrganizations: number;
  totalShadowApps: number;
  emailsSent: number;
  errors: string[];
}

// Shadow IT 앱 타입
interface ShadowApp {
  name: string;
  detectedAt: Date;
  source: string;
  transactionCount: number;
}

/**
 * Shadow IT 스캔 처리
 * - 카드 거래에서 AI 도구 키워드 탐지
 * - 미승인 앱인지 확인
 * - 관리자에게 이메일 발송
 */
export async function processShadowITScan(): Promise<ShadowITScanResult> {
  const result: ShadowITScanResult = {
    success: true,
    processedAt: new Date(),
    processedOrganizations: 0,
    totalShadowApps: 0,
    emailsSent: 0,
    errors: [],
  };

  try {
    // 모든 조직 조회 (알림 설정 포함)
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        settings: true,
        users: {
          where: { role: "ADMIN", status: "ACTIVE" },
          select: { email: true },
        },
      },
    });

    result.processedOrganizations = organizations.length;

    for (const org of organizations) {
      try {
        await processOrganization(
          {
            id: org.id,
            name: org.name,
            settings: org.settings,
            adminEmails: org.users.map((u) => u.email),
          },
          result
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "알 수 없는 오류";
        result.errors.push(`${org.id}: ${errorMessage}`);
      }
    }
  } catch (error) {
    result.success = false;
    const errorMessage =
      error instanceof Error ? error.message : "알 수 없는 오류";
    result.errors.push(errorMessage);
  }

  return result;
}

// 개별 조직 처리
async function processOrganization(
  org: {
    id: string;
    name: string;
    settings: unknown;
    adminEmails: string[];
  },
  result: ShadowITScanResult
): Promise<void> {
  const settings = org.settings as OrganizationSettings;
  const shadowITAlerts = settings?.notifications?.shadowITAlerts ?? true;
  const emailEnabled = settings?.notifications?.emailEnabled ?? true;

  // 알림 비활성화된 경우 스킵
  if (!shadowITAlerts || !emailEnabled) {
    return;
  }

  // 관리자가 없는 경우
  if (org.adminEmails.length === 0) {
    result.errors.push(`${org.id}: 관리자 없음`);
    return;
  }

  // 조직의 승인된 앱 목록 조회
  const approvedApps = await prisma.app.findMany({
    where: {
      organizationId: org.id,
      status: "ACTIVE",
    },
    select: { name: true },
  });
  const approvedAppNames = new Set(
    approvedApps.map((a) => a.name.toUpperCase())
  );

  // 최근 7일간 카드 거래에서 AI 도구 키워드 탐지
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const transactions = await prisma.cardTransaction.findMany({
    where: {
      organizationId: org.id,
      createdAt: { gte: sevenDaysAgo },
      matchedAppId: null, // 미매칭 거래만
    },
    select: {
      useStore: true,
      createdAt: true,
    },
  });

  // AI 도구 키워드 매칭
  const shadowAppsMap = new Map<string, ShadowApp>();

  for (const tx of transactions) {
    const storeName = tx.useStore.toUpperCase();

    for (const keyword of AI_TOOL_KEYWORDS) {
      if (storeName.includes(keyword)) {
        // 승인된 앱인지 확인
        if (!approvedAppNames.has(keyword)) {
          const existing = shadowAppsMap.get(keyword);
          if (existing) {
            existing.transactionCount++;
          } else {
            shadowAppsMap.set(keyword, {
              name: keyword,
              detectedAt: tx.createdAt,
              source: "card",
              transactionCount: 1,
            });
          }
        }
        break; // 하나의 키워드만 매칭
      }
    }
  }

  const shadowApps = Array.from(shadowAppsMap.values());

  if (shadowApps.length === 0) {
    return;
  }

  result.totalShadowApps += shadowApps.length;

  // 관리자에게 이메일 발송
  for (const adminEmail of org.adminEmails) {
    const emailResult = await sendShadowITAlertEmail({
      to: adminEmail,
      organizationName: org.name,
      shadowApps: shadowApps.map((app) => ({
        name: app.name,
        detectedAt: app.detectedAt,
        source: app.source,
      })),
    });

    if (emailResult.success) {
      result.emailsSent++;
    } else {
      result.errors.push(
        `${org.id}: 이메일 발송 실패 (${adminEmail}) - ${emailResult.error}`
      );
    }
  }
}
