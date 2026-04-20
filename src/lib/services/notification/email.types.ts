// src/lib/services/notification/email.types.ts

/**
 * 이메일 발송 결과
 */
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * 갱신 알림 이메일 파라미터
 */
export interface RenewalAlertEmailParams {
  to: string;
  appName: string;
  renewalDate: Date;
  daysUntilRenewal: number;
  amount: number;
  currency: string;
  organizationName: string;
}

/**
 * 환영 이메일 파라미터
 */
export interface WelcomeEmailParams {
  to: string;
  userName: string;
  organizationName: string;
}

/**
 * 퇴사자 알림 이메일 파라미터
 */
export interface TerminatedUserAlertParams {
  to: string;
  terminatedUserName: string;
  terminatedUserEmail: string;
  unrevokedApps: string[];
  terminatedAt: Date;
  organizationName: string;
}

/**
 * Extension 온보딩 안내 이메일 파라미터
 */
export interface ExtensionOnboardingGuideEmailParams {
  to: string;
  userName: string;
  orgName: string;
}

/**
 * 초대 이메일 파라미터
 */
export interface InvitationEmailParams {
  email: string;
  token: string;
  organizationName?: string;
  inviterName?: string;
  role?: string;
}

/**
 * LLM Confirm 결과 알림 파라미터
 */
export interface ConfirmationResultEmailParams {
  to: string;
  organizationName: string;
  appName: string;
  action: "approved" | "rejected";
  confidence?: number | null;
  normalizedName?: string | null;
}

/**
 * 주간 요약 이메일 파라미터
 */
export interface WeeklyDigestEmailParams {
  to: string;
  organizationName: string;
  weekRange: string;
  stats: {
    newApps: number;
    unmatchedPayments: number;
    upcomingRenewals: number;
    pendingConfirmations: number;
  };
}
