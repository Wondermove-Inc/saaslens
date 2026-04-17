// src/lib/services/sso/userSync.ts
/**
 * Google Workspace 사용자 동기화 서비스
 * Google Workspace 사용자를 DB User 테이블과 동기화
 *
 * pgbouncer 호환: 긴 트랜잭션 대신 개별 쿼리 사용
 */

import { prisma } from "@/lib/db";
import type {
  GoogleWorkspaceUser,
  SyncError,
  SyncResult,
  UserSyncOptions,
} from "@/types/sso";
import type { Integration, Prisma, UserStatus } from "@prisma/client";
import { GoogleWorkspaceService } from "./googleWorkspace";

/**
 * Google Workspace 사용자를 DB User 형식으로 매핑
 * @param teamMap orgUnitPath -> teamId 매핑 (선택)
 */
export function mapGoogleUserToDbUser(
  googleUser: GoogleWorkspaceUser,
  organizationId: string,
  teamMap?: Map<string, string>
): {
  email: string;
  name: string;
  image?: string;
  employeeId: string;
  department?: string;
  jobTitle?: string;
  status: UserStatus;
  organizationId: string;
  lastLoginAt?: Date;
  isGoogleAdmin: boolean;
  teamId?: string;
  /** Manager 이메일 (2차 패스에서 사용) */
  _managerEmail?: string;
} {
  // 주요 조직 정보 추출
  const primaryOrg =
    googleUser.organizations?.find((o) => o.primary) ||
    googleUser.organizations?.[0];

  // Manager 이메일 추출
  const managerRelation = googleUser.relations?.find(
    (r) => r.type === "manager"
  );

  // Team ID 조회 (orgUnitPath 기반)
  const teamId =
    teamMap && googleUser.orgUnitPath
      ? teamMap.get(googleUser.orgUnitPath)
      : undefined;

  return {
    email: googleUser.primaryEmail,
    name: googleUser.name.fullName,
    image: googleUser.thumbnailPhotoUrl,
    employeeId: googleUser.id,
    department: primaryOrg?.department || googleUser.orgUnitPath,
    jobTitle: primaryOrg?.title,
    status: googleUser.suspended ? "TERMINATED" : "ACTIVE",
    organizationId,
    lastLoginAt: googleUser.lastLoginTime
      ? new Date(googleUser.lastLoginTime)
      : undefined,
    isGoogleAdmin: googleUser.isAdmin || false,
    teamId,
    _managerEmail: managerRelation?.value,
  };
}

/**
 * Google Workspace에서 사용자 동기화
 * pgbouncer 호환: 트랜잭션을 최소화하고 개별 쿼리로 처리
 * @param teamMap orgUnitPath -> teamId 매핑 (선택, Team 동기화 후 전달)
 */
