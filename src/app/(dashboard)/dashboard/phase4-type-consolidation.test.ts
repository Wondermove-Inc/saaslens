// src/app/(dashboard)/dashboard/phase4-type-consolidation.test.ts
// Phase 4 RED: 타입 시스템 통합 검증
// 1) dashboard-v3.ts → dashboard.ts 병합
// 2) dashboard2.ts에서 프로덕션 사용 타입 → dashboard.ts 이동, 나머지는 별도 유지
// 3) RenewalReportData를 actions/ → types/로 이동
// 4) dashboard2-seat.ts 중복 타입 제거

import { existsSync, readFileSync, readdirSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const PROJECT_ROOT = path.resolve(__dirname, "../../../../");

function readFile(relPath: string): string {
  return readFileSync(path.resolve(PROJECT_ROOT, relPath), "utf-8");
}

function fileExists(relPath: string): boolean {
  return existsSync(path.resolve(PROJECT_ROOT, relPath));
}

// ============================================================
// Helper: 소스 파일 수집
// ============================================================
function collectTsFiles(dir: string): string[] {
  // readdirSync is imported at top level
  const results: string[] = [];
  const absDir = path.resolve(PROJECT_ROOT, dir);
  if (!existsSync(absDir)) return results;
  const entries = readdirSync(absDir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(absDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTsFiles(path.join(dir, entry.name)));
    } else if (
      /\.(ts|tsx)$/.test(entry.name) &&
      !entry.name.endsWith(".test.ts") &&
      !entry.name.endsWith(".test.tsx")
    ) {
      results.push(full);
    }
  }
  return results;
}

describe("Phase 4: 타입 시스템 통합 검증", () => {
  // ─── 1. dashboard-v3.ts 삭제 ───

  describe("dashboard-v3.ts가 삭제되어야 한다", () => {
    it("src/types/dashboard-v3.ts 이 존재하지 않아야 한다", () => {
      expect(fileExists("src/types/dashboard-v3.ts")).toBe(false);
    });

    it("@/types/dashboard-v3 import가 코드베이스에 없어야 한다", () => {
      const dirs = ["src/app", "src/components", "src/actions", "src/lib"];
      const allFiles = dirs.flatMap((d) => collectTsFiles(d));
      const violations: string[] = [];
      for (const f of allFiles) {
        const content = readFileSync(f, "utf-8");
        if (content.includes("@/types/dashboard-v3")) {
          violations.push(path.relative(PROJECT_ROOT, f));
        }
      }
      expect(
        violations,
        `@/types/dashboard-v3를 import하는 파일:\n${violations.join("\n")}`
      ).toHaveLength(0);
    });
  });

  // ─── 2. dashboard-v3 타입이 dashboard.ts로 병합 ───

  describe("dashboard-v3 타입이 dashboard.ts에 존재해야 한다", () => {
    const expectedTypes = [
      "OptimizationHeroData",
      "RenewalItem",
      "TotalCostKpiData",
      "AnomalyKpiData",
      "TerminatedKpiData",
      "AppsWithoutSubKpiData",
      "MonthlyBarData",
      "CostAppData",
      "SubscriptionAnomalyItem",
      "DashboardV3Data",
    ];

    for (const typeName of expectedTypes) {
      it(`dashboard.ts에 ${typeName}이 정의되어야 한다`, () => {
        const content = readFile("src/types/dashboard.ts");
        expect(content).toContain(`export interface ${typeName}`);
      });
    }
  });

  // ─── 3. dashboard2.ts에서 프로덕션 Seat 타입 → dashboard.ts 이동 ───

  describe("Seat 관련 프로덕션 타입이 dashboard.ts에 존재해야 한다", () => {
    const seatTypes = [
      "LowUtilizationApp",
      "TopLicenseApp",
      "SeatWidgetData",
      "LicenseUsageTrend",
    ];

    for (const typeName of seatTypes) {
      it(`dashboard.ts에 ${typeName}이 정의되어야 한다`, () => {
        const content = readFile("src/types/dashboard.ts");
        expect(content).toContain(`export interface ${typeName}`);
      });
    }
  });

  // ─── 4. RenewalReportData가 types/로 이동 ───

  describe("RenewalReportData가 타입 파일에 있어야 한다", () => {
    it("dashboard.ts에 RenewalReportData가 정의되어야 한다", () => {
      const content = readFile("src/types/dashboard.ts");
      expect(content).toContain("export interface RenewalReportData");
    });

    it("actions/dashboard.ts에 RenewalReportData interface 정의가 없어야 한다", () => {
      const content = readFile("src/actions/dashboard.ts");
      expect(content).not.toContain("export interface RenewalReportData");
    });
  });

  // ─── 5. dashboard2-seat.ts 중복 타입 제거 ───

  describe("dashboard2-seat.ts에서 중복 타입이 제거되어야 한다", () => {
    it("dashboard2-seat.ts에 LowUtilizationApp interface가 없어야 한다", () => {
      const content = readFile("src/actions/dashboard2-seat.ts");
      expect(content).not.toContain("export interface LowUtilizationApp");
    });

    it("dashboard2-seat.ts에 TopLicenseApp interface가 없어야 한다", () => {
      const content = readFile("src/actions/dashboard2-seat.ts");
      expect(content).not.toContain("export interface TopLicenseApp");
    });

    it("dashboard2-seat.ts에 SeatWidgetData interface가 없어야 한다", () => {
      const content = readFile("src/actions/dashboard2-seat.ts");
      expect(content).not.toContain("export interface SeatWidgetData");
    });

    it("dashboard2-seat.ts가 dashboard.ts에서 타입을 import해야 한다", () => {
      const content = readFile("src/actions/dashboard2-seat.ts");
      expect(content).toContain("@/types/dashboard");
    });
  });

  // ─── 6. 기존 import가 @/types/dashboard로 마이그레이션 ───

  describe("모든 import가 @/types/dashboard를 사용해야 한다", () => {
    it("@/types/dashboard2에서 Seat 타입을 import하는 파일이 없어야 한다 (dashboard2 비즈니스 타입 제외)", () => {
      const dirs = [
        "src/components/dashboard",
        "src/app/(dashboard)/dashboard",
      ];
      const allFiles = dirs.flatMap((d) => collectTsFiles(d));
      const violations: string[] = [];
      for (const f of allFiles) {
        const content = readFileSync(f, "utf-8");
        if (content.includes("@/types/dashboard2")) {
          violations.push(path.relative(PROJECT_ROOT, f));
        }
      }
      expect(
        violations,
        `new-dashboard/dashboard에서 @/types/dashboard2 import:\n${violations.join("\n")}`
      ).toHaveLength(0);
    });
  });

  // ─── 7. dashboard.ts 파일 크기 제한 ───

  describe("dashboard.ts가 500줄을 초과하지 않아야 한다", () => {
    it("dashboard.ts가 500줄 이내여야 한다", () => {
      const content = readFile("src/types/dashboard.ts");
      const lineCount = content.split("\n").length;
      expect(
        lineCount,
        `dashboard.ts: ${lineCount}줄 (500줄 제한 초과)`
      ).toBeLessThanOrEqual(500);
    });
  });
});
