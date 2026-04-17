// src/actions/extensions/index.ts
// Extension Server Actions barrel export

// Whitelist
export {
  createWhitelist,
  deleteWhitelist,
  getWhitelists,
  updateWhitelist,
} from "./whitelist";

// Blacklist
export {
  createBlacklist,
  deleteBlacklist,
  getBlacklists,
  updateBlacklist,
} from "./blacklist";

// Devices
export {
  checkExtensionInstalled,
  getExtensionDevice,
  getExtensionDevices,
  syncExtensionDevice,
  updateExtensionDeviceStatus,
} from "./devices";

// Usage Analytics
export { getDomainLoginEvents, getUsageAnalytics } from "./usage";

// Dashboard
export { getExtensionDashboard } from "./dashboard";

// Builds
export {
  deleteBuild,
  getBuild,
  getBuilds,
  getExtensionDeploySettings,
  getLatestBuild,
  retryBuild,
  triggerBuild,
  updateExtensionDeploySettings,
} from "./builds";
export type { ExtensionDeployMethod, ExtensionDeploySettings } from "./builds";

// Auth Management (Extension API credentials)
export {
  createExtensionAuth,
  deleteExtensionAuth,
  listExtensionAuths,
  revokeExtensionAuth,
} from "./auth-mgmt";
export type {
  CreateExtensionAuthInput,
  CreateExtensionAuthResult,
  ExtensionAuthInfo,
  ListExtensionAuthsResult,
} from "./auth-mgmt";

// Recommended Apps (Legacy)
export {
  dismissRecommendedApp,
  getRecommendedApps,
  registerRecommendedApp,
  scanUnregisteredDomains as scanRecommendedApps,
} from "./recommended-apps";
export type {
  RecommendedAppItem,
  RecommendedAppsResponse,
} from "./recommended-apps";

// Activity Sync (Retroactive login → app access bridge)
export { syncLoginEventsToAppAccess } from "./activity-sync";
export type { SyncResult } from "./activity-sync";

// Review Apps (New - includes malware detection)
export {
  blockReviewApp,
  bulkBlockReviewApps,
  bulkRegisterReviewApps,
  dismissReviewApp,
  getReviewApps,
  registerReviewApp,
  scanUnregisteredDomains,
} from "./review-apps";
export type {
  ReviewAppItem,
  ReviewAppType,
  ReviewAppsResponse,
} from "./review-apps";
