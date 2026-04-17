/**
 * Popup script for the Shade SaaS Manager extension
 * Handles UI interactions, sync status display, and settings management
 */

import { MessageType, SyncStatus, UsageStats } from "../shared/types";
import { loadConfig } from "../shared/utils";

// DOM elements - will be initialized when DOM is ready
let enabledToggle: HTMLInputElement;
let enabledToggler: HTMLLabelElement;
let statusText: HTMLSpanElement;
let versionText: HTMLSpanElement;

// Status card elements
let blockedCountEl: HTMLSpanElement;
let trackedCountEl: HTMLSpanElement;
let todayTimeEl: HTMLSpanElement;

// Sync status elements
let blacklistSyncTimeEl: HTMLSpanElement;
let blacklistSyncBadgeEl: HTMLSpanElement;
let whitelistSyncTimeEl: HTMLSpanElement;
let whitelistSyncBadgeEl: HTMLSpanElement;
let usageSyncTimeEl: HTMLSpanElement;
let usageSyncBadgeEl: HTMLSpanElement;
let browsingSyncTimeEl: HTMLSpanElement;
let browsingSyncBadgeEl: HTMLSpanElement;
let blockSyncTimeEl: HTMLSpanElement;
let blockSyncBadgeEl: HTMLSpanElement;
let syncAllButton: HTMLButtonElement;

// Time tracking DOM elements
let todayTotalEl: HTMLSpanElement;
let weeklyTotalEl: HTMLSpanElement;
let todayListEl: HTMLDivElement;
let weeklyListEl: HTMLDivElement;
let tabButtons: NodeListOf<HTMLButtonElement>;

// Admin link
let adminLinkEl: HTMLAnchorElement;

/**
 * Load and display configuration
 */
const loadAndDisplayConfig = async (): Promise<void> => {
  try {
    const config = await loadConfig();

    // Update UI with config values
    enabledToggle.checked = config.enabled;

    // Update admin link
    if (adminLinkEl && config.api) {
      adminLinkEl.href = config.api;
      adminLinkEl.addEventListener("click", (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: config.api });
      });
    }

    // Update status text
    updateStatusDisplay(config.enabled);

    // Get extension version
    const manifest = chrome.runtime.getManifest();
    versionText.textContent = manifest.version;
  } catch (error) {
    console.error("Error loading configuration:", error);
  }
};

/**
 * Update status display based on enabled state
 */
const updateStatusDisplay = (enabled: boolean): void => {
  statusText.textContent = enabled ? "Active" : "Disabled";
  statusText.className = `status-card-value ${enabled ? "status-active" : "status-disabled"}`;
};

/**
 * Format timestamp to relative time
 */
const formatRelativeTime = (timestamp: number): string => {
  if (!timestamp) return "Never";

  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString();
};

/**
 * Update sync badge display
 */
const updateSyncBadge = (
  badgeEl: HTMLSpanElement,
  status: "success" | "pending" | "error",
  text?: string
): void => {
  badgeEl.className = `sync-badge sync-badge-${status}`;
  badgeEl.textContent =
    text ||
    (status === "success"
      ? "Synced"
      : status === "error"
        ? "Error"
        : "Pending");
};

/**
 * Helper to display a SyncStatus on a sync row
 */
const displaySyncStatus = (
  syncStatus: SyncStatus,
  timeEl: HTMLSpanElement,
  badgeEl: HTMLSpanElement
): void => {
  timeEl.textContent = `Last sync: ${formatRelativeTime(syncStatus.lastSyncTime)}`;

  if (syncStatus.lastError) {
    updateSyncBadge(badgeEl, "error", "Error");
  } else if (syncStatus.pendingCount > 0) {
    updateSyncBadge(badgeEl, "pending", `${syncStatus.pendingCount} pending`);
  } else {
    updateSyncBadge(badgeEl, "success");
  }
};

/**
 * Load and display sync status for all sync types
 */
