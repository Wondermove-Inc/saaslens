/**
 * Background script for the extension
 * Implements Service Worker state management for Manifest V3
 */

import { API_PATHS } from "../shared/api-paths";
import {
  DEFAULT_ONBOARDING_STATE,
  DEFAULT_SW_STATE,
  LoginData,
  MessageType,
  OnboardingState,
  PendingLogin,
  RemoteConfig,
  ServiceWorkerState,
} from "../shared/types";
import { getDomain, loadConfig, sendToBackend } from "../shared/utils";
import { getBlacklistManager } from "./blacklist-manager";
import { getConfigManager } from "./config-manager";
import { getContentScriptInjector } from "./content-script-injector";
import { getTimeTracker, TimeTracker } from "./time-tracker";
import { getUrlLogger } from "./url-logger";
import { getWhitelistManager } from "./whitelist-manager";

/** Storage key for Service Worker state */
const SW_STATE_KEY = "swState";

/** Maximum retry attempts for pending logins */
const MAX_RETRY_COUNT = 3;

/** Retry delay in milliseconds (exponential backoff base) */
const _RETRY_DELAY_BASE = 1000;

/**
 * Generate a unique ID for pending logins
 */
const generatePendingId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Load Service Worker state from session storage
 */
export const loadSWState = async (): Promise<ServiceWorkerState> => {
  try {
    const result = await chrome.storage.session.get(SW_STATE_KEY);
    if (result[SW_STATE_KEY]) {
      return result[SW_STATE_KEY] as ServiceWorkerState;
    }
  } catch (error) {
    console.error("Failed to load SW state:", error);
  }
  return { ...DEFAULT_SW_STATE, initTimestamp: Date.now() };
};

/**
 * Save Service Worker state to session storage
 */
export const saveSWState = async (
  state: Partial<ServiceWorkerState>
): Promise<void> => {
  try {
    const currentState = await loadSWState();
    const newState = { ...currentState, ...state };
    await chrome.storage.session.set({ [SW_STATE_KEY]: newState });
  } catch (error) {
    console.error("Failed to save SW state:", error);
  }
};

/**
 * Add a pending login for retry
 */
export const addPendingLogin = async (
  loginData: Partial<LoginData>
): Promise<string> => {
  const state = await loadSWState();
  const id = generatePendingId();
  const pendingLogin: PendingLogin = {
    id,
    loginData,
    timestamp: Date.now(),
    retryCount: 0,
  };
  state.pendingLogins.push(pendingLogin);
  await saveSWState({ pendingLogins: state.pendingLogins });
  return id;
};

/**
 * Remove a pending login after successful processing
 */
export const removePendingLogin = async (id: string): Promise<void> => {
  const state = await loadSWState();
  state.pendingLogins = state.pendingLogins.filter((p) => p.id !== id);
  await saveSWState({ pendingLogins: state.pendingLogins });
};

/**
 * Process pending logins with retry logic
 */
export const processPendingLogins = async (): Promise<void> => {
  const state = await loadSWState();
  const config = await loadConfig();

  if (!config.enabled || state.pendingLogins.length === 0) {
    return;
  }

  for (const pending of state.pendingLogins) {
    if (pending.retryCount >= MAX_RETRY_COUNT) {
      // Max retries exceeded, remove from queue
      await removePendingLogin(pending.id);
      continue;
    }

    try {
      await handleLoginDetected(
        pending.loginData,
        config.api,
        config.id,
        config.filters
      );
      // Success - remove from queue
      await removePendingLogin(pending.id);
      await saveSWState({ lastApiSuccess: Date.now() });
    } catch (error) {
      // Increment retry count
      pending.retryCount++;
      const updatedState = await loadSWState();
      const idx = updatedState.pendingLogins.findIndex(
        (p) => p.id === pending.id
      );
      if (idx !== -1) {
        updatedState.pendingLogins[idx] = pending;
        await saveSWState({ pendingLogins: updatedState.pendingLogins });
      }
    }
  }
};

