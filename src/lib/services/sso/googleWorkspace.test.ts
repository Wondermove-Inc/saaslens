// src/lib/services/sso/googleWorkspace.test.ts
import type {
  GoogleWorkspaceUser,
  ServiceAccountCredentials,
} from "@/types/sso";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleWorkspaceService } from "./googleWorkspace";

// googleapis mock
vi.mock("googleapis", () => {
  class MockJWT {
    constructor(public opts: unknown) {}
    authorize = vi.fn().mockResolvedValue({});
  }
  return {
    google: {
      auth: { JWT: MockJWT },
      admin: vi.fn(() => ({
        users: {
          list: vi.fn().mockResolvedValue({ data: { users: [] } }),
          get: vi.fn().mockResolvedValue({ data: null }),
        },
        tokens: {
          list: vi.fn().mockResolvedValue({ data: { items: [] } }),
        },
      })),
    },
  };
});

describe("GoogleWorkspaceService", () => {
  const mockCredentials: ServiceAccountCredentials = {
    clientEmail: "test@project.iam.gserviceaccount.com",
    privateKey: "-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----",
    subject: "admin@example.com",
  };

  let service: GoogleWorkspaceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GoogleWorkspaceService(mockCredentials);
  });

  describe("constructor", () => {
    it("should create instance with valid credentials", () => {
      expect(service).toBeInstanceOf(GoogleWorkspaceService);
    });

    it("should throw error with missing clientEmail", () => {
      const invalidCreds = { ...mockCredentials, clientEmail: "" };
      expect(() => new GoogleWorkspaceService(invalidCreds)).toThrow(
        "서비스 계정 이메일이 필요합니다"
      );
    });

    it("should throw error with missing privateKey", () => {
      const invalidCreds = { ...mockCredentials, privateKey: "" };
      expect(() => new GoogleWorkspaceService(invalidCreds)).toThrow(
        "서비스 계정 Private Key가 필요합니다"
      );
    });

    it("should throw error with missing subject", () => {
      const invalidCreds = { ...mockCredentials, subject: "" };
      expect(() => new GoogleWorkspaceService(invalidCreds)).toThrow(
        "관리자 이메일(subject)이 필요합니다"
      );
    });
  });

  describe("listUsers", () => {
    const mockUsers: GoogleWorkspaceUser[] = [
      {
        id: "user-1",
        primaryEmail: "user1@example.com",
        name: { givenName: "John", familyName: "Doe", fullName: "John Doe" },
        isAdmin: false,
        suspended: false,
        creationTime: "2024-01-01T00:00:00Z",
      },
      {
        id: "user-2",
        primaryEmail: "user2@example.com",
        name: {
          givenName: "Jane",
          familyName: "Smith",
          fullName: "Jane Smith",
        },
        isAdmin: true,
        suspended: false,
        creationTime: "2024-01-02T00:00:00Z",
      },
    ];

    it("should return list of users", async () => {
      const mockList = vi.fn().mockResolvedValue({
        data: { users: mockUsers },
      });
      service["adminClient"].users.list = mockList;

      const users = await service.listUsers();

      expect(users).toHaveLength(2);
      expect(users[0].primaryEmail).toBe("user1@example.com");
      expect(mockList).toHaveBeenCalledWith({
        customer: "my_customer",
        maxResults: 500,
        pageToken: undefined,
        projection: "full",
      });
    });

    it("should handle pagination", async () => {
      const mockList = vi
        .fn()
        .mockResolvedValueOnce({
          data: { users: [mockUsers[0]], nextPageToken: "token123" },
        })
        .mockResolvedValueOnce({
          data: { users: [mockUsers[1]] },
        });
      service["adminClient"].users.list = mockList;

      const users = await service.listUsers();

      expect(users).toHaveLength(2);
      expect(mockList).toHaveBeenCalledTimes(2);
    });

    it("should return empty array when no users", async () => {
      const mockList = vi.fn().mockResolvedValue({
        data: { users: undefined },
      });
      service["adminClient"].users.list = mockList;

      const users = await service.listUsers();

      expect(users).toHaveLength(0);
    });

    it("should filter by orgUnitPath when provided", async () => {
      const mockList = vi.fn().mockResolvedValue({
        data: { users: mockUsers },
      });
      service["adminClient"].users.list = mockList;

      await service.listUsers("/Engineering");

      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({
          query: "orgUnitPath='/Engineering'",
        })
      );
    });
  });

  describe("getUser", () => {
    const mockUser: GoogleWorkspaceUser = {
      id: "user-1",
      primaryEmail: "user@example.com",
      name: { givenName: "Test", familyName: "User", fullName: "Test User" },
      isAdmin: false,
      suspended: false,
      creationTime: "2024-01-01T00:00:00Z",
    };

    it("should return user by email", async () => {
      const mockGet = vi.fn().mockResolvedValue({ data: mockUser });
      service["adminClient"].users.get = mockGet;

      const user = await service.getUser("user@example.com");

      expect(user).toEqual(mockUser);
      expect(mockGet).toHaveBeenCalledWith({
        userKey: "user@example.com",
        projection: "full",
      });
    });

    it("should return null when user not found", async () => {
      const mockGet = vi.fn().mockRejectedValue({
        code: 404,
        message: "User not found",
      });
      service["adminClient"].users.get = mockGet;

      const user = await service.getUser("nonexistent@example.com");

      expect(user).toBeNull();
    });
  });

  describe("listTokens", () => {
    const mockTokens = [
      {
        clientId: "client-1",
        displayText: "Test App 1",
        scopes: ["email", "profile"],
        userKey: "user@example.com",
      },
      {
        clientId: "client-2",
        displayText: "Test App 2",
        scopes: ["drive"],
        userKey: "user@example.com",
      },
    ];

    it("should return list of OAuth tokens for user", async () => {
      const mockList = vi.fn().mockResolvedValue({
        data: { items: mockTokens },
      });
      service["adminClient"].tokens.list = mockList;

      const tokens = await service.listTokens("user@example.com");

      expect(tokens).toHaveLength(2);
      expect(tokens[0].displayText).toBe("Test App 1");
      expect(mockList).toHaveBeenCalledWith({
        userKey: "user@example.com",
      });
    });

    it("should return empty array when no tokens", async () => {
      const mockList = vi.fn().mockResolvedValue({
        data: { items: undefined },
      });
      service["adminClient"].tokens.list = mockList;

      const tokens = await service.listTokens("user@example.com");

      expect(tokens).toHaveLength(0);
    });

    it("should handle API errors gracefully", async () => {
      const mockList = vi.fn().mockRejectedValue(new Error("API Error"));
      service["adminClient"].tokens.list = mockList;

      await expect(service.listTokens("user@example.com")).rejects.toThrow(
        "OAuth 토큰 조회 실패"
      );
    });
  });

  describe("testConnection", () => {
    it("should return true when connection is successful", async () => {
      const mockList = vi.fn().mockResolvedValue({
        data: { users: [] },
      });
      service["adminClient"].users.list = mockList;

      const result = await service.testConnection();

      expect(result).toBe(true);
    });

    it("should throw error when connection fails", async () => {
      const mockList = vi.fn().mockRejectedValue(new Error("Auth failed"));
      service["adminClient"].users.list = mockList;

      await expect(service.testConnection()).rejects.toThrow(
        "Google API 오류: Auth failed"
      );
    });
  });
});