const loadSyncStatus = async (): Promise<void> => {
  try {
    // Get blacklist sync status
    const blacklistResponse = await chrome.runtime.sendMessage({
      type: MessageType.GET_BLACKLIST,
    });

    if (blacklistResponse?.success && blacklistResponse.data) {
      const domains = blacklistResponse.data.domains || [];
      blockedCountEl.textContent = String(domains.length);

      const lastSync = blacklistResponse.data.lastSyncTime;
      blacklistSyncTimeEl.textContent = `Last sync: ${formatRelativeTime(lastSync)}`;
      updateSyncBadge(blacklistSyncBadgeEl, lastSync ? "success" : "pending");
    }

    // Get whitelist sync status
    const whitelistResponse = await chrome.runtime.sendMessage({
      type: MessageType.GET_WHITELIST,
    });

    if (whitelistResponse?.success && whitelistResponse.data) {
      const domains = whitelistResponse.data.domains || [];
      trackedCountEl.textContent = String(domains.length);

      const lastSync = whitelistResponse.data.lastSyncTime;
      whitelistSyncTimeEl.textContent = `Last sync: ${formatRelativeTime(lastSync)}`;
      updateSyncBadge(whitelistSyncBadgeEl, lastSync ? "success" : "pending");
    }

    // Get all sync statuses (usage, browsing logs, block logs)
    const usageResponse = await chrome.runtime.sendMessage({
      type: MessageType.GET_SYNC_STATUS,
    });

    if (usageResponse?.success && usageResponse.data) {
      // Fix: properly extract timeTracking from the response object
      const allStatus = usageResponse.data as {
        timeTracking: SyncStatus;
        whitelist: SyncStatus;
        blacklist: SyncStatus;
        browsingLog: SyncStatus;
        blockLog: SyncStatus;
      };

      // Usage Data (time tracking)
      const usageStatus = allStatus.timeTracking;
      displaySyncStatus(usageStatus, usageSyncTimeEl, usageSyncBadgeEl);

      // Browsing Logs
      if (allStatus.browsingLog) {
        displaySyncStatus(
          allStatus.browsingLog,
          browsingSyncTimeEl,
          browsingSyncBadgeEl
        );
      }

      // Block Logs
      if (allStatus.blockLog) {
        displaySyncStatus(
          allStatus.blockLog,
          blockSyncTimeEl,
          blockSyncBadgeEl
        );
      }
    }
  } catch (error) {
    console.error("Error loading sync status:", error);
  }
};

/**
 * Trigger manual sync for all data types
 */
const syncAll = async (): Promise<void> => {
  syncAllButton.disabled = true;
  syncAllButton.textContent = "Syncing...";

  try {
    // Sync blacklist
    await chrome.runtime.sendMessage({ type: MessageType.SYNC_BLACKLIST });

    // Sync time tracking
    await chrome.runtime.sendMessage({ type: MessageType.SYNC_TIME_TRACKING });

    // Sync browsing & block logs
    await chrome.runtime.sendMessage({ type: MessageType.SYNC_URL_LOGS });

    // Send heartbeat to update device status immediately
    await chrome.runtime.sendMessage({ type: MessageType.SEND_HEARTBEAT });

    // Reload sync status
    await loadSyncStatus();

    syncAllButton.textContent = "Synced!";
    setTimeout(() => {
      syncAllButton.textContent = "Sync All Now";
      syncAllButton.disabled = false;
    }, 2000);
  } catch (error) {
    console.error("Error syncing:", error);
    syncAllButton.textContent = "Sync Failed";
    setTimeout(() => {
      syncAllButton.textContent = "Sync All Now";
      syncAllButton.disabled = false;
    }, 2000);
  }
};

/**
 * Initialize the popup
 */
const initialize = (): void => {
  // Initialize DOM elements
  enabledToggle = document.getElementById("enabled-toggle") as HTMLInputElement;
  enabledToggler = document.getElementById(
    "enabled-toggler"
  ) as HTMLLabelElement;
  statusText = document.getElementById("status-text") as HTMLSpanElement;
  versionText = document.getElementById("version-text") as HTMLSpanElement;

  // Initialize status card elements
  blockedCountEl = document.getElementById("blocked-count") as HTMLSpanElement;
  trackedCountEl = document.getElementById("tracked-count") as HTMLSpanElement;
  todayTimeEl = document.getElementById("today-time") as HTMLSpanElement;

  // Initialize sync status elements
  blacklistSyncTimeEl = document.getElementById(
    "blacklist-sync-time"
  ) as HTMLSpanElement;
  blacklistSyncBadgeEl = document.getElementById(
    "blacklist-sync-badge"
  ) as HTMLSpanElement;
  whitelistSyncTimeEl = document.getElementById(
    "whitelist-sync-time"
  ) as HTMLSpanElement;
  whitelistSyncBadgeEl = document.getElementById(
    "whitelist-sync-badge"
  ) as HTMLSpanElement;
  usageSyncTimeEl = document.getElementById(
    "usage-sync-time"
  ) as HTMLSpanElement;
  usageSyncBadgeEl = document.getElementById(
    "usage-sync-badge"
  ) as HTMLSpanElement;
  browsingSyncTimeEl = document.getElementById(
    "browsing-sync-time"
  ) as HTMLSpanElement;
  browsingSyncBadgeEl = document.getElementById(
    "browsing-sync-badge"
  ) as HTMLSpanElement;
  blockSyncTimeEl = document.getElementById(
    "block-sync-time"
  ) as HTMLSpanElement;
  blockSyncBadgeEl = document.getElementById(
    "block-sync-badge"
  ) as HTMLSpanElement;
  syncAllButton = document.getElementById(
    "sync-all-button"
  ) as HTMLButtonElement;

  // Initialize time tracking DOM elements
  todayTotalEl = document.getElementById("today-total") as HTMLSpanElement;
  weeklyTotalEl = document.getElementById("weekly-total") as HTMLSpanElement;
  todayListEl = document.getElementById("today-list") as HTMLDivElement;
  weeklyListEl = document.getElementById("weekly-list") as HTMLDivElement;
  tabButtons = document.querySelectorAll(
    ".tab"
  ) as NodeListOf<HTMLButtonElement>;

  // Initialize admin link
  adminLinkEl = document.getElementById("admin-link") as HTMLAnchorElement;

  // Check if all critical elements were found
  if (!enabledToggle || !statusText) {
    console.error("Some critical DOM elements were not found");
    return;
  }

  // Load and display configuration
  loadAndDisplayConfig();

  // Load sync status
  loadSyncStatus();

  // Set up event listeners
  syncAllButton?.addEventListener("click", syncAll);

  // Toggle status text when the toggle is clicked
  enabledToggle.addEventListener("change", () => {
    updateStatusDisplay(enabledToggle.checked);
  });

  // Set up tab switching
  setupTabSwitching();

  // Load time tracking data
  loadTimeTrackingData();
};

