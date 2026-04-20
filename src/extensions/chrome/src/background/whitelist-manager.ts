/**
 * Whitelist Manager Module
 * Manages dynamic whitelist for SaaS domain tracking
 * Phase 5 Implementation
 *
 * Integrates with ContentScriptInjector for dynamic content script registration
 */

import { API_PATHS } from "../shared/api-paths";
import {
  DEFAULT_WHITELIST_DOMAINS,
  SyncStatus,
  WhitelistDomain,
  WhitelistState,
} from "../shared/types";
import { loadConfig, sendToBackend } from "../shared/utils";
import { getContentScriptInjector } from "./content-script-injector";

/** Storage key for whitelist state */
export const WHITELIST_STORAGE_KEY = "whitelistState";

/**
 * WhitelistManager class for managing SaaS domain whitelist
 */
export class WhitelistManager {
  private state: WhitelistState;

  constructor() {
    // Deep copy to prevent shared state between instances
    this.state = {
      domains: DEFAULT_WHITELIST_DOMAINS.map((d) => ({ ...d })),
      lastSyncTime: 0,
      pendingSync: false,
    };
  }

  /**
   * Get current whitelist state
   */
  async getState(): Promise<WhitelistState> {
    return { ...this.state };
  }

  /**
   * Get all whitelisted domains
   */
  async getDomains(): Promise<WhitelistDomain[]> {
    return [...this.state.domains];
  }

  /**
   * Get only enabled domains
   */
  async getEnabledDomains(): Promise<WhitelistDomain[]> {
    return this.state.domains.filter((d) => d.enabled);
  }

  /**
   * Add a new domain to the whitelist
   * @param pattern - Domain pattern (e.g., "*.example.com")
   * @param name - Display name
   */
  async addDomain(pattern: string, name: string): Promise<boolean> {
    // Check if domain already exists
    const exists = this.state.domains.some(
      (d) => d.pattern.toLowerCase() === pattern.toLowerCase()
    );
    if (exists) {
      return false;
    }

    const newDomain: WhitelistDomain = {
      pattern: pattern.toLowerCase(),
      name,
      enabled: true,
      addedAt: Date.now(),
      source: "user",
    };

    this.state.domains.push(newDomain);
    this.state.pendingSync = true;
    await this.saveToStorage();

    // Register with content script injector and inject into existing tabs
    try {
      const injector = await getContentScriptInjector();
      const domainWithoutWildcard = pattern.toLowerCase().replace(/^\*\./, "");
      await injector.registerDomain(domainWithoutWildcard);
      await injector.injectIntoExistingTabs(domainWithoutWildcard);
    } catch (injectorError) {
      console.error(
        "Failed to register domain with content script injector:",
        injectorError
      );
    }

    return true;
  }

  /**
   * Remove a domain from the whitelist
   * @param pattern - Domain pattern to remove
   */
  async removeDomain(pattern: string): Promise<boolean> {
    const index = this.state.domains.findIndex(
      (d) => d.pattern.toLowerCase() === pattern.toLowerCase()
    );
    if (index === -1) {
      return false;
    }

    // Only allow removing user-added domains
    if (this.state.domains[index].source === "default") {
      return false;
    }

    this.state.domains.splice(index, 1);
    this.state.pendingSync = true;
    await this.saveToStorage();

    // Unregister from content script injector
    try {
      const injector = await getContentScriptInjector();
      const domainWithoutWildcard = pattern.toLowerCase().replace(/^\*\./, "");
      await injector.unregisterDomain(domainWithoutWildcard);
    } catch (injectorError) {
      console.error(
        "Failed to unregister domain from content script injector:",
        injectorError
      );
    }

    return true;
  }

