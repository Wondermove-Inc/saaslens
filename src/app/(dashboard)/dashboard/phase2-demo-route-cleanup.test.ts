// src/app/(dashboard)/dashboard/phase2-demo-route-cleanup.test.ts
// Phase 2 RED: 데모 라우트 및 미사용 컴포넌트/액션 삭제 검증
// - 삭제 대상 파일이 존재하지 않아야 함
// - 프로덕션 유지 대상 파일이 모두 존재해야 함
// - 삭제 대상 모듈을 프로덕션에서 import하지 않아야 함

import { existsSync, readFileSync, readdirSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const PROJECT_ROOT = path.resolve(__dirname, "../../../../");

// ============================================================
// 1. 삭제 대상 파일 목록
// ============================================================

/** 데모 라우트 페이지 */
const DEMO_ROUTE_PAGES_TO_DELETE = [
  "src/app/(dashboard)/dashboard2/page.tsx",
  "src/app/(dashboard)/dashboard-v2-demo/page.tsx",
  "src/app/(dashboard)/dashboard-v2-cost/page.tsx",
  "src/app/(dashboard)/dashboard-v2-seat/page.tsx",
];

/** dashboard-v2-demo 전체 삭제 (프로덕션 미사용) */
const DASHBOARD_V2_DEMO_FILES_TO_DELETE = [
  "src/components/dashboard-v2-demo/index.ts",
  "src/components/dashboard-v2-demo/dashboard-v2-demo-client.tsx",
  "src/components/dashboard-v2-demo/cost-savings-hero.tsx",
  "src/components/dashboard-v2-demo/cost-trend-chart.tsx",
  "src/components/dashboard-v2-demo/kpi-card-grid.tsx",
  "src/components/dashboard-v2-demo/renewal-alerts-card.tsx",
  "src/components/dashboard-v2-demo/savings-opportunity-card.tsx",
  "src/components/dashboard-v2-demo/top-apps-table.tsx",
];

/** dashboard-v2-cost 삭제 대상 (프로덕션 사용 3개 제외) */
const DASHBOARD_V2_COST_FILES_TO_DELETE = [
  "src/components/dashboard-v2-cost/dashboard-v2-cost-client.tsx",
  "src/components/dashboard-v2-cost/cost-kpi-cards.tsx",
  "src/components/dashboard-v2-cost/optimization-hero.tsx",
  "src/components/dashboard-v2-cost/savings-breakdown.tsx",
];

/** dashboard-v2-seat 삭제 대상 (프로덕션 사용 1개 제외) */
const DASHBOARD_V2_SEAT_FILES_TO_DELETE = [
  "src/components/dashboard-v2-seat/dashboard-v2-seat-client.tsx",
  "src/components/dashboard-v2-seat/seat-kpi-cards.tsx",
  "src/components/dashboard-v2-seat/app-efficiency-matrix.tsx",
  "src/components/dashboard-v2-seat/optimization-actions.tsx",
];

/** dashboard2 컴포넌트 삭제 대상 (프로덕션 사용 2개 제외) */
const DASHBOARD2_COMPONENT_FILES_TO_DELETE = [
  "src/components/dashboard2/dashboard2-page-client.tsx",
  "src/components/dashboard2/kpi-cards.tsx",
  "src/components/dashboard2/alerts-banner.tsx",
  "src/components/dashboard2/app-status-overview-card.tsx",
  "src/components/dashboard2/app-status-overview-card.test.tsx",
  "src/components/dashboard2/apps-table-with-tabs.tsx",
  "src/components/dashboard2/apps-table.utils.tsx",
  "src/components/dashboard2/detected-apps-table.tsx",
  "src/components/dashboard2/device-detected-apps-card.tsx",
  "src/components/dashboard2/license-efficiency-card.tsx",
  "src/components/dashboard2/monthly-spend-trend-chart.tsx",
  "src/components/dashboard2/onboarding-offboarding-card.tsx",
  "src/components/dashboard2/security-risk-overview-card.tsx",
  "src/components/dashboard2/shadow-it-table.tsx",
  "src/components/dashboard2/spend-by-category-card.tsx",
  "src/components/dashboard2/spend-by-category-card.test.tsx",
  "src/components/dashboard2/spending-apps-table.tsx",
  "src/components/dashboard2/top-spending-apps-table.tsx",
  "src/components/dashboard2/urgent-renewals-card.tsx",
  "src/components/dashboard2/user-overview-card.tsx",
  "src/components/dashboard2/users-vs-licenses-chart.tsx",
];

/** dashboard2 액션 삭제 대상 (dashboard2-seat, dashboard2-cost, dashboard2-renewals는 AI read-tool에서 사용하므로 유지) */
const DASHBOARD2_ACTIONS_TO_DELETE = [
  "src/actions/dashboard2.ts",
  "src/actions/dashboard2-security.ts",
  "src/actions/dashboard2-summary.ts",
  "src/actions/dashboard2-users.ts",
  "src/actions/dashboard2-devices.ts",
];

const ALL_FILES_TO_DELETE = [
  ...DEMO_ROUTE_PAGES_TO_DELETE,
  ...DASHBOARD_V2_DEMO_FILES_TO_DELETE,
  ...DASHBOARD_V2_COST_FILES_TO_DELETE,
  ...DASHBOARD_V2_SEAT_FILES_TO_DELETE,
  ...DASHBOARD2_COMPONENT_FILES_TO_DELETE,
  ...DASHBOARD2_ACTIONS_TO_DELETE,
];

// ============================================================
// 2. 프로덕션 유지 대상 파일 목록
// ============================================================

const PRODUCTION_MUST_KEEP_FILES = [
  // Phase 3 통합 후: 모든 컴포넌트가 new-dashboard/에 위치
  "src/components/dashboard/new-dashboard-client.tsx",
  "src/components/dashboard/seat-utilization-chart.tsx",
  "src/components/dashboard/per-user-license-apps-chart.tsx",
  "src/components/dashboard/cost-bar-chart.tsx",
  "src/components/dashboard/cost-apps-table.tsx",
  "src/components/dashboard/upcoming-renewals.tsx",
  "src/components/dashboard/department-spend-chart.tsx",
  // 프로덕션 액션 (dashboard2-seat: 대시보드, dashboard2-cost/renewals: AI read-tool)
  "src/actions/dashboard2-seat.ts",
  "src/actions/dashboard2-cost.ts",
  "src/actions/dashboard2-cost.constants.ts",
  "src/actions/dashboard2-renewals.ts",
  // 프로덕션 타입
  "src/types/dashboard2.ts",
  // 페이지
  "src/app/(dashboard)/dashboard/page.tsx",
];

// ============================================================
// Helper
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

describe("Phase 2: 데모 라우트 정리 안전성 검증", () => {
  describe("삭제 대상 파일은 존재하지 않아야 한다", () => {
    for (const filePath of ALL_FILES_TO_DELETE) {
      it(`${filePath} 이(가) 삭제되어야 한다`, () => {
        const abs = path.resolve(PROJECT_ROOT, filePath);
        expect(existsSync(abs), `삭제 대상 파일이 아직 존재: ${filePath}`).toBe(
          false
        );
      });
    }
  });

  describe("프로덕션 필수 파일이 모두 존재해야 한다", () => {
    for (const filePath of PRODUCTION_MUST_KEEP_FILES) {
      it(`${filePath} 이(가) 존재해야 한다`, () => {
        const abs = path.resolve(PROJECT_ROOT, filePath);
        expect(existsSync(abs), `프로덕션 필수 파일 누락: ${filePath}`).toBe(
          true
        );
      });
    }
  });

  describe("삭제된 모듈을 프로덕션 코드에서 import하지 않아야 한다", () => {
    const productionDirs = [
      path.join(PROJECT_ROOT, "src/app"),
      path.join(PROJECT_ROOT, "src/components/dashboard"),
      path.join(PROJECT_ROOT, "src/components/common"),
      path.join(PROJECT_ROOT, "src/actions"),
      path.join(PROJECT_ROOT, "src/lib"),
    ];

    const productionFiles: string[] = [];
    for (const dir of productionDirs) {
      productionFiles.push(...collectTsFiles(dir));
    }

    // 삭제 대상 + 삭제된 라우트 페이지 제외
    const deleteAbsPaths = new Set(
      ALL_FILES_TO_DELETE.map((f) => path.resolve(PROJECT_ROOT, f))
    );
    const filtered = productionFiles.filter((f) => !deleteAbsPaths.has(f));

    // 삭제된 모듈 import 패턴
    const deletedImportPatterns = [
      // dashboard-v2-demo 전체 삭제
      "@/components/dashboard-v2-demo",
      // dashboard-v2-cost 삭제 대상
      "@/components/dashboard-v2-cost/dashboard-v2-cost-client",
      "@/components/dashboard-v2-cost/cost-kpi-cards",
      "@/components/dashboard-v2-cost/optimization-hero",
      "@/components/dashboard-v2-cost/savings-breakdown",
      // dashboard-v2-seat 삭제 대상
      "@/components/dashboard-v2-seat/dashboard-v2-seat-client",
      "@/components/dashboard-v2-seat/seat-kpi-cards",
      "@/components/dashboard-v2-seat/app-efficiency-matrix",
      "@/components/dashboard-v2-seat/optimization-actions",
      // dashboard2 삭제 대상 (개별)
      "@/components/dashboard2/dashboard2-page-client",
      "@/components/dashboard2/kpi-cards",
      "@/components/dashboard2/alerts-banner",
      "@/components/dashboard2/app-status-overview-card",
      "@/components/dashboard2/apps-table-with-tabs",
      "@/components/dashboard2/detected-apps-table",
      "@/components/dashboard2/device-detected-apps-card",
      "@/components/dashboard2/license-efficiency-card",
      "@/components/dashboard2/monthly-spend-trend-chart",
      "@/components/dashboard2/onboarding-offboarding-card",
      "@/components/dashboard2/security-risk-overview-card",
      "@/components/dashboard2/shadow-it-table",
      "@/components/dashboard2/spend-by-category-card",
      "@/components/dashboard2/spending-apps-table",
      "@/components/dashboard2/top-spending-apps-table",
      "@/components/dashboard2/urgent-renewals-card",
      "@/components/dashboard2/user-overview-card",
      "@/components/dashboard2/users-vs-licenses-chart",
      // 삭제된 액션 (dashboard2-cost, dashboard2-renewals는 AI read-tool에서 사용하므로 유지)
      "@/actions/dashboard2-security",
      "@/actions/dashboard2-summary",
      "@/actions/dashboard2-users",
      "@/actions/dashboard2-devices",
    ];

    it("삭제된 모듈을 import하는 프로덕션 파일이 없어야 한다", () => {
      const violations: { file: string; pattern: string }[] = [];

      for (const filePath of filtered) {
        const content = readFileSync(filePath, "utf-8");
        for (const pattern of deletedImportPatterns) {
          if (content.includes(pattern)) {
            violations.push({
              file: path.relative(PROJECT_ROOT, filePath),
              pattern,
            });
          }
        }
      }

      expect(
        violations,
        `프로덕션에서 삭제된 모듈 import 발견:\n${violations
          .map((v) => `  ${v.file} → ${v.pattern}`)
          .join("\n")}`
      ).toHaveLength(0);
    });

    it("@/actions/dashboard2 barrel import가 프로덕션 코드에 없어야 한다", () => {
      const violations: string[] = [];
      for (const filePath of filtered) {
        const content = readFileSync(filePath, "utf-8");
        // @/actions/dashboard2" 또는 @/actions/dashboard2' (barrel만, dashboard2-seat 아님)
        if (/from\s+["']@\/actions\/dashboard2["']/.test(content)) {
          violations.push(path.relative(PROJECT_ROOT, filePath));
        }
      }
      expect(
        violations,
        `@/actions/dashboard2 barrel import 발견:\n${violations.join("\n")}`
      ).toHaveLength(0);
    });
  });

  describe("보존된 index.ts가 삭제된 컴포넌트를 export하지 않아야 한다", () => {
    it("dashboard2/index.ts는 seat-utilization-chart와 per-user-license-apps-chart만 export해야 한다", () => {
      const indexPath = path.resolve(
        PROJECT_ROOT,
        "src/components/dashboard2/index.ts"
      );
      if (!existsSync(indexPath)) return;
      const content = readFileSync(indexPath, "utf-8");

      // 삭제된 컴포넌트 export 금지
      expect(content).not.toContain("dashboard2-page-client");
      expect(content).not.toContain("kpi-cards");
      expect(content).not.toContain("alerts-banner");
      expect(content).not.toContain("shadow-it-table");
      expect(content).not.toContain("app-status-overview-card");

      // 유지 대상 export 확인
      expect(content).toContain("seat-utilization-chart");
      expect(content).toContain("per-user-license-apps-chart");
    });

    it("dashboard-v2-cost/index.ts는 cost-bar-chart, cost-apps-table, upcoming-renewals만 export해야 한다", () => {
      const indexPath = path.resolve(
        PROJECT_ROOT,
        "src/components/dashboard-v2-cost/index.ts"
      );
      if (!existsSync(indexPath)) return;
      const content = readFileSync(indexPath, "utf-8");

      expect(content).not.toContain("dashboard-v2-cost-client");
      expect(content).not.toContain("cost-kpi-cards");
      expect(content).not.toContain("optimization-hero");
      expect(content).not.toContain("savings-breakdown");

      expect(content).toContain("cost-bar-chart");
      expect(content).toContain("cost-apps-table");
      expect(content).toContain("upcoming-renewals");
    });

    it("dashboard-v2-seat/index.ts는 department-spend-chart만 export해야 한다", () => {
      const indexPath = path.resolve(
        PROJECT_ROOT,
        "src/components/dashboard-v2-seat/index.ts"
      );
      if (!existsSync(indexPath)) return;
      const content = readFileSync(indexPath, "utf-8");

      expect(content).not.toContain("dashboard-v2-seat-client");
      expect(content).not.toContain("seat-kpi-cards");
      expect(content).not.toContain("app-efficiency-matrix");
      expect(content).not.toContain("optimization-actions");

      expect(content).toContain("department-spend-chart");
    });
  });

  describe("데모 라우트 디렉토리가 정리되어야 한다", () => {
    it("dashboard-v2-demo 디렉토리가 존재하지 않아야 한다", () => {
      const dir = path.resolve(
        PROJECT_ROOT,
        "src/components/dashboard-v2-demo"
      );
      expect(existsSync(dir), "dashboard-v2-demo 디렉토리 아직 존재").toBe(
        false
      );
    });

    it("dashboard2 라우트 디렉토리가 존재하지 않아야 한다", () => {
      const dir = path.resolve(PROJECT_ROOT, "src/app/(dashboard)/dashboard2");
      expect(existsSync(dir), "dashboard2 라우트 디렉토리 아직 존재").toBe(
        false
      );
    });

    it("dashboard-v2-demo 라우트 디렉토리가 존재하지 않아야 한다", () => {
      const dir = path.resolve(
        PROJECT_ROOT,
        "src/app/(dashboard)/dashboard-v2-demo"
      );
      expect(
        existsSync(dir),
        "dashboard-v2-demo 라우트 디렉토리 아직 존재"
      ).toBe(false);
    });

    it("dashboard-v2-cost 라우트 디렉토리가 존재하지 않아야 한다", () => {
      const dir = path.resolve(
        PROJECT_ROOT,
        "src/app/(dashboard)/dashboard-v2-cost"
      );
      expect(
        existsSync(dir),
        "dashboard-v2-cost 라우트 디렉토리 아직 존재"
      ).toBe(false);
    });

    it("dashboard-v2-seat 라우트 디렉토리가 존재하지 않아야 한다", () => {
      const dir = path.resolve(
        PROJECT_ROOT,
        "src/app/(dashboard)/dashboard-v2-seat"
      );
      expect(
        existsSync(dir),
        "dashboard-v2-seat 라우트 디렉토리 아직 존재"
      ).toBe(false);
    });
  });
});
