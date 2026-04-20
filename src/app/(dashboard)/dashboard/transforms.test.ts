// src/app/(dashboard)/dashboard/transforms.test.ts
import { describe, expect, it } from "vitest";

import {
  getGrade,
  transformSeatWasteToLicenseTrend,
  transformToDashboardV3Data,
  transformTopApps,
} from "./transforms";

import type {
  AppCostDistribution,
  CostStatistics,
  MonthlyCostTrend,
} from "@/types/cost-analytics";
import type { DashboardStats } from "@/types/dashboard";
import type {
  SeatWasteAnalysis,
  SeatWastePerApp,
} from "@/types/seat-analytics";

// Minimal stubs for required params (not under test)
const stubStats: DashboardStats = {
  totalApps: 5,
  activeSubscriptions: 3,
  totalUsers: 10,
  totalMonthlyCost: 100000,
  currency: "KRW",
};

const stubCostStats: CostStatistics = {
  totalCost: 100000,
  monthlyAverage: 95000,
  costChange: -5,
  costDifference: -5000,
  transactionCount: 20,
  currency: "KRW",
  periodStart: new Date("2026-01-01"),
  periodEnd: new Date("2026-01-31"),
  totalCostAll: 120000,
};

function makeSeatWasteApp(
  overrides: Partial<SeatWastePerApp>
): SeatWastePerApp {
  return {
    appId: "app-1",
    appName: "TestApp",
    appLogoUrl: null,
    totalSeats: 20,
    assignedSeats: 3,
    activeSeats: 3,
    unassignedSeats: 17,
    inactiveSeats: 0,
    wastedSeats: 17,
    perSeatPrice: 10000,
    monthlyWaste: 170000,
    annualWaste: 2040000,
    utilizationRate: 15,
    ...overrides,
  };
}

function makeSeatWaste(apps: SeatWastePerApp[]): SeatWasteAnalysis {
  return {
    summary: {
      totalMonthlyWaste: apps.reduce((s, a) => s + a.monthlyWaste, 0),
      totalAnnualWaste: apps.reduce((s, a) => s + a.annualWaste, 0),
      overallUtilizationRate: 15,
      appCount: apps.length,
      totalWastedSeats: apps.reduce((s, a) => s + a.wastedSeats, 0),
    },
    apps,
  };
}

// Helper: create AppCostDistribution
function makeApp(overrides: Partial<AppCostDistribution>): AppCostDistribution {
  return {
    appId: "app-1",
    appName: "Slack",
    appLogoUrl: "https://logo.example.com/slack.png",
    totalCost: 500000,
    percentage: 25,
    transactionCount: 10,
    ...overrides,
  };
}

