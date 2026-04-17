// src/actions/teams.ts
/**
 * Team 관련 Server Actions
 * Google Workspace OU 기반 팀 관리
 */

"use server";

import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import type { ActionState } from "@/types";
import type { Team, User } from "@prisma/client";

import { requireOrganization } from "@/lib/auth/require-auth";

// ==================== Types ====================

export interface TeamWithStats extends Team {
  _count: {
    members: number;
    children: number;
  };
  parent?: {
    id: string;
    name: string;
  } | null;
}

export interface TeamNode extends TeamWithStats {
  children: TeamNode[];
}

export interface TeamMember extends User {
  manager?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

// ==================== Server Actions ====================

/**
 * 팀 목록 조회 (flat)
 */
export async function getTeams(): Promise<ActionState<TeamWithStats[]>> {
  try {
    const { organizationId } = await requireOrganization();

    const teams = await prisma.team.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { members: true, children: true },
        },
        parent: {
          select: { id: true, name: true },
        },
      },
      orderBy: { googleOrgUnitPath: "asc" },
    });

    return { success: true, data: teams };
  } catch (error) {
    logger.error({ err: error }, "팀 목록 조회 오류");
    if (isRedirectError(error)) throw error;
    return { success: false, message: "팀 목록을 불러오는 데 실패했습니다" };
  }
}

/**
 * 팀 계층 구조 조회 (tree)
 */
export async function getTeamHierarchy(): Promise<ActionState<TeamNode[]>> {
  try {
    const { organizationId } = await requireOrganization();

    const teams = await prisma.team.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { members: true, children: true },
        },
        parent: {
          select: { id: true, name: true },
        },
      },
      orderBy: { googleOrgUnitPath: "asc" },
    });

    // 트리 구조로 변환
    const teamMap = new Map<string, TeamNode>();
    const rootTeams: TeamNode[] = [];

    // 1차: 모든 팀을 맵에 추가
    teams.forEach((team) => {
      teamMap.set(team.id, { ...team, children: [] });
    });

    // 2차: 부모-자식 관계 설정
    teams.forEach((team) => {
      const node = teamMap.get(team.id)!;
      if (team.parentId) {
        const parent = teamMap.get(team.parentId);
        if (parent) {
          parent.children.push(node);
        } else {
          // 부모가 없으면 루트로
          rootTeams.push(node);
        }
      } else {
        rootTeams.push(node);
      }
    });

    return { success: true, data: rootTeams };
  } catch (error) {
    logger.error({ err: error }, "팀 계층 조회 오류");
    if (isRedirectError(error)) throw error;
    return { success: false, message: "팀 계층을 불러오는 데 실패했습니다" };
  }
}

/**
 * 단일 팀 조회
 */
export async function getTeam(
  teamId: string
): Promise<ActionState<TeamWithStats>> {
  try {
    const { organizationId } = await requireOrganization();

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        _count: {
          select: { members: true, children: true },
        },
        parent: {
          select: { id: true, name: true },
        },
      },
    });

    if (!team) {
      return { success: false, message: "팀을 찾을 수 없습니다" };
    }

    if (team.organizationId !== organizationId) {
      return { success: false, message: "접근 권한이 없습니다" };
    }

    return { success: true, data: team };
  } catch (error) {
    logger.error({ err: error }, "팀 조회 오류");
    if (isRedirectError(error)) throw error;
    return { success: false, message: "팀을 불러오는 데 실패했습니다" };
  }
}

/**
 * 팀 멤버 조회
 */
