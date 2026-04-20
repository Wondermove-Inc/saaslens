// src/lib/api/auth-middleware.ts
/**
 * API 라우트 인증 미들웨어
 *
 * Server Actions의 세션 체크에만 의존하지 않고,
 * API 레벨에서 방어적으로 인증을 검증합니다 (Defense-in-depth).
 */

import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// 인증된 세션 타입
export type AuthenticatedSession = NonNullable<
  Awaited<ReturnType<typeof auth>>
> & {
  user: {
    id: string;
    organizationId: string;
    role: string;
    email?: string | null;
    name?: string | null;
  };
};

// 인증된 핸들러 타입
export type AuthenticatedHandler = (
  request: NextRequest,
  context: { session: AuthenticatedSession }
) => Promise<NextResponse>;

// 역할 타입
export type Role = "SUPER_ADMIN" | "ADMIN" | "MEMBER" | "VIEWER";

// 미들웨어 옵션
export interface ApiAuthOptions {
  /** ADMIN 역할 필수 여부 (deprecated: allowRoles 사용 권장) */
  requireAdmin?: boolean;
  /** 허용되는 역할 목록 (지정 시 해당 역할만 허용) */
  allowRoles?: Role[];
  /** VIEWER 차단 여부 (기본: false) */
  blockViewer?: boolean;
}

import { logger } from "@/lib/logger";

/**
 * API 라우트 인증을 적용하는 HOF (Higher-Order Function)
 *
 * @example
 * ```typescript
 * export const GET = withApiAuth(async (request, { session }) => {
 *   const data = await getData(session.user.organizationId);
 *   return NextResponse.json({ data });
 * });
 * ```
 */
export function withApiAuth(
  handler: AuthenticatedHandler,
  options: ApiAuthOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const session = await auth();

    // 세션 검증
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // 조직 검증 (SUPER_ADMIN은 조직 없이도 허용)
    const userRole = session.user.role as Role;
    if (!session.user.organizationId && userRole !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "조직 정보가 필요합니다" },
        { status: 403 }
      );
    }

    // 역할 기반 권한 검증
    // allowRoles 옵션: 특정 역할만 허용
    if (options.allowRoles && options.allowRoles.length > 0) {
      if (!options.allowRoles.includes(userRole)) {
        return NextResponse.json(
          { error: "이 작업에 대한 권한이 없습니다" },
          { status: 403 }
        );
      }
    }

    // requireAdmin 옵션 (하위 호환성)
    if (options.requireAdmin && userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "관리자 권한이 필요합니다" },
        { status: 403 }
      );
    }

    // blockViewer 옵션: VIEWER 차단
    if (options.blockViewer && userRole === "VIEWER") {
      return NextResponse.json(
        { error: "읽기 전용 사용자는 이 작업을 수행할 수 없습니다" },
        { status: 403 }
      );
    }

    // 인증 컨텍스트 로깅
    logger.debug(
      {
        userId: session.user.id,
        orgId: session.user.organizationId,
        role: userRole,
      },
      "authenticated"
    );

    // 핸들러 호출
    return handler(request, {
      session: session as unknown as AuthenticatedSession,
    });
  };
}
