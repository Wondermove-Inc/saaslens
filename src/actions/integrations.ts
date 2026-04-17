// src/actions/integrations.ts
// Barrel export file for integration actions
// Individual modules have "use server" directive

// Re-export types
export type {
  GetIntegrationsParams,
  IntegrationSettingsInput,
  SyncLogEntry,
} from "./integrations.types";

// Re-export read operations
export {
  getIntegration,
  getIntegrations,
  getSyncLogs,
} from "./integrations-read";

// Re-export write operations
export {
  createIntegration,
  deleteIntegration,
  syncIntegrationNow,
  updateIntegrationSettings,
  updateIntegrationStatus,
} from "./integrations-write";
