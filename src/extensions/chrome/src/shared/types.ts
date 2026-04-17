/**
 * Authentication type for login events
 * UPPERCASE to match API schema (extension-api.ts)
 */
export type AuthType = "PASSWORD" | "MAGIC_LINK" | "OAUTH" | "SSO";

/**
 * Represents login data captured by the extension
 */
export interface LoginData {
  domain: string;
  username: string;
  password: string;
  deviceId: string;
  capturedTime?: string;
  hasMFA?: boolean;
  mfaType?: string;
  /** Authentication type: password (default), magic_link (email verification), oauth, sso */
  authType?: AuthType;
}

/**
 * Response from the backend API
 */
export interface ApiResponse {
  status: "success" | "error";
  message?: string;
}

/**
 * Message types for communication between content script and background script
 */
export enum MessageType {
  LOGIN_DETECTED = "LOGIN_DETECTED",
  GET_DEVICE_ID = "GET_DEVICE_ID",
  HEALTH_CHECK = "HEALTH_CHECK",
  CONFIG_UPDATED = "CONFIG_UPDATED",
  ERROR = "ERROR",
  // Time Tracking (Phase 4)
  GET_TODAY_USAGE = "GET_TODAY_USAGE",
  GET_WEEKLY_USAGE = "GET_WEEKLY_USAGE",
  GET_USAGE_STATS = "GET_USAGE_STATS",
  // Whitelist & Sync (Phase 5)
  GET_WHITELIST = "GET_WHITELIST",
  UPDATE_WHITELIST = "UPDATE_WHITELIST",
  SYNC_TIME_TRACKING = "SYNC_TIME_TRACKING",
  GET_SYNC_STATUS = "GET_SYNC_STATUS",
  // Blacklist / Domain Blocking (Phase 9)
  GET_BLACKLIST = "GET_BLACKLIST",
  CHECK_DOMAIN_BLOCKED = "CHECK_DOMAIN_BLOCKED",
  SYNC_BLACKLIST = "SYNC_BLACKLIST",
  DOMAIN_BLOCKED = "DOMAIN_BLOCKED",
  // URL/Block Logging
  GET_URL_LOG_STATS = "GET_URL_LOG_STATS",
  SYNC_URL_LOGS = "SYNC_URL_LOGS",
  GET_URL_LOG_SYNC_STATUS = "GET_URL_LOG_SYNC_STATUS",
  // Heartbeat
  SEND_HEARTBEAT = "SEND_HEARTBEAT",
  // Onboarding
  ONBOARDING_VERIFY = "ONBOARDING_VERIFY",
  ONBOARDING_COMPLETE = "ONBOARDING_COMPLETE",
  GET_ONBOARDING_STATUS = "GET_ONBOARDING_STATUS",
}

/**
 * Message structure for internal extension communication
 */
export interface Message {
  type: MessageType;
  data?: LoginData | string | Record<string, unknown>;
}

/**
 * Standardized message response from background script
 */
export interface MessageResponse {
  success: boolean;
  error?: string;
  data?: unknown;
}

/**
 * Options for message sending with retry
 */
export interface MessageRetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
}

/**
 * Configuration for the extension
 */
export interface ExtensionConfig {
  api: string;
  id: string;
  enabled: boolean;
  token: string;
  locked: boolean;
  filters: string[];
}

/**
 * 빌드 시 webpack DefinePlugin으로 주입되는 전역 상수
 * 런타임 조건문 없이 직접 값이 대체됨
 */
declare const __BUILD_API_URL__: string | undefined;
declare const __BUILD_API_CREDENTIAL__: string | undefined;

/**
 * Default configuration values
 * 빌드 시 DefinePlugin이 __BUILD_*__ 상수를 실제 값으로 대체
 */
export const DEFAULT_CONFIG: ExtensionConfig = {
  api:
    typeof __BUILD_API_URL__ !== "undefined"
      ? __BUILD_API_URL__
      : "http://localhost:3000",
  id: "",
  enabled: true,
  token:
    typeof __BUILD_API_CREDENTIAL__ !== "undefined"
      ? __BUILD_API_CREDENTIAL__
      : "",
  locked: false,
  filters: [],
};

/**
 * Pending login data for retry/recovery
 */
export interface PendingLogin {
  id: string;
  loginData: Partial<LoginData>;
  timestamp: number;
  retryCount: number;
}

/**
 * Service Worker session state
 * Stored in chrome.storage.session for persistence across SW restarts
 */
