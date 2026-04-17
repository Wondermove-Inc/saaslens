// src/app/api/v1/extensions/builds/[id]/download/route.ts
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { createReadStream, existsSync, readdirSync, statSync } from "fs";
import { NextRequest, NextResponse } from "next/server";
import { join } from "path";

// 빌드 파일 경로
const EXTENSION_DIR = join(process.cwd(), "src", "extensions", "chrome");
const RELEASE_DIR = join(EXTENSION_DIR, "release");

/**
 * release 디렉토리에서 버전에 맞는 zip 파일 탐색
 * 1. 버전 정확히 일치하는 파일 우선
 * 2. 가장 최근 수정된 zip으로 fallback
 */
function findZipFile(version: string): string | null {
  if (!existsSync(RELEASE_DIR)) {
    return null;
  }

  const files = readdirSync(RELEASE_DIR).filter((f) => f.endsWith(".zip"));
  if (files.length === 0) {
    return null;
  }

  // 1. 버전 정확히 일치
  const exactMatch = `shade-extension-${version}.zip`;
  if (files.includes(exactMatch)) {
    return join(RELEASE_DIR, exactMatch);
  }

  // 2. 가장 최근 수정된 zip으로 fallback
  const sortedFiles = files
    .map((f) => ({ name: f, mtime: statSync(join(RELEASE_DIR, f)).mtime }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  return join(RELEASE_DIR, sortedFiles[0].name);
}

/**
 * 내부적으로 빌드 실행 트리거
 * COMPLETED 상태임에도 zip이 없는 경우 (컨테이너 재시작 등으로 파일 소실) 호출
 */
async function triggerBuild(
  buildId: string,
  version: string,
  organizationId: string,
  serverUrl: string
): Promise<boolean> {
  const AUTH_SECRET = process.env.AUTH_SECRET || "dev-secret-123";
  try {
    const response = await fetch(
      `${serverUrl}/api/v1/extensions/builds/execute`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": AUTH_SECRET,
        },
        body: JSON.stringify({ buildId, version, organizationId }),
      }
    );

    if (!response.ok) {
      logger.error(
        { status: response.status },
        "[Download API] 내부 빌드 트리거 실패"
      );
      return false;
    }

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    logger.error({ err: error }, "[Download API] 내부 빌드 트리거 에러");
    return false;
  }
}

/**
 * GET /api/v1/extensions/builds/[id]/download
 * 빌드된 ZIP 파일 다운로드
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }
    if (!isSuperAdmin && !session.user.organizationId) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { id } = await params;

    // 빌드 정보 조회
    const build = await prisma.extensionBuild.findUnique({
      where: { id },
    });

    if (
      !build ||
      (!isSuperAdmin && build.organizationId !== session.user.organizationId)
    ) {
      return NextResponse.json(
        { error: "빌드를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 빌드 중인 경우
    if (build.status === "BUILDING") {
      return NextResponse.json(
        { message: "빌드 중입니다. 잠시 후 다시 시도해주세요" },
        { status: 202 }
      );
    }

    if (build.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "빌드가 완료되지 않았습니다" },
        { status: 400 }
      );
    }

    // zip 파일 탐색 (버전 정확히 일치 → 최신 zip 순서로)
    let zipPath = findZipFile(build.version);

    // zip이 없으면 자동 빌드 트리거 (컨테이너 재시작으로 파일 소실 대응)
    if (!zipPath) {
      logger.info(
        { buildId: id, version: build.version },
        "[Download API] zip 파일 없음 → 자동 빌드 트리거"
      );

      // 내부 self-call은 localhost 사용 (CloudFront/WAF 우회)
      const serverUrl = `http://localhost:${process.env.PORT || 3000}`;

      const success = await triggerBuild(
        id,
        build.version,
        isSuperAdmin ? build.organizationId : session.user.organizationId!,
        serverUrl
      );

      if (!success) {
        return NextResponse.json(
          { error: "빌드 파일을 생성하지 못했습니다" },
          { status: 500 }
        );
      }

      // 빌드 후 다시 탐색
      zipPath = findZipFile(build.version);
      if (!zipPath) {
        return NextResponse.json(
          { error: "빌드 완료 후에도 ZIP 파일을 찾을 수 없습니다" },
          { status: 500 }
        );
      }
    }

    const stats = statSync(zipPath);

    // 파일 스트림 생성
    const stream = createReadStream(zipPath);
    const readableStream = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk) => {
          controller.enqueue(chunk);
        });
        stream.on("end", () => {
          controller.close();
        });
        stream.on("error", (err) => {
          controller.error(err);
        });
      },
    });

    // 다운로드 응답 반환
    return new NextResponse(readableStream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="shade-extension-${build.version}.zip"`,
        "Content-Length": stats.size.toString(),
      },
    });
  } catch (error) {
    logger.error({ err: error }, "[Download API] Error");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "다운로드 실패" },
      { status: 500 }
    );
  }
}