export async function getTeamMembers(
  teamId: string
): Promise<ActionState<TeamMember[]>> {
  try {
    const { organizationId } = await requireOrganization();

    // 팀 존재 여부 및 권한 확인
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { organizationId: true },
    });

    if (!team) {
      return { success: false, message: "팀을 찾을 수 없습니다" };
    }

    if (team.organizationId !== organizationId) {
      return { success: false, message: "접근 권한이 없습니다" };
    }

    const members = await prisma.user.findMany({
      where: { teamId },
      include: {
        manager: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return { success: true, data: members };
  } catch (error) {
    logger.error({ err: error }, "팀 멤버 조회 오류");
    if (isRedirectError(error)) throw error;
    return { success: false, message: "팀 멤버를 불러오는 데 실패했습니다" };
  }
}

/**
 * 팀 생성 (수동)
 */
async function _createTeam(input: {
  name: string;
  description?: string;
  parentId?: string;
  memberIds?: string[];
}): Promise<ActionState<Team>> {
  try {
    const { organizationId, role } = await requireOrganization();

    if (role !== "ADMIN") {
      return { success: false, message: "관리자 권한이 필요합니다" };
    }

    const { name, description, parentId, memberIds } = input;

    if (!name.trim()) {
      return { success: false, message: "팀 이름을 입력해주세요" };
    }

    // 부모 팀 확인 (parentId가 있는 경우)
    if (parentId) {
      const parentTeam = await prisma.team.findUnique({
        where: { id: parentId },
        select: { organizationId: true },
      });

      if (!parentTeam) {
        return { success: false, message: "부모 팀을 찾을 수 없습니다" };
      }

      if (parentTeam.organizationId !== organizationId) {
        return { success: false, message: "접근 권한이 없습니다" };
      }
    }

    // 팀 생성
    const team = await prisma.team.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        parentId: parentId || null,
        organizationId,
      },
    });

    // 멤버 배정 (memberIds가 있는 경우)
    if (memberIds && memberIds.length > 0) {
      // 유효한 멤버만 필터링
      const validMembers = await prisma.user.findMany({
        where: {
          id: { in: memberIds },
          organizationId,
        },
        select: { id: true },
      });

      if (validMembers.length > 0) {
        await prisma.user.updateMany({
          where: {
            id: { in: validMembers.map((m) => m.id) },
          },
          data: { teamId: team.id },
        });
      }
    }

    revalidatePath("/teams");

    return { success: true, data: team, message: "팀이 생성되었습니다" };
  } catch (error) {
    logger.error({ err: error }, "팀 생성 오류");
    if (isRedirectError(error)) throw error;
    return { success: false, message: "팀 생성에 실패했습니다" };
  }
}
export const createTeam = withLogging("createTeam", _createTeam);

/**
 * 팀 수정 입력 타입
 */
export interface UpdateTeamInput {
  name?: string;
  description?: string;
  parentId?: string | null;
  memberIds?: string[]; // 전체 멤버 ID 배열 (sync 방식)
}

/**
 * 팀 수정 (수동 생성된 팀만)
 * - memberIds가 제공되면 팀 멤버를 동기화 (추가/제거)
 * - 트랜잭션으로 원자성 보장
 * - 팀에서 제거된 멤버는 해당 팀의 구독 배정에서도 제거
 */
