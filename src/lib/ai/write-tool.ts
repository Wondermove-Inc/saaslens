/**
 * SMP AI Agent Write Tool
 * SMP-198: 실제 SMP Server Actions + Prisma 스키마 기반 설계
 * SMP-205: 사용자 배정/제거 Write Tool 추가
 *
 * App: createAppSchema (name, category, customWebsite, notes, tags, ownerId, catalogId, teamIds)
 * Subscription: createSubscriptionSchema (appId, billingCycle, billingType, amount, currency,
 *   totalLicenses, usedLicenses, startDate, endDate, renewalDate, autoRenewal, notes, teamIds, assignedUserIds)
 * Suggestion: createSubscriptionFromSuggestion (appId 기반, 추천 정보로 자동 생성)
 *
 * [Fix] AI SDK v6: tool({ inputSchema }) 키 사용 필수 (parameters 불가)
 * [Fix] jsonSchema() 헬퍼로 Anthropic input_schema.type: "object" 보장
 */

import { jsonSchema, tool } from "ai";
import { nanoid } from "nanoid";

import type {
  WriteToolParams,
  WriteToolPendingAction,
  WriteToolResult,
} from "./write-tool.types";

// ==================== 승인 대기 액션 생성 ====================

export function createPendingAction(
  params: WriteToolParams,
  description: string,
  impact?: string
): WriteToolPendingAction {
  return {
    id: nanoid(),
    action: params.action,
    params,
    description,
    impact,
    createdAt: new Date(),
  };
}

// ==================== AI SDK Write Tools ====================

