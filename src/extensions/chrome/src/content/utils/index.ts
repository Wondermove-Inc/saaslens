/**
 * Utils modules re-exports
 */

export {
  monitorLoginResult,
  sendLoginData,
  sendLoginDataImmediate,
} from "./login-sender";

export { observeDOMChanges, observeVisibilityChanges } from "./dom-observer";

export {
  clearMultiStepLoginData,
  getMultiStepLoginData,
  isMFAStep,
  isMultiStepLoginDomain,
  isPasswordStep,
  restoreMultiStepUsername,
  saveMultiStepUsername,
  setupNavigationListener,
  updateMultiStepLoginStep,
} from "./multi-step-login";

export {
  deepQuerySelector,
  deepQuerySelectorAll,
  findAllButtons,
  findAllForms,
  findAllInputs,
  findAllPasswordFields,
  findAllShadowRoots,
  hasShadowDOMLoginForms,
  observeShadowDOMChanges,
} from "./shadow-dom";

export {
  cleanupRemovedElements,
  forceRefreshValues,
  getTrackingStatus,
  scanAndTrackFields,
  startTracking,
  stopTracking,
  trackInput,
} from "./field-tracker";

export {
  LOGIN_CONFIG,
  getAllConfiguredDomains,
  getLoginConfig,
  isRedirectLoginUrl,
} from "./login-url-config";

export {
  detectLoginFormEnhanced,
  setupDynamicFormObserver,
} from "./enhanced-form-detector";
