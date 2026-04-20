// src/lib/middleware/cron-auth.ts
/**
 * Cron 엔드포인트 인증 미들웨어
 *
 * 패턴 C (verifyCronSecret) 기반 - 가장 안전한 검증 로직
 * 모든 크론 엔드포인트에 일관된 CRON_SECRET 검증을 제공합니다.
 */

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

/**
 * 크론 핸들러 타입
 */
export type CronHandler = (request: NextRequest) => Promise<NextResponse>;

/**
 * withCronAuth 옵션
 */
export interface CronAuthOptions {
  /**
   * 개발 환경에서 인증을 스킵할지 여부
   * @default false (기본값: 개발 환경에서도 인증 필요)
   *
   * 주의: true로 설정 시 개발 환경에서 CRON_SECRET 없이 접근 가능
   * 보안상 false 권장
   */
  skipInDevelopment?: boolean;
}

/**
 * 크론 엔드포인트 인증을 적용하는 HOF (Higher-Order Function)
 *
 * 패턴 C (verifyCronSecret) 기반 - 가장 안전한 검증 로직
 *
 * 검증 순서:
 * 1. 개발 환경 스킵 옵션 확인 (선택적)
 * 2. Authorization 헤더 존재 확인
 * 3. CRON_SECRET 환경변수 설정 확인
 * 4. Bearer 토큰 일치 확인
 *
 * @example
 * ```typescript
 * // 기본 사용 (가장 엄격)
 * export const GET = withCronAuth(
 *   withLogging("cron:my-job", async (request) => {
 *     // 크론 로직
 *     return NextResponse.json({ success: true });
 *   })
 * );
 *
 * // 개발 환경 스킵 (필요시에만)
 * export const GET = withCronAuth(
 *   withLogging("cron:my-job", handler),
 *   { skipInDevelopment: true }
 * );
 * ```
 */
export function withCronAuth(
  handler: CronHandler,
  options: CronAuthOptions = {}
): CronHandler {
  const { skipInDevelopment = false } = options;

  return async (request: NextRequest): Promise<NextResponse> => {
    // 1. 개발 환경 스킵 옵션 (선택적)
    if (skipInDevelopment && process.env.NODE_ENV === "development") {
      logger.debug("[CronAuth] Skipping auth in development");
      return handler(request);
    }

    // 2. Authorization 헤더 검증
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      logger.warn("[CronAuth] Missing authorization header");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 3. CRON_SECRET 환경변수 검증
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      logger.error("[CronAuth] CRON_SECRET is not configured");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 4. Bearer 토큰 일치 검증
    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn("[CronAuth] Invalid cron secret");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 5. 인증 성공 - 핸들러 호출
    logger.debug("[CronAuth] Authentication successful");
    return handler(request);
  };
}
