/**
 * Utility functions for the extension
 */

import {
  DEFAULT_CONFIG,
  ExtensionConfig,
  Message,
  MessageResponse,
  MessageRetryOptions,
} from "./types";

/** Default retry options */
const DEFAULT_RETRY_OPTIONS: Required<MessageRetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  timeoutMs: 10000,
};

/**
 * Legacy config interface for migration from older versions
 */
interface LegacyConfig extends ExtensionConfig {
  deviceId?: string;
}

/**
 * Generate a unique device ID
 */
export const generateDeviceId = (): string => {
  return (
    "device_" +
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

/**
 * Get the current domain from a URL
 */
export const getDomain = (url: string): string => {
  try {
    const urlObj = new URL(url);
    let port = urlObj.port;
    if (port == "") {
      port = urlObj.protocol == "https:" ? "443" : "80";
    }
    return urlObj.protocol + "//" + urlObj.hostname + ":" + port;
  } catch (e) {
    console.error("Invalid URL:", url);
    return "";
  }
};

/**
 * Interface for managed policy configuration
 * These values come from GPO/MDM and take precedence over local settings
 */
interface ManagedConfig {
  api_url?: string;
  api_token?: string;
  enabled?: boolean;
  locked?: boolean;
  device_id?: string;
  department?: string;
  blocking_enabled?: boolean;
  time_tracking_enabled?: boolean;
  hibp_check_enabled?: boolean;
  notifications_enabled?: boolean;
  username_filters?: string[];
  sync_interval_blacklist?: number;
  sync_interval_whitelist?: number;
  sync_interval_usage?: number;
  sync_interval_config?: number;
}

/**
 * Load managed configuration from chrome.storage.managed (GPO/MDM)
 * Returns empty object if no managed config or if API not available
 */
const loadManagedConfig = async (): Promise<ManagedConfig> => {
  return new Promise((resolve) => {
    try {
      if (!chrome.storage.managed) {
        resolve({});
        return;
      }
      chrome.storage.managed.get(null, (result) => {
        if (chrome.runtime.lastError) {
          // Managed storage not available or error
          resolve({});
          return;
        }
        resolve((result as ManagedConfig) || {});
      });
    } catch {
      resolve({});
    }
  });
};

/**
 * Load extension configuration from storage
 * Priority: managed (GPO/MDM) > local > defaults
 *
 * Managed policies from GPO/MDM always take precedence.
 * If 'locked' is true in managed config, popup should prevent user modifications.
 */
export const loadConfig = async (): Promise<ExtensionConfig> => {
  // Load managed config (GPO/MDM) - highest priority
  const managed = await loadManagedConfig();

  return new Promise((resolve) => {
    chrome.storage.local.get("config", (result) => {
      // Start with defaults
      let config: ExtensionConfig = { ...DEFAULT_CONFIG };

      // Apply local config (빈 값은 DEFAULT_CONFIG 유지)
      if (result.config) {
        const filtered = Object.fromEntries(
          Object.entries(result.config).filter(
            ([, v]) => v !== "" && v !== undefined && v !== null
          )
        );
        config = { ...config, ...filtered };
      }

      // Normalize legacy field name if present
      const legacyConfig = config as LegacyConfig;
      if (!config.id && legacyConfig.deviceId) {
        config.id = legacyConfig.deviceId;
        delete legacyConfig.deviceId;
      }

      // Apply managed config (overrides local settings)
      if (managed.api_url) {
        config.api = managed.api_url;
      }
      if (managed.api_token) {
        config.token = managed.api_token;
      }
      if (typeof managed.enabled === "boolean") {
        config.enabled = managed.enabled;
      }
      if (managed.device_id) {
        config.id = managed.device_id;
      }

      // Store locked status in config for popup to check
      if (typeof managed.locked === "boolean") {
        (config as ExtensionConfig & { locked?: boolean }).locked =
          managed.locked;
      }

      // Generate device ID if not present
      if (!config.id) {
        config.id = generateDeviceId();
        chrome.storage.local.set({ config });
      }

      resolve(config);
    });
  });
};

/**
 * Check if settings are locked by enterprise policy
 */
export const isSettingsLocked = async (): Promise<boolean> => {
  const managed = await loadManagedConfig();
  return managed.locked === true;
};

/**
 * Get managed feature flags from enterprise policy
 * Returns null for features not managed by policy
 */
export const getManagedFeatures = async (): Promise<{
  blocking?: boolean;
  timeTracking?: boolean;
  hibpCheck?: boolean;
  notifications?: boolean;
}> => {
  const managed = await loadManagedConfig();
  return {
    blocking: managed.blocking_enabled,
    timeTracking: managed.time_tracking_enabled,
    hibpCheck: managed.hibp_check_enabled,
    notifications: managed.notifications_enabled,
  };
};

/**
 * Get managed sync intervals from enterprise policy
 * Returns null for intervals not managed by policy
 */
export const getManagedSyncIntervals = async (): Promise<{
  blacklist?: number;
  whitelist?: number;
  usage?: number;
  config?: number;
}> => {
  const managed = await loadManagedConfig();
  return {
    blacklist: managed.sync_interval_blacklist,
    whitelist: managed.sync_interval_whitelist,
    usage: managed.sync_interval_usage,
    config: managed.sync_interval_config,
  };
};

/**
 * Save extension configuration to storage
 */
export const saveConfig = async (config: ExtensionConfig): Promise<void> => {
  return new Promise((resolve) => {
    chrome.storage.local.set({ config }, resolve);
  });
};

/**
 * Send data to the backend API
 */
export const sendToBackend = async (
  endpoint: string,
  data: Record<string, unknown>,
  apiUrl: string
): Promise<Response> => {
  const url = `${apiUrl}${endpoint}`;

  // Load token from config to include Authorization header when available
  let token = "";
  try {
    const config = await loadConfig();
    token = config.token || "";
  } catch (e) {
    // Ignore config load error; proceed without auth header
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });
};

/**
 * Sleep for a specified duration
 */
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wrap a promise with a timeout
 */
const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = "Operation timed out"
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
};

/**
 * Send a message to the background script with retry logic
 * Uses exponential backoff for retries
 */
export const sendMessageWithRetry = async (
  message: Message,
  options: MessageRetryOptions = {}
): Promise<MessageResponse> => {
  const { maxRetries, baseDelayMs, timeoutMs } = {
    ...DEFAULT_RETRY_OPTIONS,
    ...options,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await withTimeout(
        new Promise<MessageResponse>((resolve, reject) => {
          chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            resolve(response as MessageResponse);
          });
        }),
        timeoutMs,
        `Message timeout after ${timeoutMs}ms`
      );

      return response;
    } catch (error) {
      lastError = error as Error;

      // Don't retry on the last attempt
      if (attempt < maxRetries) {
        // Exponential backoff: baseDelay * 2^attempt
        const delay = baseDelayMs * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  // All retries failed
  return {
    success: false,
    error: lastError?.message || "Unknown error after retries",
  };
};
