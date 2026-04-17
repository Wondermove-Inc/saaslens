// src/extensions/chrome/src/shared/api-paths.ts
/**
 * SMP API 엔드포인트 경로 상수
 *
 * Extension에서 호출하는 모든 API 경로를 중앙 관리합니다.
 * 서버 API 경로 변경 시 이 파일만 수정하면 됩니다.
 */

// API 버전 prefix
const API_PREFIX = "/api/v1/extensions";

/**
 * Extension API 엔드포인트 경로
 */
export const API_PATHS = {
  /** 헬스체크 - GET */
  HEALTH: `${API_PREFIX}/health`,

  /** 로그인 캡처 - POST */
  LOGIN: `${API_PREFIX}/login`,

  /** 사용량 동기화 - POST */
  USAGE_SYNC: `${API_PREFIX}/usage/sync`,

  /** 화이트리스트 동기화 - GET, POST */
  WHITELIST_SYNC: `${API_PREFIX}/whitelist/sync`,

  /** 블랙리스트 동기화 - GET */
  BLACKLIST_SYNC: `${API_PREFIX}/blacklist/sync`,

  /** 원격 설정 동기화 - POST */
  CONFIG_SYNC: `${API_PREFIX}/config/sync`,

  /** 브라우징 로그 동기화 - POST */
  BROWSING_LOG_SYNC: `${API_PREFIX}/logs/browsing/sync`,

  /** 차단 로그 동기화 - POST */
  BLOCK_LOG_SYNC: `${API_PREFIX}/logs/block/sync`,

  /** 온보딩 이메일 검증 - POST */
  ONBOARDING_VERIFY: `${API_PREFIX}/onboarding/verify`,

  /** 온보딩 완료 - POST */
  ONBOARDING_COMPLETE: `${API_PREFIX}/onboarding/complete`,

  /** Heartbeat - POST */
  HEARTBEAT: `${API_PREFIX}/heartbeat`,
} as const;

export type ApiPath = (typeof API_PATHS)[keyof typeof API_PATHS];
