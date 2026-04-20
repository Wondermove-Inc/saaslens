/**
 * Detector modules re-exports
 */

export {
  detectCaptcha,
  hasCaptcha,
  isCaptchaSolved,
  observeCaptchaChanges,
  waitForCaptchaSolution,
} from "./captcha-detector";
export type { CaptchaDetectionResult, CaptchaType } from "./captcha-detector";
export {
  detectFederatedFromLocation,
  handleSamlFormSubmit,
  hookHistoryChanges,
  tryExtractUsernameFromSaml,
} from "./federated-auth";
export { isMFAField, isPasswordField, isUsernameField } from "./field-detector";
export {
  OAUTH_BUTTON_CONFIG,
  detectAndMonitorLoginButtons,
  detectOAuthProviderLogin,
} from "./login-button-detector";
export {
  getLoginSuccessConfidence,
  isLoginFailure,
  isLoginSuccess,
} from "./login-status";