export async function syncUsersFromGoogle(
  integration: Integration,
  googleService: GoogleWorkspaceService,
  options: UserSyncOptions = {},
  teamMap?: Map<string, string>
): Promise<SyncResult> {
  const {
    createNew = true,
    updateExisting = true,
    detectTerminated = true,
    orgUnitPath,
  } = options;

  const startTime = Date.now();
  const errors: SyncError[] = [];
  let itemsFound = 0;
  let itemsCreated = 0;
  let itemsUpdated = 0;
  let syncLogId: string | undefined;

  // Manager 관계 설정을 위한 매핑 (email -> managerEmail)
  const managerRelations: Map<string, string> = new Map();

  try {
    // 1. 동기화 시작 로그 생성 (단일 쿼리)
    const syncLog = await prisma.syncLog.create({
      data: {
        integrationId: integration.id,
        status: "RUNNING",
        startedAt: new Date(),
        itemsFound: 0,
        itemsCreated: 0,
        itemsUpdated: 0,
      },
    });
    syncLogId = syncLog.id;

    // 2. Google Workspace에서 사용자 목록 조회
    const googleUsers = await googleService.listUsers(orgUnitPath);
    itemsFound = googleUsers.length;

    // 3. 1차 패스: 각 사용자 개별 처리 (트랜잭션 없이)
    for (const googleUser of googleUsers) {
      try {
        const userData = mapGoogleUserToDbUser(
          googleUser,
          integration.organizationId,
          teamMap
        );

        // Manager 관계 저장 (2차 패스에서 처리)
        if (userData._managerEmail) {
          managerRelations.set(userData.email, userData._managerEmail);
        }

        if (createNew || updateExisting) {
          // upsert: 없으면 생성, 있으면 업데이트
          const existingUser = await prisma.user.findUnique({
            where: { email: userData.email },
          });

          if (!existingUser && createNew) {
            await prisma.user.create({
              data: {
                email: userData.email,
                name: userData.name,
                image: userData.image,
                employeeId: userData.employeeId,
                department: userData.department,
                jobTitle: userData.jobTitle,
                status: userData.status,
                organizationId: userData.organizationId,
                lastLoginAt: userData.lastLoginAt,
                isGoogleAdmin: userData.isGoogleAdmin,
                teamId: userData.teamId,
                role: "MEMBER",
              },
            });
            itemsCreated++;
          } else if (existingUser && updateExisting) {
            // 조직 ID가 일치하는 경우만 업데이트
            if (existingUser.organizationId === integration.organizationId) {
              const updateData: Prisma.UserUncheckedUpdateInput = {
                name: userData.name,
                image: userData.image,
                employeeId: userData.employeeId,
                department: userData.department,
                jobTitle: userData.jobTitle,
                lastLoginAt: userData.lastLoginAt,
                isGoogleAdmin: userData.isGoogleAdmin,
                teamId: userData.teamId,
              };

              // 퇴사자 감지가 활성화된 경우에만 상태 업데이트
              if (detectTerminated) {
                updateData.status = userData.status;
                if (userData.status === "TERMINATED") {
                  updateData.terminatedAt = new Date();
                }
              }

              await prisma.user.update({
                where: { id: existingUser.id },
                data: updateData,
              });
              itemsUpdated++;
            }
          }
        }
      } catch (userError) {
        errors.push({
          code: "USER_SYNC_ERROR",
          message:
            userError instanceof Error ? userError.message : "Unknown error",
          entity: "User",
          entityId: googleUser.primaryEmail,
        });
      }
    }

    // 4. 2차 패스: Manager 관계 설정 (개별 쿼리)
    for (const [userEmail, managerEmail] of managerRelations) {
      try {
        // Manager 조회
        const manager = await prisma.user.findFirst({
          where: {
            email: managerEmail,
            organizationId: integration.organizationId,
          },
          select: { id: true },
        });

        if (manager) {
          await prisma.user.updateMany({
            where: {
              organizationId: integration.organizationId,
              email: userEmail,
            },
            data: { managerId: manager.id },
          });
        }
      } catch (managerError) {
        // Manager 관계 설정 실패는 에러로 기록하지만 동기화는 계속 진행
        console.warn(
          `Manager 관계 설정 실패: ${userEmail} -> ${managerEmail}`,
          managerError
        );
      }
    }

    // 5. 동기화 완료 로그 업데이트 (단일 쿼리)
    const finalStatus = errors.length > 0 ? "PARTIAL" : "SUCCESS";
    await prisma.syncLog.update({
      where: { id: syncLogId },
      data: {
        status: finalStatus,
        itemsFound,
        itemsCreated,
        itemsUpdated,
        errors:
          errors.length > 0 ? JSON.parse(JSON.stringify(errors)) : undefined,
        completedAt: new Date(),
      },
    });

    // 6. Integration 마지막 동기화 시간 업데이트 (단일 쿼리)
    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        lastSyncAt: new Date(),
        lastError: errors.length > 0 ? errors[0].message : null,
        status: "ACTIVE",
      },
    });

    return {
      status: finalStatus as "PARTIAL" | "SUCCESS",
      itemsFound,
      itemsCreated,
      itemsUpdated,
      errors,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    // 전체 동기화 실패
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // 실패 로그 업데이트
    if (syncLogId) {
      await prisma.syncLog.update({
        where: { id: syncLogId },
        data: {
          status: "FAILED",
          errors: [{ code: "SYNC_FAILED", message: errorMessage }],
          completedAt: new Date(),
        },
      });
    }

    // Integration 에러 업데이트
    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        lastError: errorMessage,
        status: "ERROR",
      },
    });

    return {
      status: "FAILED",
      itemsFound: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      errors: [
        {
          code: "SYNC_FAILED",
          message: errorMessage,
        },
      ],
      duration: Date.now() - startTime,
    };
  }
}