export interface ServiceWorkerState {
  /** Last active tab ID */
  lastActiveTabId?: number;
  /** Pending logins awaiting retry */
  pendingLogins: PendingLogin[];
  /** Whether config has been loaded this session */
  configLoaded: boolean;
  /** Last successful API communication timestamp */
  lastApiSuccess?: number;
  /** Service Worker initialization timestamp */
  initTimestamp: number;
}

/**
 * Default Service Worker state
 */
export const DEFAULT_SW_STATE: ServiceWorkerState = {
  pendingLogins: [],
  configLoaded: false,
  initTimestamp: Date.now(),
};

// ============================================
// Time Tracking Types (Phase 4)
// ============================================

/**
 * Represents a single usage session for a domain
 */
export interface UsageSession {
  /** Domain being tracked */
  domain: string;
  /** Session start timestamp (ms) */
  startTime: number;
  /** Session end timestamp (ms), undefined if ongoing */
  endTime?: number;
  /** Duration in seconds */
  duration: number;
}

/**
 * Aggregated usage data for a single domain
 */
export interface DomainUsage {
  /** Domain name */
  domain: string;
  /** Total usage time in seconds */
  totalSeconds: number;
  /** Last activity timestamp */
  lastActive: number;
  /** Individual sessions (kept for detailed analytics) */
  sessions: UsageSession[];
}

/**
 * Daily usage data container
 */
export interface DailyUsage {
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Usage data per domain */
  domains: Record<string, DomainUsage>;
  /** Total seconds across all domains for this day */
  totalSeconds: number;
}

/**
 * Complete time tracking state
 * Stored in chrome.storage.local for persistence
 */
export interface TimeTrackingState {
  /** Currently active session, if any */
  currentSession?: UsageSession;
  /** Daily usage data, keyed by YYYY-MM-DD */
  dailyUsage: Record<string, DailyUsage>;
  /** Last time data was synced to storage */
  lastSyncTime: number;
  /** Flag for Phase 5 Backend sync */
  pendingSync?: boolean;
  /** Timestamp of last Backend sync (Phase 5) */
  syncedAt?: number;
}

/**
 * Default time tracking state
 */
export const DEFAULT_TIME_TRACKING_STATE: TimeTrackingState = {
  dailyUsage: {},
  lastSyncTime: Date.now(),
  pendingSync: false,
};

/**
 * Usage statistics summary
 */
export interface UsageStats {
  /** Total usage time in seconds */
  totalSeconds: number;
  /** Usage breakdown by domain */
  byDomain: Array<{
    domain: string;
    seconds: number;
    percentage: number;
  }>;
  /** Number of days in the stats period */
  daysCount: number;
  /** Start date of the stats period */
  startDate: string;
  /** End date of the stats period */
  endDate: string;
}

// ============================================
// Whitelist & Sync Types (Phase 5)
// ============================================

/**
 * Single domain entry in the whitelist
 */
export interface WhitelistDomain {
  /** Domain pattern (e.g., "*.salesforce.com") */
  pattern: string;
  /** Display name for UI */
  name: string;
  /** Whether this domain is enabled */
  enabled: boolean;
  /** When this entry was added */
  addedAt: number;
  /** Source: 'default' for manifest domains, 'user' for user-added, 'backend' for synced */
  source: "default" | "user" | "backend";
}

/**
 * Whitelist state stored in chrome.storage.local
 */
export interface WhitelistState {
  /** List of whitelisted domains */
  domains: WhitelistDomain[];
  /** Last sync timestamp with backend */
  lastSyncTime: number;
  /** Whether there are pending changes to sync */
  pendingSync: boolean;
}

/**
 * SaaS Category for grouping domains
 */
export type SaaSCategory =
  | "productivity"
  | "collaboration"
  | "crm"
  | "identity"
  | "ai-chatbot"
  | "ai-coding"
  | "ai-image"
  | "ai-video"
  | "ai-voice"
  | "ai-writing"
  | "ai-productivity"
  | "ai-research"
  | "ai-design"
  | "ai-automation"
  | "ai-translation"
  | "storage"
  | "communication";

/**
 * Extended whitelist domain with category
 */
export interface ExtendedWhitelistDomain extends WhitelistDomain {
  /** Category for grouping */
  category?: SaaSCategory;
}

/**
 * Default whitelist domains - Empty by default
 * All whitelist domains are managed by Admin UI
 */
export const DEFAULT_WHITELIST_DOMAINS: WhitelistDomain[] = [];

/**
 * Default whitelist state
 */
export const DEFAULT_WHITELIST_STATE: WhitelistState = {
  domains: DEFAULT_WHITELIST_DOMAINS,
  lastSyncTime: 0,
  pendingSync: false,
};

