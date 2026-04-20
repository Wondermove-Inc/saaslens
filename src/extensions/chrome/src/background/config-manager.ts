/**
 * Config Manager - Handles remote configuration synchronization
 * Syncs with backend and provides feature flags and sync intervals
 */

import { API_PATHS } from "../shared/api-paths";
import {
  DEFAULT_REMOTE_CONFIG_STATE,
  FeatureFlags,
  RemoteConfig,
  RemoteConfigState,
  SyncIntervals,
  SyncStatus,
} from "../shared/types";
import { loadConfig, sendToBackend } from "../shared/utils";

/** Storage key for remote config state */
const CONFIG_STORAGE_KEY = "remoteConfigState";

/** Default sync interval in minutes (used before first sync) */
const DEFAULT_SYNC_INTERVAL_MINUTES = 60;

/**
 * Singleton instance
 */
let instance: ConfigManager | null = null;

/**
 * Event listeners for config changes
 */
type ConfigChangeListener = (config: RemoteConfig) => void;

/**
 * Manages remote configuration state and backend synchronization
 */
export class ConfigManager {
  private state: RemoteConfigState;
  private syncing = false;
  private lastError?: string;
  private listeners: ConfigChangeListener[] = [];

  private constructor() {
    this.state = { ...DEFAULT_REMOTE_CONFIG_STATE };
  }

  /**
   * Get or create the singleton instance
   */
  static async getInstance(): Promise<ConfigManager> {
    if (!instance) {
      instance = new ConfigManager();
      await instance.loadFromStorage();
    }
    return instance;
  }

  /**
   * Load state from chrome.storage.local
   */
  private async loadFromStorage(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(CONFIG_STORAGE_KEY);
      if (result[CONFIG_STORAGE_KEY]) {
        const stored = result[CONFIG_STORAGE_KEY] as RemoteConfigState;
        // Merge with defaults to ensure all fields exist
        this.state = {
          ...DEFAULT_REMOTE_CONFIG_STATE,
          ...stored,
          config: {
            ...DEFAULT_REMOTE_CONFIG_STATE.config,
            ...stored.config,
            syncIntervals: {
              ...DEFAULT_REMOTE_CONFIG_STATE.config.syncIntervals,
              ...stored.config?.syncIntervals,
            },
            features: {
              ...DEFAULT_REMOTE_CONFIG_STATE.config.features,
              ...stored.config?.features,
            },
            filters: {
              ...DEFAULT_REMOTE_CONFIG_STATE.config.filters,
              ...stored.config?.filters,
            },
          },
        };
      }
    } catch (error) {
      console.error("Failed to load remote config state:", error);
    }
  }

  /**
   * Save state to chrome.storage.local
   */
  private async saveToStorage(): Promise<void> {
    try {
      await chrome.storage.local.set({ [CONFIG_STORAGE_KEY]: this.state });
    } catch (error) {
      console.error("Failed to save remote config state:", error);
    }
  }

  /**
   * Get the current remote configuration
   */
  getConfig(): RemoteConfig {
    return this.state.config;
  }

  /**
   * Get sync intervals configuration
   */
  getSyncIntervals(): SyncIntervals {
    return this.state.config.syncIntervals;
  }

  /**
   * Get a specific sync interval value in minutes
   */
  getSyncInterval(key: keyof SyncIntervals): number {
    return this.state.config.syncIntervals[key];
  }

  /**
   * Get feature flags configuration
   */
  getFeatures(): FeatureFlags {
    return this.state.config.features;
  }

  /**
   * Check if a specific feature is enabled
   */
  isFeatureEnabled(feature: keyof FeatureFlags): boolean {
    return this.state.config.features[feature];
  }

  /**
   * Get username filters from remote config
   */
  getUsernameFilters(): string[] {
    return this.state.config.filters.usernameFilters;
  }

  /**
   * Get current config version
   */
  getVersion(): string {
    return this.state.config.version;
  }

  /**
   * Add a listener for config changes
   */
  addChangeListener(listener: ConfigChangeListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove a config change listener
   */
  removeChangeListener(listener: ConfigChangeListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Notify all listeners of config change
   */
  private notifyListeners(): void {
    const config = this.getConfig();
    for (const listener of this.listeners) {
      try {
        listener(config);
      } catch (error) {
        console.error("Config change listener error:", error);
      }
    }
  }

  /**
   * Sync configuration from backend
   */
  async syncFromBackend(): Promise<SyncStatus> {
    if (this.syncing) {
      return this.getSyncStatus();
    }

    this.syncing = true;
    this.lastError = undefined;

    try {
      const extensionConfig = await loadConfig();
      if (!extensionConfig.enabled) {
        this.lastError = "Extension disabled";
        return this.getSyncStatus();
      }

      const response = await sendToBackend(
        API_PATHS.CONFIG_SYNC,
        {},
        extensionConfig.api
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.lastError = errorText || `HTTP ${response.status}`;
        return this.getSyncStatus();
      }

      const data = await response.json();

      // Check if we got valid config data
      if (data.success && data.config) {
        const oldVersion = this.state.config.version;
        const newConfig = data.config as RemoteConfig;

        // Update state with synced config
        this.state.config = {
          ...this.state.config,
          ...newConfig,
          syncIntervals: {
            ...this.state.config.syncIntervals,
            ...newConfig.syncIntervals,
          },
          features: {
            ...this.state.config.features,
            ...newConfig.features,
          },
          filters: {
            ...this.state.config.filters,
            ...newConfig.filters,
          },
          onboarding: newConfig.onboarding ?? this.state.config.onboarding,
        };
        this.state.lastSyncTime = Date.now();
        this.state.pendingSync = false;

        await this.saveToStorage();

        // Notify listeners if config changed
        if (oldVersion !== newConfig.version) {
          console.log(
            `Remote config updated: ${oldVersion} -> ${newConfig.version}`
          );
          this.notifyListeners();
        }
      }

      return this.getSyncStatus();
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : "Sync failed";
      console.error("Remote config sync error:", error);
      return this.getSyncStatus();
    } finally {
      this.syncing = false;
    }
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return {
      syncing: this.syncing,
      lastSyncTime: this.state.lastSyncTime,
      lastError: this.lastError,
      pendingCount: 0, // Config is read-only from extension side
    };
  }

  /**
   * Check if sync is needed based on time
   */
  needsSync(): boolean {
    const now = Date.now();
    const syncIntervalMs = this.getSyncInterval("config") * 60 * 1000;
    return now - this.state.lastSyncTime > syncIntervalMs;
  }

  /**
   * Get the last sync time
   */
  getLastSyncTime(): number {
    return this.state.lastSyncTime;
  }

  /**
   * Force a sync regardless of timing
   */
  async forceSync(): Promise<SyncStatus> {
    this.state.pendingSync = true;
    return this.syncFromBackend();
  }
}

/**
 * Get the singleton config manager instance
 */
export const getConfigManager = async (): Promise<ConfigManager> => {
  return ConfigManager.getInstance();
};
