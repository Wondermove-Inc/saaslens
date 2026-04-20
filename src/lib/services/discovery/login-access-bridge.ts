// src/lib/services/discovery/login-access-bridge.ts
/**
 * 로그인 이벤트 → UserAppAccess 브릿지 서비스
 * ExtensionLoginEvent에서 감지된 로그인을 UserAppAccess 레코드로 변환
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { matchDomainToApp } from "./domain-matcher";

export interface BridgeLoginParams {
  domain: string;
  deviceId: string;
  organizationId: string;
  userId?: string;
  capturedAt: Date;
}

export interface BridgeResult {
  matched: boolean;
  appId?: string;
  appName?: string;
  userId?: string;
  confidence?: number;
}

/**
 * 로그인 이벤트를 UserAppAccess 레코드로 브릿지
 *
 * 1. userId 해결: 직접 제공 or ExtensionDevice.userId 조회
 * 2. 도메인 매칭: matchDomainToApp() 호출
 * 3. UserAppAccess upsert: source EXTENSION_LOGIN, lastUsedAt 갱신
 */
export async function bridgeLoginToAppAccess(
  params: BridgeLoginParams
): Promise<BridgeResult> {
  const { domain, deviceId, organizationId, capturedAt } = params;

  // 1. userId 해결
  let userId = params.userId;

  if (!userId) {
    const device = await prisma.extensionDevice.findUnique({
      where: { deviceKey: deviceId },
      select: { userId: true },
    });

    userId = device?.userId ?? undefined;
  }

  if (!userId) {
    logger.debug(
      { deviceId, domain },
      "Login bridge skipped: userId not resolved"
    );
    return { matched: false };
  }

  // 2. 도메인 매칭
  const matchResult = await matchDomainToApp(domain, organizationId);

  if (!matchResult) {
    logger.debug(
      { domain, organizationId },
      "Login bridge: no app match for domain"
    );
    return { matched: false, userId };
  }

  // 3. UserAppAccess upsert (EXTENSION_LOGIN source)
  // 기존 SSO_LOG 레코드가 있으면 lastUsedAt만 갱신 (source 변경 안 함)
  const existing = await prisma.userAppAccess.findUnique({
    where: {
      userId_appId: {
        userId,
        appId: matchResult.appId,
      },
    },
    select: { source: true },
  });

  if (existing) {
    // 기존 레코드 있으면 lastUsedAt만 갱신
    await prisma.userAppAccess.update({
      where: {
        userId_appId: {
          userId,
          appId: matchResult.appId,
        },
      },
      data: {
        lastUsedAt: capturedAt,
      },
    });
  } else {
    // 새 레코드 생성
    await prisma.userAppAccess.create({
      data: {
        userId,
        appId: matchResult.appId,
        source: "EXTENSION_LOGIN",
        lastUsedAt: capturedAt,
      },
    });
  }

  logger.info(
    {
      domain,
      appId: matchResult.appId,
      appName: matchResult.appName,
      userId,
      confidence: matchResult.confidence,
      matchTier: matchResult.matchTier,
      isNew: !existing,
    },
    "Login bridge: UserAppAccess created/updated"
  );

  return {
    matched: true,
    appId: matchResult.appId,
    appName: matchResult.appName,
    userId,
    confidence: matchResult.confidence,
  };
}
