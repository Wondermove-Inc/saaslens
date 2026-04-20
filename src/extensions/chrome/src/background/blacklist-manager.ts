/**
 * Blacklist Manager - Handles domain blocking functionality
 * Syncs with backend and provides domain checking
 * Includes block event logging for reporting
 */

import { API_PATHS } from "../shared/api-paths";
import {
  BlacklistDomain,
  BlacklistState,
  BlockCheckResult,
  DEFAULT_BLACKLIST_STATE,
  SyncStatus,
} from "../shared/types";
import { loadConfig } from "../shared/utils";

/** Storage key for blacklist state */
const BLACKLIST_STORAGE_KEY = "blacklistState";

/** Sync interval in minutes */
const SYNC_INTERVAL_MINUTES = 5;

/**
 * Singleton instance
 */
let instance: BlacklistManager | null = null;

/**
 * Manages blacklist state and backend synchronization
 */
export class BlacklistManager {
  private state: BlacklistState;
  private syncing = false;
  private lastError?: string;

  private constructor() {
    this.state = { ...DEFAULT_BLACKLIST_STATE };
  }

  /**
   * Get or create the singleton instance
   */
  static async getInstance(): Promise<BlacklistManager> {
    if (!instance) {
      instance = new BlacklistManager();
      await instance.loadFromStorage();
    }
    return instance;
  }

  /**
   * Load state from chrome.storage.local
   */
  private async loadFromStorage(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(BLACKLIST_STORAGE_KEY);
      if (result[BLACKLIST_STORAGE_KEY]) {
        this.state = result[BLACKLIST_STORAGE_KEY] as BlacklistState;
      }
    } catch (error) {
      console.error("Failed to load blacklist state:", error);
    }
  }

  /**
   * Save state to chrome.storage.local
   */
  private async saveToStorage(): Promise<void> {
    try {
      await chrome.storage.local.set({ [BLACKLIST_STORAGE_KEY]: this.state });
    } catch (error) {
      console.error("Failed to save blacklist state:", error);
    }
  }

  /**
   * Get all blacklisted domains
   */
  getDomains(): BlacklistDomain[] {
    return this.state.domains;
  }

  /**
   * Check if a domain is blocked
   */
  checkDomain(domain: string): BlockCheckResult {
    const enabledDomains = this.state.domains.filter((d) => d.enabled);

    for (const blockedDomain of enabledDomains) {
      if (this.matchesPattern(domain, blockedDomain.pattern)) {
        return {
          blocked: true,
          matchedDomain: blockedDomain,
        };
      }
    }

    return { blocked: false };
  }

  /**
   * Match a domain against a pattern
   * Supports wildcards: *.example.com matches sub.example.com
   */
  private matchesPattern(domain: string, pattern: string): boolean {
    // Normalize both
    const normalizedDomain = domain.toLowerCase();
    const normalizedPattern = pattern.toLowerCase();

    // Exact match
    if (normalizedDomain === normalizedPattern) {
      return true;
    }

    // Wildcard pattern: *.example.com
    if (normalizedPattern.startsWith("*.")) {
      const suffix = normalizedPattern.substring(2);
      // Match exact suffix or subdomain
      return (
        normalizedDomain === suffix || normalizedDomain.endsWith("." + suffix)
      );
    }

    // Pattern without wildcard should match as suffix
    return (
      normalizedDomain === normalizedPattern ||
      normalizedDomain.endsWith("." + normalizedPattern)
    );
  }

  /**
   * Sync blacklist from backend
   */
  async syncFromBackend(): Promise<SyncStatus> {
    if (this.syncing) {
      return this.getSyncStatus();
    }

    this.syncing = true;
    this.lastError = undefined;

    try {
      const config = await loadConfig();
      if (!config.enabled) {
        this.lastError = "Extension disabled";
        return this.getSyncStatus();
      }

      // Use GET request for blacklist sync (not POST like sendToBackend)
      const url = `${config.api}${API_PATHS.BLACKLIST_SYNC}`;
      const headers: Record<string, string> = {};
      if (config.token) {
        headers["Authorization"] = `Bearer ${config.token}`;
      }
      const response = await fetch(url, { method: "GET", headers });

      if (!response.ok) {
        const errorText = await response.text();
        this.lastError = errorText || `HTTP ${response.status}`;
        return this.getSyncStatus();
      }

      const data = await response.json();

      // Update state with synced domains
      // Support both "domains" and "blacklist" field names from API
      const syncedDomains = data.domains || data.blacklist;
      if (syncedDomains && Array.isArray(syncedDomains)) {
        this.state.domains = syncedDomains;
        this.state.lastSyncTime = Date.now();
        if (data.version) {
          this.state.version = data.version;
        }
        await this.saveToStorage();
      }

      return this.getSyncStatus();
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : "Sync failed";
      console.error("Blacklist sync error:", error);
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
      pendingCount: 0, // Blacklist is read-only from extension side
    };
  }

  /**
   * Check if sync is needed based on time
   */
  needsSync(): boolean {
    const now = Date.now();
    const syncIntervalMs = SYNC_INTERVAL_MINUTES * 60 * 1000;
    return now - this.state.lastSyncTime > syncIntervalMs;
  }

  /**
   * Get the last sync time
   */
  getLastSyncTime(): number {
    return this.state.lastSyncTime;
  }
}

/**
 * Get the singleton blacklist manager instance
 */
export const getBlacklistManager = async (): Promise<BlacklistManager> => {
  return BlacklistManager.getInstance();
};