export const writeTools = {
  create_app: tool({
    description:
      "새 SaaS 앱을 등록합니다. 앱 이름은 필수이고, 카테고리/웹사이트/메모 등은 선택입니다. ADMIN 또는 MEMBER 권한 필요. 실행 전 사용자 승인이 필요합니다.",
    inputSchema: jsonSchema<{
      name: string;
      category?: string;
      customWebsite?: string;
      notes?: string;
      tags?: string;
    }>({
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "앱 이름 (2~100자, 필수)",
        },
        category: {
          type: "string",
          description: "카테고리 (예: 개발도구, 디자인, 마케팅, 커뮤니케이션)",
        },
        customWebsite: {
          type: "string",
          description: "앱 웹사이트 URL",
        },
        notes: {
          type: "string",
          description: "메모 (최대 1000자)",
        },
        tags: {
          type: "string",
          description: "태그 (쉼표 구분)",
        },
      },
      required: ["name"],
    }),
    execute: async (params) => {
      const pending = createPendingAction(
        { action: "create_app", ...params },
        `"${params.name}" 앱을 새로 등록합니다.`,
        [
          params.category && `카테고리: ${params.category}`,
          params.customWebsite && `웹사이트: ${params.customWebsite}`,
        ]
          .filter(Boolean)
          .join(", ") || undefined
      );
      return { type: "pending_approval" as const, pendingAction: pending };
    },
  }),

  update_app: tool({
    description:
      "기존 SaaS 앱 정보를 수정합니다. 앱 ID가 필수입니다. ADMIN 권한 필요. 실행 전 사용자 승인이 필요합니다.",
    inputSchema: jsonSchema<{
      id: string;
      name?: string;
      category?: string;
      customWebsite?: string;
      notes?: string;
      tags?: string;
      status?: "ACTIVE" | "INACTIVE" | "PENDING_REVIEW" | "BLOCKED";
    }>({
      type: "object",
      properties: {
        id: { type: "string", description: "수정할 앱 ID" },
        name: { type: "string", description: "새 앱 이름" },
        category: { type: "string", description: "새 카테고리" },
        customWebsite: { type: "string", description: "새 웹사이트 URL" },
        notes: { type: "string", description: "새 메모" },
        tags: { type: "string", description: "새 태그" },
        status: {
          type: "string",
          enum: ["ACTIVE", "INACTIVE", "PENDING_REVIEW", "BLOCKED"],
          description: "앱 상태",
        },
      },
      required: ["id"],
    }),
    execute: async (params) => {
      const changes = Object.entries(params)
        .filter(([k, v]) => k !== "id" && v !== undefined)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      const pending = createPendingAction(
        { action: "update_app", ...params },
        `앱(ID: ${params.id})을 수정합니다.`,
        changes || undefined
      );
      return { type: "pending_approval" as const, pendingAction: pending };
    },
  }),

  delete_app: tool({
    description:
      "SaaS 앱을 삭제합니다. 연결된 구독, 사용자 접근도 함께 삭제됩니다. ADMIN 권한 필요. 실행 전 사용자 승인이 필요합니다.",
    inputSchema: jsonSchema<{ id: string; name: string }>({
      type: "object",
      properties: {
        id: { type: "string", description: "삭제할 앱 ID" },
        name: { type: "string", description: "삭제할 앱 이름 (확인용)" },
      },
      required: ["id", "name"],
    }),
    execute: async (params) => {
      const pending = createPendingAction(
        { action: "delete_app", ...params },
        `"${params.name}" 앱을 삭제합니다.`,
        "연결된 구독 및 사용자 접근이 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다."
      );
      return { type: "pending_approval" as const, pendingAction: pending };
    },
  }),

  create_subscription: tool({
    description:
      "앱에 새 구독을 등록합니다. 앱 ID, 결제 주기(MONTHLY/QUARTERLY/YEARLY/ONE_TIME), 금액, 시작일이 필수입니다. ADMIN 또는 MEMBER 권한 필요. 실행 전 사용자 승인이 필요합니다.",
    inputSchema: jsonSchema<{
      appId: string;
      appName: string;
      billingCycle: "MONTHLY" | "QUARTERLY" | "YEARLY" | "ONE_TIME";
      billingType?: "FLAT_RATE" | "PER_SEAT";
      amount: string;
      currency?: string;
      startDate: string;
      endDate?: string;
      totalLicenses?: number;
      autoRenewal?: boolean;
      notes?: string;
    }>({
      type: "object",
      properties: {
        appId: { type: "string", description: "구독할 앱 ID" },
        appName: { type: "string", description: "앱 이름 (확인용)" },
        billingCycle: {
          type: "string",
          enum: ["MONTHLY", "QUARTERLY", "YEARLY", "ONE_TIME"],
          description: "결제 주기",
        },
        billingType: {
          type: "string",
          enum: ["FLAT_RATE", "PER_SEAT"],
          description: "과금 유형 (기본: FLAT_RATE)",
        },
        amount: {
          type: "string",
          description: "금액 (숫자 문자열, 예: '20000')",
        },
        currency: {
          type: "string",
          description: "통화 (기본: KRW)",
        },
        startDate: {
          type: "string",
          description: "시작일 (YYYY-MM-DD)",
        },
        endDate: {
          type: "string",
          description: "종료일 (YYYY-MM-DD, 선택)",
        },
        totalLicenses: {
          type: "number",
          description: "총 라이선스 수 (PER_SEAT일 때)",
        },
        autoRenewal: {
          type: "boolean",
          description: "자동 갱신 여부 (기본: true)",
        },
        notes: {
          type: "string",
          description: "메모",
        },
      },
      required: ["appId", "appName", "billingCycle", "amount", "startDate"],
    }),
    execute: async (params) => {
      const cycleLabel: Record<string, string> = {
        MONTHLY: "월간",
        QUARTERLY: "분기",
        YEARLY: "연간",
        ONE_TIME: "일회성",
      };
      const pending = createPendingAction(
        { action: "create_subscription", ...params },
        `"${params.appName}" 구독을 등록합니다.`,
        `${cycleLabel[params.billingCycle] ?? params.billingCycle} / ${Number(params.amount).toLocaleString()} ${params.currency ?? "KRW"} / 시작: ${params.startDate}`
      );
      return { type: "pending_approval" as const, pendingAction: pending };
    },
  }),

  update_subscription: tool({
    description:
      "기존 구독 정보를 수정합니다. 구독 ID가 필수입니다. ADMIN 또는 MEMBER 권한 필요. 실행 전 사용자 승인이 필요합니다.",
    inputSchema: jsonSchema<{
      id: string;
      billingCycle?: "MONTHLY" | "QUARTERLY" | "YEARLY" | "ONE_TIME";
      billingType?: "FLAT_RATE" | "PER_SEAT";
      amount?: string;
      currency?: string;
      totalLicenses?: number;
      status?: "ACTIVE" | "EXPIRED" | "CANCELLED" | "PENDING";
      autoRenewal?: boolean;
      notes?: string;
    }>({
      type: "object",
      properties: {
        id: { type: "string", description: "수정할 구독 ID" },
        billingCycle: {
          type: "string",
          enum: ["MONTHLY", "QUARTERLY", "YEARLY", "ONE_TIME"],
          description: "새 결제 주기",
        },
        billingType: {
          type: "string",
          enum: ["FLAT_RATE", "PER_SEAT"],
          description: "새 과금 유형",
        },
        amount: { type: "string", description: "새 금액" },
        currency: { type: "string", description: "새 통화" },
        totalLicenses: { type: "number", description: "새 총 라이선스 수" },
        status: {
          type: "string",
          enum: ["ACTIVE", "EXPIRED", "CANCELLED", "PENDING"],
          description: "구독 상태",
        },
        autoRenewal: { type: "boolean", description: "자동 갱신 여부" },
        notes: { type: "string", description: "메모" },
      },
      required: ["id"],
    }),
    execute: async (params) => {
      const changes = Object.entries(params)
        .filter(([k, v]) => k !== "id" && v !== undefined)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      const pending = createPendingAction(
        { action: "update_subscription", ...params },
        `구독(ID: ${params.id})을 수정합니다.`,
        changes || undefined
      );
      return { type: "pending_approval" as const, pendingAction: pending };
    },
  }),

  delete_subscription: tool({
    description:
      "구독을 삭제합니다. ADMIN 권한 필요. 실행 전 사용자 승인이 필요합니다.",
    inputSchema: jsonSchema<{ id: string; appName: string }>({
      type: "object",
      properties: {
        id: { type: "string", description: "삭제할 구독 ID" },
        appName: { type: "string", description: "앱 이름 (확인용)" },
      },
      required: ["id", "appName"],
    }),
    execute: async (params) => {
      const pending = createPendingAction(
        { action: "delete_subscription", ...params },
        `"${params.appName}" 구독을 삭제합니다.`,
        "이 작업은 되돌릴 수 없습니다."
      );
      return { type: "pending_approval" as const, pendingAction: pending };
    },
  }),

  confirm_subscription_suggestion: tool({
    description:
      "구독 추천(suggestions)을 확인하여 구독으로 등록합니다. 먼저 get_subscription_suggestions로 추천 정보를 조회한 뒤, 사용자에게 Seat 수와 배정 유저를 확인받고 이 Tool을 호출하세요. suggestionSource로 결제 기반(payment_record)인지 카드 기반(card_transaction)인지 구분합니다. 실행 전 사용자 승인이 필요합니다.",
    inputSchema: jsonSchema<{
      appId: string;
      appName: string;
      suggestionSource: "payment_record" | "card_transaction";
      selectedUserIds?: string[];
      billingType?: "FLAT_RATE" | "PER_SEAT";
      totalLicenses?: number;
    }>({
      type: "object",
      properties: {
        appId: {
          type: "string",
          description: "추천된 앱 ID",
        },
        appName: {
          type: "string",
          description: "앱 이름 (확인용)",
        },
        suggestionSource: {
          type: "string",
          enum: ["payment_record", "card_transaction"],
          description:
            "추천 소스. get_subscription_suggestions 결과의 source 값 사용",
        },
        selectedUserIds: {
          type: "array",
          items: { type: "string" },
          description:
            "배정할 유저 ID 목록. get_subscription_suggestions의 availableUsers에서 선택",
        },
        billingType: {
          type: "string",
          enum: ["FLAT_RATE", "PER_SEAT"],
          description: "과금 유형 오버라이드. 추천값과 다르게 설정할 때만 사용",
        },
        totalLicenses: {
          type: "number",
          description: "총 Seat 수 (PER_SEAT일 때). 사용자가 지정한 값 사용",
        },
      },
      required: ["appId", "appName", "suggestionSource"],
    }),
    execute: async (params) => {
      const details = [
        params.billingType && `과금유형: ${params.billingType}`,
        params.totalLicenses && `Seat 수: ${params.totalLicenses}`,
        params.selectedUserIds?.length &&
          `배정 유저: ${params.selectedUserIds.length}명`,
      ]
        .filter(Boolean)
        .join(", ");
      const pending = createPendingAction(
        { action: "confirm_suggestion", ...params },
        `"${params.appName}" 구독 추천을 확인하여 구독으로 등록합니다.`,
        details ||
          "추천 정보(금액, 결제 주기, Seat 판단 등)가 자동으로 적용됩니다."
      );
      return { type: "pending_approval" as const, pendingAction: pending };
    },
  }),

  assign_user_to_subscription: tool({
    description:
      "구독에 사용자를 배정합니다. 모든 구독 유형(FLAT_RATE, PER_SEAT)에서 사용자 배정이 가능합니다. billingType과 관계없이 사용자를 배정할 수 있습니다. PER_SEAT 구독은 Seat 한도가 있을 수 있고, FLAT_RATE 구독은 무제한 배정 가능합니다. 먼저 search_subscriptions로 구독 ID를, get_users로 사용자 ID를 조회하세요. 실행 전 사용자 승인이 필요합니다.",
    inputSchema: jsonSchema<{
      subscriptionId: string;
      subscriptionName: string;
      userId: string;
      userName: string;
    }>({
      type: "object",
      properties: {
        subscriptionId: {
          type: "string",
          description: "배정할 구독 ID",
        },
        subscriptionName: {
          type: "string",
          description: "구독 이름 (확인용, 앱 이름)",
        },
        userId: {
          type: "string",
          description: "배정할 사용자 ID",
        },
        userName: {
          type: "string",
          description: "사용자 이름 (확인용)",
        },
      },
      required: ["subscriptionId", "subscriptionName", "userId", "userName"],
    }),
    execute: async (params) => {
      const pending = createPendingAction(
        { action: "assign_user", ...params },
        `"${params.subscriptionName}" 구독에 ${params.userName}님을 배정합니다.`,
        undefined
      );
      return { type: "pending_approval" as const, pendingAction: pending };
    },
  }),

  remove_user_from_subscription: tool({
    description:
      "구독에서 사용자를 제거합니다. 배정된 사용자만 제거 가능합니다. 먼저 구독 상세에서 배정된 사용자 목록을 확인하세요. 실행 전 사용자 승인이 필요합니다.",
    inputSchema: jsonSchema<{
      subscriptionId: string;
      subscriptionName: string;
      userId: string;
      userName: string;
    }>({
      type: "object",
      properties: {
        subscriptionId: {
          type: "string",
          description: "구독 ID",
        },
        subscriptionName: {
          type: "string",
          description: "구독 이름 (확인용, 앱 이름)",
        },
        userId: {
          type: "string",
          description: "제거할 사용자 ID",
        },
        userName: {
          type: "string",
          description: "사용자 이름 (확인용)",
        },
      },
      required: ["subscriptionId", "subscriptionName", "userId", "userName"],
    }),
    execute: async (params) => {
      const pending = createPendingAction(
        { action: "remove_user", ...params },
        `"${params.subscriptionName}" 구독에서 ${params.userName}님을 제거합니다.`,
        "배정 해제 후 해당 사용자의 구독 접근이 제거됩니다."
      );
      return { type: "pending_approval" as const, pendingAction: pending };
    },
  }),
};