/**
 * Sync status information
 */
export interface SyncStatus {
  /** Whether sync is currently in progress */
  syncing: boolean;
  /** Last successful sync timestamp */
  lastSyncTime: number;
  /** Last sync error, if any */
  lastError?: string;
  /** Number of pending items to sync */
  pendingCount: number;
}

/**
 * State for exponential backoff retry strategy
 */
export interface BackoffState {
  /** Number of consecutive sync failures */
  consecutiveFailures: number;
  /** Current effective interval in minutes (after backoff) */
  currentInterval: number;
  /** Base interval from Remote Config (minutes) */
  baseInterval: number;
  /** Maximum backoff interval (60 minutes) */
  maxInterval: number;
}

/**
 * Time tracking sync payload for backend
 */
export interface TimeTrackingSyncPayload {
  /** Device ID */
  deviceId: string;
  /** Daily usage data to sync */
  dailyUsage: DailyUsage[];
  /** Timestamp of this sync request */
  syncTimestamp: number;
}

/**
 * Whitelist sync payload for backend
 */
export interface WhitelistSyncPayload {
  /** Device ID */
  deviceId: string;
  /** User-added domains to sync */
  userDomains: WhitelistDomain[];
  /** Timestamp of this sync request */
  syncTimestamp: number;
}

// ============================================
// Blacklist Types (Domain Blocking)
// ============================================

/**
 * Single domain entry in the blacklist
 */
export interface BlacklistDomain {
  /** Unique ID from backend */
  id?: number;
  /** Domain pattern (e.g., "*.blocked.com") */
  pattern: string;
  /** Display name for UI */
  name: string;
  /** Why this domain is blocked */
  reason?: string;
  /** Whether this blocking rule is enabled */
  enabled: boolean;
  /** When this entry was added (Unix timestamp) */
  addedAt: number;
  /** Who added this entry */
  addedBy?: string;
}

/**
 * Blacklist state stored in chrome.storage.local
 */
export interface BlacklistState {
  /** List of blacklisted domains */
  domains: BlacklistDomain[];
  /** Last sync timestamp with backend */
  lastSyncTime: number;
  /** Version from backend for cache invalidation */
  version?: string;
}

/**
 * Default blacklist state
 */
export const DEFAULT_BLACKLIST_STATE: BlacklistState = {
  domains: [],
  lastSyncTime: 0,
};

/**
 * Result of checking if a domain is blocked
 */
export interface BlockCheckResult {
  /** Whether the domain is blocked */
  blocked: boolean;
  /** The matching blacklist entry, if blocked */
  matchedDomain?: BlacklistDomain;
}

// ============================================
// Remote Config Types (Auto-Deployment)
// ============================================

/**
 * Sync interval configuration (in minutes)
 */
export interface SyncIntervals {
  /** Blacklist sync interval (default: 5 min) */
  blacklist: number;
  /** Whitelist sync interval (default: 15 min) */
  whitelist: number;
  /** Usage data sync interval (default: 15 min) */
  usage: number;
  /** Remote config sync interval (default: 60 min) */
  config: number;
  /** Browsing log sync interval (default: 5 min) */
  browsingLog: number;
  /** Block log sync interval (default: 5 min) */
  blockLog: number;
}

/**
 * Feature flags for enabling/disabling extension features
 */
export interface FeatureFlags {
  /** Enable domain blocking feature */
  blocking: boolean;
  /** Enable time tracking feature */
  timeTracking: boolean;
  /** Enable HIBP password breach check */
  hibpCheck: boolean;
  /** Enable browser notifications */
  notifications: boolean;
  /** Enable captcha detection */
  captchaDetection: boolean;
}

/**
 * Filter configuration
 */
export interface FilterConfig {
  /** Username domain filters (e.g., ["@company.com"]) */
  usernameFilters: string[];
}

/**
 * Onboarding configuration from backend
 */
export interface OnboardingRemoteConfig {
  /** Whether onboarding is enabled */
  enabled: boolean;
}

/**
 * Remote configuration fetched from backend
 */
export interface RemoteConfig {
  /** Config version for cache invalidation */
  version: string;
  /** Sync intervals in minutes */
  syncIntervals: SyncIntervals;
  /** Feature flags */
  features: FeatureFlags;
  /** Filter configuration */
  filters: FilterConfig;
  /** Onboarding popup control */
  onboarding?: OnboardingRemoteConfig;
}

/**
 * Remote config state stored in chrome.storage.local
 */
