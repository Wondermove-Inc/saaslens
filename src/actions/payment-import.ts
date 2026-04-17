// src/actions/payment-import.ts
// Note: "use server" removed to allow type exports
// All server actions are defined in ./payments/index.ts with proper "use server" directives

/**
 * @deprecated Import from "@/actions/payments" instead
 * This file is kept for backward compatibility only.
 */

// Re-export everything from the new modular structure
export {
  deletePaymentRecord,
  // Queries
  getPaymentRecords,
  getPaymentStatusCounts,
  getPaymentSummaryByApp,
  // Import
  importPaymentCSV,
  linkPaymentToSubscription,
  // Matching
  updatePaymentMatch,
  updatePaymentRecord,
  type GetPaymentRecordsResult,
  type PaymentImportResult,
  type PaymentRecordWithApp,
  type PaymentSummaryByAppResult,
} from "./payments/index";
