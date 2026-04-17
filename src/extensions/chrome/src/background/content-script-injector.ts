/**
 * Content Script Injector Module
 * Dynamically registers content scripts for whitelisted domains
 * Uses chrome.scripting.registerContentScripts API (Manifest V3)
 *
 * Phase 2 Implementation - Dynamic Content Script Injection
 */

/** Maximum number of dynamically registered scripts (Chrome limit) */
const MAX_SCRIPTS = 100;

/** Prefix for script IDs */
const SCRIPT_ID_PREFIX = "login-capture-";

/** Storage key for injector state */
export const INJECTOR_STORAGE_KEY = "contentScriptInjectorState";

/**
 * State for content script injector
 * Stored in chrome.storage.local for persistence across service worker restarts
 */
export interface ContentScriptInjectorState {
  /** Registered domains with their last used timestamp */
  registeredDomains: Record<string, number>;
  /** Last state update timestamp */
  lastUpdated: number;
}

/**
 * Default injector state
 */
export const DEFAULT_INJECTOR_STATE: ContentScriptInjectorState = {
  registeredDomains: {},
  lastUpdated: 0,
};

/**
 * ContentScriptInjector class for dynamic content script management
 * Implements LRU eviction when MAX_SCRIPTS limit is reached
 */
export class ContentScriptInjector {
  private state: ContentScriptInjectorState;
  private initialized: boolean = false;

  constructor() {
    // Deep copy to prevent mutation of DEFAULT_INJECTOR_STATE
    this.state = {
      registeredDomains: {},
      lastUpdated: 0,
    };
  }

  /**
   * Initialize injector by loading state from storage and syncing with Chrome
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.loadFromStorage();

    // Verify registered scripts match our state
    await this.syncWithChrome();

    this.initialized = true;
  }

  /**
   * Get the count of currently registered scripts
   */
  getRegisteredCount(): number {
    return Object.keys(this.state.registeredDomains).length;
  }

  /**
   * Get all registered domains
   */
  getRegisteredDomains(): string[] {
    return Object.keys(this.state.registeredDomains);
  }

  /**
   * Check if a domain is registered
   */
  isRegistered(domain: string): boolean {
    return domain in this.state.registeredDomains;
  }

  /**
   * Register a domain for content script injection
   * Uses LRU eviction if MAX_SCRIPTS limit is reached
   */
  async registerDomain(domain: string): Promise<boolean> {
    await this.initialize();

    const normalizedDomain = this.normalizeDomain(domain);

    // Already registered - just update timestamp
    if (this.isRegistered(normalizedDomain)) {
      this.state.registeredDomains[normalizedDomain] = Date.now();
      await this.saveToStorage();
      return true;
    }

    // Check limit and evict if necessary
    if (this.getRegisteredCount() >= MAX_SCRIPTS) {
      await this.evictLRU();
    }

    // Register new content script
    try {
      await chrome.scripting.registerContentScripts([
        {
          id: this.getScriptId(normalizedDomain),
          matches: this.getDomainMatches(normalizedDomain),
          js: ["content.js"],
          runAt: "document_idle",
        },
      ]);

      this.state.registeredDomains[normalizedDomain] = Date.now();
      await this.saveToStorage();
      return true;
    } catch (error) {
      console.error(
        `Failed to register content script for ${normalizedDomain}:`,
        error
      );
      return false;
    }
  }

  /**
   * Unregister a domain
   */
  async unregisterDomain(domain: string): Promise<boolean> {
    await this.initialize();

    const normalizedDomain = this.normalizeDomain(domain);

    if (!this.isRegistered(normalizedDomain)) {
      return false;
    }

    try {
      await chrome.scripting.unregisterContentScripts({
        ids: [this.getScriptId(normalizedDomain)],
      });

      delete this.state.registeredDomains[normalizedDomain];
      await this.saveToStorage();
      return true;
    } catch (error) {
      console.error(
        `Failed to unregister content script for ${normalizedDomain}:`,
        error
      );
      return false;
    }
  }

  /**
   * Sync with whitelist - register all domains from whitelist
   * Unregisters domains no longer in whitelist
   */
  async syncWithWhitelist(domains: string[]): Promise<void> {
    await this.initialize();

    const normalizedDomains = domains.map((d) => this.normalizeDomain(d));
    const currentDomains = new Set(this.getRegisteredDomains());
    const targetDomains = new Set(normalizedDomains.slice(0, MAX_SCRIPTS));

    // Unregister domains no longer in whitelist
    for (const domain of currentDomains) {
      if (!targetDomains.has(domain)) {
        await this.unregisterDomain(domain);
      }
    }

    // Register new domains from whitelist
    for (const domain of targetDomains) {
      if (!currentDomains.has(domain)) {
        await this.registerDomain(domain);
      }
    }
  }

