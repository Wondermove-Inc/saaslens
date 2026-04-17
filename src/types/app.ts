// src/types/app.ts
// 앱 관리 관련 타입 정의

import type { AppSource, AppStatus } from "@prisma/client";

/**
 * 앱 목록 아이템
 */
export interface AppListItem {
  id: string;
  name: string;
  status: AppStatus;
  source: AppSource;
  category: string | null;
  customLogoUrl: string | null;
  catalogLogoUrl?: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  subscriptionCount: number;
  userAccessCount: number;
  createdAt: Date;
  updatedAt: Date;
  // Team 다중 배정
  teams: { id: string; name: string }[];
}

/**
 * 앱 상세 정보
 */
export interface AppDetail extends AppListItem {
  catalogId: string | null;
  customWebsite: string | null;
  notes: string | null;
  tags: string[];
  riskScore: number | null;
  discoveredAt: Date | null;
}

/**
 * 앱 생성 입력
 */
export interface CreateAppInput {
  name: string;
  category?: string;
  customLogoUrl?: string;
  customWebsite?: string;
  notes?: string;
  tags?: string[];
  ownerId?: string;
  catalogId?: string;
  teamIds?: string[];
}

/**
 * 앱 수정 입력
 */
export interface UpdateAppInput {
  name?: string;
  status?: AppStatus;
  category?: string;
  customLogoUrl?: string;
  customWebsite?: string;
  notes?: string;
  tags?: string[];
  ownerId?: string;
  teamIds?: string[];
}

/**
 * 앱 필터 옵션
 */
export interface AppFilterOptions {
  search?: string;
  status?: AppStatus;
  source?: AppSource;
  category?: string;
  ownerId?: string;
  teamIds?: string[];
}

/**
 * 앱 정렬 옵션
 */
export interface AppSortOptions {
  sortBy?: "name" | "createdAt" | "updatedAt" | "category";
  sortOrder?: "asc" | "desc";
}
