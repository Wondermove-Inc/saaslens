// src/app/api/creds/register/route.test.ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// Mock auth context type
type MockAuthContext = {
  auth: { organizationId: string; deviceId: string };
};

// Mock extension auth
vi.mock("@/lib/api/extension-auth", () => ({
  withExtensionAuth: (
    handler: (req: NextRequest, ctx: MockAuthContext) => Promise<Response>
  ) => {
    return async (request: NextRequest) => {
      // 테스트용 mock auth context
      const mockAuth = {
        organizationId: "org-123",
        deviceId: "device-123",
      };
      return handler(request, { auth: mockAuth });
    };
  },
}));

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    extensionLoginEvent: {
      create: vi.fn(),
    },
  },
}));

// Mock HIBP checker
vi.mock("@/lib/services/hibp/breach-checker", () => ({
  checkCredentialHIBP: vi.fn(),
}));

import { prisma } from "@/lib/db";
import { checkCredentialHIBP } from "@/lib/services/hibp/breach-checker";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as any;
const mockHIBP = vi.mocked(checkCredentialHIBP);

function createMockRequest(body: object): NextRequest {
  return new NextRequest("http://localhost/api/creds/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer test-token",
    },
    body: JSON.stringify(body),
  });
}

describe("/api/creds/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHIBP.mockResolvedValue({ checked: true, breached: false, count: 0 });
  });

  describe("POST", () => {
    it("should successfully register login event", async () => {
      const mockLoginEvent = { id: "event-123" };
      mockPrisma.extensionLoginEvent.create.mockResolvedValue(
        mockLoginEvent as never
      );

      const requestBody = {
        device_id: "device-123",
        domain: "https://slack.com",
        username: "user@test.com",
        password_hash: "a".repeat(128), // SHA-512 hash
        auth_type: "PASSWORD",
        captured_at: Date.now(),
      };

      const request = createMockRequest(requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe("event-123");
      expect(data.data.hibp.checked).toBe(true);
      expect(data.data.hibp.breached).toBe(false);
    });

    it("should return HIBP breach info when password is breached", async () => {
      mockHIBP.mockResolvedValue({ checked: true, breached: true, count: 5 });
      mockPrisma.extensionLoginEvent.create.mockResolvedValue({
        id: "event-456",
      } as never);

      const requestBody = {
        device_id: "device-123",
        domain: "https://slack.com",
        username: "user@test.com",
        password_hash: "b".repeat(128),
        auth_type: "PASSWORD",
        captured_at: Date.now(),
      };

      const request = createMockRequest(requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.hibp.breached).toBe(true);
      expect(data.data.hibp.breach_count).toBe(5);
    });

    it("should return 400 for missing required fields", async () => {
      const requestBody = {
        domain: "https://slack.com",
        // missing: device_id, username, password_hash, captured_at
      };

      const request = createMockRequest(requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it("should return 400 for invalid password_hash length", async () => {
      const requestBody = {
        device_id: "device-123",
        domain: "https://slack.com",
        username: "user@test.com",
        password_hash: "short", // Should be at least 64 chars
        auth_type: "PASSWORD",
        captured_at: Date.now(),
      };

      const request = createMockRequest(requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("should handle different auth types", async () => {
      mockPrisma.extensionLoginEvent.create.mockResolvedValue({
        id: "event-789",
      } as never);

      const authTypes = ["PASSWORD", "MAGIC_LINK", "OAUTH", "SSO"];

      for (const authType of authTypes) {
        const requestBody = {
          device_id: "device-123",
          domain: "https://slack.com",
          username: "user@test.com",
          password_hash: "c".repeat(128),
          auth_type: authType,
          captured_at: Date.now(),
        };

        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      }
    });

    it("should continue saving login even if HIBP check fails", async () => {
      mockHIBP.mockRejectedValue(new Error("HIBP API error"));
      mockPrisma.extensionLoginEvent.create.mockResolvedValue({
        id: "event-101",
      } as never);

      const requestBody = {
        device_id: "device-123",
        domain: "https://slack.com",
        username: "user@test.com",
        password_hash: "d".repeat(128),
        auth_type: "PASSWORD",
        captured_at: Date.now(),
      };

      const request = createMockRequest(requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.hibp.checked).toBe(false);
    });

    it("should return 500 for database errors", async () => {
      mockPrisma.extensionLoginEvent.create.mockRejectedValue(
        new Error("DB error")
      );

      const requestBody = {
        device_id: "device-123",
        domain: "https://slack.com",
        username: "user@test.com",
        password_hash: "e".repeat(128),
        auth_type: "PASSWORD",
        captured_at: Date.now(),
      };

      const request = createMockRequest(requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Failed to capture login");
    });
  });
});
