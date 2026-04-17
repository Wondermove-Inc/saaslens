#!/usr/bin/env bash
# scripts/build-extension.sh
# Chrome Extension 빌드 스크립트
#
# Usage:
#   ./scripts/build-extension.sh --env dev    # dev 서버 대상 빌드
#   ./scripts/build-extension.sh --env local  # 로컬 서버 대상 빌드
#
# 전제 조건:
#   - .env.local 파일이 프로젝트 루트에 존재해야 함 (DATABASE_URL 등)
#   - node, npm이 설치되어 있어야 함

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ============================================================
# 인자 파싱
# ============================================================
ENV_TARGET=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      ENV_TARGET="$2"
      shift 2
      ;;
    *)
      echo "❌ 알 수 없는 옵션: $1"
      echo "Usage: $0 --env [dev|local]"
      exit 1
      ;;
  esac
done

if [[ -z "$ENV_TARGET" ]]; then
  echo "❌ --env 옵션이 필요합니다 (dev 또는 local)"
  echo "Usage: $0 --env [dev|local]"
  exit 1
fi

# ============================================================
# 환경 설정
# ============================================================
case "$ENV_TARGET" in
  dev)
    BUILD_API_URL="${BUILD_API_URL:-http://localhost:3000}"
    ;;
  local)
    BUILD_API_URL="http://localhost:3000"
    ;;
  *)
    echo "❌ 지원하지 않는 환경: $ENV_TARGET (dev 또는 local만 가능)"
    exit 1
    ;;
esac

echo "======================================================"
echo "  Chrome Extension 빌드 스크립트"
echo "  환경: $ENV_TARGET | URL: $BUILD_API_URL"
echo "======================================================"
echo ""

# ============================================================
# Node.js 빌드 실행 (인라인 mjs 스크립트)
# ============================================================
cd "$PROJECT_ROOT"

node --input-type=module <<EOF
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import { execFile } from "child_process";
import { existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { config } from "dotenv";
import { promisify } from "util";

// 환경변수 로드
config({ path: ".env.local" });

const prisma = new PrismaClient();
const execFileAsync = promisify(execFile);

const BUILD_API_URL = "${BUILD_API_URL}";
const EXTENSION_DIR = join(process.cwd(), "src", "extensions", "chrome");
const BUILD_SCRIPT = join(EXTENSION_DIR, "build.js");
const RELEASE_DIR = join(EXTENSION_DIR, "release");

// 토큰 생성 유틸
function generateToken() {
  return randomBytes(32).toString("base64url");
}
function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

async function main() {
  // 1. 현재 조직 정보 조회
  const org = await prisma.organization.findFirst({
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  if (!org) {
    console.error("❌ 조직 정보를 찾을 수 없습니다. DB 연결을 확인하세요.");
    process.exit(1);
  }
  console.log("✅ 조직:", org.name, "(id:", org.id + ")");

  // 2. 빌드 버전 결정 (manifest.json에서 읽기)
  const manifestPath = join(EXTENSION_DIR, "manifest.json");
  const manifest = JSON.parse((await import("fs")).readFileSync(manifestPath, "utf-8"));
  const version = manifest.version;
  console.log("📦 버전:", version);

  // 3. API 토큰 생성 또는 재사용
  const rawToken = generateToken();
  const hashedToken = hashToken(rawToken);

  const buildLabel = "Build-Script-" + Date.now();
  const tokenRecord = await prisma.extensionApiToken.create({
    data: {
      organizationId: org.id,
      token: hashedToken,
      name: buildLabel,
      isActive: true,
    },
  });
  console.log("🔑 API 토큰 생성:", tokenRecord.name);

  // 4. ExtensionBuild 레코드 생성
  const build = await prisma.extensionBuild.create({
    data: {
      organizationId: org.id,
      version,
      platform: "CHROME",
      status: "BUILDING",
      serverUrl: BUILD_API_URL,
      buildLog: "[" + new Date().toISOString() + "] build-extension.sh 빌드 시작\n",
    },
  });
  console.log("📋 빌드 레코드 생성 (id:", build.id + ")");

  // 5. build.js 실행
  console.log("");
  console.log("🔨 webpack 빌드 시작...");

  let buildResult;
  try {
    const { stdout, stderr } = await execFileAsync(
      "node",
      [BUILD_SCRIPT, version],
      {
        cwd: EXTENSION_DIR,
        env: {
          ...process.env,
          NODE_ENV: "production",
          BUILD_API_URL,
          BUILD_API_CREDENTIAL: rawToken,
        },
        maxBuffer: 10 * 1024 * 1024,
      }
    );

    try {
      buildResult = JSON.parse(stdout.trim());
    } catch {
      buildResult = { success: true, buildLog: stdout + stderr };
    }
  } catch (error) {
    // execFile 에러가 있어도 stdout에 JSON 결과가 있을 수 있음
    try {
      buildResult = JSON.parse(error.stdout?.trim() || "{}");
    } catch {
      buildResult = {
        success: false,
        error: error.message,
        buildLog: (error.stdout || "") + (error.stderr || ""),
      };
    }
  }

  // 6. DB 업데이트
  if (buildResult.success && buildResult.zipPath) {
    await prisma.extensionBuild.update({
      where: { id: build.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        buildLog: buildResult.buildLog,
        fileSize: buildResult.fileSize,
        checksum: buildResult.checksum,
        downloadUrl: "/api/v1/extensions/builds/" + build.id + "/download",
      },
    });

    console.log("");
    console.log("✅ 빌드 성공!");
    console.log("   ZIP 경로:", buildResult.zipPath);
    console.log("   파일 크기:", (buildResult.fileSize / 1024).toFixed(2), "KB");
    console.log("   체크섬:", buildResult.checksum);
    console.log("");
    console.log("🔗 다운로드 URL:");
    console.log("   " + BUILD_API_URL + "/api/v1/extensions/builds/" + build.id + "/download");
    console.log("");
    console.log("💡 SMP 앱에서 Extensions → Builds 페이지를 새로고침하세요.");
  } else {
    await prisma.extensionBuild.update({
      where: { id: build.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        buildLog: buildResult.buildLog,
        errorMessage: buildResult.error || "빌드 실패",
      },
    });

    console.error("");
    console.error("❌ 빌드 실패:", buildResult.error);
    console.error("빌드 로그:");
    console.error(buildResult.buildLog);
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error("❌ 스크립트 오류:", err.message);
    process.exit(1);
  })
  .finally(() => prisma.\$disconnect());
EOF
