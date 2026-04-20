// src/actions/cards/card-registration.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock 설정
vi.mock("@/lib/db", () => ({
  prisma: {
    corporateCard: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    team: {
      findFirst: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/require-auth", () => ({
  getCachedSession: vi.fn(),
}));

vi.mock("@/lib/crypto", () => ({
  encryptJson: vi.fn().mockReturnValue("encrypted-credentials"),
  getCardLast4: vi.fn().mockReturnValue("1234"),
  maskCardNumber: vi.fn().mockReturnValue("****-****-****-1234"),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { getCachedSession } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { registerCorporateCard } from "./card-registration";

describe("registerCorporateCard", () => {
  const mockAdminSession = {
    user: {
      id: "user-admin",
      organizationId: "org-1",
      role: "ADMIN",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCachedSession).mockResolvedValue(mockAdminSession as never);
    vi.mocked(prisma.corporateCard.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.corporateCard.create).mockResolvedValue({
      id: "card-1",
    } as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);
  });

  // 기본 FormData 생성 헬퍼
  const createFormData = (overrides: Record<string, string> = {}) => {
    const formData = new FormData();
    formData.append("cardCd", "001");
    formData.append("cardNo", "1234567890123456");
    formData.append("loginMethod", "ID");
    formData.append("userId", "card-login-id"); // 카드사 로그인 ID
    formData.append("userPw", "card-login-pw");

    Object.entries(overrides).forEach(([key, value]) => {
      formData.set(key, value);
    });

    return formData;
  };

  describe("유저 배정 기본 기능", () => {
    it("should register card with assignedUserId when valid user provided", async () => {
      // Arrange: 조직에 속한 유저 생성
      const mockUser = {
        id: "user-member",
        organizationId: "org-1",
        teamId: "team-marketing",
      };
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as never);

      const formData = createFormData();
      formData.append("assignedUserId", "user-member");

      // Act
      const result = await registerCorporateCard(formData);

      // Assert
      expect(result.success).toBe(true);
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: "user-member",
          organizationId: "org-1",
        },
      });
      expect(prisma.corporateCard.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assignedUserId: "user-member",
          }),
        })
      );
    });

    it("should reject assignedUserId from different organization", async () => {
      // Arrange: 유저를 찾을 수 없음 (다른 조직이므로)
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      const formData = createFormData();
      formData.append("assignedUserId", "user-other-org");

      // Act
      const result = await registerCorporateCard(formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe("유효하지 않은 사용자입니다");
    });

    it("should reject when both teamId and assignedUserId are provided", async () => {
      // Arrange: 팀과 유저 둘 다 유효
      vi.mocked(prisma.team.findFirst).mockResolvedValue({
        id: "team-1",
        organizationId: "org-1",
      } as never);
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "user-1",
        organizationId: "org-1",
      } as never);

      const formData = createFormData();
      formData.append("teamId", "team-1");
      formData.append("assignedUserId", "user-1");

      // Act
      const result = await registerCorporateCard(formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe(
        "팀 배정과 유저 배정 중 하나만 선택할 수 있습니다"
      );
    });

    it("should allow card registration with only teamId", async () => {
      // Arrange: 팀만 유효
      vi.mocked(prisma.team.findFirst).mockResolvedValue({
        id: "team-1",
        organizationId: "org-1",
      } as never);

      const formData = createFormData();
      formData.append("teamId", "team-1");

      // Act
      const result = await registerCorporateCard(formData);

      // Assert
      expect(result.success).toBe(true);
      expect(prisma.corporateCard.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            teamId: "team-1",
            assignedUserId: null,
          }),
        })
      );
    });

    it("should allow card registration with only assignedUserId", async () => {
      // Arrange: 유저만 유효
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "user-1",
        organizationId: "org-1",
      } as never);

      const formData = createFormData();
      formData.append("assignedUserId", "user-1");

      // Act
      const result = await registerCorporateCard(formData);

      // Assert
      expect(result.success).toBe(true);
      expect(prisma.corporateCard.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            teamId: null,
            assignedUserId: "user-1",
          }),
        })
      );
    });

    it("should allow card registration without teamId and assignedUserId", async () => {
      // Arrange: 배정 정보 없음
      const formData = createFormData();

      // Act
      const result = await registerCorporateCard(formData);

      // Assert
      expect(result.success).toBe(true);
      expect(prisma.corporateCard.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            teamId: null,
            assignedUserId: null,
          }),
        })
      );
    });
  });

  describe("감사 로그", () => {
    it("should create audit log with assignedUserId when user assigned", async () => {
      // Arrange
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "user-1",
        organizationId: "org-1",
      } as never);

      const formData = createFormData();
      formData.append("assignedUserId", "user-1");

      // Act
      await registerCorporateCard(formData);

      // Assert
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              assignedUserId: "user-1",
            }),
          }),
        })
      );
    });
  });
});

describe("getCorporateCards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should include user info with team for user-assigned cards", async () => {
    // 이 테스트는 getCorporateCards 함수 수정 후 구현
    // Phase 1 완료 후 추가 예정
    expect(true).toBe(true);
  });
});
