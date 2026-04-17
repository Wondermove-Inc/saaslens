// src/app/(dashboard)/dashboard/phase1-unused-code-cleanup.test.ts
// Phase 1 RED: 미사용 코드 삭제 후 프로덕션 /dashboard 정상 동작 검증
// - 삭제 대상 파일이 프로덕션 코드에서 import되지 않는지 검증
// - 프로덕션 유지 대상 파일이 모두 존재하는지 검증

import { existsSync, readFileSync, readdirSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = path.resolve(__dirname, "../../../");
const PROJECT_ROOT = path.resolve(SRC_ROOT, "../");

// ============================================================
// 1. 삭제 대상 파일 목록 (Phase 1)
// ============================================================

/** dashboard-v3 디렉토리에서 삭제할 파일들 (DashboardAlertBanner만 유지) */
const DASHBOARD_V3_FILES_TO_DELETE = [
  "src/components/dashboard-v3/dashboard-v3-client.tsx",
  "src/components/dashboard-v3/anomaly-kpi-card.tsx",
  "src/components/dashboard-v3/apps-without-sub-kpi-card.tsx",
  "src/components/dashboard-v3/total-cost-kpi-card.tsx",
  "src/components/dashboard-v3/terminated-kpi-card.tsx",
];

/**
 * Phase 1에서 삭제된 구 dashboard 컴포넌트 파일들.
 * Phase 5에서 new-dashboard/ → dashboard/로 rename되어 경로가 충돌하므로,
 * Phase 3에서 이동되지 않은(프로덕션 미사용) 파일만 검증합니다.
 * upcoming-renewals 등은 Phase 3에서 이동되어 현재 dashboard/에 존재합니다.
 */
const DASHBOARD_FILES_TO_DELETE = [
  "src/components/dashboard/dashboard-page-client.tsx",
  "src/components/dashboard/dashboard-page-client.test.tsx",
  "src/components/dashboard/cost-summary-card.tsx",
  "src/components/dashboard/cost-summary-card.test.tsx",
  "src/components/dashboard/dashboard-customization-dialog.tsx",
  "src/components/dashboard/department-overview.tsx",
  "src/components/dashboard/discovery-kpis.tsx",
  "src/components/dashboard/discovery-sources.tsx",
  "src/components/dashboard/monthly-cost-trend.tsx",
  "src/components/dashboard/monthly-cost-trend.test.tsx",
  "src/components/dashboard/pending-confirmations-card.tsx",
  "src/components/dashboard/pending-confirmations-card.test.tsx",
  "src/components/dashboard/savings-opportunity-card.tsx",
  "src/components/dashboard/savings-opportunity-card.test.tsx",
  "src/components/dashboard/security-overview.tsx",
  "src/components/dashboard/stats-cards.tsx",
  "src/components/dashboard/stats-cards.test.tsx",
  "src/components/dashboard/top-apps-cost-chart.tsx",
  "src/components/dashboard/top-apps-cost-chart.test.tsx",
  // upcoming-renewals는 Phase 3에서 이동되어 현재 dashboard/에 존재 → 제외
  "src/components/dashboard/cost-analytics-section.tsx",
  "src/components/dashboard/cost-anomaly-alert.tsx",
  "src/components/dashboard/cost-anomaly-alert.test.tsx",
  "src/components/dashboard/date-range-filter.tsx",
  "src/components/dashboard/date-range-filter.test.tsx",
  "src/components/dashboard/export-buttons.tsx",
  "src/components/dashboard/terminated-users-alert.tsx",
  "src/components/dashboard/terminated-users-alert.test.tsx",
  "src/components/dashboard/grid/dashboard-grid-item.tsx",
];

/** 타입/액션 삭제 대상 */
const TYPE_ACTION_FILES_TO_DELETE = [
  "src/types/dashboard-grid.ts",
  "src/types/dashboard-settings.ts",
  "src/actions/dashboard-settings.ts",
  "src/actions/dashboard-settings.test.ts",
];

const ALL_FILES_TO_DELETE = [
  ...DASHBOARD_V3_FILES_TO_DELETE,
  ...DASHBOARD_FILES_TO_DELETE,
  ...TYPE_ACTION_FILES_TO_DELETE,
];

// ============================================================
// 2. 프로덕션 유지 대상 파일 목록
// ============================================================

/** 삭제하면 안 되는 프로덕션 필수 파일 */
const PRODUCTION_MUST_KEEP_FILES = [
  // new-dashboard (Phase 3 통합 후: 모든 컴포넌트가 여기에 위치)
  "src/components/dashboard/new-dashboard-client.tsx",
  "src/components/dashboard/bento-kpi-cards.tsx",
  "src/components/dashboard/bento-optimization-hero.tsx",
  "src/components/dashboard/apps-by-category.tsx",
  "src/components/dashboard/recent-activity.tsx",
  "src/components/dashboard/cost-bar-chart.tsx",
  "src/components/dashboard/cost-apps-table.tsx",
  "src/components/dashboard/upcoming-renewals.tsx",
  "src/components/dashboard/seat-utilization-chart.tsx",
  "src/components/dashboard/per-user-license-apps-chart.tsx",
  "src/components/dashboard/department-spend-chart.tsx",
  "src/components/dashboard/dashboard-alert-banner.tsx",
  "src/components/dashboard/index.ts",
  // 페이지 파일
  "src/app/(dashboard)/dashboard/page.tsx",
  "src/app/(dashboard)/dashboard/transforms.ts",
  "src/app/(dashboard)/dashboard/transforms.test.ts",
  // 프로덕션 타입/액션 (Phase 4: dashboard-v3.ts → dashboard.ts 병합)
  "src/types/dashboard.ts",
  "src/actions/dashboard.ts",
  "src/actions/dashboard.test.ts",
];

// ============================================================
// Helper: 재귀적으로 .ts/.tsx 파일 수집
// ============================================================
function collectTsFiles(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTsFiles(fullPath));
    } else if (
      /\.(ts|tsx)$/.test(entry.name) &&
      !entry.name.endsWith(".test.ts") &&
      !entry.name.endsWith(".test.tsx")
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

// ============================================================
// Tests
// ============================================================

describe("Phase 1: 미사용 코드 삭제 안전성 검증", () => {
  describe("삭제 대상 파일이 프로덕션 코드에서 import되지 않아야 한다", () => {
    // 프로덕션 소스 디렉토리 (삭제 대상 제외)
    const productionDirs = [
      path.join(SRC_ROOT, "app"),
      path.join(SRC_ROOT, "components/dashboard"),
      path.join(SRC_ROOT, "components/common"),
      path.join(SRC_ROOT, "actions"),
      path.join(SRC_ROOT, "lib"),
      path.join(SRC_ROOT, "hooks"),
      path.join(SRC_ROOT, "stores"),
    ];

    // 삭제 대상에서 모듈 경로 추출
    const deletionModulePaths = ALL_FILES_TO_DELETE.filter(
      (f) => !f.endsWith(".test.ts") && !f.endsWith(".test.tsx")
    ).map((f) => {
      // src/components/dashboard/cost-summary-card.tsx → @/components/dashboard/cost-summary-card
      const withoutSrcAndExt = f
        .replace(/^src\//, "@/")
        .replace(/\.(ts|tsx)$/, "");
      return withoutSrcAndExt;
    });

    // 프로덕션 파일 수집
    const productionFiles: string[] = [];
    for (const dir of productionDirs) {
      productionFiles.push(...collectTsFiles(dir));
    }

    // 삭제 대상 파일 자체는 검사에서 제외
    const deleteAbsolutePaths = new Set(
      ALL_FILES_TO_DELETE.map((f) => path.resolve(PROJECT_ROOT, f))
    );
    const filteredProductionFiles = productionFiles.filter(
      (f) => !deleteAbsolutePaths.has(f)
    );

    it("삭제 대상 모듈을 import하는 프로덕션 파일이 없어야 한다", () => {
      const violations: { file: string; importPath: string; line: string }[] =
        [];

      for (const filePath of filteredProductionFiles) {
        const content = readFileSync(filePath, "utf-8");
        const lines = content.split("\n");

        for (const line of lines) {
          // import 문 감지
          if (!line.includes("from") || !line.includes("import")) continue;

          for (const modulePath of deletionModulePaths) {
            if (line.includes(modulePath)) {
              const relPath = path.relative(PROJECT_ROOT, filePath);
              violations.push({
                file: relPath,
                importPath: modulePath,
                line: line.trim(),
              });
            }
          }
        }
      }

      expect(
        violations,
        `프로덕션 코드에서 삭제 대상 모듈을 import하는 파일이 발견됨:\n${violations
          .map((v) => `  ${v.file} → ${v.importPath}\n    ${v.line}`)
          .join("\n")}`
      ).toHaveLength(0);
    });

    it("dashboard-settings 관련 import가 프로덕션 코드에 없어야 한다", () => {
      const settingsViolations: string[] = [];

      for (const filePath of filteredProductionFiles) {
        const content = readFileSync(filePath, "utf-8");
        if (
          content.includes("@/types/dashboard-settings") ||
          content.includes("@/actions/dashboard-settings")
        ) {
          settingsViolations.push(path.relative(PROJECT_ROOT, filePath));
        }
      }

      expect(
        settingsViolations,
        `dashboard-settings를 import하는 프로덕션 파일:\n${settingsViolations.join("\n")}`
      ).toHaveLength(0);
    });

    it("dashboard-grid 타입 import가 프로덕션 코드에 없어야 한다", () => {
      const gridViolations: string[] = [];

      for (const filePath of filteredProductionFiles) {
        const content = readFileSync(filePath, "utf-8");
        if (content.includes("@/types/dashboard-grid")) {
          gridViolations.push(path.relative(PROJECT_ROOT, filePath));
        }
      }

      expect(
        gridViolations,
        `dashboard-grid를 import하는 프로덕션 파일:\n${gridViolations.join("\n")}`
      ).toHaveLength(0);
    });
  });

  describe("프로덕션 필수 파일이 모두 존재해야 한다", () => {
    for (const filePath of PRODUCTION_MUST_KEEP_FILES) {
      it(`${filePath} 이(가) 존재해야 한다`, () => {
        const absolutePath = path.resolve(PROJECT_ROOT, filePath);
        expect(
          existsSync(absolutePath),
          `프로덕션 필수 파일이 누락됨: ${filePath}`
        ).toBe(true);
      });
    }
  });

  describe("삭제 대상 파일은 존재하지 않아야 한다 (삭제 후 검증)", () => {
    for (const filePath of ALL_FILES_TO_DELETE) {
      it(`${filePath} 이(가) 삭제되어야 한다`, () => {
        const absolutePath = path.resolve(PROJECT_ROOT, filePath);
        expect(
          existsSync(absolutePath),
          `삭제 대상 파일이 아직 존재함: ${filePath}`
        ).toBe(false);
      });
    }
  });

  describe("dashboard-v3 index.ts가 DashboardAlertBanner만 export해야 한다", () => {
    it("dashboard-v3 index.ts에서 삭제된 컴포넌트를 export하지 않아야 한다", () => {
      const indexPath = path.resolve(
        PROJECT_ROOT,
        "src/components/dashboard-v3/index.ts"
      );

      if (!existsSync(indexPath)) {
        // index.ts가 삭제된 경우 - 다른 방식으로 import해야 함
        return;
      }

      const content = readFileSync(indexPath, "utf-8");

      // 삭제된 컴포넌트를 export하면 안 됨
      expect(content).not.toContain("dashboard-v3-client");
      expect(content).not.toContain("anomaly-kpi-card");
      expect(content).not.toContain("apps-without-sub-kpi-card");
      expect(content).not.toContain("total-cost-kpi-card");
      expect(content).not.toContain("terminated-kpi-card");

      // DashboardAlertBanner는 유지
      expect(content).toContain("dashboard-alert-banner");
    });
  });
});
