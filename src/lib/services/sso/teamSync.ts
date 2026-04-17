// src/lib/services/sso/teamSync.ts
/**
 * Google Workspace OU -> Team 동기화 서비스
 * Organizational Unit을 Team 테이블에 계층 구조로 저장
 */

import { prisma } from "@/lib/db";
import type { GoogleOrgUnit, SyncError, TeamSyncResult } from "@/types/sso";
import type { Integration, Team } from "@prisma/client";
import type { GoogleWorkspaceService } from "./googleWorkspace";

/**
 * OU를 부모-자식 순서로 정렬 (부모가 먼저 오도록)
 * 루트 OU("/")는 제외하고, 부모 경로가 짧은 것부터 정렬
 */
function sortOrgUnitsByHierarchy(orgUnits: GoogleOrgUnit[]): GoogleOrgUnit[] {
  // 루트 OU는 제외 (경로가 "/" 또는 빈 문자열인 경우)
  const filtered = orgUnits.filter(
    (ou) => ou.orgUnitPath && ou.orgUnitPath !== "/"
  );

  // 경로 깊이(슬래시 개수)로 정렬 - 부모가 먼저
  return filtered.sort((a, b) => {
    const depthA = (a.orgUnitPath.match(/\//g) || []).length;
    const depthB = (b.orgUnitPath.match(/\//g) || []).length;
    if (depthA !== depthB) {
      return depthA - depthB;
    }
    // 같은 깊이면 경로 알파벳순
    return a.orgUnitPath.localeCompare(b.orgUnitPath);
  });
}

/**
 * 부모 Team ID 찾기
 * @param parentOrgUnitPath 부모 OU 경로
 * @param organizationId 조직 ID
 * @param teamCache 이미 생성/조회된 팀 캐시
 */
async function findParentTeamId(
  parentOrgUnitPath: string | undefined,
  organizationId: string,
  teamCache: Map<string, string>
): Promise<string | null> {
  if (!parentOrgUnitPath || parentOrgUnitPath === "/") {
    return null;
  }

  // 캐시에서 먼저 확인
  const cachedId = teamCache.get(parentOrgUnitPath);
  if (cachedId) {
    return cachedId;
  }

  // DB에서 조회
  const parentTeam = await prisma.team.findFirst({
    where: {
      organizationId,
      googleOrgUnitPath: parentOrgUnitPath,
    },
    select: { id: true },
  });

  if (parentTeam) {
    teamCache.set(parentOrgUnitPath, parentTeam.id);
    return parentTeam.id;
  }

  return null;
}

/**
 * Google Workspace OU를 Team으로 동기화
 */
export async function syncTeamsFromGoogle(
  integration: Integration,
  googleService: GoogleWorkspaceService,
  organizationId: string
): Promise<TeamSyncResult> {
  const startTime = Date.now();
  const errors: SyncError[] = [];
  let itemsFound = 0;
  let itemsCreated = 0;
  let itemsUpdated = 0;

  try {
    // 1. Google에서 모든 OU 조회
    const googleOrgUnits = await googleService.listOrgUnits();
    itemsFound = googleOrgUnits.length;

    // 2. 부모-자식 순서로 정렬
    const sortedOrgUnits = sortOrgUnitsByHierarchy(googleOrgUnits);

    // 3. 팀 캐시 (orgUnitPath -> teamId)
    const teamCache = new Map<string, string>();

    // 4. 기존 팀 조회하여 캐시에 추가
    const existingTeams = await prisma.team.findMany({
      where: { organizationId },
      select: { id: true, googleOrgUnitPath: true },
    });
    existingTeams.forEach((team) => {
      if (team.googleOrgUnitPath) {
        teamCache.set(team.googleOrgUnitPath, team.id);
      }
    });

    // 5. 각 OU를 Team으로 upsert
    for (const orgUnit of sortedOrgUnits) {
      try {
        const parentId = await findParentTeamId(
          orgUnit.parentOrgUnitPath,
          organizationId,
          teamCache
        );

        const teamData = {
          name: orgUnit.name,
          description: orgUnit.description || null,
          googleOrgUnitId: orgUnit.orgUnitId,
          googleOrgUnitPath: orgUnit.orgUnitPath,
          parentId,
          organizationId,
        };

        // upsert 실행
        const result = await prisma.team.upsert({
          where: {
            organizationId_googleOrgUnitPath: {
              organizationId,
              googleOrgUnitPath: orgUnit.orgUnitPath,
            },
          },
          create: teamData,
          update: {
            name: orgUnit.name,
            description: orgUnit.description || null,
            parentId,
          },
        });

        // 캐시 업데이트
        teamCache.set(orgUnit.orgUnitPath, result.id);

        // 생성/업데이트 카운트
        if (
          existingTeams.some((t) => t.googleOrgUnitPath === orgUnit.orgUnitPath)
        ) {
          itemsUpdated++;
        } else {
          itemsCreated++;
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "알 수 없는 오류";
        errors.push({
          code: "TEAM_SYNC_ERROR",
          message: errorMessage,
          entity: "Team",
          entityId: orgUnit.orgUnitPath,
          timestamp: new Date(),
        });
      }
    }

    const duration = Date.now() - startTime;

    return {
      status: errors.length > 0 ? "PARTIAL" : "SUCCESS",
      itemsFound,
      itemsCreated,
      itemsUpdated,
      errors,
      duration,
    };
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "알 수 없는 오류";

    return {
      status: "FAILED",
      itemsFound,
      itemsCreated,
      itemsUpdated,
      errors: [
        {
          code: "SYNC_FAILED",
          message: errorMessage,
          timestamp: new Date(),
        },
      ],
      duration,
    };
  }
}

/**
 * 조직의 모든 팀을 트리 구조로 조회
 */
export async function getTeamTree(organizationId: string): Promise<Team[]> {
  return prisma.team.findMany({
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
}

/**
 * orgUnitPath로 팀 ID 매핑 조회
 */
export async function getTeamPathMap(
  organizationId: string
): Promise<Map<string, string>> {
  const teams = await prisma.team.findMany({
    where: { organizationId },
    select: { id: true, googleOrgUnitPath: true },
  });

  const map = new Map<string, string>();
  teams.forEach((team) => {
    if (team.googleOrgUnitPath) {
      map.set(team.googleOrgUnitPath, team.id);
    }
  });

  return map;
}
