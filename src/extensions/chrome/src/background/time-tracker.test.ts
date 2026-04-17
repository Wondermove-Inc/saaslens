/**
 * Time Tracker Module Tests
 * TDD approach - tests written before implementation
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TimeTrackingState } from "../shared/types";

// Mock chrome.storage.local
const mockStorage: Record<string, unknown> = {};
const mockChrome = {
  storage: {
    local: {
      get: vi.fn((keys: string | string[]) => {
        const result: Record<string, unknown> = {};
        const keyArray = Array.isArray(keys) ? keys : [keys];
        keyArray.forEach((key) => {
          if (mockStorage[key] !== undefined) {
            result[key] = mockStorage[key];
          }
        });
        return Promise.resolve(result);
      }),
      set: vi.fn((items: Record<string, unknown>) => {
        Object.assign(mockStorage, items);
        return Promise.resolve();
      }),
      remove: vi.fn((keys: string | string[]) => {
        const keyArray = Array.isArray(keys) ? keys : [keys];
        keyArray.forEach((key) => delete mockStorage[key]);
        return Promise.resolve();
      }),
    },
  },
};

// Set up global chrome mock
(global as unknown as { chrome: typeof mockChrome }).chrome = mockChrome;

// Import after mock setup
import {
  formatDuration,
  getDateString,
  STORAGE_KEY,
  TimeTracker,
} from "./time-tracker";

describe("Time Tracker Module", () => {
  let tracker: TimeTracker;

  beforeEach(() => {
    // Clear mock storage completely
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    vi.clearAllMocks();

    // Create fresh tracker instance
    tracker = new TimeTracker();
  });

  afterEach(() => {
    // Restore real timers if fake timers were used
    vi.useRealTimers();
    // Ensure storage is cleared after each test
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  describe("Utility Functions", () => {
    describe("getDateString", () => {
      it("should return date in YYYY-MM-DD format", () => {
        const date = new Date("2026-01-07T10:30:00Z");
        const result = getDateString(date);
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });

      it("should use current date when no argument provided", () => {
        const result = getDateString();
        const today = new Date().toISOString().split("T")[0];
        expect(result).toBe(today);
      });
    });

    describe("formatDuration", () => {
      it('should format seconds as "Xh Ym"', () => {
        expect(formatDuration(3661)).toBe("1h 1m");
        expect(formatDuration(7200)).toBe("2h 0m");
        expect(formatDuration(1800)).toBe("0h 30m");
      });

      it("should handle zero seconds", () => {
        expect(formatDuration(0)).toBe("0h 0m");
      });

      it("should handle large values", () => {
        expect(formatDuration(86400)).toBe("24h 0m"); // 24 hours
      });
    });
  });

  describe("Session Management", () => {
    describe("startSession", () => {
      it("should create a new session for a domain", async () => {
        await tracker.startSession("github.com");

        const state = await tracker.getState();
        expect(state.currentSession).toBeDefined();
        expect(state.currentSession?.domain).toBe("github.com");
        expect(state.currentSession?.startTime).toBeLessThanOrEqual(Date.now());
        expect(state.currentSession?.duration).toBe(0);
      });

      it("should end previous session when starting new one", async () => {
        await tracker.startSession("github.com");

        // Wait a bit to accumulate some time
        await new Promise((resolve) => setTimeout(resolve, 100));

        await tracker.startSession("slack.com");

        const state = await tracker.getState();
        expect(state.currentSession?.domain).toBe("slack.com");

        // Previous session should be saved to daily usage
        const today = getDateString();
        expect(state.dailyUsage[today]?.domains["github.com"]).toBeDefined();
      });

      it("should not create duplicate session for same domain", async () => {
        await tracker.startSession("github.com");
        const firstState = await tracker.getState();
        const firstStartTime = firstState.currentSession?.startTime;

        await tracker.startSession("github.com");
        const secondState = await tracker.getState();

        expect(secondState.currentSession?.startTime).toBe(firstStartTime);
      });
    });

    describe("endSession", () => {
      it("should end current session and save to daily usage", async () => {
        await tracker.startSession("github.com");

        // Wait to accumulate time
        await new Promise((resolve) => setTimeout(resolve, 100));

        await tracker.endSession();

        const state = await tracker.getState();
        expect(state.currentSession).toBeUndefined();

        const today = getDateString();
        expect(state.dailyUsage[today]?.domains["github.com"]).toBeDefined();
      });

      it("should do nothing if no active session", async () => {
        await tracker.endSession();

        const state = await tracker.getState();
        expect(state.currentSession).toBeUndefined();
      });

      it("should calculate duration correctly", async () => {
        // Use fake timers to control time precisely
        vi.useFakeTimers();
        const baseTime = new Date("2026-04-01T12:00:00Z").getTime();
        vi.setSystemTime(baseTime);

        await tracker.startSession("github.com");

        // Advance time by 5 seconds
        vi.setSystemTime(baseTime + 5000);

        await tracker.endSession();

        const state = await tracker.getState();
        const today = getDateString();
        const usage = state.dailyUsage[today]?.domains["github.com"];

        // Duration should be 5 seconds (Math.round(5000 / 1000))
        expect(usage?.totalSeconds).toBe(5);

        vi.useRealTimers();
      });
    });
  });

  describe("Usage Statistics", () => {
    beforeEach(async () => {
      // Set up test data
      const today = getDateString();
      const yesterday = getDateString(new Date(Date.now() - 86400000));

      const testState: TimeTrackingState = {
        dailyUsage: {
          [today]: {
            date: today,
            domains: {
              "github.com": {
                domain: "github.com",
                totalSeconds: 3600, // 1 hour
                lastActive: Date.now(),
                sessions: [],
              },
              "slack.com": {
                domain: "slack.com",
                totalSeconds: 1800, // 30 minutes
                lastActive: Date.now(),
                sessions: [],
              },
            },
            totalSeconds: 5400,
          },
          [yesterday]: {
            date: yesterday,
            domains: {
              "github.com": {
                domain: "github.com",
                totalSeconds: 7200, // 2 hours
                lastActive: Date.now() - 86400000,
                sessions: [],
              },
            },
            totalSeconds: 7200,
          },
        },
        lastSyncTime: Date.now(),
        pendingSync: false,
      };

      mockStorage[STORAGE_KEY] = testState;
      tracker = new TimeTracker();
      await tracker.loadFromStorage();
    });

    describe("getTodayUsage", () => {
      it("should return usage stats for today only", async () => {
        const stats = await tracker.getTodayUsage();

        expect(stats.daysCount).toBe(1);
        expect(stats.totalSeconds).toBe(5400); // 1.5 hours
        expect(stats.byDomain).toHaveLength(2);
      });

      it("should calculate percentages correctly", async () => {
        const stats = await tracker.getTodayUsage();

        const githubUsage = stats.byDomain.find(
          (d: { domain: string; seconds: number; percentage: number }) =>
            d.domain === "github.com"
        );
        const slackUsage = stats.byDomain.find(
          (d: { domain: string; seconds: number; percentage: number }) =>
            d.domain === "slack.com"
        );

        // GitHub: 3600/5400 = 66.67%
        expect(githubUsage?.percentage).toBeCloseTo(66.67, 1);
        // Slack: 1800/5400 = 33.33%
        expect(slackUsage?.percentage).toBeCloseTo(33.33, 1);
      });

      it("should sort domains by usage time descending", async () => {
        const stats = await tracker.getTodayUsage();

        expect(stats.byDomain[0].domain).toBe("github.com");
        expect(stats.byDomain[1].domain).toBe("slack.com");
      });
    });

    describe("getWeeklyUsage", () => {
      it("should return usage stats for last 7 days", async () => {
        const stats = await tracker.getWeeklyUsage();

        expect(stats.daysCount).toBe(7);
        // Today (5400) + Yesterday (7200) = 12600
        expect(stats.totalSeconds).toBe(12600);
      });

      it("should aggregate domain usage across days", async () => {
        const stats = await tracker.getWeeklyUsage();

        const githubUsage = stats.byDomain.find(
          (d: { domain: string; seconds: number; percentage: number }) =>
            d.domain === "github.com"
        );
        // Today (3600) + Yesterday (7200) = 10800
        expect(githubUsage?.seconds).toBe(10800);
      });
    });

    describe("getUsageStats", () => {
      it("should return stats for specified number of days", async () => {
        const stats = await tracker.getUsageStats(2);

        expect(stats.daysCount).toBe(2);
      });

      it("should handle days with no data", async () => {
        const stats = await tracker.getUsageStats(30);

        expect(stats.daysCount).toBe(30);
        // Should still have the same total from available data
        expect(stats.totalSeconds).toBe(12600);
      });
    });
  });

  describe("Storage Operations", () => {
    describe("saveToStorage", () => {
      it("should save state to chrome.storage.local", async () => {
        await tracker.startSession("github.com");
        await tracker.saveToStorage();

        expect(mockChrome.storage.local.set).toHaveBeenCalled();
        expect(mockStorage[STORAGE_KEY]).toBeDefined();
      });
    });

    describe("loadFromStorage", () => {
      it("should load state from chrome.storage.local", async () => {
        const testState: TimeTrackingState = {
          dailyUsage: {
            "2026-01-07": {
              date: "2026-01-07",
              domains: {
                "test.com": {
                  domain: "test.com",
                  totalSeconds: 100,
                  lastActive: Date.now(),
                  sessions: [],
                },
              },
              totalSeconds: 100,
            },
          },
          lastSyncTime: Date.now(),
          pendingSync: false,
        };

        mockStorage[STORAGE_KEY] = testState;

        await tracker.loadFromStorage();
        const state = await tracker.getState();

        expect(state.dailyUsage["2026-01-07"]).toBeDefined();
      });

      it("should use default state for new tracker instance", async () => {
        // A newly created tracker should have default state before loadFromStorage
        const freshTracker = new TimeTracker();
        const state = await freshTracker.getState();

        // Before loading, state should be default
        expect(state.pendingSync).toBe(false);
        expect(state.lastSyncTime).toBeDefined();
      });
    });

    describe("cleanupOldData", () => {
      it("should remove data older than 30 days", async () => {
        const today = getDateString();
        const oldDate = getDateString(new Date(Date.now() - 31 * 86400000));

        const testState: TimeTrackingState = {
          dailyUsage: {
            [today]: {
              date: today,
              domains: {},
              totalSeconds: 0,
            },
            [oldDate]: {
              date: oldDate,
              domains: {},
              totalSeconds: 0,
            },
          },
          lastSyncTime: Date.now(),
          pendingSync: false,
        };

        mockStorage[STORAGE_KEY] = testState;
        await tracker.loadFromStorage();

        await tracker.cleanupOldData();

        const state = await tracker.getState();
        expect(state.dailyUsage[today]).toBeDefined();
        expect(state.dailyUsage[oldDate]).toBeUndefined();
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle domain with no prior usage", async () => {
      await tracker.startSession("newdomain.com");
      await tracker.endSession();

      const stats = await tracker.getTodayUsage();
      expect(
        stats.byDomain.some(
          (d: { domain: string }) => d.domain === "newdomain.com"
        )
      ).toBe(true);
    });

    it("should handle rapid session switches", async () => {
      await tracker.startSession("github.com");
      await tracker.startSession("slack.com");
      await tracker.startSession("notion.so");
      await tracker.endSession();

      const state = await tracker.getState();
      expect(state.currentSession).toBeUndefined();
    });

    it("should persist across tracker instances", async () => {
      await tracker.startSession("github.com");
      await new Promise((resolve) => setTimeout(resolve, 100));
      await tracker.endSession();
      await tracker.saveToStorage();

      // Create new tracker instance
      const newTracker = new TimeTracker();
      await newTracker.loadFromStorage();

      const stats = await newTracker.getTodayUsage();
      expect(
        stats.byDomain.some(
          (d: { domain: string }) => d.domain === "github.com"
        )
      ).toBe(true);
    });
  });
});