async function _updateTeam(
  teamId: string,
  input: UpdateTeamInput
): Promise<ActionState<Team>> {
  try {
    const { organizationId, role } = await requireOrganization();

    if (role !== "ADMIN") {
      return { success: false, message: "관리자 권한이 필요합니다" };
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { organizationId: true, googleOrgUnitId: true },
    });

    if (!team) {
      return { success: false, message: "팀을 찾을 수 없습니다" };
    }

    if (team.organizationId !== organizationId) {
      return { success: false, message: "접근 권한이 없습니다" };
    }

    // Google Workspace에서 동기화된 팀은 이름 수정 불가
    if (team.googleOrgUnitId && input.name) {
      return {
        success: false,
        message: "Google Workspace에서 동기화된 팀의 이름은 수정할 수 없습니다",
      };
    }

    // 부모 팀 확인 (parentId가 있는 경우)
    if (input.parentId) {
      // 자기 자신을 부모로 설정하는 것 방지
      if (input.parentId === teamId) {
        return {
          success: false,
          message: "자기 자신을 부모 팀으로 설정할 수 없습니다",
        };
      }

      // 순환 참조 방지: 자신의 하위 팀을 부모로 설정하는 것 방지
      const isDescendant = await checkIsDescendant(teamId, input.parentId);
      if (isDescendant) {
        return {
          success: false,
          message: "하위 팀을 부모 팀으로 설정할 수 없습니다",
        };
      }

      const parentTeam = await prisma.team.findUnique({
        where: { id: input.parentId },
        select: { organizationId: true },
      });

      if (!parentTeam) {
        return { success: false, message: "부모 팀을 찾을 수 없습니다" };
      }

      if (parentTeam.organizationId !== organizationId) {
        return { success: false, message: "접근 권한이 없습니다" };
      }
    }

    // 트랜잭션으로 모든 변경 사항을 원자적으로 처리
    const updatedTeam = await prisma.$transaction(async (tx) => {
      // 1. 팀 기본 정보 업데이트
      const updated = await tx.team.update({
        where: { id: teamId },
        data: {
          ...(input.name && { name: input.name.trim() }),
          ...(input.description !== undefined && {
            description: input.description?.trim() || null,
          }),
          ...(input.parentId !== undefined && { parentId: input.parentId }),
        },
      });

      // 2. 멤버 동기화 (memberIds가 제공된 경우)
      if (input.memberIds !== undefined) {
        // 유효한 멤버만 필터링 (조직에 속한 멤버)
        const validMembers = await tx.user.findMany({
          where: {
            id: { in: input.memberIds },
            organizationId,
          },
          select: { id: true },
        });
        const validMemberIds = validMembers.map((m) => m.id);

        // 현재 팀 멤버 조회
        const currentMembers = await tx.user.findMany({
          where: { teamId },
          select: { id: true },
        });
        const currentMemberIds = currentMembers.map((m) => m.id);

        // 추가할 멤버 (input에 있지만 현재에 없는)
        const membersToAdd = validMemberIds.filter(
          (id) => !currentMemberIds.includes(id)
        );

        // 제거할 멤버 (현재에 있지만 input에 없는)
        const membersToRemove = currentMemberIds.filter(
          (id) => !validMemberIds.includes(id)
        );

        // 2-1. 추가할 멤버: 기존 팀에서 이동 시 이전 팀의 구독 배정에서 제거
        if (membersToAdd.length > 0) {
          // 추가할 멤버들의 이전 팀 정보 조회
          const usersWithPrevTeam = await tx.user.findMany({
            where: { id: { in: membersToAdd }, teamId: { not: null } },
            select: { id: true, teamId: true },
          });

          // 이전 팀의 구독에서 해당 사용자들의 배정 제거
          for (const user of usersWithPrevTeam) {
            if (user.teamId) {
              // 이전 팀에 배정된 구독 조회
              const prevTeamSubscriptions = await tx.subscription.findMany({
                where: { teamId: user.teamId },
                select: { id: true },
              });

              if (prevTeamSubscriptions.length > 0) {
                // 해당 구독들에서 사용자 배정 제거
                await tx.subscriptionUser.deleteMany({
                  where: {
                    userId: user.id,
                    subscriptionId: {
                      in: prevTeamSubscriptions.map((s) => s.id),
                    },
                  },
                });
              }
            }
          }

          // 팀 이동
          await tx.user.updateMany({
            where: { id: { in: membersToAdd } },
            data: { teamId },
          });
        }

        // 2-2. 제거할 멤버: 현재 팀의 구독 배정에서 제거
        if (membersToRemove.length > 0) {
          // 현재 팀에 배정된 구독 조회
          const teamSubscriptions = await tx.subscription.findMany({
            where: { teamId },
            select: { id: true },
          });

          if (teamSubscriptions.length > 0) {
            // 해당 구독들에서 제거될 멤버들의 배정 제거
            await tx.subscriptionUser.deleteMany({
              where: {
                userId: { in: membersToRemove },
                subscriptionId: { in: teamSubscriptions.map((s) => s.id) },
              },
            });
          }

          // 팀에서 제거
          await tx.user.updateMany({
            where: { id: { in: membersToRemove } },
            data: { teamId: null },
          });
        }
      }

      return updated;
    });

    revalidatePath("/teams");
    revalidatePath("/users");
    revalidatePath("/subscriptions");

    return { success: true, data: updatedTeam, message: "팀이 수정되었습니다" };
  } catch (error) {
    logger.error({ err: error }, "팀 수정 오류");
    if (isRedirectError(error)) throw error;
    return { success: false, message: "팀 수정에 실패했습니다" };
  }
}
export const updateTeam = withLogging("updateTeam", _updateTeam);

/**
 * 순환 참조 체크: targetId가 teamId의 하위 팀인지 확인
 */
async function checkIsDescendant(
  teamId: string,
  targetId: string
): Promise<boolean> {
  const children = await prisma.team.findMany({
    where: { parentId: teamId },
    select: { id: true },
  });

  for (const child of children) {
    if (child.id === targetId) {
      return true;
    }
    const isDescendant = await checkIsDescendant(child.id, targetId);
    if (isDescendant) {
      return true;
    }
  }

  return false;
}

/**
 * 팀 삭제 시 영향도 조회
 */
export interface TeamImpact {
  memberCount: number; // 영향 받는 멤버 수
  appCount: number; // 배정된 앱 수 (AppTeam)
  subscriptionCount: number; // 담당 구독 수
  cardCount: number; // 소속 법인카드 수
  childTeamCount: number; // 하위 팀 수
  paymentRecordCount: number; // SMP-78: 배정된 결제 내역 수
}

export async function getTeamImpact(
  teamId: string
): Promise<ActionState<TeamImpact>> {
  try {
    const { organizationId } = await requireOrganization();

    // 팀 존재 여부 및 권한 확인
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { organizationId: true },
    });

    if (!team) {
      return { success: false, message: "팀을 찾을 수 없습니다" };
    }

    if (team.organizationId !== organizationId) {
      return { success: false, message: "접근 권한이 없습니다" };
    }

    // 병렬로 영향도 조회 (SMP-78: paymentRecordCount 추가)
    const [
      memberCount,
      appCount,
      subscriptionCount,
      cardCount,
      childTeamCount,
      paymentRecordCount,
    ] = await Promise.all([
      prisma.user.count({ where: { teamId } }),
      prisma.appTeam.count({ where: { teamId } }),
      prisma.subscription.count({ where: { teamId } }),
      prisma.corporateCard.count({ where: { teamId } }),
      prisma.team.count({ where: { parentId: teamId } }),
      prisma.paymentRecord.count({ where: { teamId } }),
    ]);

    return {
      success: true,
      data: {
        memberCount,
        appCount,
        subscriptionCount,
        cardCount,
        childTeamCount,
        paymentRecordCount,
      },
    };
  } catch (error) {
    logger.error({ err: error }, "팀 영향도 조회 오류");
    if (isRedirectError(error)) throw error;
    return { success: false, message: "팀 영향도를 불러오는 데 실패했습니다" };
  }
}