/**
 * Set up tab switching for time tracking section
 */
const setupTabSwitching = (): void => {
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // Update active tab button
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      // Show corresponding content
      const tabName = button.getAttribute("data-tab");
      document.querySelectorAll(".tab-content").forEach((content) => {
        content.classList.remove("active");
      });
      const targetContent = document.getElementById(`${tabName}-content`);
      if (targetContent) {
        targetContent.classList.add("active");
      }
    });
  });
};

/**
 * Format duration in seconds to human-readable string
 */
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

/**
 * Load and display time tracking data
 */
const loadTimeTrackingData = async (): Promise<void> => {
  try {
    // Request today's usage from background script
    const todayResponse = await chrome.runtime.sendMessage({
      type: MessageType.GET_TODAY_USAGE,
    });

    if (todayResponse?.success && todayResponse.data) {
      const stats = todayResponse.data as UsageStats;
      displayUsageStats(stats, todayTotalEl, todayListEl);

      // Update today's time in status card
      if (todayTimeEl) {
        todayTimeEl.textContent = formatDuration(stats.totalSeconds);
      }
    }

    // Request weekly usage from background script
    const weeklyResponse = await chrome.runtime.sendMessage({
      type: MessageType.GET_WEEKLY_USAGE,
    });

    if (weeklyResponse?.success && weeklyResponse.data) {
      displayUsageStats(
        weeklyResponse.data as UsageStats,
        weeklyTotalEl,
        weeklyListEl
      );
    }
  } catch (error) {
    console.error("Error loading time tracking data:", error);
  }
};

/**
 * Display usage statistics in the popup
 */
const displayUsageStats = (
  stats: UsageStats,
  totalEl: HTMLSpanElement,
  listEl: HTMLDivElement
): void => {
  // Update total
  totalEl.textContent = formatDuration(stats.totalSeconds);

  // Clear existing list
  listEl.innerHTML = "";

  if (stats.byDomain.length === 0) {
    listEl.innerHTML = '<div class="no-data">No usage data yet</div>';
    return;
  }

  // Create list items for each domain
  stats.byDomain.forEach((item) => {
    const itemEl = document.createElement("div");
    itemEl.className = "usage-item";

    const infoEl = document.createElement("div");
    infoEl.style.flex = "1";
    infoEl.style.overflow = "hidden";

    const domainEl = document.createElement("div");
    domainEl.className = "usage-domain";
    domainEl.textContent = item.domain;
    domainEl.title = item.domain;

    const barEl = document.createElement("div");
    barEl.className = "usage-bar";

    const barFillEl = document.createElement("div");
    barFillEl.className = "usage-bar-fill";
    barFillEl.style.width = `${Math.min(100, item.percentage)}%`;

    barEl.appendChild(barFillEl);
    infoEl.appendChild(domainEl);
    infoEl.appendChild(barEl);

    const timeEl = document.createElement("div");
    timeEl.className = "usage-time";
    timeEl.textContent = formatDuration(item.seconds);

    itemEl.appendChild(infoEl);
    itemEl.appendChild(timeEl);
    listEl.appendChild(itemEl);
  });
};

// Initialize when the DOM is ready
// Use a more reliable approach for Chrome extensions
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  // DOM is already ready
  initialize();
}
