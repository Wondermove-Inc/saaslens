// src/config/features.ts
/**
 * Feature Flags
 * MVP 범위 외 기능을 제어하기 위한 feature flag 설정
 */

export const FEATURES = {
  /** 조직 설정 - 팀/부서 관리 기능 (V2) */
  ORGANIZATION_TEAMS: false,

  /** 조직 설정 - 로고 URL 설정 기능 (V2) */
  ORGANIZATION_LOGO: false,

  /** 조직 설정 - 멀티도메인 관리 기능 */
  ORGANIZATION_DOMAINS: true,
} as const;
