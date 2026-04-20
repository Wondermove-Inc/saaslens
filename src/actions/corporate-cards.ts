// Note: "use server" removed to allow type exports
// All server actions are defined in ./cards/index.ts with proper "use server" directives

/**
 * @deprecated Import from "@/actions/cards" instead
 * This file is kept for backward compatibility only.
 */

// Re-export everything from the new modular structure
export {
  deleteCorporateCard,
  getCardTransactionSummary,
  // Card Transactions
  getCardTransactions,
  getCorporateCard,
  getCorporateCardCached,
  getCorporateCards,
  matchTransactionToAppManually,
  // Card Registration & Management
  registerCorporateCard,
  // Card Sync
  syncCardTransactions,
  type CardAssignment,
  type CardTransactionSummary,
  type CorporateCardWithCount,
  type TransactionFilter,
  type TransactionListResult,
  type TransactionQuery,
} from "./cards";
