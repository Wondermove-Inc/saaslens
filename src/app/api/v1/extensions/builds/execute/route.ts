// src/app/api/v1/extensions/builds/execute/route.ts
/**
 * Chrome Extension 빌드 실행 API
 * Server Action에서 child_process를 사용할 수 없어 API Route로 분리
 *
 * 빌드 시 조직용 API 인증 정보를 자동으로 생성하고 Extension에 주입
 */

import { generateToken, hashToken } from "@/lib/api/extension-auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { execFile } from "child_process";
import { NextRequest, NextResponse } from "next/server";

interface BuildResult {
  success: boolean;
  zipPath?: string;
  checksum?: string;
  fileSize?: number;
  error?: string;
  buildLog: string;
}

interface BuildEnvVars {
  BUILD_API_URL: string;
  BUILD_API_CREDENTIAL: string;
}

// 경로를 함수로 구성하여 Turbopack 정적 분석 회피
function getExtensionDir(): string {
  return [process.cwd(), "src", "extensions", "chrome"].join("/");
}

function getBuildScript(): string {
  return [getExtensionDir(), "build.js"].join("/");
}

/**
 * 조직용 Extension API 인증 정보 생성 또는 기존 것 사용
 */
async function getOrCreateBuildCredential(
  organizationId: string,
  buildId: string
): Promise<{ rawValue: string; credentialId: string }> {
  // 기존 빌드용 인증 정보 찾기
  const existingCredential = await prisma.extensionApiToken.findFirst({
    where: {
      organizationId,
      isActive: true,
      name: { startsWith: "Build-" },
    },
  });

  if (existingCredential) {
    // 기존 인증 정보가 있으면 새 값 생성 (보안상 기존 해시에서 원본 복원 불가)
    // 새 인증 정보 생성
  }

  // 새 인증 정보 생성
  const rawValue = generateToken();
  const hashedValue = hashToken(rawValue);

  const credential = await prisma.extensionApiToken.create({
    data: {
      organizationId,
      token: hashedValue,
      name: `Build-${buildId}`,
      isActive: true,
    },
  });

  return { rawValue, credentialId: credential.id };
}

/**
 * Chrome Extension 빌드 실행
 * execFile을 사용하여 안전하게 실행
 * 환경 변수로 API URL과 인증 정보를 전달
 */
async function executeBuild(
  version: string,
  envVars: BuildEnvVars
): Promise<BuildResult> {
  return new Promise((resolve) => {
    const extensionDir = getExtensionDir();
    const buildScript = getBuildScript();

    execFile(
      "node",
      [buildScript, version],
      {
        cwd: extensionDir,
        env: {
          ...process.env,
          NODE_ENV: "production",
          BUILD_API_URL: envVars.BUILD_API_URL,
          BUILD_API_CREDENTIAL: envVars.BUILD_API_CREDENTIAL,
        },
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      },
      (error, stdout, stderr) => {
        if (error) {
          // 에러가 있어도 stdout에 JSON 결과가 있을 수 있음
          try {
            const result = JSON.parse(stdout.trim());
            resolve(result);
          } catch {
            resolve({
              success: false,
              error: error.message,
              buildLog: stdout + stderr,
            });
          }
          return;
        }

        // 정상 종료
        try {
          const result = JSON.parse(stdout.trim());
          resolve(result);
        } catch {
          resolve({
            success: true,
            buildLog: stdout + stderr,
          });
        }
      }
    );
  });
}

/**
 * POST /api/v1/extensions/builds/execute
 * 빌드 실행 요청
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { buildId, version } = body;

    if (!buildId || !version) {
      return NextResponse.json(
        { success: false, error: "buildId와 version이 필요합니다" },
        { status: 400 }
      );
    }

    // 인증: 내부 시크릿 또는 세션
    let organizationId: string;
    const internalSecret = request.headers.get("x-internal-secret");
    const AUTH_SECRET = process.env.AUTH_SECRET || "dev-secret-123";

    if (internalSecret && internalSecret === AUTH_SECRET) {
      // 내부 호출 - body의 organizationId 사용
      if (!body.organizationId) {
        return NextResponse.json(
          { success: false, error: "organizationId가 필요합니다" },
          { status: 400 }
        );
      }
      organizationId = body.organizationId;
    } else {
      const session = await auth();
      if (!session?.user?.organizationId) {
        return NextResponse.json(
          { success: false, error: "인증이 필요합니다" },
          { status: 401 }
        );
      }
      organizationId = session.user.organizationId;
    }

    // 빌드 존재 확인
    const build = await prisma.extensionBuild.findUnique({
      where: { id: buildId },
    });

    if (!build || build.organizationId !== organizationId) {
      return NextResponse.json(
        { success: false, error: "빌드를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 상태를 BUILDING으로 변경
    await prisma.extensionBuild.update({
      where: { id: buildId },
      data: { status: "BUILDING", buildLog: "빌드 시작...\n" },
    });

    // 빌드용 API 인증 정보 생성
    const { rawValue } = await getOrCreateBuildCredential(
      organizationId,
      buildId
    );

    // 서버 URL 결정 (요청 헤더에서 추출 또는 환경 변수)
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const serverUrl = process.env.NEXTAUTH_URL || `${protocol}://${host}`;

    // 빌드 실행 (환경 변수로 인증 정보 전달)
    const result = await executeBuild(version, {
      BUILD_API_URL: serverUrl,
      BUILD_API_CREDENTIAL: rawValue,
    });

    if (result.success && result.zipPath) {
      await prisma.extensionBuild.update({
        where: { id: buildId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          buildLog: result.buildLog,
          fileSize: result.fileSize,
          checksum: result.checksum,
          downloadUrl: `/api/v1/extensions/builds/${buildId}/download`,
        },
      });
    } else {
      await prisma.extensionBuild.update({
        where: { id: buildId },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          buildLog: result.buildLog,
          errorMessage: result.error || "빌드 실패",
        },
      });
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    logger.error(
      { err: error },
      "[POST /api/v1/extensions/builds/execute] Error"
    );
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "빌드 실행 실패",
      },
      { status: 500 }
    );
  }
}
