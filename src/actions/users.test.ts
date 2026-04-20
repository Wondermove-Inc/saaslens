// src/actions/users.test.ts
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getTerminatedUsersWithAccess,
  getUser,
  getUsers,
  revokeAllUserAppAccess,
  revokeUserAppAccess,
  updateUser,
} from "./users";
import { permanentlyDeleteUser } from "./users-write";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
    userAppAccess: {
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    subscriptionUser: {
      deleteMany: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    subscription: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    app: {
      updateMany: vi.fn(),
    },
    corporateCard: {
      updateMany: vi.fn(),
    },
    cardTransaction: {
      updateMany: vi.fn(),
    },
    invitation: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock next/navigation redirect
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockedAuth = auth as any;

describe("Users Server Actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockRedirect.mockClear();
  });

  describe("getUsers", () => {
    it("인증되지 않은 경우 login으로 리다이렉트해야 한다", async () => {
      mockedAuth.mockResolvedValue(null);

      await expect(getUsers()).rejects.toThrow("NEXT_REDIRECT");

      expect(mockRedirect).toHaveBeenCalledWith("/login");
    });

    it("organizationId가 없는 경우 onboarding으로 리다이렉트해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: null },
        expires: "",
      });

      await expect(getUsers()).rejects.toThrow("NEXT_REDIRECT");

      expect(mockRedirect).toHaveBeenCalledWith("/onboarding");
    });

    it("사용자 목록을 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
        expires: "",
      });

      const mockUsers = [
        {
          id: "user-1",
          email: "test@example.com",
          name: "Test User",
          avatarUrl: null,
          role: "MEMBER",
          status: "ACTIVE",
          department: "개발팀",
          jobTitle: "개발자",
          lastLoginAt: new Date("2024-01-15"),
          terminatedAt: null,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-15"),
          subscriptionAssignments: [
            { subscription: { appId: "app-1" } },
            { subscription: { appId: "app-2" } },
            { subscription: { appId: "app-1" } }, // duplicate
            { subscription: { appId: "app-3" } },
            { subscription: { appId: "app-4" } },
          ],
        },
      ];

      vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as never);
      vi.mocked(prisma.user.count).mockResolvedValue(1);

      const result = await getUsers();

      expect(result.items).toHaveLength(1);
      expect(result.items[0].email).toBe("test@example.com");
      expect(result.items[0].assignedAppCount).toBe(4);
      expect(result.total).toBe(1);
    });

    it("필터 조건으로 사용자를 조회해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
        expires: "",
      });

      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.count).mockResolvedValue(0);

      await getUsers({ filter: { status: "ACTIVE", role: "ADMIN" } });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "org-1",
            status: "ACTIVE",
            role: "ADMIN",
          }),
        })
      );
    });

    it("검색어로 사용자를 조회해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
        expires: "",
      });

      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.count).mockResolvedValue(0);

      await getUsers({ filter: { search: "test" } });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { email: { contains: "test", mode: "insensitive" } },
              { name: { contains: "test", mode: "insensitive" } },
            ]),
          }),
        })
      );
    });
  });

  describe("getUser", () => {
    it("사용자 상세 정보를 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
        expires: "",
      });

      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        avatarUrl: null,
        role: "MEMBER",
        status: "ACTIVE",
        department: "개발팀",
        jobTitle: "개발자",
        employeeId: "EMP001",
        lastLoginAt: new Date("2024-01-15"),
        terminatedAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-15"),
        subscriptionAssignments: [
          { subscription: { appId: "app-1" } },
          { subscription: { appId: "app-2" } },
        ],
        appAccesses: [
          {
            id: "access-1",
            appId: "app-1",
            accessLevel: "admin",
            grantedAt: new Date("2024-01-01"),
            lastUsedAt: new Date("2024-01-15"),
            source: "SSO_LOG",
            app: {
              id: "app-1",
              name: "Slack",
              customLogoUrl: "https://example.com/slack.png",
              catalog: null,
            },
          },
        ],
      };

      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as never);
      // Mock subscription.findMany for getUser
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      const result = await getUser("user-1");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("user-1");
      expect(result?.email).toBe("test@example.com");
      expect(result?.appAccesses).toHaveLength(1);
      expect(result?.appAccesses[0].appName).toBe("Slack");
    });

    it("존재하지 않는 사용자는 null을 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
        expires: "",
      });

      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      // Mock subscription.findMany for getUser (still called in parallel)
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      const result = await getUser("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("updateUser", () => {
    it("인증되지 않은 경우 /login으로 리다이렉트해야 한다", async () => {
      mockedAuth.mockResolvedValue(null);

      const formData = new FormData();
      formData.append("name", "Updated Name");

      await expect(
        updateUser("user-1", { success: false }, formData)
      ).rejects.toThrow("NEXT_REDIRECT:/login");
    });

    it("사용자가 존재하지 않으면 에러를 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
        expires: "",
      });

      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      const formData = new FormData();
      formData.append("name", "Updated Name");

      const result = await updateUser(
        "non-existent",
        { success: false },
        formData
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe("사용자를 찾을 수 없습니다");
    });

    it("사용자 정보를 성공적으로 수정해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "current-user", organizationId: "org-1" },
        expires: "",
      });

      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        organizationId: "org-1",
      } as never);

      vi.mocked(prisma.user.update).mockResolvedValue({
        id: "user-1",
        name: "Updated Name",
      } as never);

      const formData = new FormData();
      formData.append("name", "Updated Name");
      formData.append("department", "마케팅팀");

      const result = await updateUser("user-1", { success: false }, formData);

      expect(result.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith("/users");
    });
  });

  describe("getTerminatedUsersWithAccess", () => {
    it("퇴사자 중 미회수 접근 권한이 있는 사용자를 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
        expires: "",
      });

      const mockTerminatedUsers = [
        {
          id: "terminated-1",
          email: "terminated@example.com",
          name: "퇴사자",
          avatarUrl: null,
          department: "개발팀",
          jobTitle: "개발자",
          terminatedAt: new Date("2024-01-01"),
          _count: { appAccesses: 2, subscriptionAssignments: 1 },
          appAccesses: [
            {
              id: "access-1",
              appId: "app-1",
              accessLevel: "user",
              grantedAt: new Date("2023-06-01"),
              lastUsedAt: new Date("2023-12-15"),
              source: "SSO_LOG",
              app: {
                id: "app-1",
                name: "Slack",
                customLogoUrl: null,
                catalog: { logoUrl: "https://example.com/slack.png" },
              },
            },
          ],
          subscriptionAssignments: [
            {
              id: "sa-1",
              subscriptionId: "sub-1",
              assignedAt: new Date("2023-07-01"),
              subscription: {
                appId: "app-2",
                billingCycle: "MONTHLY",
                billingType: "PER_USER",
                app: {
                  name: "Notion",
                  customLogoUrl: null,
                  catalog: null,
                },
              },
            },
          ],
        },
      ];

      vi.mocked(prisma.user.findMany).mockResolvedValue(
        mockTerminatedUsers as never
      );

      const result = await getTerminatedUsersWithAccess();

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe("terminated@example.com");
      expect(result[0].unrevokedAccessCount).toBe(3);
      expect(result[0].appAccesses).toHaveLength(1);
      expect(result[0].subscriptionAssignments).toHaveLength(1);
    });
  });

  describe("revokeUserAppAccess", () => {
    it("인증되지 않은 경우 /login으로 리다이렉트해야 한다", async () => {
      mockedAuth.mockResolvedValue(null);

      await expect(revokeUserAppAccess("user-1", "app-1")).rejects.toThrow(
        "NEXT_REDIRECT:/login"
      );
    });

    it("사용자 앱 접근 권한을 성공적으로 회수해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "current-user", organizationId: "org-1" },
        expires: "",
      });

      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        organizationId: "org-1",
        appAccesses: [
          {
            id: "access-1",
            appId: "app-1",
            app: { id: "app-1", name: "Slack" },
          },
        ],
      } as never);

      vi.mocked(prisma.subscriptionUser.findMany).mockResolvedValue([]);
      vi.mocked(prisma.$transaction).mockImplementation(async (cb) => {
        if (typeof cb === "function") {
          return cb(prisma);
        }
        return cb;
      });
      vi.mocked(prisma.userAppAccess.delete).mockResolvedValue({
        id: "access-1",
      } as never);

      const result = await revokeUserAppAccess("user-1", "app-1");

      expect(result.success).toBe(true);
      expect(prisma.userAppAccess.delete).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith("/users");
      expect(revalidatePath).toHaveBeenCalledWith("/subscriptions");
    });

    it("개별 회수 시 해당 앱의 SubscriptionUser를 삭제하고 usedLicenses를 재계산해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "current-user", organizationId: "org-1" },
        expires: "",
      });

      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        organizationId: "org-1",
        appAccesses: [
          {
            id: "access-1",
            appId: "app-1",
            app: { id: "app-1", name: "Slack" },
          },
        ],
      } as never);

      // 해당 앱의 구독에 배정된 SubscriptionUser 존재
      vi.mocked(prisma.subscriptionUser.findMany).mockResolvedValue([
        { id: "su-1", subscriptionId: "sub-1" },
      ] as never);

      vi.mocked(prisma.$transaction).mockImplementation(async (cb) => {
        if (typeof cb === "function") {
          return cb(prisma);
        }
        return cb;
      });
      vi.mocked(prisma.userAppAccess.delete).mockResolvedValue({
        id: "access-1",
      } as never);
      vi.mocked(prisma.subscriptionUser.deleteMany).mockResolvedValue({
        count: 1,
      });
      vi.mocked(prisma.subscriptionUser.count).mockResolvedValue(4);
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as never);

      const result = await revokeUserAppAccess("user-1", "app-1");

      expect(result.success).toBe(true);
      // SubscriptionUser 삭제 확인
      expect(prisma.subscriptionUser.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
          subscription: { appId: "app-1" },
        },
      });
      // usedLicenses 재계산 확인
      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: "sub-1" },
        data: { usedLicenses: 4 },
      });
      // 구독 페이지 revalidation 확인
      expect(revalidatePath).toHaveBeenCalledWith("/subscriptions");
      expect(revalidatePath).toHaveBeenCalledWith("/subscriptions/sub-1");
    });

    it("접근 권한이 없으면 에러를 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "current-user", organizationId: "org-1" },
        expires: "",
      });

      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        organizationId: "org-1",
        appAccesses: [],
      } as never);

      const result = await revokeUserAppAccess("user-1", "app-1");

      expect(result.success).toBe(false);
      expect(result.message).toBe("접근 권한을 찾을 수 없습니다");
    });
  });

  describe("revokeAllUserAppAccess", () => {
    it("인증되지 않은 경우 /login으로 리다이렉트해야 한다", async () => {
      mockedAuth.mockResolvedValue(null);

      await expect(revokeAllUserAppAccess("user-1")).rejects.toThrow(
        "NEXT_REDIRECT:/login"
      );
    });

    it("사용자의 모든 앱 접근 권한을 성공적으로 회수해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "current-user", organizationId: "org-1" },
        expires: "",
      });

      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        organizationId: "org-1",
        appAccesses: [
          { id: "access-1", appId: "app-1" },
          { id: "access-2", appId: "app-2" },
        ],
        subscriptionAssignments: [{ id: "sa-1", subscriptionId: "sub-1" }],
      } as never);

      // Interactive transaction mock: execute the callback with prisma as tx
      vi.mocked(prisma.$transaction).mockImplementation(async (cb) => {
        if (typeof cb === "function") {
          return cb(prisma);
        }
        return cb;
      });
      vi.mocked(prisma.userAppAccess.deleteMany).mockResolvedValue({
        count: 2,
      });
      vi.mocked(prisma.subscriptionUser.deleteMany).mockResolvedValue({
        count: 1,
      });
      vi.mocked(prisma.subscriptionUser.count).mockResolvedValue(3);
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as never);

      const result = await revokeAllUserAppAccess("user-1");

      expect(result.success).toBe(true);
      expect(result.message).toBe("3개의 접근 권한이 회수되었습니다");
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              revokedAppAccessCount: 2,
              revokedSubscriptionAssignmentCount: 1,
              revokedCount: 3,
            }),
          }),
        })
      );
      expect(revalidatePath).toHaveBeenCalledWith("/users");
      expect(revalidatePath).toHaveBeenCalledWith("/users/offboarded");
      expect(revalidatePath).toHaveBeenCalledWith("/subscriptions");
      expect(revalidatePath).toHaveBeenCalledWith("/subscriptions/sub-1");
    });

    it("subscriptionAssignments만 있는 경우에도 회수에 성공해야 한다 (버그 재현)", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "current-user", organizationId: "org-1" },
        expires: "",
      });

      // Bug scenario: appAccesses=0, subscriptionAssignments>=1
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        organizationId: "org-1",
        appAccesses: [],
        subscriptionAssignments: [
          { id: "sa-1", subscriptionId: "sub-1" },
          { id: "sa-2", subscriptionId: "sub-2" },
        ],
      } as never);

      vi.mocked(prisma.$transaction).mockImplementation(async (cb) => {
        if (typeof cb === "function") {
          return cb(prisma);
        }
        return cb;
      });
      vi.mocked(prisma.userAppAccess.deleteMany).mockResolvedValue({
        count: 0,
      });
      vi.mocked(prisma.subscriptionUser.deleteMany).mockResolvedValue({
        count: 2,
      });
      vi.mocked(prisma.subscriptionUser.count).mockResolvedValue(1);
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as never);

      const result = await revokeAllUserAppAccess("user-1");

      expect(result.success).toBe(true);
      expect(result.message).toBe("2개의 접근 권한이 회수되었습니다");
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("구독 회수 시 영향받는 구독의 usedLicenses가 재계산되어야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "current-user", organizationId: "org-1" },
        expires: "",
      });

      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        organizationId: "org-1",
        appAccesses: [{ id: "access-1", appId: "app-1" }],
        subscriptionAssignments: [
          { id: "sa-1", subscriptionId: "sub-1" },
          { id: "sa-2", subscriptionId: "sub-2" },
        ],
      } as never);

      vi.mocked(prisma.$transaction).mockImplementation(async (cb) => {
        if (typeof cb === "function") {
          return cb(prisma);
        }
        return cb;
      });
      vi.mocked(prisma.userAppAccess.deleteMany).mockResolvedValue({
        count: 1,
      });
      vi.mocked(prisma.subscriptionUser.deleteMany).mockResolvedValue({
        count: 2,
      });
      // sub-1: 2명 남음, sub-2: 0명 남음
      vi.mocked(prisma.subscriptionUser.count)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(0);
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as never);

      const result = await revokeAllUserAppAccess("user-1");

      expect(result.success).toBe(true);
      // sub-1 usedLicenses = 2
      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: "sub-1" },
        data: { usedLicenses: 2 },
      });
      // sub-2 usedLicenses = 0
      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: "sub-2" },
        data: { usedLicenses: 0 },
      });
    });

    it("사용자를 찾을 수 없으면 에러를 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "current-user", organizationId: "org-1" },
        expires: "",
      });

      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      const result = await revokeAllUserAppAccess("non-existent");

      expect(result.success).toBe(false);
      expect(result.message).toBe("사용자를 찾을 수 없습니다");
    });

    it("appAccesses와 subscriptionAssignments 모두 없으면 에러를 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "current-user", organizationId: "org-1" },
        expires: "",
      });

      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        organizationId: "org-1",
        appAccesses: [],
        subscriptionAssignments: [],
      } as never);

      const result = await revokeAllUserAppAccess("user-1");

      expect(result.success).toBe(false);
      expect(result.message).toBe("회수할 접근 권한이 없습니다");
    });
  });

  describe("permanentlyDeleteUser", () => {
    it("cascade 삭제 시 영향받는 구독의 usedLicenses가 재계산되어야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "admin-user", organizationId: "org-1", role: "ADMIN" },
        expires: "",
      });

      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "target-user",
        email: "terminated@example.com",
        name: "Terminated User",
        role: "MEMBER",
        status: "TERMINATED",
        department: "개발팀",
        organizationId: "org-1",
      } as never);

      // 삭제 전 영향받는 구독 조회
      vi.mocked(prisma.subscriptionUser.findMany).mockResolvedValue([
        { subscriptionId: "sub-1" },
        { subscriptionId: "sub-2" },
      ] as never);

      vi.mocked(prisma.$transaction).mockImplementation(async (cb) => {
        if (typeof cb === "function") {
          return cb(prisma);
        }
        return cb;
      });
      vi.mocked(prisma.app.updateMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.corporateCard.updateMany).mockResolvedValue({
        count: 0,
      });
      vi.mocked(prisma.cardTransaction.updateMany).mockResolvedValue({
        count: 0,
      });
      vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.invitation.deleteMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.user.delete).mockResolvedValue({} as never);
      vi.mocked(prisma.subscriptionUser.count)
        .mockResolvedValueOnce(5) // sub-1: 5명 남음
        .mockResolvedValueOnce(0); // sub-2: 0명 남음
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as never);

      const result = await permanentlyDeleteUser("target-user");

      expect(result.success).toBe(true);
      // 영향받는 구독의 usedLicenses 재계산 확인
      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: "sub-1" },
        data: { usedLicenses: 5 },
      });
      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: "sub-2" },
        data: { usedLicenses: 0 },
      });
      // 구독 페이지 revalidation 확인
      expect(revalidatePath).toHaveBeenCalledWith("/subscriptions");
      expect(revalidatePath).toHaveBeenCalledWith("/subscriptions/sub-1");
      expect(revalidatePath).toHaveBeenCalledWith("/subscriptions/sub-2");
    });

    it("구독 배정 없는 사용자 삭제 시 usedLicenses 재계산 없이 성공해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "admin-user", organizationId: "org-1", role: "ADMIN" },
        expires: "",
      });

      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "target-user",
        email: "terminated@example.com",
        name: "Terminated User",
        role: "MEMBER",
        status: "TERMINATED",
        department: "개발팀",
        organizationId: "org-1",
      } as never);

      // 구독 배정 없음
      vi.mocked(prisma.subscriptionUser.findMany).mockResolvedValue([]);

      vi.mocked(prisma.$transaction).mockImplementation(async (cb) => {
        if (typeof cb === "function") {
          return cb(prisma);
        }
        return cb;
      });
      vi.mocked(prisma.app.updateMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.corporateCard.updateMany).mockResolvedValue({
        count: 0,
      });
      vi.mocked(prisma.cardTransaction.updateMany).mockResolvedValue({
        count: 0,
      });
      vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.invitation.deleteMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.user.delete).mockResolvedValue({} as never);

      const result = await permanentlyDeleteUser("target-user");

      expect(result.success).toBe(true);
      // subscription.update는 호출되지 않아야 함
      expect(prisma.subscription.update).not.toHaveBeenCalled();
    });

    it("TERMINATED 상태가 아닌 사용자는 삭제할 수 없어야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "admin-user", organizationId: "org-1", role: "ADMIN" },
        expires: "",
      });

      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "target-user",
        email: "active@example.com",
        name: "Active User",
        role: "MEMBER",
        status: "ACTIVE",
        department: "개발팀",
        organizationId: "org-1",
      } as never);

      const result = await permanentlyDeleteUser("target-user");

      expect(result.success).toBe(false);
      expect(result.message).toContain("퇴사 처리된 사용자만");
    });
  });
});
