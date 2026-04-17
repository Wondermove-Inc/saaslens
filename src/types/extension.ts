// src/types/extension.ts
// Extension 관련 TypeScript 타입 및 Zod 검증 스키마

import type { Prisma } from "@prisma/client";
import { z } from "zod";

// ==================== Whitelist Types ====================

/**
 * Extension Whitelist 항목
 */
export type ExtensionWhitelistItem = Prisma.ExtensionWhitelistGetPayload<{
  select: {
    id: true;
    organizationId: true;
    pattern: true;
    name: true;
    enabled: true;
    source: true;
    addedAt: true;
    updatedAt: true;
  };
}>;

/**
 * Extension Whitelist 상세 (현재는 Item과 동일)
 */
export type ExtensionWhitelistDetail = ExtensionWhitelistItem;

/**
 * Whitelist 생성 입력
 */
export type CreateWhitelistInput = {
  pattern: string;
  name: string;
  source?: "MANUAL" | "GOOGLE_SYNC" | "ADMIN_IMPORT";
};

/**
 * Whitelist 수정 입력
 */
export type UpdateWhitelistInput = Partial<CreateWhitelistInput> & {
  enabled?: boolean;
};

// ==================== Blacklist Types ====================

/**
 * Extension Blacklist 항목
 */
export type ExtensionBlacklistItem = Prisma.ExtensionBlacklistGetPayload<{
  select: {
    id: true;
    organizationId: true;
    pattern: true;
    name: true;
    reason: true;
    enabled: true;
    addedAt: true;
    updatedAt: true;
  };
}>;

/**
 * Extension Blacklist 상세 (현재는 Item과 동일)
 */
export type ExtensionBlacklistDetail = ExtensionBlacklistItem;

/**
 * Blacklist 생성 입력
 */
export type CreateBlacklistInput = {
  pattern: string;
  name: string;
  reason?: string;
};

/**
 * Blacklist 수정 입력
 */
export type UpdateBlacklistInput = Partial<CreateBlacklistInput> & {
  enabled?: boolean;
};

// ==================== Config Types ====================

/**
 * Extension Config 항목
 */
export type ExtensionConfigItem = Prisma.ExtensionConfigGetPayload<{
  select: {
    id: true;
    organizationId: true;
    configKey: true;
    configValue: true;
    category: true;
    valueType: true;
    description: true;
    isActive: true;
    createdAt: true;
    updatedAt: true;
  };
}>;

/**
 * Config 수정 입력
 */
export type UpdateConfigInput = {
  configKey: string;
  configValue: string;
};

// ==================== Build Types ====================

/**
 * Extension Build 항목
 */
export type ExtensionBuildItem = Prisma.ExtensionBuildGetPayload<{
  select: {
    id: true;
    organizationId: true;
    version: true;
    platform: true;
    status: true;
    serverUrl: true;
    downloadUrl: true;
    checksum: true;
    fileSize: true;
    buildLog: true;
    errorMessage: true;
    createdAt: true;
    completedAt: true;
  };
}>;

/**
 * Build 트리거 입력
 */
export type TriggerBuildInput = {
  platform: "CHROME" | "WINDOWS_EXE" | "WINDOWS_MSI" | "MAC_PKG" | "MAC_DMG";
};

// ==================== Pagination Types ====================

/**
 * 페이지네이션 응답
 */
export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

/**
 * 페이지네이션 파라미터
 */
export type PaginationParams = {
  page?: number;
  limit?: number;
};

// ==================== Zod Schemas ====================

/**
 * Whitelist 생성 입력 검증 스키마
 */
export const createWhitelistSchema = z.object({
  pattern: z.string().min(1, "도메인 패턴을 입력하세요").max(255),
  name: z.string().min(1, "이름을 입력하세요").max(100),
  source: z.enum(["MANUAL", "GOOGLE_SYNC", "ADMIN_IMPORT"]).optional(),
});

/**
 * Whitelist 수정 입력 검증 스키마
 */
export const updateWhitelistSchema = z.object({
  pattern: z.string().min(1).max(255).optional(),
  name: z.string().min(1).max(100).optional(),
  enabled: z.boolean().optional(),
});

/**
 * Blacklist 생성 입력 검증 스키마
 */
