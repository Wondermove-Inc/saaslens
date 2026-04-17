// src/actions/team-members.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Mock revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getTeamMembers, removeMember, updateMemberRole } from "./team-members";

describe("team-members actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateMemberRole", () => {
    it("인증되지 않은 사용자는 에러를 반환해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue(null as never);

      const result = await updateMemberRole({
        userId: "user-2",
        role: "ADMIN",
      });

      expect(result).toEqual({
        success: false,
        message: "인증이 필요합니다",
      });
    });

    it("조직 ID가 없는 사용자는 에러를 반환해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: null, role: "ADMIN" },
      } as never);

      const result = await updateMemberRole({
        userId: "user-2",
        role: "ADMIN",
      });

      expect(result).toEqual({
        success: false,
        message: "조직 정보가 필요합니다",
      });
    });

    it("ADMIN이 아닌 사용자는 역할을 변경할 수 없어야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "MEMBER" },
      } as never);

      const result = await updateMemberRole({
        userId: "user-2",
        role: "ADMIN",
      });

      expect(result).toEqual({
        success: false,
        message: "관리자만 역할을 변경할 수 있습니다",
      });
    });

    it("자기 자신의 역할은 변경할 수 없어야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      const result = await updateMemberRole({
        userId: "user-1",
        role: "MEMBER",
      });

      expect(result).toEqual({
        success: false,
        message: "자신의 역할은 변경할 수 없습니다",
      });
    });

    it("존재하지 않는 사용자는 에러를 반환해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      const result = await updateMemberRole({
        userId: "user-2",
        role: "ADMIN",
      });

      expect(result).toEqual({
        success: false,
        message: "팀원을 찾을 수 없습니다",
      });
    });

    it("팀원의 역할을 성공적으로 변경해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "user-2",
        organizationId: "org-1",
        role: "MEMBER",
      } as never);

      vi.mocked(prisma.user.update).mockResolvedValue({
        id: "user-2",
        role: "ADMIN",
      } as never);

      const result = await updateMemberRole({
        userId: "user-2",
        role: "ADMIN",
      });

      expect(result.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-2" },
        data: { role: "ADMIN" },
      });
      expect(revalidatePath).toHaveBeenCalledWith("/settings/team");
    });
  });

  describe("removeMember", () => {
    it("인증되지 않은 사용자는 에러를 반환해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue(null as never);

      const result = await removeMember("user-2");

      expect(result).toEqual({
        success: false,
        message: "인증이 필요합니다",
      });
    });

    it("ADMIN이 아닌 사용자는 팀원을 제거할 수 없어야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "MEMBER" },
      } as never);

      const result = await removeMember("user-2");

      expect(result).toEqual({
        success: false,
        message: "관리자만 팀원을 제거할 수 있습니다",
      });
    });

    it("자기 자신은 제거할 수 없어야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      const result = await removeMember("user-1");

      expect(result).toEqual({
        success: false,
        message: "자신은 제거할 수 없습니다",
      });
    });

    it("조직의 마지막 관리자는 제거할 수 없어야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "user-2",
        organizationId: "org-1",
        role: "ADMIN",
      } as never);

      vi.mocked(prisma.user.count).mockResolvedValue(1);

      const result = await removeMember("user-2");

      expect(result).toEqual({
        success: false,
        message: "조직의 마지막 관리자는 제거할 수 없습니다",
      });
    });

    it("팀원을 성공적으로 제거해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "user-2",
        organizationId: "org-1",
        role: "MEMBER",
      } as never);

      vi.mocked(prisma.user.update).mockResolvedValue({
        id: "user-2",
        organizationId: null,
      } as never);

      const result = await removeMember("user-2");

      expect(result.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-2" },
        data: {
          organizationId: null,
          role: "VIEWER",
        },
      });
      expect(revalidatePath).toHaveBeenCalledWith("/settings/team");
    });
  });

  describe("getTeamMembers", () => {
    it("인증되지 않은 사용자는 에러를 반환해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue(null as never);

      const result = await getTeamMembers();

      expect(result).toEqual({
        success: false,
        message: "인증이 필요합니다",
      });
    });

    it("조직의 모든 팀원을 반환해야 한다", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      } as never);

      const mockMembers = [
        {
          id: "user-1",
          name: "Admin User",
          email: "admin@example.com",
          role: "ADMIN",
          status: "ACTIVE",
          image: null,
          lastLoginAt: new Date(),
          createdAt: new Date(),
        },
        {
          id: "user-2",
          name: "Member User",
          email: "member@example.com",
          role: "MEMBER",
          status: "ACTIVE",
          image: null,
          lastLoginAt: new Date(),
          createdAt: new Date(),
        },
      ];

      vi.mocked(prisma.user.findMany).mockResolvedValue(mockMembers as never);

      const result = await getTeamMembers();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockMembers);
    });
  });
});