describe("transformTopApps", () => {
  it("should use real seat data when seatWasteApps match by appId", () => {
    const apps: AppCostDistribution[] = [
      makeApp({
        appId: "app-1",
        appName: "Slack",
        appLogoUrl: "https://logo.example.com/slack.png",
      }),
    ];
    const seatWasteApps: SeatWastePerApp[] = [
      makeSeatWasteApp({
        appId: "app-1",
        assignedSeats: 15,
        activeSeats: 10, // different from assignedSeats
        totalSeats: 20,
        utilizationRate: 50, // activeSeats-based (should be ignored)
      }),
    ];

    const result = transformTopApps(apps, seatWasteApps);

    expect(result).toHaveLength(1);
    expect(result[0].hasSeatData).toBe(true);
    expect(result[0].usedLicenses).toBe(15); // assignedSeats
    expect(result[0].totalLicenses).toBe(20); // totalSeats
    expect(result[0].usageEfficiency).toBe(75); // assignedSeats/totalSeats = 15/20 = 75%
    expect(result[0].grade).toBe("B"); // 75 → B (60-79)
    expect(result[0].logoUrl).toBe("https://logo.example.com/slack.png");
  });

  it("should fallback to 0/0/0%/D with hasSeatData=false for apps without seat waste data", () => {
    const apps: AppCostDistribution[] = [
      makeApp({ appId: "app-no-sub", appName: "NoSub App" }),
    ];
    const seatWasteApps: SeatWastePerApp[] = [
      makeSeatWasteApp({ appId: "app-other" }),
    ];

    const result = transformTopApps(apps, seatWasteApps);

    expect(result).toHaveLength(1);
    expect(result[0].hasSeatData).toBe(false);
    expect(result[0].usedLicenses).toBe(0);
    expect(result[0].totalLicenses).toBe(0);
    expect(result[0].usageEfficiency).toBe(0);
    expect(result[0].grade).toBe("D");
  });

  it("should be backward-compatible when seatWasteApps is not provided", () => {
    const apps: AppCostDistribution[] = [makeApp({ appId: "app-1" })];

    const result = transformTopApps(apps);

    expect(result).toHaveLength(1);
    expect(result[0].hasSeatData).toBe(false);
    expect(result[0].usedLicenses).toBe(0);
    expect(result[0].totalLicenses).toBe(0);
    expect(result[0].usageEfficiency).toBe(0);
    expect(result[0].grade).toBe("D");
  });

  it("should handle mixed matched and unmatched apps", () => {
    const apps: AppCostDistribution[] = [
      makeApp({ appId: "app-1", appName: "Slack", totalCost: 500000 }),
      makeApp({ appId: "app-2", appName: "Notion", totalCost: 300000 }),
      makeApp({ appId: "app-3", appName: "Figma", totalCost: 200000 }),
    ];
    const seatWasteApps: SeatWastePerApp[] = [
      makeSeatWasteApp({
        appId: "app-1",
        assignedSeats: 18,
        activeSeats: 14,
        totalSeats: 20,
        utilizationRate: 70, // activeSeats-based (ignored)
      }),
      makeSeatWasteApp({
        appId: "app-3",
        assignedSeats: 5,
        activeSeats: 3,
        totalSeats: 10,
        utilizationRate: 30, // activeSeats-based (ignored)
      }),
    ];

    const result = transformTopApps(apps, seatWasteApps);

    expect(result).toHaveLength(3);
    // app-1: matched → assignedSeats/totalSeats = 18/20 = 90%
    expect(result[0].hasSeatData).toBe(true);
    expect(result[0].usedLicenses).toBe(18);
    expect(result[0].totalLicenses).toBe(20);
    expect(result[0].usageEfficiency).toBe(90);
    expect(result[0].grade).toBe("A");
    // app-2: unmatched → fallback
    expect(result[1].hasSeatData).toBe(false);
    expect(result[1].usedLicenses).toBe(0);
    expect(result[1].totalLicenses).toBe(0);
    expect(result[1].usageEfficiency).toBe(0);
    expect(result[1].grade).toBe("D");
    // app-3: matched → assignedSeats/totalSeats = 5/10 = 50%
    expect(result[2].hasSeatData).toBe(true);
    expect(result[2].usedLicenses).toBe(5);
    expect(result[2].totalLicenses).toBe(10);
    expect(result[2].usageEfficiency).toBe(50);
    expect(result[2].grade).toBe("C"); // 50 → C (40-59)
  });

  it("should map logoUrl from AppCostDistribution.appLogoUrl", () => {
    const apps: AppCostDistribution[] = [
      makeApp({
        appId: "app-1",
        appLogoUrl: "https://logo.example.com/app.png",
      }),
      makeApp({ appId: "app-2", appLogoUrl: undefined }),
    ];

    const result = transformTopApps(apps);

    expect(result[0].logoUrl).toBe("https://logo.example.com/app.png");
    expect(result[1].logoUrl).toBeUndefined();
  });

  it("should use assignedSeats (not activeSeats) for usedLicenses", () => {
    const apps: AppCostDistribution[] = [
      makeApp({ appId: "app-1", appName: "Slack" }),
    ];
    const seatWasteApps: SeatWastePerApp[] = [
      makeSeatWasteApp({
        appId: "app-1",
        totalSeats: 20,
        assignedSeats: 12,
        activeSeats: 5, // different from assignedSeats
      }),
    ];

    const result = transformTopApps(apps, seatWasteApps);

    // usedLicenses should reflect assignedSeats (12), NOT activeSeats (5)
    expect(result[0].usedLicenses).toBe(12);
    expect(result[0].totalLicenses).toBe(20);
  });

  it("should compute usageEfficiency and grade from assignedSeats, not activeSeats (regression)", () => {
    const apps: AppCostDistribution[] = [
      makeApp({ appId: "app-1", appName: "Slack" }),
    ];
    const seatWasteApps: SeatWastePerApp[] = [
      makeSeatWasteApp({
        appId: "app-1",
        totalSeats: 20,
        assignedSeats: 12,
        activeSeats: 8, // different from assignedSeats
        utilizationRate: 40, // activeSeats/totalSeats = 8/20 = 40% (should be ignored)
      }),
    ];

    const result = transformTopApps(apps, seatWasteApps);

    // Efficiency should be assignedSeats/totalSeats = 12/20 = 60%, NOT utilizationRate (40%)
    expect(result[0].usedLicenses).toBe(12);
    expect(result[0].usageEfficiency).toBe(60);
    expect(result[0].grade).toBe("B"); // 60% → B
  });

  it("should produce deterministic results (no Math.random)", () => {
    const apps: AppCostDistribution[] = [makeApp({ appId: "app-1" })];
    const seatWasteApps: SeatWastePerApp[] = [
      makeSeatWasteApp({
        appId: "app-1",
        assignedSeats: 10,
        activeSeats: 7,
        totalSeats: 20,
        utilizationRate: 35, // activeSeats-based (ignored)
      }),
    ];

    const result1 = transformTopApps(apps, seatWasteApps);
    const result2 = transformTopApps(apps, seatWasteApps);

    expect(result1[0].hasSeatData).toBe(result2[0].hasSeatData);
    expect(result1[0].usageEfficiency).toBe(result2[0].usageEfficiency);
    expect(result1[0].grade).toBe(result2[0].grade);
    expect(result1[0].usedLicenses).toBe(result2[0].usedLicenses);
    expect(result1[0].totalLicenses).toBe(result2[0].totalLicenses);
  });
});