/**
 * 팀 삭제 (수동 생성된 팀만)
 */
async function _deleteTeam(teamId: string): Promise<ActionState> {
  try {
    const { organizationId, role } = await requireOrganization();

    if (role !== "ADMIN") {
      return { success: false, message: "관리자 권한이 필요합니다" };
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { organizationId: true, googleOrgUnitId: true },
    });

    if (!team) {
      return { success: false, message: "팀을 찾을 수 없습니다" };
    }

    if (team.organizationId !== organizationId) {
      return { success: false, message: "접근 권한이 없습니다" };
    }

    // Google Workspace에서 동기화된 팀은 삭제 불가
    if (team.googleOrgUnitId) {
      return {
        success: false,
        message:
          "Google Workspace에서 동기화된 팀은 삭제할 수 없습니다. Google Admin Console에서 OU를 삭제하세요.",
      };
    }

    await prisma.team.delete({
      where: { id: teamId },
    });

    revalidatePath("/teams");

    return { success: true, message: "팀이 삭제되었습니다" };
  } catch (error) {
    logger.error({ err: error }, "팀 삭제 오류");
    if (isRedirectError(error)) throw error;
    return { success: false, message: "팀 삭제에 실패했습니다" };
  }
}
export const deleteTeam = withLogging("deleteTeam", _deleteTeam);

/**
 * 팀 통계 조회 (대시보드용)
 */
export async function getTeamStats(): Promise<
  ActionState<{
    totalTeams: number;
    teamsWithMembers: number;
    avgMembersPerTeam: number;
    maxDepth: number;
  }>
> {
  try {
    const { organizationId } = await requireOrganization();

    const teams = await prisma.team.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    const totalTeams = teams.length;
    const teamsWithMembers = teams.filter((t) => t._count.members > 0).length;
    const totalMembers = teams.reduce((sum, t) => sum + t._count.members, 0);
    const avgMembersPerTeam =
      totalTeams > 0 ? Math.round((totalMembers / totalTeams) * 10) / 10 : 0;

    // 최대 깊이 계산 (googleOrgUnitPath의 슬래시 개수)
    const maxDepth = teams.reduce((max, team) => {
      if (!team.googleOrgUnitPath) return max;
      const depth = (team.googleOrgUnitPath.match(/\//g) || []).length;
      return Math.max(max, depth);
    }, 0);

    return {
      success: true,
      data: {
        totalTeams,
        teamsWithMembers,
        avgMembersPerTeam,
        maxDepth,
      },
    };
  } catch (error) {
    logger.error({ err: error }, "팀 통계 조회 오류");
    if (isRedirectError(error)) throw error;
    return { success: false, message: "팀 통계를 불러오는 데 실패했습니다" };
  }
}

/**
 * 사용자를 팀에 할당 (수동)
 */
async function _assignUserToTeam(
  userId: string,
  teamId: string | null
): Promise<ActionState> {
  try {
    const { organizationId, role } = await requireOrganization();

    if (role !== "ADMIN") {
      return { success: false, message: "관리자 권한이 필요합니다" };
    }

    // 사용자 확인
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (!user) {
      return { success: false, message: "사용자를 찾을 수 없습니다" };
    }

    if (user.organizationId !== organizationId) {
      return { success: false, message: "접근 권한이 없습니다" };
    }

    // 팀 확인 (teamId가 있는 경우)
    if (teamId) {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { organizationId: true },
      });

      if (!team) {
        return { success: false, message: "팀을 찾을 수 없습니다" };
      }

      if (team.organizationId !== organizationId) {
        return { success: false, message: "접근 권한이 없습니다" };
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { teamId },
    });

    revalidatePath("/teams");
    revalidatePath("/users");

    return {
      success: true,
      message: teamId ? "팀에 할당되었습니다" : "팀에서 제외되었습니다",
    };
  } catch (error) {
    logger.error({ err: error }, "사용자 팀 할당 오류");
    if (isRedirectError(error)) throw error;
    return { success: false, message: "사용자 팀 할당에 실패했습니다" };
  }
}
export const assignUserToTeam = withLogging(
  "assignUserToTeam",
  _assignUserToTeam
);
