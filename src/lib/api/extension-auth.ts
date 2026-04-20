// src/lib/api/extension-auth.ts
/**
 * Extension API 인증 미들웨어
 *
 * Chrome Extension이 Bearer 토큰으로 인증할 때 사용
 * ExtensionApiToken 테이블에서 토큰을 검증하고 organizationId를 반환
 */

import { prisma } from "@/lib/db";
import type { ExtensionAuthContext } from "@/types/extension-api";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

/**
 * Bearer 토큰을 해시하여 저장된 값과 비교
 * 토큰은 SHA-256으로 해시되어 DB에 저장됨
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * 새 API 토큰 생성
 * 랜덤 32바이트를 Base64URL 인코딩하여 생성
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Authorization 헤더에서 Bearer 토큰 추출
 */
function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return null;
  }

  return parts[1];
}

/**
 * Extension 토큰 인증 수행
 *
 * @param request - NextRequest 객체
 * @returns ExtensionAuthContext 또는 null (인증 실패 시)
 */
export async function validateExtensionToken(
  request: NextRequest
): Promise<ExtensionAuthContext | null> {
  const rawToken = extractBearerToken(request);
  if (!rawToken) {
    return null;
  }

  const hashedToken = hashToken(rawToken);

  // 토큰 조회
  const tokenRecord = await prisma.extensionApiToken.findUnique({
    where: { token: hashedToken },
    select: {
      id: true,
      organizationId: true,
      deviceId: true,
      isActive: true,
      expiresAt: true,
    },
  });

  if (!tokenRecord) {
    return null;
  }

  // 비활성화 체크
  if (!tokenRecord.isActive) {
    return null;
  }

  // 만료 체크
  if (tokenRecord.expiresAt && tokenRecord.expiresAt < new Date()) {
    return null;
  }

  // lastUsedAt 업데이트 (비동기로 처리하여 응답 지연 방지)
  prisma.extensionApiToken
    .update({
      where: { id: tokenRecord.id },
      data: { lastUsedAt: new Date() },
    })
    .catch((err) => {
      logger.error({ err }, "Failed to update token lastUsedAt");
    });

  return {
    organizationId: tokenRecord.organizationId,
    tokenId: tokenRecord.id,
    deviceId: tokenRecord.deviceId ?? undefined,
  };
}

// Extension 인증된 핸들러 타입
export type ExtensionAuthenticatedHandler = (
  request: NextRequest,
  context: { auth: ExtensionAuthContext }
) => Promise<NextResponse>;

import { logger } from "@/lib/logger";

/**
 * Extension API 인증 래퍼 (HOF)
 *
 * @example
 * ```typescript
 * export const GET = withExtensionAuth(async (request, { auth }) => {
 *   const data = await getData(auth.organizationId);
 *   return NextResponse.json({ success: true, data });
 * });
 * ```
 */
export function withExtensionAuth(handler: ExtensionAuthenticatedHandler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const auth = await validateExtensionToken(request);

    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid or missing token" },
        { status: 401 }
      );
    }

    // 인증 컨텍스트 로깅
    logger.debug(
      {
        orgId: auth.organizationId,
        tokenId: auth.tokenId,
      },
      "ext-authenticated"
    );

    return handler(request, { auth });
  };
}