export interface RemoteConfigState {
  /** Current remote configuration */
  config: RemoteConfig;
  /** Last sync timestamp with backend */
  lastSyncTime: number;
  /** Whether sync is pending */
  pendingSync: boolean;
}

/**
 * Default sync intervals
 */
export const DEFAULT_SYNC_INTERVALS: SyncIntervals = {
  blacklist: 5,
  whitelist: 15,
  usage: 15,
  config: 60,
  browsingLog: 5,
  blockLog: 5,
};

/**
 * Default feature flags
 */
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  blocking: true,
  timeTracking: true,
  hibpCheck: true,
  notifications: true,
  captchaDetection: true,
};

/**
 * Default filter config
 */
export const DEFAULT_FILTER_CONFIG: FilterConfig = {
  usernameFilters: [],
};

/**
 * Default remote configuration
 */
export const DEFAULT_REMOTE_CONFIG: RemoteConfig = {
  version: "1.0.0",
  syncIntervals: DEFAULT_SYNC_INTERVALS,
  features: DEFAULT_FEATURE_FLAGS,
  filters: DEFAULT_FILTER_CONFIG,
};

/**
 * Default remote config state
 */
export const DEFAULT_REMOTE_CONFIG_STATE: RemoteConfigState = {
  config: DEFAULT_REMOTE_CONFIG,
  lastSyncTime: 0,
  pendingSync: false,
};

// ============================================
// Browsing & Block Log Types (URL/Block Logging)
// ============================================

/**
 * Single browsing log entry for URL visit tracking
 */
export interface BrowsingLogEntry {
  /** Unique ID for this log entry */
  id: string;
  /** Full URL visited */
  url: string;
  /** Extracted domain from URL */
  domain: string;
  /** Timestamp of visit (Unix ms) */
  visitedAt: number;
  /** Whether domain is in whitelist */
  isWhitelisted: boolean;
  /** Whether domain is in blacklist */
  isBlacklisted: boolean;
  /** Whether this entry has been synced to backend */
  synced: boolean;
}

/**
 * Single block log entry for blocked URL tracking
 */
export interface BlockLogEntry {
  /** Unique ID for this log entry */
  id: string;
  /** Full URL that was blocked */
  url: string;
  /** Extracted domain from URL */
  domain: string;
  /** Reason for blocking (from blacklist) */
  blockReason: string;
  /** Timestamp of block event (Unix ms) */
  blockedAt: number;
  /** Whether this entry has been synced to backend */
  synced: boolean;
}

/**
 * State for browsing log storage
 */
export interface BrowsingLogState {
  /** All browsing log entries */
  logs: BrowsingLogEntry[];
  /** Last sync timestamp */
  lastSyncTime: number;
  /** Whether there are pending entries to sync */
  pendingSync: boolean;
}

/**
 * State for block log storage
 */
export interface BlockLogState {
  /** All block log entries */
  logs: BlockLogEntry[];
  /** Last sync timestamp */
  lastSyncTime: number;
  /** Whether there are pending entries to sync */
  pendingSync: boolean;
}

/**
 * Default browsing log state
 */
export const DEFAULT_BROWSING_LOG_STATE: BrowsingLogState = {
  logs: [],
  lastSyncTime: 0,
  pendingSync: false,
};

// ============================================
// Onboarding Types
// ============================================

/**
 * Onboarding state stored in chrome.storage.local
 */
export interface OnboardingState {
  /** Whether onboarding has been completed */
  completed: boolean;
  /** Email used for onboarding */
  email?: string;
  /** User ID from backend */
  userId?: string;
  /** User name from backend */
  userName?: string;
  /** Timestamp of completion */
  completedAt?: number;
}

/**
 * Default onboarding state
 */
export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  completed: false,
};

/**
 * Default block log state
 */
export const DEFAULT_BLOCK_LOG_STATE: BlockLogState = {
  logs: [],
  lastSyncTime: 0,
  pendingSync: false,
};

/**
 * Payload for syncing browsing logs to backend
 */
export interface BrowsingLogSyncPayload {
  /** Device ID */
  deviceId: string;
  /** User ID (from onboarding) */
  userId?: string;
  /** Logs to sync */
  logs: Array<{
    url: string;
    domain: string;
    visitedAt: string;
    isWhitelisted: boolean;
    isBlacklisted: boolean;
  }>;
}

/**
 * Payload for syncing block logs to backend
 */
export interface BlockLogSyncPayload {
  /** Device ID */
  deviceId: string;
  /** User ID (from onboarding) */
  userId?: string;
  /** Logs to sync */
  logs: Array<{
    url: string;
    domain: string;
    blockReason: string;
    blockedAt: string;
  }>;
}
