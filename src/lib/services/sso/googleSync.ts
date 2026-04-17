// src/lib/services/sso/googleSync.ts
/**
 * Google Workspace 전체 동기화 서비스
 * Team (OU) 동기화 + User 동기화를 통합 실행
 */

import { prisma } from "@/lib/db";
import type {
  FullSyncResult,
  IntegrationCredentials,
  SyncError,
} from "@/types/sso";
import { GoogleWorkspaceService } from "./googleWorkspace";
import { getTeamPathMap, syncTeamsFromGoogle } from "./teamSync";
import { syncUsersFromGoogle } from "./userSync";

/**
 * Integration 자격증명으로 GoogleWorkspaceService 생성
 */
function createServiceFromCredentials(
  credentials: IntegrationCredentials
): GoogleWorkspaceService {
  if (
    !credentials.serviceAccountEmail ||
    !credentials.privateKey ||
    !credentials.adminEmail
  ) {
    throw new Error("Google Workspace 자격증명이 올바르지 않습니다");
  }

  return new GoogleWorkspaceService({
    clientEmail: credentials.serviceAccountEmail,
    privateKey: credentials.privateKey.replace(/\\n/g, "\n"),
    subject: credentials.adminEmail,
  });
}

/**
 * Google Workspace 전체 동기화 실행
 * 순서: Team (OU) 동기화 → User 동기화 (Team 매핑 포함)
 */
export async function fullGoogleWorkspaceSync(
  integrationId: string
): Promise<FullSyncResult> {
  const startTime = Date.now();
  const errors: SyncError[] = [];

  // 1. Integration 조회
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
  });

  if (!integration) {
    throw new Error(`Integration을 찾을 수 없습니다: ${integrationId}`);
  }

  if (integration.type !== "GOOGLE_WORKSPACE") {
    throw new Error(
      `Google Workspace Integration이 아닙니다: ${integration.type}`
    );
  }

  // 2. Google Service 생성
  const credentials = integration.credentials as IntegrationCredentials;
  const googleService = createServiceFromCredentials(credentials);

  // 3. 연결 테스트
  const isConnected = await googleService.testConnection();
  if (!isConnected) {
    throw new Error("Google Workspace 연결에 실패했습니다");
  }

  // 4. Team (OU) 동기화
  const teamResult = await syncTeamsFromGoogle(
    integration,
    googleService,
    integration.organizationId
  );

  if (teamResult.errors.length > 0) {
    errors.push(...teamResult.errors);
  }

  // 5. Team 매핑 조회 (User 동기화에 사용)
  const teamMap = await getTeamPathMap(integration.organizationId);

  // 6. User 동기화 (Team 매핑 포함)
  const userResult = await syncUsersFromGoogle(
    integration,
    googleService,
    {
      createNew: true,
      updateExisting: true,
      detectTerminated: true,
    },
    teamMap
  );

  if (userResult.errors.length > 0) {
    errors.push(...userResult.errors);
  }

  // 7. Integration 상태 업데이트
  await prisma.integration.update({
    where: { id: integrationId },
    data: {
      lastSyncAt: new Date(),
      lastError: errors.length > 0 ? errors[0].message : null,
      status: errors.length > 0 ? "ERROR" : "ACTIVE",
    },
  });

  const totalDuration = Date.now() - startTime;

  return {
    teamResult,
    userResult,
    totalDuration,
  };
}

/**
 * 특정 조직의 Google Workspace 연동 상태 확인
 */
export async function checkGoogleWorkspaceConnection(
  organizationId: string
): Promise<{
  connected: boolean;
  integration?: { id: string; status: string };
}> {
  const integration = await prisma.integration.findFirst({
    where: {
      organizationId,
      type: "GOOGLE_WORKSPACE",
    },
    select: {
      id: true,
      status: true,
      credentials: true,
    },
  });

  if (!integration) {
    return { connected: false };
  }

  try {
    const credentials = integration.credentials as IntegrationCredentials;
    const googleService = createServiceFromCredentials(credentials);
    const isConnected = await googleService.testConnection();

    return {
      connected: isConnected,
      integration: {
        id: integration.id,
        status: integration.status,
      },
    };
  } catch {
    return {
      connected: false,
      integration: {
        id: integration.id,
        status: integration.status,
      },
    };
  }
}