  /**
   * Inject content script into existing tabs for a domain
   * Useful when a domain is newly added and tabs are already open
   */
  async injectIntoExistingTabs(domain: string): Promise<number> {
    const normalizedDomain = this.normalizeDomain(domain);
    const matches = this.getDomainMatches(normalizedDomain);
    let injectedCount = 0;

    try {
      // Query tabs matching the domain
      for (const pattern of matches) {
        const tabs = await chrome.tabs.query({ url: pattern });

        for (const tab of tabs) {
          if (tab.id) {
            try {
              await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["content.js"],
              });
              injectedCount++;
            } catch (error) {
              // Tab might not allow script injection (e.g., chrome:// pages)
              console.warn(`Failed to inject into tab ${tab.id}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error(
        `Failed to inject into existing tabs for ${normalizedDomain}:`,
        error
      );
    }

    return injectedCount;
  }

  /**
   * Unregister all content scripts
   */
  async unregisterAll(): Promise<void> {
    await this.initialize();

    const domains = this.getRegisteredDomains();
    if (domains.length === 0) {
      return;
    }

    try {
      const ids = domains.map((d) => this.getScriptId(d));
      await chrome.scripting.unregisterContentScripts({ ids });
      this.state.registeredDomains = {};
      await this.saveToStorage();
    } catch (error) {
      console.error("Failed to unregister all content scripts:", error);
    }
  }

  /**
   * Evict the least recently used domain
   */
  private async evictLRU(): Promise<void> {
    let oldestDomain = "";
    let oldestTime = Infinity;

    for (const [domain, timestamp] of Object.entries(
      this.state.registeredDomains
    )) {
      if (timestamp < oldestTime) {
        oldestTime = timestamp;
        oldestDomain = domain;
      }
    }

    if (oldestDomain) {
      console.log(
        `Evicting LRU domain: ${oldestDomain} (last used: ${new Date(oldestTime).toISOString()})`
      );
      await this.unregisterDomain(oldestDomain);
    }
  }

  /**
   * Sync internal state with Chrome's registered scripts
   * Handles cases where state and Chrome are out of sync
   */
  private async syncWithChrome(): Promise<void> {
    try {
      const registeredScripts =
        await chrome.scripting.getRegisteredContentScripts();
      const chromeScriptIds = new Set(
        registeredScripts
          .filter((s) => s.id.startsWith(SCRIPT_ID_PREFIX))
          .map((s) => s.id)
      );

      // Remove from state any domains that Chrome doesn't have
      for (const domain of Object.keys(this.state.registeredDomains)) {
        const scriptId = this.getScriptId(domain);
        if (!chromeScriptIds.has(scriptId)) {
          delete this.state.registeredDomains[domain];
        }
      }

      // Add to state any domains that Chrome has but we don't
      for (const script of registeredScripts) {
        if (script.id.startsWith(SCRIPT_ID_PREFIX)) {
          const domain = script.id.slice(SCRIPT_ID_PREFIX.length);
          if (!(domain in this.state.registeredDomains)) {
            this.state.registeredDomains[domain] = Date.now();
          }
        }
      }

      await this.saveToStorage();
    } catch (error) {
      console.error("Failed to sync with Chrome:", error);
    }
  }

  /**
   * Get script ID for a domain
   */
  private getScriptId(domain: string): string {
    return `${SCRIPT_ID_PREFIX}${domain}`;
  }

  /**
   * Get URL match patterns for a domain
   */
  private getDomainMatches(domain: string): string[] {
    // Handle both with and without subdomain
    return [`*://*.${domain}/*`, `*://${domain}/*`];
  }

  /**
   * Normalize domain (lowercase, remove protocol and path)
   */
  private normalizeDomain(domain: string): string {
    let normalized = domain.toLowerCase().trim();

    // Remove protocol if present
    normalized = normalized.replace(/^https?:\/\//, "");

    // Remove path if present
    normalized = normalized.split("/")[0];

    // Remove wildcard prefix if present
    normalized = normalized.replace(/^\*\./, "");

    // Remove port if present
    normalized = normalized.split(":")[0];

    return normalized;
  }

  /**
   * Save state to chrome.storage.local
   */
  private async saveToStorage(): Promise<void> {
    this.state.lastUpdated = Date.now();
    await chrome.storage.local.set({ [INJECTOR_STORAGE_KEY]: this.state });
  }

  /**
   * Load state from chrome.storage.local
   */
  private async loadFromStorage(): Promise<void> {
    const result = await chrome.storage.local.get(INJECTOR_STORAGE_KEY);
    if (result[INJECTOR_STORAGE_KEY]) {
      const loaded = result[INJECTOR_STORAGE_KEY] as ContentScriptInjectorState;
      // Deep copy to prevent mutation issues
      this.state = {
        registeredDomains: { ...loaded.registeredDomains },
        lastUpdated: loaded.lastUpdated,
      };
    } else {
      this.state = {
        registeredDomains: {},
        lastUpdated: 0,
      };
    }
  }

  /**
   * Reset state (for testing)
   */
  async reset(): Promise<void> {
    await this.unregisterAll();
    // Deep copy to prevent mutation of DEFAULT_INJECTOR_STATE
    this.state = {
      registeredDomains: {},
      lastUpdated: 0,
    };
    this.initialized = false;
    await this.saveToStorage();
  }
}

// Singleton instance
let injectorInstance: ContentScriptInjector | null = null;

/**
 * Get the singleton ContentScriptInjector instance
 */
export const getContentScriptInjector =
  async (): Promise<ContentScriptInjector> => {
    if (!injectorInstance) {
      injectorInstance = new ContentScriptInjector();
      await injectorInstance.initialize();
    }
    return injectorInstance;
  };

/**
 * Reset the singleton instance (for testing)
 */
export const resetContentScriptInjector = (): void => {
  injectorInstance = null;
};
