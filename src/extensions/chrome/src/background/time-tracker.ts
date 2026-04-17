/**
 * Time Tracker Module
 * Tracks SaaS usage time by domain
 * Phase 4 Implementation
 */

import { API_PATHS } from "../shared/api-paths";
import {
  DailyUsage,
  DEFAULT_TIME_TRACKING_STATE,
  SyncStatus,
  TimeTrackingState,
  TimeTrackingSyncPayload,
  UsageSession,
  UsageStats,
} from "../shared/types";
import { loadConfig, sendToBackend } from "../shared/utils";

/** Storage key for time tracking data */
export const STORAGE_KEY = "timeTrackingState";

/** Number of days to keep data */
const DATA_RETENTION_DAYS = 30;

/**
 * Get date string in YYYY-MM-DD format
 * @param date - Date object, defaults to current date
 */
export const getDateString = (date: Date = new Date()): string => {
  return date.toISOString().split("T")[0];
};

/**
 * Format duration in seconds to human-readable string
 * @param seconds - Duration in seconds
 * @returns Formatted string like "2h 30m"
 */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

/**
 * TimeTracker class for managing usage sessions and statistics
 */
export class TimeTracker {
  private state: TimeTrackingState;

  constructor() {
    this.state = { ...DEFAULT_TIME_TRACKING_STATE };
  }

  /**
   * Get current state (for testing and debugging)
   */
  async getState(): Promise<TimeTrackingState> {
    return { ...this.state };
  }

  /**
   * Start a new usage session for a domain
   * @param domain - The domain being tracked
   */
  async startSession(domain: string): Promise<void> {
    // If same domain is already active, do nothing
    if (this.state.currentSession?.domain === domain) {
      return;
    }

    // End previous session if exists
    if (this.state.currentSession) {
      await this.endSession();
    }

    // Create new session
    this.state.currentSession = {
      domain,
      startTime: Date.now(),
      duration: 0,
    };

    await this.saveToStorage();
  }

  /**
   * End the current session and save to daily usage
   */
  async endSession(): Promise<void> {
    if (!this.state.currentSession) {
      return;
    }

    const session = this.state.currentSession;
    const endTime = Date.now();
    const durationMs = endTime - session.startTime;
    const durationSeconds = Math.round(durationMs / 1000);

    // Update session with end time and duration
    session.endTime = endTime;
    session.duration = durationSeconds;

    // Save to daily usage
    await this.addToDailyUsage(session);

    // Clear current session
    this.state.currentSession = undefined;

    await this.saveToStorage();
  }

  /**
   * Add a completed session to daily usage
   */
  private async addToDailyUsage(session: UsageSession): Promise<void> {
    const dateKey = getDateString();

    // Initialize daily usage for today if not exists
    if (!this.state.dailyUsage[dateKey]) {
      this.state.dailyUsage[dateKey] = {
        date: dateKey,
        domains: {},
        totalSeconds: 0,
      };
    }

    const daily = this.state.dailyUsage[dateKey];

    // Initialize domain usage if not exists
    if (!daily.domains[session.domain]) {
      daily.domains[session.domain] = {
        domain: session.domain,
        totalSeconds: 0,
        lastActive: session.endTime || Date.now(),
        sessions: [],
      };
    }

    const domainUsage = daily.domains[session.domain];

    // Update domain usage
    domainUsage.totalSeconds += session.duration;
    domainUsage.lastActive = session.endTime || Date.now();
    domainUsage.sessions.push({ ...session });

    // Update daily total
    daily.totalSeconds += session.duration;

    // Mark as pending sync for Phase 5
    this.state.pendingSync = true;
  }

  /**
   * Get usage statistics for today
   */
  async getTodayUsage(): Promise<UsageStats> {
    return this.getUsageStats(1);
  }

  /**
   * Get usage statistics for the last 7 days
   */
  async getWeeklyUsage(): Promise<UsageStats> {
    return this.getUsageStats(7);
  }