  /**
   * Enable or disable a domain
   * @param pattern - Domain pattern
   * @param enabled - Enable/disable state
   */
  async setDomainEnabled(pattern: string, enabled: boolean): Promise<boolean> {
    const domain = this.state.domains.find(
      (d) => d.pattern.toLowerCase() === pattern.toLowerCase()
    );
    if (!domain) {
      return false;
    }

    domain.enabled = enabled;
    this.state.pendingSync = true;
    await this.saveToStorage();

    // Update content script injector based on enabled state
    try {
      const injector = await getContentScriptInjector();
      const domainWithoutWildcard = pattern.toLowerCase().replace(/^\*\./, "");

      if (enabled) {
        await injector.registerDomain(domainWithoutWildcard);
        await injector.injectIntoExistingTabs(domainWithoutWildcard);
      } else {
        await injector.unregisterDomain(domainWithoutWildcard);
      }
    } catch (injectorError) {
      console.error("Failed to update content script injector:", injectorError);
    }

    return true;
  }

  /**
   * Check if a URL matches any whitelisted domain
   * @param url - URL to check
   */
  async isUrlWhitelisted(url: string): Promise<boolean> {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      return this.state.domains.some((domain) => {
        if (!domain.enabled) return false;
        return this.matchesPattern(hostname, domain.pattern);
      });
    } catch {
      return false;
    }
  }

  /**
   * Match hostname against a pattern
   * @param hostname - Hostname to check (e.g., "login.salesforce.com")
   * @param pattern - Pattern to match (e.g., "*.salesforce.com")
   */
  private matchesPattern(hostname: string, pattern: string): boolean {
    const patternLower = pattern.toLowerCase();
    const hostLower = hostname.toLowerCase();

    // Wildcard pattern (*.example.com)
    if (patternLower.startsWith("*.")) {
      const suffix = patternLower.slice(2); // Remove "*."
      return hostLower === suffix || hostLower.endsWith("." + suffix);
    }

    // Exact match
    return hostLower === patternLower;
  }

  /**
   * Save state to chrome.storage.local
   */
  async saveToStorage(): Promise<void> {
    await chrome.storage.local.set({ [WHITELIST_STORAGE_KEY]: this.state });
  }

  /**
   * Load state from chrome.storage.local
   */
  async loadFromStorage(): Promise<void> {
    const result = await chrome.storage.local.get(WHITELIST_STORAGE_KEY);
    if (result[WHITELIST_STORAGE_KEY]) {
      this.state = result[WHITELIST_STORAGE_KEY] as WhitelistState;
      // Ensure default domains are present
      this.ensureDefaultDomains();
    } else {
      // Deep copy to prevent shared state
      this.state = {
        domains: DEFAULT_WHITELIST_DOMAINS.map((d) => ({ ...d })),
        lastSyncTime: 0,
        pendingSync: false,
      };
    }
  }

  /**
   * Ensure all default domains exist in the state
   */
  private ensureDefaultDomains(): void {
    for (const defaultDomain of DEFAULT_WHITELIST_DOMAINS) {
      const exists = this.state.domains.some(
        (d) => d.pattern.toLowerCase() === defaultDomain.pattern.toLowerCase()
      );
      if (!exists) {
        this.state.domains.push({ ...defaultDomain });
      }
    }
  }

  /**
   * Sync whitelist to backend (Extension → Admin)
   */
  async syncToBackend(): Promise<SyncStatus> {
    const status: SyncStatus = {
      syncing: true,
      lastSyncTime: this.state.lastSyncTime,
      pendingCount: 0,
    };

    try {
      if (!this.state.pendingSync) {
        status.syncing = false;
        return status;
      }

      const config = await loadConfig();
      if (!config.enabled || !config.api) {
        status.syncing = false;
        status.lastError = "Extension disabled or API not configured";
        return status;
      }

      // Get user-added domains for sync
      const userDomains = this.state.domains.filter((d) => d.source === "user");
      status.pendingCount = userDomains.length;

      // Format payload to match API schema (device_id, whitelist)
      const payload = {
        device_id: config.id,
        whitelist: userDomains.map((d) => ({
          pattern: d.pattern,
          name: d.name,
          enabled: d.enabled,
          source: d.source,
        })),
      };

      // Send to backend
      const response = await sendToBackend(
        API_PATHS.WHITELIST_SYNC,
        payload as Record<string, unknown>,
        config.api
      );

      if (response.ok) {
        this.state.lastSyncTime = Date.now();
        this.state.pendingSync = false;
        await this.saveToStorage();
        status.lastSyncTime = this.state.lastSyncTime;
        status.pendingCount = 0;
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        status.lastError = errorData.error || `HTTP ${response.status}`;
      }
    } catch (error) {
      status.lastError = error instanceof Error ? error.message : "Sync failed";
      console.error("Whitelist sync error:", error);
    }

    status.syncing = false;
    return status;
  }

  /**
   * Sync whitelist from backend (Admin → Extension)
   * Fetches admin-registered whitelist domains for this device
   */
  async syncFromBackend(): Promise<SyncStatus> {
    const status: SyncStatus = {
      syncing: true,
      lastSyncTime: this.state.lastSyncTime,
      pendingCount: 0,
    };

    try {
      const config = await loadConfig();
      if (!config.enabled || !config.api) {
        status.syncing = false;
        status.lastError = "Extension disabled or API not configured";
        return status;
      }

      // Use GET request (global whitelist, no device_id needed)
      const url = `${config.api}${API_PATHS.WHITELIST_SYNC}`;
      const headers: Record<string, string> = {};
      if (config.token) {
        headers["Authorization"] = `Bearer ${config.token}`;
      }

      const response = await fetch(url, { method: "GET", headers });

      if (!response.ok) {
        const errorText = await response.text();
        status.lastError = errorText || `HTTP ${response.status}`;
        status.syncing = false;
        return status;
      }

      const data = await response.json();

      // Merge synced domains with existing domains
      // Admin-synced domains have source='admin'
      const syncedDomains = data.whitelist || data.domains || [];
      if (Array.isArray(syncedDomains)) {
        for (const syncedDomain of syncedDomains) {
          const existingIndex = this.state.domains.findIndex(
            (d) =>
              d.pattern.toLowerCase() === syncedDomain.pattern.toLowerCase()
          );

          if (existingIndex === -1) {
            // Add new domain from admin
            this.state.domains.push({
              pattern: syncedDomain.pattern,
              name: syncedDomain.name,
              enabled: syncedDomain.enabled !== false,
              addedAt: syncedDomain.addedAt || Date.now(),
              source: "backend",
            });
          } else {
            // Update existing domain if from admin
            const existing = this.state.domains[existingIndex];
            if (existing.source === "backend") {
              existing.name = syncedDomain.name;
              existing.enabled = syncedDomain.enabled !== false;
            }
          }
        }

        this.state.lastSyncTime = Date.now();
        await this.saveToStorage();
        status.lastSyncTime = this.state.lastSyncTime;

        // Sync content script injector with enabled domains
        try {
          const injector = await getContentScriptInjector();
          const enabledDomains = this.state.domains
            .filter((d) => d.enabled)
            .map((d) => d.pattern.replace(/^\*\./, "")); // Remove wildcard prefix
          await injector.syncWithWhitelist(enabledDomains);
        } catch (injectorError) {
          console.error(
            "Failed to sync content script injector:",
            injectorError
          );
        }
      }
    } catch (error) {
      status.lastError = error instanceof Error ? error.message : "Sync failed";
      console.error("Whitelist sync from backend error:", error);
    }

    status.syncing = false;
    return status;
  }

  /**
   * Get current sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    const userDomains = this.state.domains.filter((d) => d.source === "user");
    return {
      syncing: false,
      lastSyncTime: this.state.lastSyncTime,
      pendingCount: this.state.pendingSync ? userDomains.length : 0,
      lastError: undefined,
    };
  }

  /**
   * Reset to default domains (for testing)
   */
  async reset(): Promise<void> {
    // Deep copy to prevent shared state
    this.state = {
      domains: DEFAULT_WHITELIST_DOMAINS.map((d) => ({ ...d })),
      lastSyncTime: 0,
      pendingSync: false,
    };
    await this.saveToStorage();
  }
}

// Singleton instance
let managerInstance: WhitelistManager | null = null;

/**
 * Get the singleton WhitelistManager instance
 */
export const getWhitelistManager = async (): Promise<WhitelistManager> => {
  if (!managerInstance) {
    managerInstance = new WhitelistManager();
    await managerInstance.loadFromStorage();
  }
  return managerInstance;
};

/**
 * Reset the singleton instance (for testing)
 */
export const resetWhitelistManager = (): void => {
  managerInstance = null;
};
