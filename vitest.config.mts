import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    // 테스트 환경 설정
    environment: "jsdom",
    globals: true,
    setupFiles: [
      "./src/extensions/chrome/src/test/setup.ts",
      "./vitest.setup.ts",
    ],

    // 테스트 파일 패턴
    include: [
      "src/**/*.test.{ts,tsx}",
      "tests/**/*.test.{ts,tsx}",
      "prisma/**/*.test.{ts,tsx}",
    ],
    exclude: [
      "node_modules",
      "packages/**",
      ".next",
      // TODO (v0.1.1): module-scope chrome.webNavigation call crashes test discovery
      "src/extensions/chrome/src/background/index.test.ts",
    ],

    // 커버리지 설정
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.d.ts",
        "src/types/**",
        "src/**/index.ts",
        "src/app/layout.tsx",
        "src/app/**/layout.tsx",
        "src/app/**/loading.tsx",
        "src/app/**/error.tsx",
        "src/app/**/not-found.tsx",
      ],
      // 80% 커버리지 임계값
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },

    // 리포터 설정
    reporters: ["default", "html"],

    // framer-motion ESM 호환성 (jsdom에서 정상 동작하도록)
    server: {
      deps: {
        inline: ["framer-motion"],
      },
    },
  },

  // Path aliases (tsconfig.json과 동기화)
  resolve: {
    alias: {
      // UI 컴포넌트는 서브모듈에서 가져옴
      "@/components/ui": path.resolve(
        __dirname,
        "./packages/ui-registry/src/components/ui"
      ),
      // hooks: 프로젝트 hooks 우선, 없으면 서브모듈 폴백
      "@/hooks/use-count-up": path.resolve(
        __dirname,
        "./src/hooks/use-count-up"
      ),
      "@/hooks/use-dismissed-alerts": path.resolve(
        __dirname,
        "./src/hooks/use-dismissed-alerts"
      ),
      "@/hooks": path.resolve(__dirname, "./packages/ui-registry/src/hooks"),
      // lib/utils/renewal-date는 src에서 가져옴 (@/lib/utils보다 먼저 등록)
      "@/lib/utils/renewal-date": path.resolve(
        __dirname,
        "./src/lib/utils/renewal-date"
      ),
      // lib/utils/domain-extractor는 src에서 가져옴 (@/lib/utils보다 먼저 등록)
      "@/lib/utils/domain-extractor": path.resolve(
        __dirname,
        "./src/lib/utils/domain-extractor"
      ),
      // lib/utils는 서브모듈에서 가져옴
      "@/lib/utils": path.resolve(
        __dirname,
        "./packages/ui-registry/src/lib/utils"
      ),
      // 나머지는 src에서 가져옴
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
