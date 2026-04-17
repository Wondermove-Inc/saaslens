// src/actions/dashboard2-cost.constants.ts
// Constants and types that don't require "use server"

export interface BudgetSettings {
  currency: string;
  monthlyBudget: number | null;
  alertThreshold: number;
}

export const DEFAULT_BUDGET_SETTINGS: BudgetSettings = {
  currency: "KRW",
  monthlyBudget: null,
  alertThreshold: 80,
};
