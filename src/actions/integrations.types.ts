// src/actions/integrations.types.ts
/**
 * Integration 관련 타입 정의 및 유틸리티
 */

import type { IntegrationStatus } from "@prisma/client";

/**
 * Integration 목록 조회 파라미터
 */
export interface GetIntegrationsParams {
  filter?: {
    status?: IntegrationStatus;
    type?: string;
    search?: string;
  };
  sort?: {
    sortBy?: "createdAt" | "updatedAt" | "type";
    sortOrder?: "asc" | "desc";
  };
  page?: number;
  limit?: number;
}

/**
 * 동기화 로그 엔트리
 */
export interface SyncLogEntry {
  id: string;
  status: "RUNNING" | "SUCCESS" | "PARTIAL" | "FAILED";
  itemsFound: number;
  itemsCreated: number;
  itemsUpdated: number;
  errors: Array<{ code: string; message: string }> | null;
  startedAt: string; // ISO 8601 문자열
  completedAt: string | null; // ISO 8601 문자열
}

/**
 * Integration 설정 입력
 */
export interface IntegrationSettingsInput {
  autoSync?: boolean;
  syncInterval?: "hourly" | "daily" | "weekly";
  syncUsers?: boolean;
  syncApps?: boolean;
}

/**
 * Next.js redirect 에러 체크 유틸리티
 */
export function isRedirectError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    ((error as { digest: string }).digest.includes("NEXT_REDIRECT") ||
      (error as { digest: string }).digest.includes("NEXT_NOT_FOUND"))
  );
}