describe("getGrade", () => {
  it.each([
    [100, "A"],
    [80, "A"],
    [79, "B"],
    [60, "B"],
    [59, "C"],
    [40, "C"],
    [39, "D"],
    [0, "D"],
  ])(
    "should return correct grade for efficiency %i → %s",
    (efficiency, expected) => {
      expect(getGrade(efficiency)).toBe(expected);
    }
  );
});

describe("transformToDashboardV3Data", () => {
  // Case 1: Seat waste has unassigned seats, but no unused apps from the dedicated action
  it("should attribute unassigned to unused licenses, no unused apps when unusedAppsData is null", () => {
    const seatWaste = makeSeatWaste([
      makeSeatWasteApp({
        appId: "app-1",
        totalSeats: 20,
        assignedSeats: 3,
        activeSeats: 3,
        unassignedSeats: 17,
        inactiveSeats: 0,
        perSeatPrice: 10000,
      }),
    ]);

    const result = transformToDashboardV3Data(
      stubStats,
      stubCostStats,
      [],
      [],
      [],
      0,
      null,
      null,
      seatWaste,
      null // no unused apps
    );

    expect(result.hero.breakdown.unusedLicenses.amount).toBe(170000); // 17 * 10000
    expect(result.hero.breakdown.unusedLicenses.count).toBe(17);
    expect(result.hero.breakdown.unusedApps.amount).toBe(0);
    expect(result.hero.breakdown.unusedApps.count).toBe(0);
    expect(result.hero.monthlySavings).toBe(170000);
    expect(result.hero.annualSavings).toBe(2040000);
  });

  // Case 2: unusedAppsData provided with unused apps
  it("should use unusedAppsData for unused apps count and cost", () => {
    const seatWaste = makeSeatWaste([
      makeSeatWasteApp({
        appId: "app-1",
        totalSeats: 20,
        assignedSeats: 15,
        activeSeats: 0,
        unassignedSeats: 5,
        inactiveSeats: 15,
        perSeatPrice: 10000,
      }),
    ]);

    const result = transformToDashboardV3Data(
      stubStats,
      stubCostStats,
      [],
      [],
      [],
      0,
      null,
      null,
      seatWaste,
      { count: 2, cost: 80000 } // from getUnusedApps()
    );

    expect(result.hero.breakdown.unusedLicenses.amount).toBe(50000); // 5 * 10000
    expect(result.hero.breakdown.unusedLicenses.count).toBe(5);
    // unusedApps now comes from unusedAppsData, not seatWaste
    expect(result.hero.breakdown.unusedApps.amount).toBe(80000);
    expect(result.hero.breakdown.unusedApps.count).toBe(2);
    // monthlySavings = 50000 + 80000
    expect(result.hero.monthlySavings).toBe(130000);
    expect(result.hero.annualSavings).toBe(1560000);
  });

  // Case 3: Multiple seat waste apps + unusedAppsData
  it("should combine seat waste unused licenses with unusedAppsData", () => {
    const seatWaste = makeSeatWaste([
      makeSeatWasteApp({
        appId: "app-1",
        totalSeats: 20,
        activeSeats: 3,
        unassignedSeats: 10,
        inactiveSeats: 0,
        perSeatPrice: 5000,
      }),
      makeSeatWasteApp({
        appId: "app-2",
        totalSeats: 10,
        activeSeats: 0,
        unassignedSeats: 2,
        inactiveSeats: 8,
        perSeatPrice: 20000,
      }),
    ]);

    const result = transformToDashboardV3Data(
      stubStats,
      stubCostStats,
      [],
      [],
      [],
      0,
      null,
      null,
      seatWaste,
      { count: 3, cost: 150000 } // from getUnusedApps()
    );

    // Unused licenses from seatWaste: app-1(10*5000) + app-2(2*20000) = 90000
    expect(result.hero.breakdown.unusedLicenses.amount).toBe(90000);
    expect(result.hero.breakdown.unusedLicenses.count).toBe(12); // 10 + 2
    // Unused apps from unusedAppsData (not from seatWaste)
    expect(result.hero.breakdown.unusedApps.amount).toBe(150000);
    expect(result.hero.breakdown.unusedApps.count).toBe(3);
    // monthlySavings = 90000 + 150000
    expect(result.hero.monthlySavings).toBe(240000);
    expect(result.hero.annualSavings).toBe(2880000);
  });

  // Case 4: seatWaste is null, unusedAppsData is null
  it("should return zero savings when both seatWaste and unusedAppsData are null", () => {
    const result = transformToDashboardV3Data(
      stubStats,
      stubCostStats,
      [],
      [],
      [],
      0,
      null,
      null,
      null,
      null
    );

    expect(result.hero.monthlySavings).toBe(0);
    expect(result.hero.annualSavings).toBe(0);
    expect(result.hero.breakdown.unusedLicenses.amount).toBe(0);
    expect(result.hero.breakdown.unusedLicenses.count).toBe(0);
    expect(result.hero.breakdown.unusedApps.amount).toBe(0);
    expect(result.hero.breakdown.unusedApps.count).toBe(0);
  });

  // Case 5: topApps should use assignedSeats-based efficiency from seatWaste.apps
  it("should pass seatWaste.apps to transformTopApps with assignedSeats-based efficiency", () => {
    const topApps: AppCostDistribution[] = [
      makeApp({
        appId: "app-1",
        appName: "Slack",
        totalCost: 500000,
        percentage: 50,
      }),
    ];
    const seatWaste = makeSeatWaste([
      makeSeatWasteApp({
        appId: "app-1",
        assignedSeats: 8,
        activeSeats: 5, // different from assignedSeats
        totalSeats: 10,
        utilizationRate: 50, // activeSeats-based (ignored by transforms)
      }),
    ]);

    const result = transformToDashboardV3Data(
      stubStats,
      stubCostStats,
      topApps,
      [],
      [],
      0,
      null,
      null,
      seatWaste,
      null
    );

    expect(result.topApps).toHaveLength(1);
    expect(result.topApps[0].hasSeatData).toBe(true);
    expect(result.topApps[0].usedLicenses).toBe(8); // assignedSeats
    expect(result.topApps[0].totalLicenses).toBe(10);
    expect(result.topApps[0].usageEfficiency).toBe(80); // 8/10 = 80%
    expect(result.topApps[0].grade).toBe("A");
  });

  // Case 6: backward compatible — unusedAppsData defaults to null when omitted
  it("should default unusedAppsData to null when not provided (backward compatible)", () => {
    const result = transformToDashboardV3Data(
      stubStats,
      stubCostStats,
      [],
      [],
      [],
      0,
      null,
      null,
      null
    );

    expect(result.hero.breakdown.unusedApps.amount).toBe(0);
    expect(result.hero.breakdown.unusedApps.count).toBe(0);
  });

  // Case 7: terminated KPI uses terminatedWithSubCount and terminatedSubAssignmentCount
  it("should use terminatedWithSubCount and terminatedSubAssignmentCount for KPI terminated", () => {
    const result = transformToDashboardV3Data(
      stubStats,
      stubCostStats,
      [],
      [],
      [],
      5, // terminatedCount (legacy, used elsewhere)
      null,
      null,
      null,
      null,
      3, // terminatedWithSubCount
      7 // terminatedSubAssignmentCount
    );

    expect(result.kpi.terminated.count).toBe(3);
    expect(result.kpi.terminated.appCount).toBe(7);
  });

  // Case 8: terminated KPI defaults to 0 when new params not provided
  it("should default terminated KPI to 0 when terminatedWithSubCount and terminatedSubAssignmentCount are omitted", () => {
    const result = transformToDashboardV3Data(
      stubStats,
      stubCostStats,
      [],
      [],
      [],
      5, // terminatedCount (legacy)
      null,
      null,
      null,
      null
    );

    expect(result.kpi.terminated.count).toBe(0);
    expect(result.kpi.terminated.appCount).toBe(0);
  });
});

