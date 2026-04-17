// src/app/(dashboard)/dashboard/phase3-component-consolidation.test.ts
// Phase 3 RED: 프로덕션 컴포넌트를 new-dashboard/로 통합 검증
// - 이동된 컴포넌트가 new-dashboard/에 존재해야 함
// - 이전 디렉토리(dashboard/, dashboard2/, v2-cost/, v2-seat/, v3/)가 삭제되어야 함
// - Bento pass-through 래퍼가 제거되어야 함
// - new-dashboard-client가 이동된 컴포넌트를 직접 import해야 함

import { existsSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const PROJECT_ROOT = path.resolve(__dirname, "../../../../");
const NEW_DASHBOARD = "src/components/dashboard";

// ============================================================
// 1. new-dashboard/에 존재해야 하는 이동된 파일
// ============================================================

const MOVED_FILES_MUST_EXIST = [
  // dashboard/ → new-dashboard/
  `${NEW_DASHBOARD}/apps-by-category.tsx`,
  `${NEW_DASHBOARD}/apps-by-category.test.tsx`,
  `${NEW_DASHBOARD}/recent-activity.tsx`,
  `${NEW_DASHBOARD}/recent-activity.test.tsx`,
  // dashboard2/ → new-dashboard/
  `${NEW_DASHBOARD}/seat-utilization-chart.tsx`,
  `${NEW_DASHBOARD}/per-user-license-apps-chart.tsx`,
  // dashboard-v2-cost/ → new-dashboard/
  `${NEW_DASHBOARD}/cost-bar-chart.tsx`,
  `${NEW_DASHBOARD}/cost-apps-table.tsx`,
  `${NEW_DASHBOARD}/upcoming-renewals.tsx`,
  // dashboard-v2-seat/ → new-dashboard/
  `${NEW_DASHBOARD}/department-spend-chart.tsx`,
  // dashboard-v3/ → new-dashboard/
  `${NEW_DASHBOARD}/dashboard-alert-banner.tsx`,
  `${NEW_DASHBOARD}/dashboard-alert-banner.test.tsx`,
];

// ============================================================
// 2. 자체 구현 컴포넌트 (이동 아님, 기존 유지)
// ============================================================

const SELF_IMPLEMENTED_MUST_EXIST = [
  `${NEW_DASHBOARD}/new-dashboard-client.tsx`,
  `${NEW_DASHBOARD}/new-dashboard-client.test.tsx`,
  `${NEW_DASHBOARD}/bento-optimization-hero.tsx`,
  `${NEW_DASHBOARD}/bento-kpi-cards.tsx`,
  `${NEW_DASHBOARD}/anomaly-card.tsx`,
  `${NEW_DASHBOARD}/apps-without-sub-card.tsx`,
  `${NEW_DASHBOARD}/terminated-card.tsx`,
  `${NEW_DASHBOARD}/total-cost-card.tsx`,
  `${NEW_DASHBOARD}/index.ts`,
];

// ============================================================
// 3. 삭제되어야 하는 Bento pass-through 래퍼
// ============================================================

const BENTO_WRAPPERS_TO_DELETE = [
  `${NEW_DASHBOARD}/bento-apps-by-category.tsx`,
  `${NEW_DASHBOARD}/bento-recent-activity.tsx`,
  `${NEW_DASHBOARD}/bento-cost-bar-chart.tsx`,
  `${NEW_DASHBOARD}/bento-cost-apps-table.tsx`,
  `${NEW_DASHBOARD}/bento-upcoming-renewals.tsx`,
  `${NEW_DASHBOARD}/bento-seat-utilization.tsx`,
  `${NEW_DASHBOARD}/bento-per-user-license.tsx`,
  `${NEW_DASHBOARD}/bento-department-spend.tsx`,
];

// ============================================================
// 4. 삭제되어야 하는 이전 디렉토리
// ============================================================

// Phase 5에서 new-dashboard/ → dashboard/ rename됨. dashboard/는 현재 존재.
const OLD_DIRS_TO_DELETE = [
  "src/components/dashboard2",
  "src/components/dashboard-v2-cost",
  "src/components/dashboard-v2-seat",
  "src/components/dashboard-v3",
];

// ============================================================
// Tests
// ============================================================

describe("Phase 3: 프로덕션 컴포넌트 통합 검증", () => {
  describe("이동된 컴포넌트가 new-dashboard/에 존재해야 한다", () => {
    for (const filePath of MOVED_FILES_MUST_EXIST) {
      it(`${filePath} 존재`, () => {
        const abs = path.resolve(PROJECT_ROOT, filePath);
        expect(existsSync(abs), `이동된 파일 누락: ${filePath}`).toBe(true);
      });
    }
  });

  describe("자체 구현 컴포넌트가 유지되어야 한다", () => {
    for (const filePath of SELF_IMPLEMENTED_MUST_EXIST) {
      it(`${filePath} 존재`, () => {
        const abs = path.resolve(PROJECT_ROOT, filePath);
        expect(existsSync(abs), `자체 구현 파일 누락: ${filePath}`).toBe(true);
      });
    }
  });

  describe("Bento pass-through 래퍼가 삭제되어야 한다", () => {
    for (const filePath of BENTO_WRAPPERS_TO_DELETE) {
      it(`${filePath} 삭제됨`, () => {
        const abs = path.resolve(PROJECT_ROOT, filePath);
        expect(existsSync(abs), `Bento 래퍼 아직 존재: ${filePath}`).toBe(
          false
        );
      });
    }
  });

  describe("이전 디렉토리가 완전히 삭제되어야 한다", () => {
    for (const dirPath of OLD_DIRS_TO_DELETE) {
      it(`${dirPath}/ 삭제됨`, () => {
        const abs = path.resolve(PROJECT_ROOT, dirPath);
        expect(existsSync(abs), `이전 디렉토리 아직 존재: ${dirPath}`).toBe(
          false
        );
      });
    }
  });

  describe("new-dashboard-client가 외부 디렉토리를 import하지 않아야 한다", () => {
    it("@/components/dashboard/ import 없음", () => {
      const clientPath = path.resolve(
        PROJECT_ROOT,
        `${NEW_DASHBOARD}/new-dashboard-client.tsx`
      );
      const content = readFileSync(clientPath, "utf-8");
      expect(content).not.toMatch(/from\s+["']@\/components\/dashboard\//);
    });

    it("@/components/dashboard2/ import 없음", () => {
      const clientPath = path.resolve(
        PROJECT_ROOT,
        `${NEW_DASHBOARD}/new-dashboard-client.tsx`
      );
      const content = readFileSync(clientPath, "utf-8");
      expect(content).not.toMatch(/from\s+["']@\/components\/dashboard2\//);
    });

    it("@/components/dashboard-v2-cost/ import 없음", () => {
      const clientPath = path.resolve(
        PROJECT_ROOT,
        `${NEW_DASHBOARD}/new-dashboard-client.tsx`
      );
      const content = readFileSync(clientPath, "utf-8");
      expect(content).not.toMatch(
        /from\s+["']@\/components\/dashboard-v2-cost\//
      );
    });

    it("@/components/dashboard-v2-seat/ import 없음", () => {
      const clientPath = path.resolve(
        PROJECT_ROOT,
        `${NEW_DASHBOARD}/new-dashboard-client.tsx`
      );
      const content = readFileSync(clientPath, "utf-8");
      expect(content).not.toMatch(
        /from\s+["']@\/components\/dashboard-v2-seat\//
      );
    });

    it("@/components/dashboard-v3/ import 없음", () => {
      const clientPath = path.resolve(
        PROJECT_ROOT,
        `${NEW_DASHBOARD}/new-dashboard-client.tsx`
      );
      const content = readFileSync(clientPath, "utf-8");
      expect(content).not.toMatch(/from\s+["']@\/components\/dashboard-v3/);
    });

    it("삭제된 bento- 래퍼를 import하지 않아야 한다", () => {
      const clientPath = path.resolve(
        PROJECT_ROOT,
        `${NEW_DASHBOARD}/new-dashboard-client.tsx`
      );
      const content = readFileSync(clientPath, "utf-8");
      expect(content).not.toContain("bento-apps-by-category");
      expect(content).not.toContain("bento-recent-activity");
      expect(content).not.toContain("bento-cost-bar-chart");
      expect(content).not.toContain("bento-cost-apps-table");
      expect(content).not.toContain("bento-upcoming-renewals");
      expect(content).not.toContain("bento-seat-utilization");
      expect(content).not.toContain("bento-per-user-license");
      expect(content).not.toContain("bento-department-spend");
    });
  });

  describe("new-dashboard/index.ts가 정리되어야 한다", () => {
    it("삭제된 bento 래퍼를 export하지 않아야 한다", () => {
      const indexPath = path.resolve(PROJECT_ROOT, `${NEW_DASHBOARD}/index.ts`);
      const content = readFileSync(indexPath, "utf-8");
      expect(content).not.toContain("BentoAppsByCategory");
      expect(content).not.toContain("BentoCostAppsTable");
      expect(content).not.toContain("BentoCostBarChart");
      expect(content).not.toContain("BentoDepartmentSpend");
      expect(content).not.toContain("BentoPerUserLicense");
      expect(content).not.toContain("BentoRecentActivity");
      expect(content).not.toContain("BentoSeatUtilization");
      expect(content).not.toContain("BentoUpcomingRenewals");
    });

    it("이동된 컴포넌트를 export해야 한다", () => {
      const indexPath = path.resolve(PROJECT_ROOT, `${NEW_DASHBOARD}/index.ts`);
      const content = readFileSync(indexPath, "utf-8");
      expect(content).toContain("AppsByCategory");
      expect(content).toContain("RecentActivity");
      expect(content).toContain("CostBarChart");
      expect(content).toContain("CostAppsTable");
      expect(content).toContain("UpcomingRenewals");
      expect(content).toContain("SeatUtilizationChart");
      expect(content).toContain("PerUserLicenseAppsChart");
      expect(content).toContain("DepartmentSpendChart");
      expect(content).toContain("DashboardAlertBanner");
    });
  });
});
