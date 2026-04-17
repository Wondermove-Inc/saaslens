// FleetDM API Types
// Reference: https://fleetdm.com/docs/rest-api

// FleetDM Host (디바이스)
// Note: platform can be any string from osquery (darwin, windows, linux, ubuntu, debian, centos, rhel, freebsd, etc.)
export interface FleetDMHost {
  id: number;
  uuid: string;
  hostname: string;
  display_name: string;
  platform: string; // Various OS platforms reported by osquery
  osquery_version: string;
  os_version: string;
  build: string;
  platform_like: string;
  code_name: string;
  uptime: number;
  memory: number;
  cpu_type: string;
  cpu_subtype: string;
  cpu_brand: string;
  cpu_physical_cores: number;
  cpu_logical_cores: number;
  hardware_vendor: string;
  hardware_model: string;
  hardware_version: string;
  hardware_serial: string;
  computer_name: string;
  public_ip: string;
  primary_ip: string;
  primary_mac: string;
  distributed_interval: number;
  config_tls_refresh: number;
  logger_tls_period: number;
  team_id: number | null;
  pack_stats: FleetDMPackStat[] | null;
  status: "online" | "offline" | "missing" | "new";
  detail_updated_at: string;
  label_updated_at: string;
  policy_updated_at: string;
  last_enrolled_at: string;
  seen_time: string;
  refetch_requested: boolean;
  mdm: FleetDMHostMDM;
  software_updated_at: string;
}

export interface FleetDMPackStat {
  pack_id: number;
  pack_name: string;
  query_stats: FleetDMQueryStat[];
}

export interface FleetDMQueryStat {
  scheduled_query_name: string;
  scheduled_query_id: number;
  query_name: string;
  pack_name: string;
  pack_id: number;
  average_memory: number;
  denylisted: boolean;
  executions: number;
  interval: number;
  last_executed: string;
  output_size: number;
  system_time: number;
  user_time: number;
  wall_time: number;
}

export interface FleetDMHostMDM {
  enrollment_status: "On (manual)" | "On (automatic)" | "Off" | null;
  server_url: string | null;
  name: string | null;
}

// FleetDM Software (소프트웨어)
export interface FleetDMSoftware {
  id: number;
  name: string;
  version: string;
  source:
    | "apps"
    | "deb_packages"
    | "rpm_packages"
    | "programs"
    | "chrome_extensions"
    | "firefox_addons"
    | "homebrew_packages"
    | "atom_packages"
    | "python_packages"
    | "npm_packages"
    | "vscode_extensions";
  bundle_identifier: string | null;
  extension_id: string | null;
  browser: string | null;
  generated_cpe: string;
  vulnerabilities: FleetDMVulnerability[] | null;
  hosts_count: number;
}

export interface FleetDMVulnerability {
  cve: string;
  details_link: string;
  cvss_score: number | null;
  epss_probability: number | null;
  cisa_known_exploit: boolean;
  cve_published: string | null;
}

// FleetDM Host Software Response
export interface FleetDMHostSoftwareResponse {
  software: FleetDMSoftware[];
  count: number;
  meta: {
    has_next_results: boolean;
    has_previous_results: boolean;
  };
}

// FleetDM Hosts Response
export interface FleetDMHostsResponse {
  hosts: FleetDMHost[];
  software: FleetDMSoftware | null;
  software_title: FleetDMSoftware | null;
  munki_issue: unknown | null;
  mobile_device_management_solution: unknown | null;
}

// FleetDM Activity (활동 로그)
export interface FleetDMActivity {
  id: number;
  actor_full_name: string;
  actor_id: number | null;
  actor_gravatar: string;
  actor_email: string | null;
  type: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface FleetDMActivitiesResponse {
  activities: FleetDMActivity[];
  meta: {
    has_next_results: boolean;
    has_previous_results: boolean;
  };
}

// FleetDM Team
export interface FleetDMTeam {
  id: number;
  created_at: string;
  name: string;
  description: string;
  agent_options: Record<string, unknown> | null;
  user_count: number;
  host_count: number;
}

// FleetDM API Error
export interface FleetDMError {
  message: string;
  errors: Array<{
    name: string;
    reason: string;
  }>;
}

// API Client Options
export interface FleetDMClientConfig {
  baseUrl: string;
  apiToken: string;
  teamId?: number;
}

// Webhook Event Types
export type FleetDMWebhookEventType =
  | "host.created"
  | "host.updated"
  | "host.deleted"
  | "host.enrolled"
  | "host.unenrolled"
  | "software.installed"
  | "software.removed"
  | "vulnerability.detected"
  | "policy.failed";

export interface FleetDMWebhookPayload<T = unknown> {
  timestamp: string;
  type: FleetDMWebhookEventType;
  data: T;
}

export interface FleetDMHostWebhookData {
  host: FleetDMHost;
}

export interface FleetDMSoftwareWebhookData {
  host_id: number;
  software: FleetDMSoftware[];
}

// Platform mapping
// FleetDM reports various platform strings for different OS types
// See: https://fleetdm.com/docs/rest-api/rest-api#hosts
export const FLEETDM_PLATFORM_MAP: Record<string, string> = {
  // macOS
  darwin: "MACOS",
  // Windows
  windows: "WINDOWS",
  // Linux distributions
  linux: "LINUX",
  ubuntu: "LINUX",
  debian: "LINUX",
  centos: "LINUX",
  rhel: "LINUX",
  fedora: "LINUX",
  amzn: "LINUX", // Amazon Linux
  arch: "LINUX",
  opensuse: "LINUX",
  sles: "LINUX", // SUSE Linux Enterprise Server
  // ChromeOS
  chrome: "OTHER",
  chromeos: "OTHER",
};

// Status mapping
export const FLEETDM_STATUS_MAP: Record<string, string> = {
  online: "ONLINE",
  offline: "OFFLINE",
  missing: "OFFLINE",
  new: "PENDING",
};
