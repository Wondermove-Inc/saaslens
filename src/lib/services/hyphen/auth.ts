/**
 * Hyphen OAuth 토큰 관리
 */
import { HyphenApiError, OAuthTokenResponse } from "./types";

const HYPHEN_API_BASE = "https://api.hyphen.im";

/** 토큰 캐시 */
interface TokenCache {
  accessToken: string;
  expiresAt: Date;
}

let tokenCache: TokenCache | null = null;

/**
 * Hyphen Access Token 발급/조회
 * - 캐시된 토큰이 유효하면 재사용
 * - 만료 1시간 전에 갱신
 */
export async function getHyphenAccessToken(): Promise<string> {
  // 캐시된 토큰이 유효하면 반환
  if (tokenCache && tokenCache.expiresAt > new Date()) {
    return tokenCache.accessToken;
  }

  // 환경변수 확인
  const userId = process.env.HYPHEN_USER_ID;
  const hkey = process.env.HYPHEN_HKEY;

  if (!userId || !hkey) {
    throw new HyphenApiError(
      "AUTH_CONFIG_ERROR",
      "HYPHEN_USER_ID 또는 HYPHEN_HKEY 환경변수가 설정되지 않았습니다"
    );
  }

  // 토큰 발급
  const response = await fetch(`${HYPHEN_API_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: userId,
      hkey: hkey,
    }),
  });

  if (!response.ok) {
    throw new HyphenApiError(
      "AUTH_FAILED",
      `Hyphen 토큰 발급 실패: ${response.status} ${response.statusText}`
    );
  }

  const data: OAuthTokenResponse = await response.json();

  if (!data.access_token) {
    throw new HyphenApiError(
      "AUTH_FAILED",
      "Hyphen 토큰 발급 응답에 access_token이 없습니다"
    );
  }

  // 캐시 저장 (만료 1시간 전까지 유효)
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + (data.expires_in - 3600) * 1000),
  };

  return tokenCache.accessToken;
}

/**
 * 토큰 캐시 초기화 (테스트용)
 */
export function clearTokenCache(): void {
  tokenCache = null;
}

/**
 * 인증 헤더 생성 (카드 API용)
 * @description User-Id와 Hkey 헤더만 사용 (Bearer 토큰 불필요)
 */
export function createAuthHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "User-Id": process.env.HYPHEN_USER_ID || "",
    Hkey: process.env.HYPHEN_HKEY || "",
    "Hyphen-Gustation": "Y",
  };
}

/**
 * 직접 인증 헤더 생성 (토큰 없이 user-id, Hkey 사용)
 */
export function createDirectAuthHeaders(): Record<string, string> {
  const userId = process.env.HYPHEN_USER_ID;
  const hkey = process.env.HYPHEN_HKEY;

  if (!userId || !hkey) {
    throw new HyphenApiError(
      "AUTH_CONFIG_ERROR",
      "HYPHEN_USER_ID 또는 HYPHEN_HKEY 환경변수가 설정되지 않았습니다"
    );
  }

  return {
    "Content-Type": "application/json",
    "user-id": userId,
    Hkey: hkey,
  };
}
