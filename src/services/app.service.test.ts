// src/services/app.service.test.ts
// TDD RED: 서비스 레이어 테스트 — 구현 전 작성
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    app: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    appTeam: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
    team: {
      findMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/services/payment/payment-matching", () => ({
  matchPaymentsToNewApp: vi.fn().mockResolvedValue({ matchedCount: 0 }),
}));

import { prisma } from "@/lib/db";
import {
  createApp,
  deleteApp,
  updateApp,
  type AppServiceContext,
} from "./app.service";

const mockCtx: AppServiceContext = {
  organizationId: "org-1",
  userId: "user-1",
  role: "ADMIN",
};

describe("AppService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // ==================== createApp ====================
  describe("createApp", () => {
    it("정상적으로 앱을 생성해야 한다", async () => {
      vi.mocked(prisma.app.findFirst).mockResolvedValue(null); // no duplicate
      vi.mocked(prisma.app.create).mockResolvedValue({
        id: "app-new",
        name: "Slack",
        organizationId: "org-1",
      } as never);

      const result = await createApp(mockCtx, {
        name: "Slack",
      });

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe("app-new");
      expect(prisma.app.create).toHaveBeenCalledOnce();
      expect(prisma.auditLog.create).toHaveBeenCalledOnce();
    });

    it("중복 앱 이름이면 실패해야 한다", async () => {
      vi.mocked(prisma.app.findFirst).mockResolvedValue({
        id: "existing",
        name: "Slack",
      } as never);

      const result = await createApp(mockCtx, {
        name: "Slack",
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("이미 등록된");
      expect(prisma.app.create).not.toHaveBeenCalled();
    });

    it("VIEWER 권한이면 실패해야 한다", async () => {
      const viewerCtx = { ...mockCtx, role: "VIEWER" };

      const result = await createApp(viewerCtx, {
        name: "Slack",
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("권한");
    });

    it("카테고리, 웹사이트, 메모, 태그를 포함해야 한다", async () => {
      vi.mocked(prisma.app.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.app.create).mockResolvedValue({
        id: "app-new",
        name: "Figma",
        organizationId: "org-1",
      } as never);

      const result = await createApp(mockCtx, {
        name: "Figma",
        category: "디자인",
        customWebsite: "https://figma.com",
        notes: "디자인 도구",
        tags: "design,ui",
      });

      expect(result.success).toBe(true);
      expect(prisma.app.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Figma",
            category: "디자인",
            customWebsite: "https://figma.com",
            notes: "디자인 도구",
            tags: ["design", "ui"],
          }),
        })
      );
    });

    it("teamIds가 있으면 AppTeam 레코드를 생성해야 한다", async () => {
      vi.mocked(prisma.app.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.team.findMany).mockResolvedValue([
        { id: "team-1" },
        { id: "team-2" },
      ] as never);
      vi.mocked(prisma.app.create).mockResolvedValue({
        id: "app-new",
        name: "Slack",
        organizationId: "org-1",
      } as never);

      const result = await createApp(mockCtx, {
        name: "Slack",
        teamIds: ["team-1", "team-2"],
      });

      expect(result.success).toBe(true);
      expect(prisma.appTeam.createMany).toHaveBeenCalledWith({
        data: [
          { appId: "app-new", teamId: "team-1", assignedBy: "user-1" },
          { appId: "app-new", teamId: "team-2", assignedBy: "user-1" },
        ],
      });
    });

    it("잘못된 teamIds가 있으면 실패해야 한다", async () => {
      vi.mocked(prisma.app.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.team.findMany).mockResolvedValue([
        { id: "team-1" },
      ] as never); // only 1 of 2 found

      const result = await createApp(mockCtx, {
        name: "Slack",
        teamIds: ["team-1", "team-invalid"],
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("유효하지 않은 팀");
    });

    it("ownerId 검증 — 조직에 속하지 않으면 실패해야 한다", async () => {
      vi.mocked(prisma.app.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null); // owner not found

      const result = await createApp(mockCtx, {
        name: "Slack",
        ownerId: "unknown-user",
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("소유자");
    });
  });

  // ==================== updateApp ====================
  describe("updateApp", () => {
    it("정상적으로 앱을 수정해야 한다", async () => {
      vi.mocked(prisma.app.findFirst)
        .mockResolvedValueOnce({
          id: "app-1",
          name: "Slack",
          status: "ACTIVE",
          organizationId: "org-1",
        } as never)
        .mockResolvedValueOnce(null); // no duplicate name
      vi.mocked(prisma.app.update).mockResolvedValue({
        id: "app-1",
        name: "Slack Pro",
      } as never);

      const result = await updateApp(mockCtx, "app-1", {
        name: "Slack Pro",
      });

      expect(result.success).toBe(true);
      expect(prisma.app.update).toHaveBeenCalledOnce();
    });

    it("존재하지 않는 앱이면 실패해야 한다", async () => {
      vi.mocked(prisma.app.findFirst).mockResolvedValue(null);

      const result = await updateApp(mockCtx, "nonexistent", {
        name: "New Name",
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("찾을 수 없습니다");
    });

    it("ADMIN이 아니면 실패해야 한다", async () => {
      const memberCtx = { ...mockCtx, role: "MEMBER" };

      const result = await updateApp(memberCtx, "app-1", {
        name: "New",
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("권한");
    });

    it("중복 앱 이름으로 변경하면 실패해야 한다", async () => {
      vi.mocked(prisma.app.findFirst)
        .mockResolvedValueOnce({
          id: "app-1",
          name: "Slack",
          status: "ACTIVE",
          organizationId: "org-1",
        } as never)
        .mockResolvedValueOnce({
          id: "app-2",
          name: "Notion",
        } as never); // duplicate exists

      const result = await updateApp(mockCtx, "app-1", {
        name: "Notion",
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("이미 등록된");
    });
  });

  // ==================== deleteApp ====================
  describe("deleteApp", () => {
    it("정상적으로 앱을 삭제해야 한다", async () => {
      vi.mocked(prisma.app.findFirst).mockResolvedValue({
        id: "app-1",
        name: "Slack",
        organizationId: "org-1",
      } as never);

      const result = await deleteApp(mockCtx, "app-1");

      expect(result.success).toBe(true);
      expect(prisma.app.delete).toHaveBeenCalledWith({
        where: { id: "app-1" },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledOnce();
    });

    it("존재하지 않는 앱이면 실패해야 한다", async () => {
      vi.mocked(prisma.app.findFirst).mockResolvedValue(null);

      const result = await deleteApp(mockCtx, "nonexistent");

      expect(result.success).toBe(false);
      expect(result.message).toContain("찾을 수 없습니다");
    });

    it("ADMIN이 아니면 실패해야 한다", async () => {
      const memberCtx = { ...mockCtx, role: "MEMBER" };

      const result = await deleteApp(memberCtx, "app-1");

      expect(result.success).toBe(false);
      expect(result.message).toContain("권한");
    });
  });
});