export async function sha(mode: string, input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest(mode, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Handle login detection
 */
export const handleLoginDetected = async (
  partialLoginData: Partial<LoginData>,
  apiUrl: string,
  deviceId: string,
  filters: string[]
): Promise<void> => {
  try {
    // Complete the login data
    // capturedTime: Unix timestamp (ms) to match API schema
    // authType: UPPERCASE to match API enum (PASSWORD, MAGIC_LINK, OAUTH, SSO)
    const loginData: LoginData = {
      domain: partialLoginData.domain || "",
      username: partialLoginData.username || "",
      password: partialLoginData.password || "",
      deviceId: deviceId,
      capturedTime: Date.now().toString(),
      authType:
        partialLoginData.authType ||
        (partialLoginData.password ? "PASSWORD" : "MAGIC_LINK"),
    };

    if (Array.isArray(filters) && filters.length > 0) {
      let found = false;

      for (const filter of filters) {
        if (loginData.username.includes(filter)) {
          found = true;
          break;
        }
      }

      if (!found) {
        return;
      }
    }

    // only send the credentials when it's either localhost or a secure remote endpoint
    if (!apiUrl.startsWith("https://") && !apiUrl.includes("localhost")) {
      console.error(
        "Refusing to send credentials to insecure endpoint: ",
        apiUrl
      );
      return;
    }

    // calculate the hash of this
    const hashedPassword = await sha("SHA-512", loginData.password);

    // send to backend
    // captured_at: must be number (Unix timestamp ms) for API schema
    // auth_type: ensure UPPERCASE for API enum validation
    const response = await sendToBackend(
      "/api/creds/register",
      {
        domain: loginData.domain,
        username: loginData.username,
        password_hash: hashedPassword,
        device_id: loginData.deviceId,
        captured_at: parseInt(
          loginData.capturedTime || Date.now().toString(),
          10
        ),
        auth_type: loginData.authType?.toUpperCase() || "PASSWORD",
      },
      apiUrl
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to send login data:", errorData);
      return;
    }

    // Process the response for HIBP information
    try {
      const responseData = await response.json();

      if (
        responseData.hibp &&
        responseData.hibp.checked &&
        responseData.hibp.breached
      ) {
        // Password was found in HIBP database - show notification to user
        try {
          chrome.notifications.create({
            type: "basic",
            iconUrl: chrome.runtime.getURL("icons/icon48.svg"),
            title: "Password Security Warning!",
            message: `Your password for ${loginData.domain} has been found in ${responseData.hibp.breach_count} data breach(es). Consider changing it immediately.`,
            priority: 2,
          });
        } catch (notificationError) {
          console.error(
            "Failed to create HIBP notification:",
            notificationError
          );
        }
      }
    } catch (parseError) {
      console.error("Failed to parse backend response:", parseError);
    }
  } catch (error) {
    console.error("Error handling login detection:", error);
  }
};

/** Storage key for onboarding state */
const ONBOARDING_STATE_KEY = "onboardingState";

/**
 * Load onboarding state from local storage
 */
const loadOnboardingState = async (): Promise<OnboardingState> => {
  return new Promise((resolve) => {
    chrome.storage.local.get(ONBOARDING_STATE_KEY, (result) => {
      resolve(
        (result[ONBOARDING_STATE_KEY] as OnboardingState) ||
          DEFAULT_ONBOARDING_STATE
      );
    });
  });
};

/**
 * Check if onboarding is completed
 */
const isOnboardingCompleted = async (): Promise<boolean> => {
  const state = await loadOnboardingState();
  return state.completed;
};

/**
 * Determine whether to show the onboarding popup.
 * Returns true when onboarding is not yet completed locally.
 */
function shouldShowOnboarding(onboardingState: OnboardingState): boolean {
  return !onboardingState.completed;
}

/**
 * Open onboarding page if conditions are met.
 * Ensures only a single onboarding tab exists at a time:
 * - If the tab is already open, brings it into focus.
 * - If not, opens a new tab.
 * Does nothing when onboarding is already completed.
 */
const openOnboardingPageIfNeeded = async (): Promise<void> => {
  const onboardingState = await loadOnboardingState();

  if (!shouldShowOnboarding(onboardingState)) return;

  const onboardingUrl = chrome.runtime.getURL("onboarding.html");
  const existingTabs = await chrome.tabs.query({ url: onboardingUrl });

  if (existingTabs.length > 0 && existingTabs[0].id != null) {
    await chrome.tabs.update(existingTabs[0].id, { active: true });
  } else {
    await chrome.tabs.create({ url: onboardingUrl });
  }
};

/**
 * Parse browser name and version from User-Agent string
 */
const parseBrowserInfo = (): string => {
  const ua = navigator.userAgent;
  // Check in order of specificity
  if (ua.includes("Edg/")) {
    const match = ua.match(/Edg\/([\d.]+)/);
    return `Edge ${match?.[1] ?? ""}`.trim();
  }
  if (ua.includes("Chrome/")) {
    const match = ua.match(/Chrome\/([\d.]+)/);
    return `Chrome ${match?.[1] ?? ""}`.trim();
  }
  if (ua.includes("Firefox/")) {
    const match = ua.match(/Firefox\/([\d.]+)/);
    return `Firefox ${match?.[1] ?? ""}`.trim();
  }
  if (ua.includes("Safari/") && !ua.includes("Chrome")) {
    const match = ua.match(/Version\/([\d.]+)/);
    return `Safari ${match?.[1] ?? ""}`.trim();
  }
  return "Unknown";
};

/**
 * Get OS info from navigator.platform or userAgentData
 */
const getOsInfo = (): string => {
  // Prefer userAgentData if available (Chromium 90+)
  const uaData = (
    navigator as unknown as { userAgentData?: { platform?: string } }
  ).userAgentData;
  if (uaData?.platform) {
    return uaData.platform;
  }
  // Fallback to navigator.platform
  const platform = navigator.platform || "";
  if (platform.startsWith("Win")) return "Windows";
  if (platform.startsWith("Mac")) return "macOS";
  if (platform.startsWith("Linux")) return "Linux";
  if (platform.includes("CrOS")) return "ChromeOS";
  return platform || "Unknown";
};

/**
 * Send heartbeat to backend
 */
const sendHeartbeat = async (): Promise<void> => {
  try {
    const config = await loadConfig();
    if (!config.enabled || !config.api) return;

    await sendToBackend(
      API_PATHS.HEARTBEAT,
      {
        device_id: config.id,
        extension_version: chrome.runtime.getManifest().version,
        browser_info: parseBrowserInfo(),
        os_info: getOsInfo(),
      },
      config.api
    );
  } catch (error) {
    console.error("Heartbeat error:", error);
  }
};

/**
 * Initialize the background script
 * Handles Service Worker lifecycle and state restoration
 */
export const initialize = async (): Promise<void> => {
  // Initialize Service Worker state (ensure state is loaded)
  await loadSWState();

  // Mark config as loaded and update init timestamp
  await saveSWState({
    configLoaded: true,
    initTimestamp: Date.now(),
  });

  // Load or initialize configuration
  await loadConfig();

  // Note: onboarding page is opened exclusively via chrome.runtime.onInstalled listener
  // to prevent duplicate tabs on first install (race condition between initialize() and onInstalled)

  // Process any pending logins from previous session
  await processPendingLogins();

  // Set up message listener using the recommended pattern for Manifest V3
  // This approach properly handles asynchronous responses in service workers
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Create a promise to handle the message asynchronously
    const responsePromise = (async () => {
      try {
        // Load configuration
        const config = await loadConfig();

        // Skip processing if extension is disabled
        if (!config.enabled) {
          return { success: false, error: "Extension is disabled" };
        }

        // Handle onboarding messages regardless of data gate
        if (message.type === MessageType.GET_ONBOARDING_STATUS) {
          const obState = await loadOnboardingState();
          return { success: true, data: obState };
        }
        if (message.type === MessageType.ONBOARDING_COMPLETE) {
          // Onboarding completed from onboarding page
          return { success: true };
        }

        // Data gate: block data collection until onboarding is completed
        const onboarded = await isOnboardingCompleted();
        if (!onboarded) {
          return {
            success: false,
            error: "Onboarding not completed",
          };
        }

        switch (message.type) {
          case MessageType.LOGIN_DETECTED: {
            // Add to pending queue first for reliability
            const pendingId = await addPendingLogin(message.data);
            try {
              await handleLoginDetected(
                message.data,
                config.api,
                config.id,
                config.filters
              );
              // Success - remove from pending queue
              await removePendingLogin(pendingId);
              await saveSWState({ lastApiSuccess: Date.now() });
            } catch (error) {
              // Keep in pending queue for retry
              console.error("Login handling failed, queued for retry:", error);
            }
            return { success: true };
          }

          case MessageType.GET_DEVICE_ID:
            return { success: true, data: { deviceId: config.id } };

          case MessageType.HEALTH_CHECK: {
            // Return service worker health status
            const swState = await loadSWState();
            return {
              success: true,
              data: {
                enabled: config.enabled,
                pendingLogins: swState.pendingLogins.length,
                lastApiSuccess: swState.lastApiSuccess,
                initTimestamp: swState.initTimestamp,
              },
            };
          }

          case MessageType.CONFIG_UPDATED:
            // Acknowledge config update and trigger any necessary refresh
            return { success: true };

          case MessageType.GET_TODAY_USAGE: {
            const tracker = await getTimeTracker();
            const stats = await tracker.getTodayUsage();
            return { success: true, data: stats };
          }

          case MessageType.GET_WEEKLY_USAGE: {
            const tracker = await getTimeTracker();
            const stats = await tracker.getWeeklyUsage();
            return { success: true, data: stats };
          }

          case MessageType.GET_USAGE_STATS: {
            const tracker = await getTimeTracker();
            const days = (message.data as { days?: number })?.days || 7;
            const stats = await tracker.getUsageStats(days);
            return { success: true, data: stats };
          }

          // Phase 5: Whitelist & Sync
          case MessageType.GET_WHITELIST: {
            const whitelistManager = await getWhitelistManager();
            const domains = await whitelistManager.getDomains();
            const status = await whitelistManager.getSyncStatus();
            return {
              success: true,
              data: {
                domains,
                lastSyncTime: status.lastSyncTime,
              },
            };
          }

          case MessageType.UPDATE_WHITELIST: {
            const whitelistManager = await getWhitelistManager();
            const { action, pattern, name, enabled } = message.data as {
              action: "add" | "remove" | "toggle";
              pattern?: string;
              name?: string;
              enabled?: boolean;
            };

            let result = false;
            switch (action) {
              case "add":
                if (pattern && name) {
                  result = await whitelistManager.addDomain(pattern, name);
                }
                break;
              case "remove":
                if (pattern) {
                  result = await whitelistManager.removeDomain(pattern);
                }
                break;
              case "toggle":
                if (pattern && enabled !== undefined) {
                  result = await whitelistManager.setDomainEnabled(
                    pattern,
                    enabled
                  );
                }
                break;
            }
            return { success: result };
          }

          case MessageType.SYNC_TIME_TRACKING: {
            const tracker = await getTimeTracker();
            const syncStatus = await tracker.syncToBackend();
            return { success: !syncStatus.lastError, data: syncStatus };
          }

          case MessageType.GET_SYNC_STATUS: {
            const tracker = await getTimeTracker();
            const whitelistManager = await getWhitelistManager();
            const blacklistManager = await getBlacklistManager();
            const urlLoggerStatus = await getUrlLogger();
            const [timeStatus, whitelistStatus, blacklistStatus] =
              await Promise.all([
                tracker.getSyncStatus(),
                whitelistManager.getSyncStatus(),
                blacklistManager.getSyncStatus(),
              ]);
            return {
              success: true,
              data: {
                timeTracking: timeStatus,
                whitelist: whitelistStatus,
                blacklist: blacklistStatus,
                browsingLog: urlLoggerStatus.getSyncStatus(),
                blockLog: urlLoggerStatus.getBlockSyncStatus(),
              },
            };
          }

          // Phase 9: Blacklist / Domain Blocking
          case MessageType.GET_BLACKLIST: {
            const blacklistManager = await getBlacklistManager();
            const domains = blacklistManager.getDomains();
            const status = blacklistManager.getSyncStatus();
            return {
              success: true,
              data: {
                domains,
                lastSyncTime: status.lastSyncTime,
              },
            };
          }

          case MessageType.CHECK_DOMAIN_BLOCKED: {
            const blacklistManager = await getBlacklistManager();
            const { domain } = message.data as { domain: string };
            const result = blacklistManager.checkDomain(domain);
            return { success: true, data: result };
          }

          case MessageType.SYNC_BLACKLIST: {
            const blacklistManager = await getBlacklistManager();
            const syncStatus = await blacklistManager.syncFromBackend();
            return { success: !syncStatus.lastError, data: syncStatus };
          }

          case MessageType.SEND_HEARTBEAT: {
            await sendHeartbeat();
            return { success: true };
          }

          // URL/Block Logging
          case MessageType.GET_URL_LOG_STATS: {
            const urlLogger = await getUrlLogger();
            const stats = urlLogger.getLogStats();
            return { success: true, data: stats };
          }

          case MessageType.SYNC_URL_LOGS: {
            const urlLogger = await getUrlLogger();
            await urlLogger.syncAllLogs();
            return {
              success: true,
              data: {
                browsing: urlLogger.getSyncStatus(),
                block: urlLogger.getBlockSyncStatus(),
              },
            };
          }

          case MessageType.GET_URL_LOG_SYNC_STATUS: {
            const urlLogger = await getUrlLogger();
            return {
              success: true,
              data: {
                browsing: urlLogger.getSyncStatus(),
                block: urlLogger.getBlockSyncStatus(),
              },
            };
          }

          default:
            console.warn("Unknown message type:", message.type);
            return { success: false, error: "Unknown message type" };
        }
      } catch (error) {
        console.error("Error handling message:", error);
        return { success: false, error: "Internal error" };
      }
    })();

    // Send the response when the promise resolves
    // This is the key part of the fix - we chain the sendResponse to the promise resolution
    responsePromise.then(sendResponse);

    // Return true to indicate we will send a response asynchronously
    // This is required when using asynchronous sendResponse in Manifest V3
    return true;
  });

  // Set up alarm listener
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "processPendingLogins") {
      processPendingLogins();
    }
    if (alarm.name === "timeTrackingSave") {
      // Periodic save of time tracking data
      getTimeTracker().then((tracker) => tracker.saveToStorage());
    }
    if (alarm.name === "timeTrackingCleanup") {
      // Daily cleanup of old data
      getTimeTracker().then((tracker) => tracker.cleanupOldData());
    }
    if (alarm.name === "dataSync") {
      // Periodic sync to backend (Phase 5) + heartbeat
      Promise.all([
        getTimeTracker().then((tracker) => tracker.syncToBackend()),
        getWhitelistManager().then((manager) => manager.syncToBackend()),
        sendHeartbeat(),
      ]).catch((error) => console.error("Data sync error:", error));
    }
    if (alarm.name === "whitelistSync") {
      // Periodic whitelist sync from backend (Admin → Extension)
      getWhitelistManager()
        .then((manager) => manager.syncFromBackend())
        .catch((error) => console.error("Whitelist sync error:", error));
    }
    if (alarm.name === "blacklistSync") {
      // Periodic blacklist sync from backend (Phase 9)
      getBlacklistManager()
        .then((manager) => manager.syncFromBackend())
        .catch((error) => console.error("Blacklist sync error:", error));
    }
    if (alarm.name === "configSync") {
      // Periodic remote config sync — re-check onboarding after sync
      getConfigManager()
        .then((manager) =>
          manager.syncFromBackend().then(() => openOnboardingPageIfNeeded())
        )
        .catch((error) => console.error("Config sync error:", error));
    }
    if (alarm.name === "browsingLogSync") {
      // Periodic browsing log sync with backoff
      getUrlLogger()
        .then(async (logger) => {
          await logger.syncBrowsingLogs();
          // Recreate alarm with backoff interval if failure occurred
          const backoff = logger.getBrowsingBackoff();
          if (backoff.consecutiveFailures > 0) {
            await chrome.alarms.clear("browsingLogSync");
            chrome.alarms.create("browsingLogSync", {
              periodInMinutes: backoff.currentInterval,
            });
          }
        })
        .catch((error) => console.error("Browsing log sync error:", error));
    }
    if (alarm.name === "blockLogSync") {
      // Periodic block log sync with backoff
      getUrlLogger()
        .then(async (logger) => {
          await logger.syncBlockLogs();
          // Recreate alarm with backoff interval if failure occurred
          const backoff = logger.getBlockBackoff();
          if (backoff.consecutiveFailures > 0) {
            await chrome.alarms.clear("blockLogSync");
            chrome.alarms.create("blockLogSync", {
              periodInMinutes: backoff.currentInterval,
            });
          }
        })
        .catch((error) => console.error("Block log sync error:", error));
    }
    if (alarm.name === "heartbeat") {
      sendHeartbeat();
    }
  });

  // Initialize alarms with dynamic intervals from ConfigManager
  await initializeAlarms();

  // Initialize time tracker
  await initializeTimeTracking();

  // Initialize ConfigManager with initial sync
  const configManager = await getConfigManager();
  configManager
    .syncFromBackend()
    .catch((error) => console.error("Initial config sync error:", error));

  // Initialize blacklist with initial sync
  const blacklistManager = await getBlacklistManager();
  blacklistManager
    .syncFromBackend()
    .catch((error) => console.error("Initial blacklist sync error:", error));

  // Initialize content script injector (Phase 2 - Dynamic Script Injection)
  const contentScriptInjector = await getContentScriptInjector();
  console.log(
    `ContentScriptInjector initialized with ${contentScriptInjector.getRegisteredCount()} registered domains`
  );

  // Initialize whitelist with initial sync from backend
  // This will also sync the content script injector
  const whitelistManager = await getWhitelistManager();
  whitelistManager
    .syncFromBackend()
    .catch((error) => console.error("Initial whitelist sync error:", error));
};

