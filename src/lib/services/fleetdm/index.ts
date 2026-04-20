// src/lib/services/fleetdm/index.ts

// Device Service (로컬 DB 조회)
export {
  getDeviceApps,
  getDeviceById,
  getDeviceStats,
  getDevices,
  getShadowITApps,
  getUsersWithoutAgent,
  updateDeviceAppApprovalStatus,
  type DeviceFilterOptions,
  type DeviceListItem,
  type DeviceListResult,
  type DeviceStats,
  type DeviceWithApps,
  type ShadowITAppSummary,
} from "./deviceService";

// FleetDM API Client
export { FleetDMClient, createFleetDMClient } from "./client";

// FleetDM Types
export type {
  FleetDMActivitiesResponse,
  FleetDMActivity,
  FleetDMClientConfig,
  FleetDMError,
  FleetDMHost,
  FleetDMHostMDM,
  FleetDMHostSoftwareResponse,
  FleetDMHostWebhookData,
  FleetDMHostsResponse,
  FleetDMSoftware,
  FleetDMSoftwareWebhookData,
  FleetDMTeam,
  FleetDMVulnerability,
  FleetDMWebhookEventType,
  FleetDMWebhookPayload,
} from "./types";

export { FLEETDM_PLATFORM_MAP, FLEETDM_STATUS_MAP } from "./types";

// FleetDM Sync Service
export {
  getFleetDMClientForOrganization,
  getFleetDMClientFromIntegration,
  syncAllFromFleetDM,
  syncHostFromFleetDM,
  syncHostSoftwareFromFleetDM,
} from "./sync";
