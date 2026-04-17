// src/lib/services/notification/email.ts
/**
 * 이메일 서비스 통합 모듈
 *
 * 모든 이메일 기능을 재-export하여 기존 import 호환성 유지:
 * - email.types.ts: 타입 정의
 * - email.utils.ts: 유틸리티 + 설정
 * - email-alerts.ts: 갱신/퇴사자 알림
 * - email-notifications.ts: 확인/주간요약 알림
 * - email-onboarding.ts: 환영/초대 이메일
 */

// Types re-export
export type {
  ConfirmationResultEmailParams,
  EmailResult,
  InvitationEmailParams,
  RenewalAlertEmailParams,
  TerminatedUserAlertParams,
  WeeklyDigestEmailParams,
  WelcomeEmailParams,
} from "./email.types";

// Utils re-export
export {
  EmailConfig,
  formatCurrency,
  formatDate,
  getBaseUrl,
  getResendClient,
} from "./email.utils";

// Alert emails re-export
export {
  sendRenewalAlertEmail,
  sendTerminatedUserAlertEmail,
} from "./email-alerts";

// Notification emails re-export
export {
  sendConfirmationResultEmail,
  sendWeeklyDigestEmail,
} from "./email-notifications";

// Onboarding emails re-export
export { sendInvitationEmail, sendWelcomeEmail } from "./email-onboarding";
