/**
 * URL Logger - Handles browsing and block log collection
 * Logs all URL visits and blocked URLs for reporting
 * Supports exponential backoff with jitter for retry resilience
 */

import { API_PATHS } from "../shared/api-paths";
import {
  BackoffState,
  BlockLogEntry,
  BlockLogState,
  BrowsingLogEntry,
  BrowsingLogState,
  DEFAULT_BLOCK_LOG_STATE,
  DEFAULT_BROWSING_LOG_STATE,
  SyncStatus,
} from "../shared/types";
import { getDomain, loadConfig, sendToBackend } from "../shared/utils";
import { getBlacklistManager } from "./blacklist-manager";
import { getWhitelistManager } from "./whitelist-manager";

/** Storage key for browsing logs */
const BROWSING_LOG_STORAGE_KEY = "browsingLogState";

/** Storage key for block logs */
const BLOCK_LOG_STORAGE_KEY = "blockLogState";

/** Maximum logs to keep locally (prevents memory issues) */
const MAX_LOCAL_LOGS = 10000;

/** Batch size for sync operations */
const SYNC_BATCH_SIZE = 500;

/** Maximum backoff interval in minutes */
const MAX_BACKOFF_INTERVAL = 60;

/** Jitter range in seconds (±30s) */
const JITTER_RANGE_SECONDS = 30;

/**
 * Generate a unique ID for log entries
 */
const generateLogId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Calculate backoff interval with jitter
 * Formula: min(base × 2^failures, maxInterval) + random(-jitter, +jitter)
 */
const calculateBackoffInterval = (state: BackoffState): number => {
  const exponentialInterval = Math.min(
    state.baseInterval * Math.pow(2, state.consecutiveFailures),
    state.maxInterval
  );
  // Jitter: ±30 seconds converted to minutes
  const jitterMinutes = ((Math.random() * 2 - 1) * JITTER_RANGE_SECONDS) / 60;
  return Math.max(1, exponentialInterval + jitterMinutes);
};

/**
 * Singleton instance
 */
let instance: UrlLogger | null = null;

/**
 * Manages URL browsing logs and block logs
 */
export class UrlLogger {
  private browsingState: BrowsingLogState;
  private blockState: BlockLogState;
  private browsingSyncing = false;
  private blockSyncing = false;
  private browsingLastError?: string;
  private blockLastError?: string;

  /** Backoff state for browsing log sync */
  private browsingBackoff: BackoffState = {
    consecutiveFailures: 0,
    currentInterval: 5,
    baseInterval: 5,
    maxInterval: MAX_BACKOFF_INTERVAL,
  };

  /** Backoff state for block log sync */
  private blockBackoff: BackoffState = {
    consecutiveFailures: 0,
    currentInterval: 5,
    baseInterval: 5,
    maxInterval: MAX_BACKOFF_INTERVAL,
  };

  private constructor() {
    this.browsingState = { ...DEFAULT_BROWSING_LOG_STATE };
    this.blockState = { ...DEFAULT_BLOCK_LOG_STATE };
  }

  /**
   * Get or create the singleton instance
   */
  static async getInstance(): Promise<UrlLogger> {
    if (!instance) {
      instance = new UrlLogger();
      await instance.loadFromStorage();
    }
    return instance;
  }

  /**
   * Load state from chrome.storage.local
   */
  private async loadFromStorage(): Promise<void> {
    try {
      const result = await chrome.storage.local.get([
        BROWSING_LOG_STORAGE_KEY,
        BLOCK_LOG_STORAGE_KEY,
      ]);

      if (result[BROWSING_LOG_STORAGE_KEY]) {
        this.browsingState = result[
          BROWSING_LOG_STORAGE_KEY
        ] as BrowsingLogState;
      }

      if (result[BLOCK_LOG_STORAGE_KEY]) {
        this.blockState = result[BLOCK_LOG_STORAGE_KEY] as BlockLogState;
      }
    } catch (error) {
      console.error("Failed to load URL logger state:", error);
    }
  }

