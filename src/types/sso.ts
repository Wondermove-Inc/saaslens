// src/types/sso.ts
/**
 * SSO 연동 관련 타입 정의
 * Google Workspace Admin SDK 연동에 사용
 */

import type {
  IntegrationStatus,
  IntegrationType,
  SyncStatus,
} from "@prisma/client";

// ==================== Google Workspace Types ====================

/**
 * Google Workspace 사용자 정보
 * Admin SDK Directory API 응답 기반
 */
export interface GoogleWorkspaceUser {
  id: string;
  primaryEmail: string;
  name: {
    givenName: string;
    familyName: string;
    fullName: string;
  };
  orgUnitPath?: string;
  isAdmin: boolean;
  isDelegatedAdmin?: boolean;
  suspended: boolean;
  archived?: boolean;
  creationTime: string;
  lastLoginTime?: string;
  thumbnailPhotoUrl?: string;
  customSchemas?: Record<string, unknown>;
  /** Manager 관계 정보 */
  relations?: Array<{
    type: string; // "manager", "assistant", "custom"
    value: string; // 이메일 주소
    customType?: string;
  }>;
  /** 조직 내 직책/부서 정보 */
  organizations?: Array<{
    name?: string; // 조직명
    title?: string; // 직책 (Job Title)
    department?: string; // 부서
    location?: string; // 근무지
    primary?: boolean;
  }>;
}

/**
 * Google Workspace Organizational Unit (OU) 정보
 * Admin SDK Directory API 응답 기반
 */
export interface GoogleOrgUnit {
  /** OU 고유 ID */
  orgUnitId: string;
  /** OU 이름 (마지막 세그먼트) */
  name: string;
  /** OU 설명 */
  description?: string;
  /** OU 전체 경로 (예: "/Engineering/Frontend") */
  orgUnitPath: string;
  /** 부모 OU ID */
  parentOrgUnitId?: string;
  /** 부모 OU 경로 */
  parentOrgUnitPath?: string;
  /** 차단 상속 여부 */
  blockInheritance?: boolean;
}

/**
 * Google Workspace OAuth 토큰 정보
 * 사용자가 승인한 앱 목록 조회용
 */
export interface GoogleOAuthToken {
  clientId: string;
  displayText: string;
  kind: string;
  scopes: string[];
  userKey: string;
  etag?: string;
  nativeApp?: boolean;
  anonymous?: boolean;
}

/**
 * Google Workspace 서비스 계정 자격 증명
 */
export interface ServiceAccountCredentials {
  clientEmail: string;
  privateKey: string;
  subject: string; // 관리자 이메일 (위임용)
}

// ==================== Integration Types ====================

/**
 * Integration 생성 입력
 */
export interface CreateIntegrationInput {
  type: IntegrationType;
  credentials: IntegrationCredentials;
  metadata?: IntegrationMetadata;
}

/**
 * Integration 자격 증명 (JSON 필드)
 */
export interface IntegrationCredentials {
  // Google Workspace 서비스 계정
  serviceAccountEmail?: string;
  privateKey?: string;
  adminEmail?: string; // 위임 대상 관리자

  // OAuth 토큰 (사용자 OAuth 방식)
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

/**
 * Integration 메타데이터 (JSON 필드)
 */
export interface IntegrationMetadata {
  domain?: string;
  totalUsers?: number;
  lastUserCount?: number;
  syncFrequency?: "hourly" | "daily" | "weekly" | "monthly";
  enabledFeatures?: string[];
}

/**
 * Integration 상세 정보 (조회용)
 */
export interface IntegrationWithStats {
  id: string;
  type: IntegrationType;
  status: IntegrationStatus;
  metadata: IntegrationMetadata;
  lastSyncAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
  // 통계
  syncCount?: number;
  lastSyncResult?: SyncResult;
}

// ==================== Sync Types ====================

/**
 * 동기화 결과
 */
export interface SyncResult {
  status: SyncStatus;
  itemsFound: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsSkipped?: number;
  errors: SyncError[];
  duration?: number; // 밀리초
}

/**
 * Team 동기화 결과 (OU -> Team)
 */
export interface TeamSyncResult extends SyncResult {
  /** 삭제된 팀 수 (orphaned teams) */
  teamsDeleted?: number;
}

/**
 * 전체 Google Workspace 동기화 결과
 */
export interface FullSyncResult {
  /** Team 동기화 결과 */
  teamResult: TeamSyncResult;
  /** User 동기화 결과 */
  userResult: SyncResult;
  /** 총 소요 시간 (밀리초) */
  totalDuration: number;
}

/**
 * 동기화 에러
 */
export interface SyncError {
  code: string;
  message: string;
  entity?: string;
  entityId?: string;
  timestamp?: Date;
}

/**
 * 사용자 동기화 옵션
 */
export interface UserSyncOptions {
  /** 신규 사용자 생성 여부 */
  createNew?: boolean;
  /** 기존 사용자 업데이트 여부 */
  updateExisting?: boolean;
  /** 퇴사자 상태 자동 감지 여부 */
  detectTerminated?: boolean;
  /** 동기화 대상 OU 경로 (없으면 전체) */
  orgUnitPath?: string;
  /** 배치 크기 */
  batchSize?: number;
}

/**
 * 앱 발견 옵션
 */
export interface AppDiscoveryOptions {
  /** 최소 사용자 수 (이 이상 사용하는 앱만 발견) */
  minUsers?: number;
  /** SaaS 카탈로그 매칭 여부 */
  matchCatalog?: boolean;
  /** 기존 앱 업데이트 여부 */
  updateExisting?: boolean;
}

// ==================== Discovery Types ====================

/**
 * 발견된 앱 정보
 */
export interface DiscoveredApp {
  clientId: string;
  name: string;
  scopes: string[];
  users: DiscoveredAppUser[];
  userCount: number;
  /** 매칭된 SaaS 카탈로그 ID */
  catalogId?: string;
  /** 매칭 신뢰도 (0-1) */
  matchConfidence?: number;
}

/**
 * 앱을 사용하는 사용자 정보
 */
export interface DiscoveredAppUser {
  email: string;
  userId?: string;
  lastUsedAt?: Date;
}

/**
 * SaaS 매칭 결과
 */
export interface SaaSMatchResult {
  catalogId: string;
  catalogName: string;
  confidence: number;
  matchedBy: "exact" | "pattern" | "fuzzy";
}

// ==================== API Response Types ====================

/**
 * 동기화 시작 응답
 */
export interface StartSyncResponse {
  success: boolean;
  syncLogId?: string;
  message?: string;
  error?: string;
}

/**
 * Integration 목록 응답
 */
export interface IntegrationListResponse {
  integrations: IntegrationWithStats[];
  total: number;
}