export const createBlacklistSchema = z.object({
  pattern: z.string().min(1, "도메인 패턴을 입력하세요").max(255),
  name: z.string().min(1, "이름을 입력하세요").max(100),
  reason: z.string().max(500).optional(),
});

/**
 * Blacklist 수정 입력 검증 스키마
 */
export const updateBlacklistSchema = z.object({
  pattern: z.string().min(1).max(255).optional(),
  name: z.string().min(1).max(100).optional(),
  reason: z.string().max(500).optional(),
  enabled: z.boolean().optional(),
});

/**
 * Config 수정 입력 검증 스키마
 */
export const updateConfigSchema = z.object({
  configKey: z.string().min(1),
  configValue: z.string().min(1),
});

/**
 * Build 트리거 입력 검증 스키마
 */
export const triggerBuildSchema = z.object({
  platform: z.enum([
    "CHROME",
    "WINDOWS_EXE",
    "WINDOWS_MSI",
    "MAC_PKG",
    "MAC_DMG",
  ]),
});

// ==================== Usage Types ====================

/**
 * Extension Usage 항목 (시간 추적용)
 */
export type ExtensionUsageItem = Prisma.ExtensionUsageGetPayload<{
  select: {
    id: true;
    organizationId: true;
    deviceId: true;
    domain: true;
    visitCount: true;
    totalSeconds: true;
    date: true;
    createdAt: true;
    updatedAt: true;
  };
}>;

/**
 * Usage Analytics 기간
 */
export type UsageAnalyticsPeriod = "today" | "week" | "month";

/**
 * Usage Analytics 도메인별 데이터 (로그인 기반)
 */
export type DomainLoginItem = {
  domain: string;
  loginCount: number;
  uniqueUsers: number;
  uniqueDevices: number;
};

/**
 * Usage Analytics 데이터 (로그인 기반)
 */
export type UsageAnalyticsData = {
  period: UsageAnalyticsPeriod;
  totalLogins: number;
  uniqueUsers: number;
  uniqueDevices: number;
  topDomains: DomainLoginItem[];
};

/**
 * 로그인 이벤트 상세 (도메인별 조회용)
 */
export type LoginEventDetail = {
  id: string;
  domain: string;
  username: string;
  userName: string | null;
  userEmail: string | null;
  authType: "PASSWORD" | "MAGIC_LINK" | "OAUTH" | "SSO";
  capturedAt: Date;
  deviceId: string;
};

/**
 * 도메인 상세 응답
 */
export type DomainDetailData = {
  domain: string;
  loginCount: number;
  uniqueUsers: number;
  uniqueDevices: number;
  events: LoginEventDetail[];
};

// ==================== Device Types ====================

/**
 * Extension Device 항목
 */
export type ExtensionDeviceItem = Prisma.ExtensionDeviceGetPayload<{
  select: {
    id: true;
    organizationId: true;
    deviceKey: true;
    browserInfo: true;
    osInfo: true;
    extensionVersion: true;
    status: true;
    lastSeenAt: true;
    userId: true;
    createdAt: true;
    updatedAt: true;
  };
}>;

/**
 * Extension Device 상세 (User 포함)
 */
export type ExtensionDeviceDetail = Prisma.ExtensionDeviceGetPayload<{
  select: {
    id: true;
    organizationId: true;
    deviceKey: true;
    browserInfo: true;
    osInfo: true;
    extensionVersion: true;
    status: true;
    lastSeenAt: true;
    userId: true;
    createdAt: true;
    updatedAt: true;
    user: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
  };
}>;

/**
 * Device 상태 업데이트 입력
 */
export type UpdateDeviceStatusInput = {
  status: "APPROVED" | "REVOKED";
};

/**
 * Device 상태 업데이트 검증 스키마
 */
export const updateDeviceStatusSchema = z.object({
  status: z.enum(["APPROVED", "REVOKED"]),
});

// ==================== Dashboard Types ====================

/**
 * Sync 상태
 */
export type SyncStatusItem = {
  lastSync: Date | null;
  status: "success" | "error" | "pending";
};

/**
 * Extension Dashboard 통계
 */
export type ExtensionDashboardStats = {
  activeDevices: number;
  inactiveDevices: number;
  blockedSitesCount: number;
  trackedSitesCount: number;
  totalUsageTimeToday: number;
  syncStatus: {
    blacklist: SyncStatusItem;
    whitelist: SyncStatusItem;
    usageData: SyncStatusItem;
  };
};