/**
 * Initialize time tracking with tab event listeners
 */
const initializeTimeTracking = async (): Promise<void> => {
  const tracker = await getTimeTracker();

  // Track active tab changes
  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      await handleTabActivation(tracker, tab);
    } catch (error) {
      // Tab might have been closed
      console.error("Error handling tab activation:", error);
    }
  });

  // Track URL changes within a tab
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.active) {
      await handleTabActivation(tracker, tab);
    }
  });

  // Track tab removal
  chrome.tabs.onRemoved.addListener(async () => {
    // End session when active tab is closed
    // Check if any tracked domain tab is still active
    try {
      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!activeTab?.url) {
        await tracker.endSession();
      }
    } catch (error) {
      console.error("Error handling tab removal:", error);
    }
  });

  // Track window focus changes
  chrome.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      // Browser lost focus - end session
      await tracker.endSession();
    } else {
      // Browser gained focus - start tracking active tab
      try {
        const [activeTab] = await chrome.tabs.query({ active: true, windowId });
        if (activeTab) {
          await handleTabActivation(tracker, activeTab);
        }
      } catch (error) {
        console.error("Error handling window focus change:", error);
      }
    }
  });

  // Start tracking current active tab
  try {
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (activeTab) {
      await handleTabActivation(tracker, activeTab);
    }
  } catch (error) {
    console.error("Error initializing time tracking:", error);
  }
};

