// src/actions/subscriptions.ts
// Note: "use server" removed to allow type exports
// All server actions are defined in ./subscriptions/index.ts with proper "use server" directives

/**
 * @deprecated Import from "@/actions/subscriptions" instead
 * This file is kept for backward compatibility only.
 */

// Re-export everything from the new modular structure
export {
  createSubscription,
  createSubscriptionFromSuggestion,
  deleteSubscription,
  getLinkedPayments,
  // Calendar
  getRenewalCalendar,
  getRenewalsByDate,
  getSubscription,
  getSubscriptionCached,
  // CRUD
  getSubscriptions,
  // Suggestions
  suggestSubscriptionsFromPayments,
  updateSubscription,
  type CalendarData,
  type LinkedPayment,
  type RenewalItem,
  type RenewalsByDateResponse,
  type SubscriptionSuggestion,
} from "./subscriptions/index";