// Helper to create minimal MonthlyCostTrend stubs
function makeMonthlyTrend(month: string): MonthlyCostTrend {
  return {
    month,
    displayLabel: month,
    totalCost: 0,
    saasCost: 0,
    nonSaasCost: 0,
    transactionCount: 0,
    saasTransactionCount: 0,
    nonSaasTransactionCount: 0,
  };
}

describe("transformSeatWasteToLicenseTrend", () => {
  it("should aggregate seat data from multiple apps", () => {
    const seatWaste = makeSeatWaste([
      makeSeatWasteApp({
        appId: "app-1",
        totalSeats: 20,
        assignedSeats: 15,
        unassignedSeats: 5,
      }),
      makeSeatWasteApp({
        appId: "app-2",
        totalSeats: 10,
        assignedSeats: 8,
        unassignedSeats: 2,
      }),
    ]);
    const trends = [makeMonthlyTrend("2026-01"), makeMonthlyTrend("2026-02")];

    const { trends: result } = transformSeatWasteToLicenseTrend(
      seatWaste,
      trends
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      month: "2026-01",
      totalSeats: 30,
      assignedSeats: 23,
      unassignedSeats: 7,
    });
    expect(result[1]).toEqual({
      month: "2026-02",
      totalSeats: 30,
      assignedSeats: 23,
      unassignedSeats: 7,
    });
  });

  it("should return zero values when seatWaste is null", () => {
    const trends = [makeMonthlyTrend("2026-01")];

    const { trends: result } = transformSeatWasteToLicenseTrend(null, trends);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      month: "2026-01",
      totalSeats: 0,
      assignedSeats: 0,
      unassignedSeats: 0,
    });
  });

  it("should return empty array when monthlyTrend is empty", () => {
    const seatWaste = makeSeatWaste([
      makeSeatWasteApp({ appId: "app-1", totalSeats: 10 }),
    ]);

    const { trends: result } = transformSeatWasteToLicenseTrend(seatWaste, []);

    expect(result).toEqual([]);
  });

  it("should return zero values when seatWaste has empty apps array", () => {
    const seatWaste = makeSeatWaste([]);
    const trends = [makeMonthlyTrend("2026-01")];

    const { trends: result } = transformSeatWasteToLicenseTrend(
      seatWaste,
      trends
    );

    expect(result).toHaveLength(1);
    expect(result[0].totalSeats).toBe(0);
    expect(result[0].assignedSeats).toBe(0);
    expect(result[0].unassignedSeats).toBe(0);
  });

  it("should return totalUnassignedCost summing unassignedSeats * perSeatPrice per app", () => {
    const seatWaste = makeSeatWaste([
      makeSeatWasteApp({
        appId: "app-1",
        unassignedSeats: 5,
        perSeatPrice: 10000,
      }),
      makeSeatWasteApp({
        appId: "app-2",
        unassignedSeats: 3,
        perSeatPrice: 20000,
      }),
    ]);
    const trends = [makeMonthlyTrend("2026-01")];

    const { totalUnassignedCost } = transformSeatWasteToLicenseTrend(
      seatWaste,
      trends
    );

    // 5 * 10000 + 3 * 20000 = 110000
    expect(totalUnassignedCost).toBe(110000);
  });

  it("should return zero totalUnassignedCost when seatWaste is null", () => {
    const { totalUnassignedCost } = transformSeatWasteToLicenseTrend(null, [
      makeMonthlyTrend("2026-01"),
    ]);

    expect(totalUnassignedCost).toBe(0);
  });
});
