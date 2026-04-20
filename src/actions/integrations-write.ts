// src/actions/integrations-write.ts
"use server";

/**
 * Integration 생성/수정/삭제 관련 Server Actions
 */

import { getCachedSession, requireOrganization } from "@/lib/auth/require-auth";
import { decryptJson, encryptJson } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import {
  getERPAdapter,
  isERPIntegrationType,
  type ERPCredentials,
} from "@/lib/services/erp";
import { fullGoogleWorkspaceSync } from "@/lib/services/sso/googleSync";
import { GoogleWorkspaceService } from "@/lib/services/sso/googleWorkspace";
import type { ActionState } from "@/types";
import type {
  CreateIntegrationInput,
  FullSyncResult,
  IntegrationCredentials,
} from "@/types/sso";
import type { Integration, IntegrationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import type { IntegrationSettingsInput } from "./integrations.types";
import { isRedirectError } from "./integrations.types";

/**
 * 새 Integration 생성
 */
async function _createIntegration(
  input: CreateIntegrationInput
): Promise<ActionState<{ integration: Integration }>> {
  try {
    const session = await getCachedSession();
    if (!session?.user?.id) {
      return { success: false, message: "인증이 필요합니다" };
    }
    if (!session.user.organizationId) {
      return { success: false, message: "조직에 속해 있어야 합니다" };
    }

    const organizationId = session.user.organizationId;

    // 중복 체크
    const existing = await prisma.integration.findFirst({
      where: {
        organizationId,
        type: input.type,
      },
    });

    if (existing) {
      return {
        success: false,
        message: "이미 동일한 유형의 연동이 존재합니다",
      };
    }

    // Google Workspace인 경우 Private Key 정규화 및 연결 테스트
    let normalizedCredentials = input.credentials;
    if (input.type === "GOOGLE_WORKSPACE") {
      const creds = input.credentials as IntegrationCredentials;

      // Private Key 정규화:
      // 1. 앞뒤 공백 제거
      // 2. 앞뒤 따옴표 제거 (JSON에서 복사 시 포함될 수 있음)
      // 3. \n 문자열을 실제 줄바꿈으로 변환
      let normalizedPrivateKey = creds.privateKey?.trim();
      if (normalizedPrivateKey) {
        // 앞뒤 따옴표 제거 (", ')
        normalizedPrivateKey = normalizedPrivateKey.replace(/^["']|["']$/g, "");
        // \n 이스케이프 문자열을 실제 줄바꿈으로 변환
        normalizedPrivateKey = normalizedPrivateKey.replace(/\\n/g, "\n");
      }

      normalizedCredentials = {
        ...creds,
        privateKey: normalizedPrivateKey,
      };

      if (
        creds.serviceAccountEmail &&
        normalizedPrivateKey &&
        creds.adminEmail
      ) {
        try {
          logger.info("[Integration] Google Workspace 연결 테스트 시작...");
          logger.info(
            "[Integration] clientEmail: %s",
            creds.serviceAccountEmail
          );
          logger.info("[Integration] subject: %s", creds.adminEmail);
          logger.info(
            "[Integration] privateKey 시작: %s",
            normalizedPrivateKey?.substring(0, 50)
          );

          const service = new GoogleWorkspaceService({
            clientEmail: creds.serviceAccountEmail,
            privateKey: normalizedPrivateKey,
            subject: creds.adminEmail,
          });
          const connected = await service.testConnection();
          logger.info("[Integration] 연결 테스트 결과: %s", connected);

          if (!connected) {
            return {
              success: false,
              message: "Google Workspace 연결 테스트 실패",
            };
          }
        } catch (error) {
          logger.error(
            { err: error },
            "[Integration] Google Workspace 연결 테스트 에러"
          );
          const errorMessage =
            error instanceof Error ? error.message : "알 수 없는 오류";
          return {
            success: false,
            message: `Google Workspace 연결 실패: ${errorMessage}`,
          };
        }
      }
    }

    // DA-98: ERP 타입일 때 인증 정보 암호화 + 연결 테스트
    if (isERPIntegrationType(input.type)) {
      const erpCreds = normalizedCredentials as ERPCredentials;
      const adapter = getERPAdapter(input.type);

      if (adapter) {
        try {
          const connected = await adapter.testConnection(erpCreds);
          if (!connected) {
            return {
              success: false,
              message: `${adapter.name} 연결 테스트 실패`,
            };
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "알 수 없는 오류";
          return {
            success: false,
            message: `${adapter.name} 연결 실패: ${errorMessage}`,
          };
        }
      }

      // ERP 크리덴셜은 암호화하여 저장
      normalizedCredentials = {
        encrypted: encryptJson(erpCreds),
        type: input.type,
      } as unknown as typeof normalizedCredentials;
    }

    const integration = await prisma.integration.create({
      data: {
        organizationId,
        type: input.type,
        status: "PENDING",
        credentials: normalizedCredentials as object,
        metadata: (input.metadata || {}) as object,
      },
    });

    revalidatePath("/settings/integrations");

    return { success: true, data: { integration } };
  } catch (error) {
    logger.error({ err: error }, "Integration 생성 오류");
    if (isRedirectError(error)) throw error;
    return {
      success: false,
      message: "연동 생성 중 오류가 발생했습니다",
    };
  }
}
export const createIntegration = withLogging(
  "createIntegration",
  _createIntegration
);

/**
 * Integration 상태 업데이트
 */
async function _updateIntegrationStatus(
  integrationId: string,
  status: IntegrationStatus
): Promise<ActionState> {
  try {
    const session = await getCachedSession();
    if (!session?.user?.organizationId) {
      return { success: false, message: "인증이 필요합니다" };
    }

    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      return { success: false, message: "연동을 찾을 수 없습니다" };
    }

    if (integration.organizationId !== session.user.organizationId) {
      return { success: false, message: "접근 권한이 없습니다" };
    }

    await prisma.integration.update({
      where: { id: integrationId },
      data: { status },
    });

    revalidatePath("/settings/integrations");

    return { success: true };
  } catch (error) {
    logger.error({ err: error }, "Integration 상태 업데이트 오류");
    if (isRedirectError(error)) throw error;
    return {
      success: false,
      message: "연동 상태 업데이트 중 오류가 발생했습니다",
    };
  }
}
export const updateIntegrationStatus = withLogging(
  "updateIntegrationStatus",
  _updateIntegrationStatus
);

/**
 * Integration 삭제
 */
async function _deleteIntegration(integrationId: string): Promise<ActionState> {
  try {
    const { organizationId, role } = await requireOrganization();

    if (role !== "ADMIN") {
      return { success: false, message: "관리자 권한이 필요합니다" };
    }

    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      return { success: false, message: "연동을 찾을 수 없습니다" };
    }

    if (integration.organizationId !== organizationId) {
      return { success: false, message: "접근 권한이 없습니다" };
    }

    await prisma.integration.delete({
      where: { id: integrationId },
    });

    revalidatePath("/settings/integrations");

    return { success: true };
  } catch (error) {
    logger.error({ err: error }, "Integration 삭제 오류");
    if (isRedirectError(error)) throw error;
    return {
      success: false,
      message: "연동 삭제 중 오류가 발생했습니다",
    };
  }
}
export const deleteIntegration = withLogging(
  "deleteIntegration",
  _deleteIntegration
);

/**
 * 즉시 동기화 실행 (Team + User 전체 동기화)
 */
async function _syncIntegrationNow(
  integrationId: string
): Promise<ActionState<{ result: FullSyncResult }>> {
  try {
    const { organizationId, role } = await requireOrganization();

    if (role !== "ADMIN") {
      return { success: false, message: "관리자 권한이 필요합니다" };
    }

    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      return { success: false, message: "연동을 찾을 수 없습니다" };
    }

    if (integration.organizationId !== organizationId) {
      return { success: false, message: "접근 권한이 없습니다" };
    }

    if (integration.type === "GOOGLE_WORKSPACE") {
      // Google Workspace 전체 동기화 (Team + User)
      const result = await fullGoogleWorkspaceSync(integrationId);

      revalidatePath("/settings/integrations");
      revalidatePath("/users");
      revalidatePath("/teams");

      return { success: true, data: { result } };
    }

    // DA-100: ERP 수동 동기화
    if (isERPIntegrationType(integration.type)) {
      const adapter = getERPAdapter(integration.type);
      if (!adapter) {
        return { success: false, message: "지원하지 않는 ERP 유형입니다" };
      }

      // 크리덴셜 복호화
      const creds = integration.credentials as { encrypted?: string };
      if (!creds.encrypted) {
        return { success: false, message: "ERP 인증 정보가 없습니다" };
      }
      const erpCredentials = decryptJson<ERPCredentials>(creds.encrypted);

      // 최근 30일 데이터 동기화
      const now = new Date();
      const fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const syncResult = await adapter.fetchPayments(erpCredentials, {
        fromDate,
        toDate: now,
      });

      // SyncLog 기록
      await prisma.syncLog.create({
        data: {
          integrationId,
          status: syncResult.success ? "SUCCESS" : "FAILED",
          itemsFound: syncResult.totalCount,
          itemsCreated: syncResult.items.length,
          itemsUpdated: 0,
          errors: syncResult.errorMessage
            ? ([{ message: syncResult.errorMessage }] as object[])
            : [],
          startedAt: now,
          completedAt: new Date(),
        },
      });

      await prisma.integration.update({
        where: { id: integrationId },
        data: {
          lastSyncAt: new Date(),
          status: syncResult.success ? "ACTIVE" : "ERROR",
          lastError: syncResult.errorMessage || null,
        },
      });

      revalidatePath("/settings/integrations");
      revalidatePath("/payments");

      return {
        success: syncResult.success,
        data: {
          result: {
            teamResult: { created: 0, updated: 0, deleted: 0, errors: [] },
            userResult: {
              created: syncResult.totalCount,
              updated: 0,
              deactivated: 0,
              errors: syncResult.errorMessage ? [syncResult.errorMessage] : [],
            },
            totalDuration: 0,
          } as unknown as FullSyncResult,
        },
        message: syncResult.success
          ? `${syncResult.totalCount}건의 ERP 결제 데이터를 동기화했습니다`
          : syncResult.errorMessage,
      };
    }

    return {
      success: false,
      message: "지원하지 않는 연동 유형입니다",
    };
  } catch (error) {
    logger.error({ err: error }, "Integration 동기화 오류");
    if (isRedirectError(error)) throw error;
    return {
      success: false,
      message: "연동 동기화 중 오류가 발생했습니다",
    };
  }
}
export const syncIntegrationNow = withLogging(
  "syncIntegrationNow",
  _syncIntegrationNow
);

/**
 * Integration 설정 업데이트 (metadata 내 설정 값)
 */
async function _updateIntegrationSettings(
  integrationId: string,
  settings: IntegrationSettingsInput
): Promise<ActionState> {
  try {
    const session = await getCachedSession();
    if (!session?.user?.organizationId) {
      return { success: false, message: "인증이 필요합니다" };
    }

    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      return { success: false, message: "연동을 찾을 수 없습니다" };
    }

    if (integration.organizationId !== session.user.organizationId) {
      return { success: false, message: "접근 권한이 없습니다" };
    }

    // 기존 metadata와 병합
    const existingMetadata =
      (integration.metadata as Record<string, unknown>) || {};
    const updatedMetadata = {
      ...existingMetadata,
      ...settings,
    };

    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        metadata: updatedMetadata,
      },
    });

    revalidatePath("/settings/integrations");
    revalidatePath(`/integrations/${integrationId}`);

    return { success: true };
  } catch (error) {
    logger.error({ err: error }, "Integration 설정 업데이트 오류");
    if (isRedirectError(error)) throw error;
    return {
      success: false,
      message: "연동 설정 업데이트 중 오류가 발생했습니다",
    };
  }
}
export const updateIntegrationSettings = withLogging(
  "updateIntegrationSettings",
  _updateIntegrationSettings
);
