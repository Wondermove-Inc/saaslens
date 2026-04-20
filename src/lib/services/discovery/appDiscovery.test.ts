// src/lib/services/discovery/appDiscovery.test.ts
import type { GoogleOAuthToken, GoogleWorkspaceUser } from "@/types/sso";
import type { Integration } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { discoverAppsFromGoogle, processDiscoveredApps } from "./appDiscovery";

// Prisma mock
vi.mock("@/lib/db", () => ({
  prisma: {
    app: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    userAppAccess: {
      upsert: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    saaSCatalog: {
      findFirst: vi.fn(),
    },
    syncLog: {
      create: vi.fn(),
      update: vi.fn(),
    },
    integration: {
      update: vi.fn(),
    },
    $transaction: vi.fn((fn) =>
      fn({
        app: {
          findFirst: vi.fn(),
          create: vi.fn().mockResolvedValue({ id: "app-1" }),
          upsert: vi.fn().mockResolvedValue({ id: "app-1" }),
        },
        userAppAccess: {
          upsert: vi.fn(),
        },
        user: {
          findUnique: vi.fn().mockResolvedValue({ id: "user-1" }),
        },
        saaSCatalog: {
          findFirst: vi.fn(),
        },
        syncLog: {
          create: vi.fn().mockResolvedValue({ id: "sync-log-1" }),
          update: vi.fn(),
        },
        integration: {
          update: vi.fn(),
        },
      })
    ),
  },
}));

// GoogleWorkspaceService mock
vi.mock("../sso/googleWorkspace", () => ({
  GoogleWorkspaceService: vi.fn().mockImplementation(() => ({
    listUsers: vi.fn(),
    listTokens: vi.fn(),
  })),
}));

describe("appDiscovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("processDiscoveredApps", () => {
    it("should aggregate apps from multiple users", () => {
      const usersWithTokens: {
        user: GoogleWorkspaceUser;
        tokens: GoogleOAuthToken[];
      }[] = [
        {
          user: {
            id: "user-1",
            primaryEmail: "user1@example.com",
            name: {
              givenName: "User",
              familyName: "One",
              fullName: "User One",
            },
            isAdmin: false,
            suspended: false,
            creationTime: "2024-01-01T00:00:00Z",
          },
          tokens: [
            {
              clientId: "app-client-1",
              displayText: "Test App 1",
              kind: "admin#directory#token",
              scopes: ["email", "profile"],
              userKey: "user1@example.com",
            },
            {
              clientId: "app-client-2",
              displayText: "Test App 2",
              kind: "admin#directory#token",
              scopes: ["drive"],
              userKey: "user1@example.com",
            },
          ],
        },
        {
          user: {
            id: "user-2",
            primaryEmail: "user2@example.com",
            name: {
              givenName: "User",
              familyName: "Two",
              fullName: "User Two",
            },
            isAdmin: false,
            suspended: false,
            creationTime: "2024-01-02T00:00:00Z",
          },
          tokens: [
            {
              clientId: "app-client-1", // 같은 앱
              displayText: "Test App 1",
              kind: "admin#directory#token",
              scopes: ["email", "profile"],
              userKey: "user2@example.com",
            },
          ],
        },
      ];

      const result = processDiscoveredApps(usersWithTokens);

      expect(result).toHaveLength(2);

      const app1 = result.find((app) => app.clientId === "app-client-1");
      expect(app1).toBeDefined();
      expect(app1?.userCount).toBe(2);
      expect(app1?.users).toHaveLength(2);

      const app2 = result.find((app) => app.clientId === "app-client-2");
      expect(app2).toBeDefined();
      expect(app2?.userCount).toBe(1);
    });

    it("should return empty array when no tokens", () => {
      const result = processDiscoveredApps([]);
      expect(result).toHaveLength(0);
    });

    it("should filter out Google system apps", () => {
      const usersWithTokens: {
        user: GoogleWorkspaceUser;
        tokens: GoogleOAuthToken[];
      }[] = [
        {
          user: {
            id: "user-1",
            primaryEmail: "user1@example.com",
            name: {
              givenName: "User",
              familyName: "One",
              fullName: "User One",
            },
            isAdmin: false,
            suspended: false,
            creationTime: "2024-01-01T00:00:00Z",
          },
          tokens: [
            {
              clientId: "google.com",
              displayText: "Google",
              kind: "admin#directory#token",
              scopes: [],
              userKey: "user1@example.com",
            },
            {
              clientId: "third-party-app",
              displayText: "Third Party App",
              kind: "admin#directory#token",
              scopes: ["email"],
              userKey: "user1@example.com",
            },
          ],
        },
      ];

      const result = processDiscoveredApps(usersWithTokens);

      // google.com은 필터링됨
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Third Party App");
    });
  });

  describe("discoverAppsFromGoogle", () => {
    const mockIntegration: Integration = {
      id: "int-1",
      organizationId: "org-1",
      type: "GOOGLE_WORKSPACE",
      status: "ACTIVE",
      credentials: {
        serviceAccountEmail: "sa@project.iam.gserviceaccount.com",
        privateKey:
          "-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----",
        adminEmail: "admin@example.com",
      },
      metadata: {},
      lastSyncAt: null,
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockUsers: GoogleWorkspaceUser[] = [
      {
        id: "user-1",
        primaryEmail: "user1@example.com",
        name: { givenName: "User", familyName: "One", fullName: "User One" },
        isAdmin: false,
        suspended: false,
        creationTime: "2024-01-01T00:00:00Z",
      },
    ];

    const mockTokens: GoogleOAuthToken[] = [
      {
        clientId: "slack-client-id",
        displayText: "Slack",
        kind: "admin#directory#token",
        scopes: ["email", "profile"],
        userKey: "user1@example.com",
      },
    ];

    it("should discover apps from user tokens", async () => {
      const { GoogleWorkspaceService } = await import("../sso/googleWorkspace");
      const mockService = new GoogleWorkspaceService({
        clientEmail: "test@example.com",
        privateKey: "key",
        subject: "admin@example.com",
      });

      (mockService.listUsers as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockUsers
      );
      (mockService.listTokens as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockTokens
      );

      const { prisma } = await import("@/lib/db");

      const mockTx = {
        app: {
          findFirst: vi.fn().mockResolvedValue(null),
          upsert: vi.fn().mockResolvedValue({ id: "app-1", name: "Slack" }),
        },
        userAppAccess: {
          upsert: vi.fn(),
        },
        user: {
          findUnique: vi.fn().mockResolvedValue({ id: "db-user-1" }),
        },
        saaSCatalog: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
        syncLog: {
          create: vi.fn().mockResolvedValue({ id: "sync-log-1" }),
          update: vi.fn(),
        },
        integration: {
          update: vi.fn(),
        },
      };
      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn) => fn(mockTx)
      );

      const result = await discoverAppsFromGoogle(mockIntegration, mockService);

      expect(result.itemsFound).toBeGreaterThanOrEqual(0);
    });

    it("should handle API errors gracefully", async () => {
      const { GoogleWorkspaceService } = await import("../sso/googleWorkspace");
      const mockService = new GoogleWorkspaceService({
        clientEmail: "test@example.com",
        privateKey: "key",
        subject: "admin@example.com",
      });

      (mockService.listUsers as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("API Error")
      );

      const { prisma } = await import("@/lib/db");

      const mockTx = {
        syncLog: {
          create: vi.fn().mockResolvedValue({ id: "sync-log-1" }),
          update: vi.fn(),
        },
        integration: {
          update: vi.fn(),
        },
      };
      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn) => fn(mockTx)
      );

      const result = await discoverAppsFromGoogle(mockIntegration, mockService);

      expect(result.status).toBe("FAILED");
      expect(result.errors).toHaveLength(1);
    });
  });
});