// ==================== 승인 후 실행 ====================

/**
 * SMP-203: 서비스 레이어를 통한 실행
 * - Server Action 직접 호출 + FormData 우회 패턴 제거
 * - 서비스 함수를 직접 호출하여 깔끔한 파라미터 전달
 *
 * 주의: requireOrganization()은 API route에서 이미 호출됨.
 * executeWriteTool은 PUT /api/ai/write에서 호출되므로 ctx를 인자로 받는다.
 */
export async function executeWriteTool(
  pending: WriteToolPendingAction,
  ctx?: { organizationId: string; userId: string; role: string }
): Promise<WriteToolResult> {
  const { params } = pending;

  // ctx가 없으면 requireOrganization에서 가져옴 (하위 호환)
  let serviceCtx = ctx;
  if (!serviceCtx) {
    const { requireOrganization } = await import("@/lib/auth/require-auth");
    const auth = await requireOrganization();
    serviceCtx = {
      organizationId: auth.organizationId,
      userId: auth.userId,
      role: auth.role,
    };
  }

  try {
    switch (params.action) {
      case "create_app": {
        const { createApp } = await import("@/services/app.service");
        const result = await createApp(serviceCtx, {
          name: params.name,
          category: params.category,
          customWebsite: params.customWebsite,
          notes: params.notes,
          tags: params.tags,
        });
        if (!result.success)
          throw new Error(result.message ?? "앱 생성에 실패했습니다.");
        return {
          success: true,
          message: `"${params.name}" 앱이 등록되었습니다.`,
          data: result.data,
        };
      }

      case "update_app": {
        const { updateApp } = await import("@/services/app.service");
        const result = await updateApp(serviceCtx, params.id, {
          name: params.name,
          category: params.category,
          customWebsite: params.customWebsite,
          notes: params.notes,
          tags: params.tags,
          status: params.status,
        });
        if (!result.success)
          throw new Error(result.message ?? "앱 수정에 실패했습니다.");
        return {
          success: true,
          message: `앱이 수정되었습니다.`,
          data: result.data,
        };
      }

      case "delete_app": {
        const { deleteApp } = await import("@/services/app.service");
        const result = await deleteApp(serviceCtx, params.id);
        if (!result.success)
          throw new Error(result.message ?? "앱 삭제에 실패했습니다.");
        return {
          success: true,
          message: `"${params.name}" 앱이 삭제되었습니다.`,
        };
      }

      case "create_subscription": {
        const { createSubscription } =
          await import("@/services/subscription.service");
        const result = await createSubscription(serviceCtx, {
          appId: params.appId,
          billingCycle: params.billingCycle,
          billingType: params.billingType,
          amount: params.amount,
          currency: params.currency,
          startDate: params.startDate,
          endDate: params.endDate,
          totalLicenses: params.totalLicenses,
          autoRenewal: params.autoRenewal,
          notes: params.notes,
        });
        if (!result.success)
          throw new Error(result.message ?? "구독 생성에 실패했습니다.");
        return {
          success: true,
          message: `"${params.appName}" 구독이 등록되었습니다.`,
          data: result.data,
        };
      }

      case "update_subscription": {
        const { updateSubscription } =
          await import("@/services/subscription.service");
        const result = await updateSubscription(serviceCtx, params.id, {
          billingCycle: params.billingCycle,
          billingType: params.billingType,
          amount: params.amount,
          currency: params.currency,
          totalLicenses: params.totalLicenses,
          status: params.status,
          autoRenewal: params.autoRenewal,
          notes: params.notes,
        });
        if (!result.success)
          throw new Error(result.message ?? "구독 수정에 실패했습니다.");
        return {
          success: true,
          message: `구독이 수정되었습니다.`,
          data: result.data,
        };
      }

      case "delete_subscription": {
        const { deleteSubscription } =
          await import("@/services/subscription.service");
        const result = await deleteSubscription(serviceCtx, params.id);
        if (!result.success)
          throw new Error(result.message ?? "구독 삭제에 실패했습니다.");
        return {
          success: true,
          message: `"${params.appName}" 구독이 삭제되었습니다.`,
        };
      }

      case "confirm_suggestion": {
        // confirm_suggestion은 Server Action 호출 유지 (suggestions 전용 로직)
        const {
          suggestSubscriptionsFromPayments,
          suggestFromCardTransactions,
          createSubscriptionFromPaymentSuggestion,
          createSubscriptionFromCardSuggestion,
        } = await import("@/actions/subscriptions/subscription-suggestions");

        if (params.suggestionSource === "payment_record") {
          const suggestResult = await suggestSubscriptionsFromPayments();
          if (!suggestResult.success || !suggestResult.data)
            throw new Error("구독 추천 조회에 실패했습니다.");
          const suggestion = suggestResult.data.find(
            (s) => s.appId === params.appId
          );
          if (!suggestion)
            throw new Error(
              `"${params.appName}" 앱의 결제 기반 추천을 찾을 수 없습니다.`
            );

          const result = await createSubscriptionFromPaymentSuggestion({
            suggestion,
            selectedUserIds: params.selectedUserIds ?? [],
            billingType: params.billingType,
            totalLicenses: params.totalLicenses ?? null,
          });
          if (!result.success)
            throw new Error(result.message ?? "구독 생성에 실패했습니다.");
          return {
            success: true,
            message: `"${params.appName}" 구독이 결제 내역 기반으로 등록되었습니다.`,
            data: result.data,
          };
        } else {
          const suggestResult = await suggestFromCardTransactions();
          if (!suggestResult.success || !suggestResult.data)
            throw new Error("카드 거래 추천 조회에 실패했습니다.");
          const suggestion = suggestResult.data.find(
            (s) => s.appId === params.appId
          );
          if (!suggestion)
            throw new Error(
              `"${params.appName}" 앱의 카드 기반 추천을 찾을 수 없습니다.`
            );

          const result = await createSubscriptionFromCardSuggestion({
            suggestion,
            selectedUserIds: params.selectedUserIds ?? [],
            billingType: params.billingType,
            totalLicenses: params.totalLicenses ?? null,
          });
          if (!result.success)
            throw new Error(result.message ?? "구독 생성에 실패했습니다.");
          return {
            success: true,
            message: `"${params.appName}" 구독이 카드 거래 기반으로 등록되었습니다.`,
            data: result.data,
          };
        }
      }

      case "assign_user": {
        const { assignUserToSubscription } =
          await import("@/actions/subscriptions/subscription-seat-management");
        const result = await assignUserToSubscription(
          params.subscriptionId,
          params.userId
        );
        if (!result.success)
          throw new Error(result.error ?? "사용자 배정에 실패했습니다.");
        return {
          success: true,
          message: `"${params.subscriptionName}" 구독에 ${params.userName}님이 배정되었습니다.`,
          data: result.data,
        };
      }

      case "remove_user": {
        const { removeUserFromSubscription } =
          await import("@/actions/subscriptions/subscription-seat-management");
        const result = await removeUserFromSubscription(
          params.subscriptionId,
          params.userId
        );
        if (!result.success)
          throw new Error(result.error ?? "사용자 제거에 실패했습니다.");
        return {
          success: true,
          message: `"${params.subscriptionName}" 구독에서 ${params.userName}님이 제거되었습니다.`,
        };
      }

      default:
        return { success: false, message: "알 수 없는 작업입니다." };
    }
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "작업 중 오류가 발생했습니다.",
    };
  }
}