  /**
   * Get usage statistics for specified number of days
   * @param days - Number of days to include
   */
  async getUsageStats(days: number): Promise<UsageStats> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));

    // Aggregate usage by domain
    const domainTotals: Record<string, number> = {};
    let totalSeconds = 0;

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = getDateString(date);

      const daily = this.state.dailyUsage[dateKey];
      if (daily) {
        for (const [domain, usage] of Object.entries(daily.domains)) {
          domainTotals[domain] =
            (domainTotals[domain] || 0) + usage.totalSeconds;
          totalSeconds += usage.totalSeconds;
        }
      }
    }

    // Calculate percentages and sort by usage
    const byDomain = Object.entries(domainTotals)
      .map(([domain, seconds]) => ({
        domain,
        seconds,
        percentage: totalSeconds > 0 ? (seconds / totalSeconds) * 100 : 0,
      }))
      .sort((a, b) => b.seconds - a.seconds);

    return {
      totalSeconds,
      byDomain,
      daysCount: days,
      startDate: getDateString(startDate),
      endDate: getDateString(endDate),
    };
  }

  /**
   * Save state to chrome.storage.local
   */
  async saveToStorage(): Promise<void> {
    this.state.lastSyncTime = Date.now();
    await chrome.storage.local.set({ [STORAGE_KEY]: this.state });
  }

  /**
   * Load state from chrome.storage.local
   */
  async loadFromStorage(): Promise<void> {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    if (result[STORAGE_KEY]) {
      this.state = result[STORAGE_KEY] as TimeTrackingState;
    } else {
      this.state = { ...DEFAULT_TIME_TRACKING_STATE };
    }
  }

  /**
   * Clean up data older than retention period
   */
  async cleanupOldData(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DATA_RETENTION_DAYS);
    const cutoffKey = getDateString(cutoffDate);

    // Remove old entries
    const newDailyUsage: Record<string, DailyUsage> = {};
    for (const [dateKey, daily] of Object.entries(this.state.dailyUsage)) {
      if (dateKey >= cutoffKey) {
        newDailyUsage[dateKey] = daily;
      }
    }

    this.state.dailyUsage = newDailyUsage;
    await this.saveToStorage();
  }

  /**
   * Sync time tracking data to backend
   * Phase 5 Implementation
   */
  async syncToBackend(): Promise<SyncStatus> {
    const status: SyncStatus = {
      syncing: true,
      lastSyncTime: this.state.syncedAt || 0,
      pendingCount: 0,
    };

    try {
      // Check if there's data to sync
      if (!this.state.pendingSync) {
        status.syncing = false;
        return status;
      }

      // Load config for API URL and device ID
      const config = await loadConfig();
      if (!config.enabled || !config.api) {
        status.syncing = false;
        status.lastError = "Extension disabled or API not configured";
        return status;
      }

      // Get unsynced daily usage data
      const unsyncedData = this.getUnsyncedData();
      status.pendingCount = unsyncedData.length;

      if (unsyncedData.length === 0) {
        this.state.pendingSync = false;
        await this.saveToStorage();
        status.syncing = false;
        return status;
      }

      // Prepare sync payload
      const payload: TimeTrackingSyncPayload = {
        deviceId: config.id,
        dailyUsage: unsyncedData,
        syncTimestamp: Date.now(),
      };

      // Send to backend
      const response = await sendToBackend(
        API_PATHS.USAGE_SYNC,
        payload as unknown as Record<string, unknown>,
        config.api
      );

      if (response.ok) {
        // Mark as synced
        this.state.syncedAt = Date.now();
        this.state.pendingSync = false;
        await this.saveToStorage();

        status.lastSyncTime = this.state.syncedAt;
        status.pendingCount = 0;
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        status.lastError = errorData.error || `HTTP ${response.status}`;
      }
    } catch (error) {
      status.lastError = error instanceof Error ? error.message : "Sync failed";
      console.error("Time tracking sync error:", error);
    }

    status.syncing = false;
    return status;
  }

  /**
   * Get daily usage data that hasn't been synced yet
   */
  private getUnsyncedData(): DailyUsage[] {
    const syncedAt = this.state.syncedAt || 0;
    const unsyncedData: DailyUsage[] = [];

    for (const [dateKey, daily] of Object.entries(this.state.dailyUsage)) {
      // Include data from the last 7 days that has been modified since last sync
      const dayStart = new Date(dateKey).getTime();
      const now = Date.now();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

      if (dayStart >= sevenDaysAgo) {
        // Check if any session was added after last sync
        const hasNewData = Object.values(daily.domains).some((domain) =>
          domain.sessions.some(
            (session) => (session.endTime || session.startTime) > syncedAt
          )
        );

        if (hasNewData || syncedAt === 0) {
          unsyncedData.push(daily);
        }
      }
    }

    return unsyncedData;
  }

  /**
   * Get current sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    const unsyncedData = this.getUnsyncedData();
    return {
      syncing: false,
      lastSyncTime: this.state.syncedAt || 0,
      pendingCount: unsyncedData.length,
      lastError: undefined,
    };
  }
}

// Singleton instance for use across the extension
let trackerInstance: TimeTracker | null = null;

/**
 * Get the singleton TimeTracker instance
 */
export const getTimeTracker = async (): Promise<TimeTracker> => {
  if (!trackerInstance) {
    trackerInstance = new TimeTracker();
    await trackerInstance.loadFromStorage();
  }
  return trackerInstance;
};

/**
 * Reset the singleton instance (for testing)
 */
export const resetTimeTracker = (): void => {
  trackerInstance = null;
};
