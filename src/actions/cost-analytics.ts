// src/actions/cost-analytics.ts
// Barrel export file for cost analytics actions
// Individual modules have "use server" directive

// Re-export all functions from split modules
export { getCostStatistics, getTopCostApps } from "./cost-analytics-core";
export {
  detectCostAnomalies,
  getCostAnomalies,
  getForecastedCost,
} from "./cost-analytics-forecast";
export {
  getMonthlyCostTrend,
  getUnmatchedPaymentCount,
} from "./cost-analytics-trend";

// Re-export utility functions for external use if needed
export {
  calculateMonthlyCost,
  extractAmount,
  formatDateStr,
  formatDisplayLabel,
  formatMonthKey,
  getSeverity,
} from "./cost-analytics-utils";
