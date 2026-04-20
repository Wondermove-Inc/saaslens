// src/lib/api/extension-auth.test.ts
import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  generateToken,
  hashToken,
  validateExtensionToken,
  withExtensionAuth,
} from "./extension-auth";

// Prisma mock
vi.mock("@/lib/db", () => ({
  prisma: {
    extensionApiToken: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";

describe("extension-auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("hashToken", () => {
    it("should return consistent SHA-256 hash for the same input", () => {
      const token = "test-token-123";
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex chars
    });

    it("should return different hashes for different tokens", () => {
      const hash1 = hashToken("token-a");
      const hash2 = hashToken("token-b");

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("generateToken", () => {
    it("should generate a base64url encoded token", () => {
      const token = generateToken();

      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThan(30);
      // Base64URL should not contain +, /, or =
      expect(token).not.toMatch(/[+/=]/);
    });

    it("should generate unique tokens", () => {
      const token1 = generateToken();
      const token2 = generateToken();

      expect(token1).not.toBe(token2);
    });
  });

  describe("validateExtensionToken", () => {
    const mockRequest = (authHeader?: string) => {
      const headers = new Headers();
      if (authHeader) {
        headers.set("authorization", authHeader);
      }
      return new NextRequest("https://example.com/api/test", { headers });
    };

    it("should return null when no Authorization header", async () => {
      const request = mockRequest();
      const result = await validateExtensionToken(request);

      expect(result).toBeNull();
    });

    it("should return null when Authorization header is not Bearer", async () => {
      const request = mockRequest("Basic abc123");
      const result = await validateExtensionToken(request);

      expect(result).toBeNull();
    });

    it("should return null when token not found in database", async () => {
      vi.mocked(prisma.extensionApiToken.findUnique).mockResolvedValue(null);

      const request = mockRequest("Bearer valid-looking-token");
      const result = await validateExtensionToken(request);

      expect(result).toBeNull();
    });

    // Helper to create mock token data
    const createMockToken = (
      overrides: Partial<{
        id: string;
        organizationId: string;
        deviceId: string | null;
        isActive: boolean;
        expiresAt: Date | null;
      }> = {}
    ) => ({
      id: "token-1",
      organizationId: "org-1",
      deviceId: null as string | null,
      isActive: true,
      expiresAt: null as Date | null,
      ...overrides,
    });

    it("should return null when token is inactive", async () => {
      vi.mocked(prisma.extensionApiToken.findUnique).mockResolvedValue(
        createMockToken({ isActive: false }) as never
      );

      const request = mockRequest("Bearer some-token");
      const result = await validateExtensionToken(request);

      expect(result).toBeNull();
    });

    it("should return null when token is expired", async () => {
      const pastDate = new Date(Date.now() - 86400000); // 1 day ago
      vi.mocked(prisma.extensionApiToken.findUnique).mockResolvedValue(
        createMockToken({ expiresAt: pastDate }) as never
      );

      const request = mockRequest("Bearer some-token");
      const result = await validateExtensionToken(request);

      expect(result).toBeNull();
    });

    it("should return auth context for valid token", async () => {
      vi.mocked(prisma.extensionApiToken.findUnique).mockResolvedValue(
        createMockToken({
          organizationId: "org-123",
          deviceId: "device-456",
        }) as never
      );
      vi.mocked(prisma.extensionApiToken.update).mockResolvedValue({} as never);

      const request = mockRequest("Bearer valid-token");
      const result = await validateExtensionToken(request);

      expect(result).toEqual({
        organizationId: "org-123",
        tokenId: "token-1",
        deviceId: "device-456",
      });
    });

    it("should update lastUsedAt on successful validation", async () => {
      vi.mocked(prisma.extensionApiToken.findUnique).mockResolvedValue(
        createMockToken({ organizationId: "org-123" }) as never
      );
      vi.mocked(prisma.extensionApiToken.update).mockResolvedValue({} as never);

      const request = mockRequest("Bearer valid-token");
      await validateExtensionToken(request);

      // Wait for async update
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(prisma.extensionApiToken.update).toHaveBeenCalledWith({
        where: { id: "token-1" },
        data: { lastUsedAt: expect.any(Date) },
      });
    });
  });

  describe("withExtensionAuth", () => {
    const mockRequest = (authHeader?: string) => {
      const headers = new Headers();
      if (authHeader) {
        headers.set("authorization", authHeader);
      }
      return new NextRequest("https://example.com/api/test", { headers });
    };

    it("should return 401 when authentication fails", async () => {
      vi.mocked(prisma.extensionApiToken.findUnique).mockResolvedValue(null);

      const handler = vi
        .fn()
        .mockResolvedValue(NextResponse.json({ data: "test" }));
      const wrappedHandler = withExtensionAuth(handler);

      const request = mockRequest("Bearer invalid-token");
      const response = await wrappedHandler(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain("Unauthorized");
      expect(handler).not.toHaveBeenCalled();
    });

    // Helper to create mock token data (same as validateExtensionToken tests)
    const createMockToken = (
      overrides: Partial<{
        id: string;
        organizationId: string;
        deviceId: string | null;
        isActive: boolean;
        expiresAt: Date | null;
      }> = {}
    ) => ({
      id: "token-1",
      organizationId: "org-1",
      deviceId: null as string | null,
      isActive: true,
      expiresAt: null as Date | null,
      ...overrides,
    });

    it("should call handler with auth context when authentication succeeds", async () => {
      vi.mocked(prisma.extensionApiToken.findUnique).mockResolvedValue(
        createMockToken({
          organizationId: "org-123",
          deviceId: "device-456",
        }) as never
      );
      vi.mocked(prisma.extensionApiToken.update).mockResolvedValue({} as never);

      const handler = vi
        .fn()
        .mockResolvedValue(NextResponse.json({ success: true, data: "test" }));
      const wrappedHandler = withExtensionAuth(handler);

      const request = mockRequest("Bearer valid-token");
      const response = await wrappedHandler(request);

      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalledWith(request, {
        auth: {
          organizationId: "org-123",
          tokenId: "token-1",
          deviceId: "device-456",
        },
      });
    });
  });
});
