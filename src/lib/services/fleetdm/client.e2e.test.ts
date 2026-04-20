// FleetDM Client E2E Tests
// Run with: npm test -- src/lib/services/fleetdm/client.e2e.test.ts
//
// Prerequisites:
//   1. Docker Desktop running
//   2. FleetDM containers running:
//      cd packages/fleetdm && docker compose -f docker-compose.smp.yml up -d
//   3. FleetDM setup completed
//
// Note: These tests run against a real FleetDM instance at http://localhost:8080

import { beforeAll, describe, expect, it } from "vitest";

import { FleetDMClient } from "./client";

// Skip E2E tests in CI environment or when FleetDM is not running
const FLEET_BASE_URL = process.env.FLEET_E2E_URL || "http://localhost:8080";
const FLEET_API_TOKEN = process.env.FLEET_E2E_TOKEN || "";

// Check if we should run E2E tests
const shouldRunE2E = async (): Promise<boolean> => {
  if (!FLEET_API_TOKEN) {
    console.log("Skipping E2E tests: FLEET_E2E_TOKEN not set");
    return false;
  }

  try {
    const response = await fetch(`${FLEET_BASE_URL}/healthz`);
    return response.ok;
  } catch {
    console.log("Skipping E2E tests: FleetDM server not reachable");
    return false;
  }
};

describe.skipIf(!FLEET_API_TOKEN)("FleetDMClient E2E", () => {
  let client: FleetDMClient;

  beforeAll(async () => {
    const canRun = await shouldRunE2E();
    if (!canRun) {
      return;
    }

    client = new FleetDMClient({
      baseUrl: FLEET_BASE_URL,
      apiToken: FLEET_API_TOKEN,
    });
  });

  describe("testConnection", () => {
    it("should successfully connect to FleetDM server", async () => {
      const result = await client.testConnection();
      expect(result).toBe(true);
    });
  });

  describe("getHosts", () => {
    it("should return hosts array (may be empty)", async () => {
      const hosts = await client.getHosts();
      expect(Array.isArray(hosts)).toBe(true);
    });

    it("should return hosts with pagination", async () => {
      const hosts = await client.getHosts({ page: 1, perPage: 10 });
      expect(Array.isArray(hosts)).toBe(true);
    });
  });

  describe("getHostsCount", () => {
    it("should return count of hosts", async () => {
      const count = await client.getHostsCount();
      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getSoftware", () => {
    it("should return software array (may be empty)", async () => {
      const software = await client.getSoftware();
      // FleetDM may return null/undefined for software if no hosts
      expect(software === undefined || Array.isArray(software)).toBe(true);
    });
  });

  describe("getActivities", () => {
    it("should return activities with meta", async () => {
      const response = await client.getActivities();

      expect(response).toHaveProperty("activities");
      expect(response).toHaveProperty("meta");
      expect(Array.isArray(response.activities)).toBe(true);
      expect(response.meta).toHaveProperty("has_next_results");
      expect(response.meta).toHaveProperty("has_previous_results");
    });

    it("should include setup activities", async () => {
      const response = await client.getActivities();

      // After setup, there should be at least some activities
      expect(response.activities.length).toBeGreaterThan(0);

      // First activity should be user creation
      const createActivity = response.activities.find(
        (a) => a.type === "created_user"
      );
      expect(createActivity).toBeDefined();
    });
  });

  describe("getTeams", () => {
    it("should return teams array or require Premium license", async () => {
      try {
        const teams = await client.getTeams();
        expect(Array.isArray(teams)).toBe(true);
      } catch (error) {
        // Teams API requires Fleet Premium license
        expect((error as Error).message).toContain("Premium");
      }
    });
  });
});

// Manual test instructions
describe.skip("FleetDM E2E Manual Test", () => {
  it("should demonstrate API capabilities", async () => {
    // To run this test manually:
    // 1. Start FleetDM: cd packages/fleetdm && docker compose -f docker-compose.smp.yml up -d
    // 2. Setup FleetDM: curl -X POST http://localhost:8080/api/v1/setup ...
    // 3. Set environment variables:
    //    FLEET_E2E_URL=http://localhost:8080
    //    FLEET_E2E_TOKEN=<your-api-token>
    // 4. Run: npm test -- src/lib/services/fleetdm/client.e2e.test.ts

    const client = new FleetDMClient({
      baseUrl: "http://localhost:8080",
      apiToken: "your-token-here",
    });

    // Test connection
    const connected = await client.testConnection();
    console.log("Connected:", connected);

    // Get hosts
    const hosts = await client.getHosts();
    console.log("Hosts:", hosts.length);

    // Get activities
    const activities = await client.getActivities();
    console.log("Activities:", activities.activities.length);
  });
});