  /**
   * Save state to chrome.storage.local
   */
  private async saveToStorage(): Promise<void> {
    try {
      await chrome.storage.local.set({
        [BROWSING_LOG_STORAGE_KEY]: this.browsingState,
        [BLOCK_LOG_STORAGE_KEY]: this.blockState,
      });
    } catch (error) {
      console.error("Failed to save URL logger state:", error);
    }
  }

  /**
   * Log a URL visit
   * @param url - The URL that was visited
   */
  async logVisit(url: string): Promise<void> {
    try {
      // Skip non-HTTP URLs
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        return;
      }

      const domain = getDomain(url);
      if (!domain) {
        return;
      }

      // Check whitelist/blacklist status
      const whitelistManager = await getWhitelistManager();
      const blacklistManager = await getBlacklistManager();

      const isWhitelisted = await whitelistManager.isUrlWhitelisted(url);
      const blockResult = blacklistManager.checkDomain(domain);

      const entry: BrowsingLogEntry = {
        id: generateLogId(),
        url,
        domain,
        visitedAt: Date.now(),
        isWhitelisted,
        isBlacklisted: blockResult.blocked,
        synced: false,
      };

      this.browsingState.logs.push(entry);
      this.browsingState.pendingSync = true;

      // Trim logs if exceeding limit
      if (this.browsingState.logs.length > MAX_LOCAL_LOGS) {
        // Keep only the most recent logs
        this.browsingState.logs =
          this.browsingState.logs.slice(-MAX_LOCAL_LOGS);
      }

      await this.saveToStorage();
    } catch (error) {
      console.error("Failed to log URL visit:", error);
    }
  }

  /**
   * Log a blocked URL event
   * @param url - The URL that was blocked
   * @param reason - The reason for blocking
   */
  async logBlock(url: string, reason: string): Promise<void> {
    try {
      const domain = getDomain(url);
      if (!domain) {
        return;
      }

      const entry: BlockLogEntry = {
        id: generateLogId(),
        url,
        domain,
        blockReason: reason,
        blockedAt: Date.now(),
        synced: false,
      };

      this.blockState.logs.push(entry);
      this.blockState.pendingSync = true;

      // Trim logs if exceeding limit
      if (this.blockState.logs.length > MAX_LOCAL_LOGS) {
        this.blockState.logs = this.blockState.logs.slice(-MAX_LOCAL_LOGS);
      }

      await this.saveToStorage();
    } catch (error) {
      console.error("Failed to log block event:", error);
    }
  }

  /**
   * Sync browsing logs to backend
   * Returns sync status and updates backoff state on failure
   */
  async syncBrowsingLogs(): Promise<SyncStatus> {
    if (this.browsingSyncing) {
      return this.getSyncStatus();
    }

    this.browsingSyncing = true;
    this.browsingLastError = undefined;

    try {
      const config = await loadConfig();
      if (!config.enabled) {
        this.browsingLastError = "Extension disabled";
        return this.getSyncStatus();
      }

      // Get unsynced logs
      const unsyncedLogs = this.browsingState.logs.filter((log) => !log.synced);
      if (unsyncedLogs.length === 0) {
        return this.getSyncStatus();
      }

      // Process in batches
      for (let i = 0; i < unsyncedLogs.length; i += SYNC_BATCH_SIZE) {
        const batch = unsyncedLogs.slice(i, i + SYNC_BATCH_SIZE);

        const payload = {
          device_id: config.id,
          logs: batch.map((log) => ({
            url: log.url,
            domain: log.domain,
            visited_at: new Date(log.visitedAt).toISOString(),
            is_whitelisted: log.isWhitelisted,
            is_blacklisted: log.isBlacklisted,
          })),
        };

        const response = await sendToBackend(
          API_PATHS.BROWSING_LOG_SYNC,
          payload as Record<string, unknown>,
          config.api
        );

        if (response.ok) {
          // Mark logs as synced
          for (const log of batch) {
            const idx = this.browsingState.logs.findIndex(
              (l) => l.id === log.id
            );
            if (idx !== -1) {
              this.browsingState.logs[idx].synced = true;
            }
          }
        } else {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Unknown error" }));
          this.browsingLastError = errorData.error || `HTTP ${response.status}`;
          // Apply backoff on failure
          this.browsingBackoff.consecutiveFailures++;
          this.browsingBackoff.currentInterval = calculateBackoffInterval(
            this.browsingBackoff
          );
          break;
        }
      }

      // Remove synced logs older than 24 hours
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      this.browsingState.logs = this.browsingState.logs.filter(
        (log) => !log.synced || log.visitedAt > oneDayAgo
      );

      this.browsingState.lastSyncTime = Date.now();
      this.browsingState.pendingSync = this.browsingState.logs.some(
        (log) => !log.synced
      );
      await this.saveToStorage();

      // Reset backoff on success (if no error was set)
      if (!this.browsingLastError) {
        this.browsingBackoff.consecutiveFailures = 0;
        this.browsingBackoff.currentInterval =
          this.browsingBackoff.baseInterval;
      }

      return this.getSyncStatus();
    } catch (error) {
      this.browsingLastError =
        error instanceof Error ? error.message : "Sync failed";
      console.error("Browsing log sync error:", error);
      // Apply backoff on exception
      this.browsingBackoff.consecutiveFailures++;
      this.browsingBackoff.currentInterval = calculateBackoffInterval(
        this.browsingBackoff
      );
      return this.getSyncStatus();
    } finally {
      this.browsingSyncing = false;
    }
  }

  /**
   * Sync block logs to backend
   * Returns sync status and updates backoff state on failure
   */
  async syncBlockLogs(): Promise<SyncStatus> {
    if (this.blockSyncing) {
      return this.getBlockSyncStatus();
    }

    this.blockSyncing = true;
    this.blockLastError = undefined;

    try {
      const config = await loadConfig();
      if (!config.enabled) {
        this.blockLastError = "Extension disabled";
        return this.getBlockSyncStatus();
      }

      // Get unsynced logs
      const unsyncedLogs = this.blockState.logs.filter((log) => !log.synced);
      if (unsyncedLogs.length === 0) {
        return this.getBlockSyncStatus();
      }

      // Process in batches
      for (let i = 0; i < unsyncedLogs.length; i += SYNC_BATCH_SIZE) {
        const batch = unsyncedLogs.slice(i, i + SYNC_BATCH_SIZE);

        const payload = {
          device_id: config.id,
          logs: batch.map((log) => ({
            url: log.url,
            domain: log.domain,
            block_reason: log.blockReason,
            blocked_at: new Date(log.blockedAt).toISOString(),
          })),
        };

        const response = await sendToBackend(
          API_PATHS.BLOCK_LOG_SYNC,
          payload as Record<string, unknown>,
          config.api
        );

        if (response.ok) {
          // Mark logs as synced
          for (const log of batch) {
            const idx = this.blockState.logs.findIndex((l) => l.id === log.id);
            if (idx !== -1) {
              this.blockState.logs[idx].synced = true;
            }
          }
        } else {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Unknown error" }));
          this.blockLastError = errorData.error || `HTTP ${response.status}`;
          // Apply backoff on failure
          this.blockBackoff.consecutiveFailures++;
          this.blockBackoff.currentInterval = calculateBackoffInterval(
            this.blockBackoff
          );
          break;
        }
      }

      // Remove synced logs older than 24 hours
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      this.blockState.logs = this.blockState.logs.filter(
        (log) => !log.synced || log.blockedAt > oneDayAgo
      );

      this.blockState.lastSyncTime = Date.now();
      this.blockState.pendingSync = this.blockState.logs.some(
        (log) => !log.synced
      );
      await this.saveToStorage();

      // Reset backoff on success (if no error was set)
      if (!this.blockLastError) {
        this.blockBackoff.consecutiveFailures = 0;
        this.blockBackoff.currentInterval = this.blockBackoff.baseInterval;
      }

      return this.getBlockSyncStatus();
    } catch (error) {
      this.blockLastError =
        error instanceof Error ? error.message : "Sync failed";
      console.error("Block log sync error:", error);
      // Apply backoff on exception
      this.blockBackoff.consecutiveFailures++;
      this.blockBackoff.currentInterval = calculateBackoffInterval(
        this.blockBackoff
      );
      return this.getBlockSyncStatus();
    } finally {
      this.blockSyncing = false;
    }
  }

  /**
   * Sync all logs to backend
   * Browsing and block logs sync independently
   */
  async syncAllLogs(): Promise<void> {
    await Promise.all([this.syncBrowsingLogs(), this.syncBlockLogs()]);
  }

  /**
   * Get browsing log sync status
   */
  getSyncStatus(): SyncStatus {
    const unsyncedCount = this.browsingState.logs.filter(
      (log) => !log.synced
    ).length;
    return {
      syncing: this.browsingSyncing,
      lastSyncTime: this.browsingState.lastSyncTime,
      lastError: this.browsingLastError,
      pendingCount: unsyncedCount,
    };
  }

  /**
   * Get block log sync status
   */
  getBlockSyncStatus(): SyncStatus {
    const unsyncedCount = this.blockState.logs.filter(
      (log) => !log.synced
    ).length;
    return {
      syncing: this.blockSyncing,
      lastSyncTime: this.blockState.lastSyncTime,
      lastError: this.blockLastError,
      pendingCount: unsyncedCount,
    };
  }

  /**
   * Get the current browsing log backoff state
   */
  getBrowsingBackoff(): BackoffState {
    return { ...this.browsingBackoff };
  }

  /**
   * Get the current block log backoff state
   */
  getBlockBackoff(): BackoffState {
    return { ...this.blockBackoff };
  }

  /**
   * Get the current effective browsing log sync interval (with backoff)
   */
  getBrowsingInterval(): number {
    return this.browsingBackoff.currentInterval;
  }

  /**
   * Get the current effective block log sync interval (with backoff)
   */
  getBlockInterval(): number {
    return this.blockBackoff.currentInterval;
  }

  /**
   * Update base intervals from Remote Config
   * Resets backoff state when base interval changes
   */
  updateIntervals(browsingInterval: number, blockInterval: number): void {
    if (this.browsingBackoff.baseInterval !== browsingInterval) {
      this.browsingBackoff.baseInterval = browsingInterval;
      this.browsingBackoff.currentInterval = browsingInterval;
      this.browsingBackoff.consecutiveFailures = 0;
    }
    if (this.blockBackoff.baseInterval !== blockInterval) {
      this.blockBackoff.baseInterval = blockInterval;
      this.blockBackoff.currentInterval = blockInterval;
      this.blockBackoff.consecutiveFailures = 0;
    }
  }

  /**
   * Get statistics about stored logs
   */
  getLogStats(): {
    browsingLogs: number;
    blockLogs: number;
    unsyncedBrowsing: number;
    unsyncedBlock: number;
  } {
    return {
      browsingLogs: this.browsingState.logs.length,
      blockLogs: this.blockState.logs.length,
      unsyncedBrowsing: this.browsingState.logs.filter((l) => !l.synced).length,
      unsyncedBlock: this.blockState.logs.filter((l) => !l.synced).length,
    };
  }

  /**
   * Clear all local logs (for testing/reset)
   */
  async clearAllLogs(): Promise<void> {
    this.browsingState = { ...DEFAULT_BROWSING_LOG_STATE };
    this.blockState = { ...DEFAULT_BLOCK_LOG_STATE };
    await this.saveToStorage();
  }
}

/**
 * Get the singleton URL logger instance
 */
export const getUrlLogger = async (): Promise<UrlLogger> => {
  return UrlLogger.getInstance();
};

/**
 * Reset the singleton instance (for testing)
 */
export const resetUrlLogger = (): void => {
  instance = null;
};
