#!/usr/bin/env node
/**
 * Chrome Extension 빌드 스크립트
 * Node.js로 직접 실행 (Next.js 번들링에서 분리)
 *
 * Usage: node src/extensions/chrome/build.js <version>
 */

const webpack = require("webpack");
const archiver = require("archiver");
const {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  statSync,
} = require("fs");
const { createHash } = require("crypto");
const { join } = require("path");

// 경로 설정
const EXTENSION_DIR = __dirname;
const DIST_DIR = join(EXTENSION_DIR, "dist");
const RELEASE_DIR = join(EXTENSION_DIR, "release");

/**
 * webpack 설정 생성
 * 환경 변수로 전달된 BUILD_API_URL, BUILD_API_CREDENTIAL을 번들에 포함
 */
function createWebpackConfig() {
  const CopyPlugin = require("copy-webpack-plugin");

  // 환경 변수에서 빌드 시 주입할 값 읽기
  const buildApiUrl = process.env.BUILD_API_URL || "http://localhost:3000";
  const buildApiCredential = process.env.BUILD_API_CREDENTIAL || "";

  return {
    mode: "production",
    entry: {
      background: join(EXTENSION_DIR, "src", "background", "index.ts"),
      content: join(EXTENSION_DIR, "src", "content", "index.ts"),
      popup: join(EXTENSION_DIR, "src", "popup", "index.ts"),
      onboarding: join(EXTENSION_DIR, "src", "onboarding", "onboarding.ts"),
    },
    output: {
      path: DIST_DIR,
      filename: "[name].js",
    },
    resolve: {
      extensions: [".ts", ".js"],
      fallback: {
        crypto: false,
        buffer: false,
        stream: false,
        path: false,
        vm: false,
        fs: false,
      },
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: {
            loader: "ts-loader",
            options: {
              configFile: join(EXTENSION_DIR, "tsconfig.json"),
            },
          },
          exclude: [/node_modules/, /\.test\.ts$/],
        },
      ],
    },
    devtool: "source-map",
    optimization: {
      minimize: true,
    },
    plugins: [
      // 빌드 시 전역 상수로 주입 (런타임 조건문 없이 직접 대체)
      new webpack.DefinePlugin({
        __BUILD_API_URL__: JSON.stringify(buildApiUrl),
        __BUILD_API_CREDENTIAL__: JSON.stringify(buildApiCredential),
      }),
      new CopyPlugin({
        patterns: [
          { from: join(EXTENSION_DIR, "manifest.json"), to: "." },
          { from: join(EXTENSION_DIR, "public"), to: "." },
          {
            from: join(EXTENSION_DIR, "src", "popup", "popup.html"),
            to: "popup.html",
          },
          {
            from: join(EXTENSION_DIR, "src", "onboarding", "onboarding.html"),
            to: "onboarding.html",
          },
          {
            from: join(EXTENSION_DIR, "policy_templates"),
            to: "policy_templates",
          },
        ],
      }),
    ],
  };
}

/**
 * webpack 컴파일 실행
 */
function runWebpackBuild() {
  return new Promise((resolve) => {
    const config = createWebpackConfig();
    const compiler = webpack(config);

    compiler.run((err, stats) => {
      compiler.close(() => {});

      if (err) {
        resolve({ success: false, log: "", error: err.message });
        return;
      }

      const log = stats?.toString({ colors: false }) || "";

      if (stats?.hasErrors()) {
        const info = stats.toJson();
        resolve({
          success: false,
          log,
          error:
            info?.errors?.map((e) => e.message).join("\n") || "Build failed",
        });
        return;
      }

      resolve({ success: true, log });
    });
  });
}

/**
 * ZIP 파일 생성
 */
function createZip(version) {
  if (!existsSync(RELEASE_DIR)) {
    mkdirSync(RELEASE_DIR, { recursive: true });
  }

  const zipFileName = `shade-extension-${version}.zip`;
  const zipPath = join(RELEASE_DIR, zipFileName);

  return new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      const stats = statSync(zipPath);
      const fileBuffer = readFileSync(zipPath);
      const checksum = createHash("sha256").update(fileBuffer).digest("hex");

      resolve({ zipPath, checksum, fileSize: stats.size });
    });

    archive.on("error", (err) => reject(err));
    archive.pipe(output);
    archive.directory(DIST_DIR, false);
    archive.finalize();
  });
}

/**
 * 메인 함수
 */
async function main() {
  const version = process.argv[2] || "1.0.0";

  const result = {
    success: false,
    buildLog: `[${new Date().toISOString()}] 빌드 시작 (버전: ${version})\n`,
  };

  // manifest.json 버전 갱신 (빌드 전)
  const manifestPath = join(EXTENSION_DIR, "manifest.json");
  const originalManifest = readFileSync(manifestPath, "utf-8");

  let exitCode = 1;

  try {
    // 1. manifest.json version 필드를 빌드 버전으로 교체
    const manifest = JSON.parse(originalManifest);
    manifest.version = version;
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    result.buildLog += `[manifest] version "${version}" 으로 갱신\n`;

    // 2. webpack 빌드
    result.buildLog += "\n[webpack] 컴파일 시작...\n";
    const webpackResult = await runWebpackBuild();
    result.buildLog += webpackResult.log + "\n";

    if (!webpackResult.success) {
      result.error = webpackResult.error || "webpack 빌드 실패";
      result.buildLog += `\n[ERROR] ${webpackResult.error}`;
    } else {
      result.buildLog += "[webpack] 컴파일 완료\n";

      // 3. ZIP 생성
      result.buildLog += "\n[archiver] ZIP 파일 생성 중...\n";
      const zipResult = await createZip(version);
      result.buildLog += `[archiver] ZIP 생성 완료: ${zipResult.zipPath}\n`;
      result.buildLog += `[archiver] 파일 크기: ${(zipResult.fileSize / 1024).toFixed(2)} KB\n`;
      result.buildLog += `[archiver] 체크섬: ${zipResult.checksum}\n`;
      result.buildLog += `\n[${new Date().toISOString()}] 빌드 완료!\n`;

      result.success = true;
      result.zipPath = zipResult.zipPath;
      result.checksum = zipResult.checksum;
      result.fileSize = zipResult.fileSize;
      exitCode = 0;
    }
  } catch (error) {
    result.error = error.message || "알 수 없는 오류";
    result.buildLog += `\n[ERROR] ${result.error}\n`;
  } finally {
    // manifest.json 원본 복원 (소스 오염 방지)
    writeFileSync(manifestPath, originalManifest);
    result.buildLog += `[manifest] 원본 복원 완료\n`;
  }

  console.log(JSON.stringify(result));
  process.exit(exitCode);
}

main();