/**
 * Handle tab activation for time tracking and URL logging
 */
const handleTabActivation = async (
  tracker: TimeTracker,
  tab: chrome.tabs.Tab
): Promise<void> => {
  if (!tab.url) {
    return;
  }

  // Data gate: skip tracking if onboarding not completed
  const onboarded = await isOnboardingCompleted();
  if (!onboarded) {
    return;
  }

  const domain = getDomain(tab.url);
  if (!domain) {
    // Not a trackable URL (e.g., chrome:// pages)
    await tracker.endSession();
    return;
  }

  // Log the URL visit
  try {
    const urlLogger = await getUrlLogger();
    await urlLogger.logVisit(tab.url);
  } catch (logError) {
    console.error("Failed to log URL visit:", logError);
  }

  // Start tracking this domain
  await tracker.startSession(domain);
};

/**
 * Initialize alarms with intervals from ConfigManager
 * Called on startup and when config changes
 */
const initializeAlarms = async (): Promise<void> => {
  // Get ConfigManager and sync intervals
  const configManager = await getConfigManager();
  const intervals = configManager.getSyncIntervals();

  // Clear existing alarms and recreate with new intervals
  await chrome.alarms.clearAll();

  // Fixed alarms
  chrome.alarms.create("processPendingLogins", { periodInMinutes: 1 });
  chrome.alarms.create("timeTrackingSave", { periodInMinutes: 5 });
  chrome.alarms.create("timeTrackingCleanup", { periodInMinutes: 60 * 24 }); // Daily

  // Dynamic alarms based on remote config
  chrome.alarms.create("blacklistSync", {
    periodInMinutes: intervals.blacklist,
  });
  chrome.alarms.create("whitelistSync", {
    periodInMinutes: intervals.whitelist,
  }); // Admin → Extension
  chrome.alarms.create("dataSync", { periodInMinutes: intervals.usage }); // Usage & whitelist (Extension → Admin)
  chrome.alarms.create("configSync", { periodInMinutes: intervals.config });
  chrome.alarms.create("browsingLogSync", {
    periodInMinutes: intervals.browsingLog,
  });
  chrome.alarms.create("blockLogSync", {
    periodInMinutes: intervals.blockLog,
  });
  chrome.alarms.create("heartbeat", { periodInMinutes: 5 }); // Heartbeat every 5 minutes

  console.log("Alarms initialized with intervals:", intervals);

  // Register listener for config changes to update alarms
  configManager.addChangeListener(handleConfigChange);
};

