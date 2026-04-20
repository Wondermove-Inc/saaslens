// src/lib/services/notification/index.ts
export {
  EmailConfig,
  sendRenewalAlertEmail,
  sendTerminatedUserAlertEmail,
  sendWelcomeEmail,
  type EmailResult,
  type RenewalAlertEmailParams,
  type TerminatedUserAlertParams,
  type WelcomeEmailParams,
} from "./email";

export {
  findUpcomingRenewals,
  processRenewalAlerts,
  sendRenewalAlert,
  type ProcessResult,
  type SendAlertResult,
  type UpcomingRenewal,
} from "./renewalAlert";

export {
  sendCostAnomalyAlertEmail,
  sendShadowITAlertEmail,
  type CostAnomalyAlertParams,
  type ShadowITAlertParams,
} from "./securityAlert";

export {
  sendAgentInstallationReminderEmail,
  type AgentInstallationReminderParams,
} from "./agentReminder";
