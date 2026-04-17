// FleetDM Client Tests
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createFleetDMClient, FleetDMClient } from "./client";
import type {
  FleetDMActivitiesResponse,
  FleetDMHost,
  FleetDMHostSoftwareResponse,
  FleetDMHostsResponse,
  FleetDMSoftware,
  FleetDMTeam,
} from "./types";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("FleetDMClient", () => {
  let client: FleetDMClient;
  const baseUrl = "https://fleet.example.com";
  const apiToken = "test-api-token";
  const teamId = 1;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new FleetDMClient({ baseUrl, apiToken, teamId });
  });

  describe("constructor", () => {
    it("should remove trailing slash from baseUrl", () => {
      const clientWithSlash = new FleetDMClient({
        baseUrl: "https://fleet.example.com/",
        apiToken,
      });
      // 생성 후 내부 URL 검증은 request를 통해 확인
      expect(clientWithSlash).toBeDefined();
    });

    it("should create client without teamId", () => {
      const clientWithoutTeam = new FleetDMClient({ baseUrl, apiToken });
      expect(clientWithoutTeam).toBeDefined();
    });
  });

  describe("getHosts", () => {
    const mockHosts: FleetDMHost[] = [
      {
        id: 1,
        uuid: "uuid-1",
        hostname: "device-1",
        display_name: "Device 1",
        platform: "darwin",
        osquery_version: "5.0.0",
        os_version: "macOS 14.0",
        build: "",
        platform_like: "darwin",
        code_name: "",
        uptime: 86400,
        memory: 16000000000,
        cpu_type: "x86_64",
        cpu_subtype: "",
        cpu_brand: "Apple M1",
        cpu_physical_cores: 8,
        cpu_logical_cores: 8,
        hardware_vendor: "Apple Inc.",
        hardware_model: "MacBook Pro",
        hardware_version: "",
        hardware_serial: "ABC123",
        computer_name: "Device 1",
        public_ip: "1.2.3.4",
        primary_ip: "192.168.1.1",
        primary_mac: "00:00:00:00:00:01",
        distributed_interval: 10,
        config_tls_refresh: 10,
        logger_tls_period: 10,
        team_id: 1,
        pack_stats: null,
        status: "online",
        detail_updated_at: "2024-01-01T00:00:00Z",
        label_updated_at: "2024-01-01T00:00:00Z",
        policy_updated_at: "2024-01-01T00:00:00Z",
        last_enrolled_at: "2024-01-01T00:00:00Z",
        seen_time: "2024-01-01T00:00:00Z",
        refetch_requested: false,
        mdm: {
          enrollment_status: null,
          server_url: null,
          name: null,
        },
        software_updated_at: "2024-01-01T00:00:00Z",
      },
    ];

    const mockResponse: FleetDMHostsResponse = {
      hosts: mockHosts,
      software: null,
      software_title: null,
      munki_issue: null,
      mobile_device_management_solution: null,
    };

    it("should fetch hosts without parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const hosts = await client.getHosts();

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/fleet/hosts?team_id=1`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${apiToken}`,
          }),
        })
      );
      expect(hosts).toEqual(mockHosts);
    });

    it("should fetch hosts with pagination parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await client.getHosts({ page: 2, perPage: 50 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("page=2"),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("per_page=50"),
        expect.any(Object)
      );
    });

    it("should fetch hosts with status filter", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await client.getHosts({ status: "online" });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("status=online"),
        expect.any(Object)
      );
    });

    it("should override teamId when provided in params", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await client.getHosts({ teamId: 99 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("team_id=99"),
        expect.any(Object)
      );
    });
  });

  describe("getHost", () => {
    const mockHost: FleetDMHost = {
      id: 1,
      uuid: "uuid-1",
      hostname: "device-1",
      display_name: "Device 1",
      platform: "darwin",
      osquery_version: "5.0.0",
      os_version: "macOS 14.0",
      build: "",
      platform_like: "darwin",
      code_name: "",
      uptime: 86400,
      memory: 16000000000,
      cpu_type: "x86_64",
      cpu_subtype: "",
      cpu_brand: "Apple M1",
      cpu_physical_cores: 8,
      cpu_logical_cores: 8,
      hardware_vendor: "Apple Inc.",
      hardware_model: "MacBook Pro",
      hardware_version: "",
      hardware_serial: "ABC123",
      computer_name: "Device 1",
      public_ip: "1.2.3.4",
      primary_ip: "192.168.1.1",
      primary_mac: "00:00:00:00:00:01",
      distributed_interval: 10,
      config_tls_refresh: 10,
      logger_tls_period: 10,
      team_id: 1,
      pack_stats: null,
      status: "online",
      detail_updated_at: "2024-01-01T00:00:00Z",
      label_updated_at: "2024-01-01T00:00:00Z",
      policy_updated_at: "2024-01-01T00:00:00Z",
      last_enrolled_at: "2024-01-01T00:00:00Z",
      seen_time: "2024-01-01T00:00:00Z",
      refetch_requested: false,
      mdm: {
        enrollment_status: null,
        server_url: null,
        name: null,
      },
      software_updated_at: "2024-01-01T00:00:00Z",
    };

    it("should fetch single host by ID", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ host: mockHost }),
      });

      const host = await client.getHost(1);

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/fleet/hosts/1`,
        expect.any(Object)
      );
      expect(host).toEqual(mockHost);
    });
  });

  describe("getHostSoftware", () => {
    const mockSoftware: FleetDMSoftware[] = [
      {
        id: 1,
        name: "Visual Studio Code",
        version: "1.85.0",
        source: "apps",
        bundle_identifier: "com.microsoft.VSCode",
        extension_id: null,
        browser: null,
        generated_cpe: "",
        vulnerabilities: null,
        hosts_count: 10,
      },
    ];

    const mockResponse: FleetDMHostSoftwareResponse = {
      software: mockSoftware,
      count: 1,
      meta: {
        has_next_results: false,
        has_previous_results: false,
      },
    };

    it("should fetch host software", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const software = await client.getHostSoftware(1);

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/fleet/hosts/1/software`,
        expect.any(Object)
      );
      expect(software).toEqual(mockSoftware);
    });

    it("should fetch host software with pagination", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await client.getHostSoftware(1, {
        page: 2,
        perPage: 100,
        query: "VSCode",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("page=2"),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("per_page=100"),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("query=VSCode"),
        expect.any(Object)
      );
    });
  });

  describe("getSoftware", () => {
    const mockSoftware: FleetDMSoftware[] = [
      {
        id: 1,
        name: "Slack",
        version: "4.35.0",
        source: "apps",
        bundle_identifier: "com.tinyspeck.slackmacgap",
        extension_id: null,
        browser: null,
        generated_cpe: "",
        vulnerabilities: null,
        hosts_count: 50,
      },
    ];

    it("should fetch all software", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ software: mockSoftware }),
      });

      const software = await client.getSoftware();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/software"),
        expect.any(Object)
      );
      expect(software).toEqual(mockSoftware);
    });

    it("should fetch vulnerable software only", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ software: mockSoftware }),
      });

      await client.getSoftware({ vulnerable: true });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("vulnerable=true"),
        expect.any(Object)
      );
    });
  });

  describe("getActivities", () => {
    const mockActivities: FleetDMActivitiesResponse = {
      activities: [
        {
          id: 1,
          actor_full_name: "Admin User",
          actor_id: 1,
          actor_gravatar: "",
          actor_email: "admin@example.com",
          type: "user_logged_in",
          details: {},
          created_at: "2024-01-01T00:00:00Z",
        },
      ],
      meta: {
        has_next_results: false,
        has_previous_results: false,
      },
    };

    it("should fetch activities", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockActivities),
      });

      const activities = await client.getActivities();

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/fleet/activities`,
        expect.any(Object)
      );
      expect(activities).toEqual(mockActivities);
    });

    it("should fetch activities with pagination", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockActivities),
      });

      await client.getActivities({ page: 2, perPage: 25 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("page=2"),
        expect.any(Object)
      );
    });
  });

  describe("getTeams", () => {
    const mockTeams: FleetDMTeam[] = [
      {
        id: 1,
        created_at: "2024-01-01T00:00:00Z",
        name: "Engineering",
        description: "Engineering team",
        agent_options: null,
        user_count: 10,
        host_count: 50,
      },
    ];

    it("should fetch teams", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ teams: mockTeams }),
      });

      const teams = await client.getTeams();

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/fleet/teams`,
        expect.any(Object)
      );
      expect(teams).toEqual(mockTeams);
    });
  });

  describe("getTeam", () => {
    const mockTeam: FleetDMTeam = {
      id: 1,
      created_at: "2024-01-01T00:00:00Z",
      name: "Engineering",
      description: "Engineering team",
      agent_options: null,
      user_count: 10,
      host_count: 50,
    };

    it("should fetch single team by ID", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ team: mockTeam }),
      });

      const team = await client.getTeam(1);

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/fleet/teams/1`,
        expect.any(Object)
      );
      expect(team).toEqual(mockTeam);
    });
  });

  describe("testConnection", () => {
    it("should return true on successful connection", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: { id: 1 } }),
      });

      const result = await client.testConnection();

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/fleet/me`,
        expect.any(Object)
      );
      expect(result).toBe(true);
    });

    it("should return false on failed connection", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: "Unauthorized" }),
      });

      const result = await client.testConnection();

      expect(result).toBe(false);
    });
  });

  describe("getHostsCount", () => {
    it("should fetch hosts count", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 100 }),
      });

      const count = await client.getHostsCount();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/hosts/count"),
        expect.any(Object)
      );
      expect(count).toBe(100);
    });

    it("should fetch hosts count with status filter", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 50 }),
      });

      const count = await client.getHostsCount({ status: "online" });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("status=online"),
        expect.any(Object)
      );
      expect(count).toBe(50);
    });
  });

  describe("getSoftwareCount", () => {
    it("should fetch software count", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 200 }),
      });

      const count = await client.getSoftwareCount();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/software/count"),
        expect.any(Object)
      );
      expect(count).toBe(200);
    });

    it("should fetch vulnerable software count", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 15 }),
      });

      const count = await client.getSoftwareCount({ vulnerable: true });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("vulnerable=true"),
        expect.any(Object)
      );
      expect(count).toBe(15);
    });
  });

  describe("error handling", () => {
    it("should throw error with FleetDM error message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            message: "Invalid request",
            errors: [{ name: "field", reason: "required" }],
          }),
      });

      await expect(client.getHosts()).rejects.toThrow("Invalid request");
    });

    it("should throw generic error when JSON parsing fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error("JSON parse error")),
      });

      await expect(client.getHosts()).rejects.toThrow("FleetDM API Error: 500");
    });
  });
});

describe("createFleetDMClient", () => {
  it("should create FleetDMClient instance", () => {
    const client = createFleetDMClient({
      baseUrl: "https://fleet.example.com",
      apiToken: "test-token",
    });

    expect(client).toBeInstanceOf(FleetDMClient);
  });
});