/**
 * Handle remote config changes
 * Reinitialize alarms when sync intervals change
 */
const handleConfigChange = async (newConfig: RemoteConfig): Promise<void> => {
  console.log(
    "Remote config changed, reinitializing alarms:",
    newConfig.version
  );

  // Reinitialize alarms with new intervals
  const configManager = await getConfigManager();
  const intervals = configManager.getSyncIntervals();

  // Clear and recreate dynamic alarms
  await chrome.alarms.clear("blacklistSync");
  await chrome.alarms.clear("whitelistSync");
  await chrome.alarms.clear("dataSync");
  await chrome.alarms.clear("configSync");
  await chrome.alarms.clear("browsingLogSync");
  await chrome.alarms.clear("blockLogSync");

  chrome.alarms.create("blacklistSync", {
    periodInMinutes: intervals.blacklist,
  });
  chrome.alarms.create("whitelistSync", {
    periodInMinutes: intervals.whitelist,
  });
  chrome.alarms.create("dataSync", { periodInMinutes: intervals.usage });
  chrome.alarms.create("configSync", { periodInMinutes: intervals.config });
  chrome.alarms.create("browsingLogSync", {
    periodInMinutes: intervals.browsingLog,
  });
  chrome.alarms.create("blockLogSync", {
    periodInMinutes: intervals.blockLog,
  });

  // Update URL logger intervals (resets backoff if interval changed)
  const urlLogger = await getUrlLogger();
  urlLogger.updateIntervals(intervals.browsingLog, intervals.blockLog);

  console.log("Alarms updated with new intervals:", intervals);
};

