/**
 * SMP AI Agent Write Tool 타입 정의
 * SMP-198: 실제 SMP Prisma 스키마 + Server Actions 기반 설계
 * SMP-205: assign_user / remove_user 액션 추가
 */

// ==================== Write Tool 액션 타입 ====================

export type WriteToolAction =
  | "create_app"
  | "update_app"
  | "delete_app"
  | "create_subscription"
  | "update_subscription"
  | "delete_subscription"
  | "confirm_suggestion"
  | "assign_user"
  | "remove_user";

// ==================== Write Tool 파라미터 (실제 SMP 스키마 기반) ====================

export interface CreateAppParams {
  name: string;
  category?: string;
  customWebsite?: string;
  notes?: string;
  tags?: string;
}

export interface UpdateAppParams {
  id: string;
  name?: string;
  category?: string;
  customWebsite?: string;
  notes?: string;
  tags?: string;
  status?: "ACTIVE" | "INACTIVE" | "PENDING_REVIEW" | "BLOCKED";
}

export interface DeleteAppParams {
  id: string;
  name: string;
}

export interface CreateSubscriptionParams {
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
}

export interface UpdateSubscriptionParams {
  id: string;
  billingCycle?: "MONTHLY" | "QUARTERLY" | "YEARLY" | "ONE_TIME";
  billingType?: "FLAT_RATE" | "PER_SEAT";
  amount?: string;
  currency?: string;
  totalLicenses?: number;
  status?: "ACTIVE" | "EXPIRED" | "CANCELLED" | "PENDING";
  autoRenewal?: boolean;
  notes?: string;
}

export interface DeleteSubscriptionParams {
  id: string;
  appName: string;
}

export interface ConfirmSuggestionParams {
  appId: string;
  appName: string;
  suggestionSource: "payment_record" | "card_transaction";
  selectedUserIds?: string[];
  billingType?: "FLAT_RATE" | "PER_SEAT";
  totalLicenses?: number;
}

export interface AssignUserParams {
  subscriptionId: string;
  subscriptionName: string;
  userId: string;
  userName: string;
}

export interface RemoveUserParams {
  subscriptionId: string;
  subscriptionName: string;
  userId: string;
  userName: string;
}

export type WriteToolParams =
  | ({ action: "create_app" } & CreateAppParams)
  | ({ action: "update_app" } & UpdateAppParams)
  | ({ action: "delete_app" } & DeleteAppParams)
  | ({ action: "create_subscription" } & CreateSubscriptionParams)
  | ({ action: "update_subscription" } & UpdateSubscriptionParams)
  | ({ action: "delete_subscription" } & DeleteSubscriptionParams)
  | ({ action: "confirm_suggestion" } & ConfirmSuggestionParams)
  | ({ action: "assign_user" } & AssignUserParams)
  | ({ action: "remove_user" } & RemoveUserParams);

// ==================== 승인 플로우 ====================

export interface WriteToolPendingAction {
  id: string;
  action: WriteToolAction;
  params: WriteToolParams;
  description: string;
  impact?: string;
  createdAt: Date;
}

export interface WriteToolResult {
  success: boolean;
  message: string;
  data?: unknown;
}

// ==================== AI Agent 메시지 타입 ====================

export type AIMessageRole = "user" | "assistant" | "system";

export interface AIMessage {
  id: string;
  role: AIMessageRole;
  content: string;
  createdAt: Date;
  pendingAction?: WriteToolPendingAction;
  toolResult?: WriteToolResult;
}