/**
 * Initialize blacklist domain blocking via webNavigation API
 * This checks ALL page navigations and redirects blocked domains to blocked.html
 */
const initializeBlacklistBlocking = async (): Promise<void> => {
  // Check domains on navigation completed
  chrome.webNavigation.onCommitted.addListener(async (details) => {
    // Only check main frame navigations (not iframes)
    if (details.frameId !== 0) {
      return;
    }

    // Skip chrome:// and extension pages
    if (
      !details.url.startsWith("http://") &&
      !details.url.startsWith("https://")
    ) {
      return;
    }

    // Skip the blocked page itself to prevent infinite loop
    if (details.url.includes("blocked.html")) {
      return;
    }

    try {
      // Extract hostname only (not full URL with protocol/port)
      const urlObj = new URL(details.url);
      const hostname = urlObj.hostname;
      if (!hostname) {
        return;
      }

      // Check if domain is blacklisted
      const blacklistManager = await getBlacklistManager();
      const result = blacklistManager.checkDomain(hostname);

      if (result.blocked && result.matchedDomain) {
        console.log(
          `Blocking access to: ${hostname} (matched: ${result.matchedDomain.pattern})`
        );

        // Log the block event
        const reason =
          result.matchedDomain.reason ||
          "This website has been blocked by your organization's security policy.";

        try {
          const urlLogger = await getUrlLogger();
          await urlLogger.logBlock(details.url, reason);
        } catch (logError) {
          console.error("Failed to log block event:", logError);
        }

        // Redirect to blocked page
        const blockedPageUrl = chrome.runtime.getURL("blocked.html");
        const redirectUrl = `${blockedPageUrl}?domain=${encodeURIComponent(hostname)}&reason=${encodeURIComponent(reason)}`;

        await chrome.tabs.update(details.tabId, { url: redirectUrl });
      }
    } catch (error) {
      console.error("Error checking domain blacklist:", error);
    }
  });

  console.log("Blacklist blocking initialized");
};

/** Alarm name for periodic onboarding check */
const ONBOARDING_CHECK_ALARM = "onboarding-check";

/** How often (in minutes) to re-check onboarding completion */
const ONBOARDING_CHECK_INTERVAL_MINUTES = 60;

// Listen for extension install event
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    // First install - open onboarding page (single-tab guaranteed)
    await openOnboardingPageIfNeeded();
    // Schedule periodic re-check in case user closed the tab without completing
    chrome.alarms.create(ONBOARDING_CHECK_ALARM, {
      periodInMinutes: ONBOARDING_CHECK_INTERVAL_MINUTES,
    });
  }
});

// Re-check onboarding on every browser startup
chrome.runtime.onStartup.addListener(async () => {
  await openOnboardingPageIfNeeded();
});

// Periodic alarm: re-open onboarding tab if still not completed
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ONBOARDING_CHECK_ALARM) {
    await openOnboardingPageIfNeeded();
  }
});

// Start the background script (skip during tests)
if (typeof jest === "undefined") {
  initialize();
  initializeBlacklistBlocking();
}
