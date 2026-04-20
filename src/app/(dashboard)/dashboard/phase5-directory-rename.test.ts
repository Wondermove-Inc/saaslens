// src/app/(dashboard)/dashboard/phase5-directory-rename.test.ts
// Phase 5 RED: new-dashboard/ → dashboard/ 디렉토리 rename 검증

import { existsSync, readFileSync, readdirSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const PROJECT_ROOT = path.resolve(__dirname, "../../../../");

function fileExists(relPath: string): boolean {
  return existsSync(path.resolve(PROJECT_ROOT, relPath));
}

function collectTsFiles(dir: string): string[] {
  const results: string[] = [];
  const absDir = path.resolve(PROJECT_ROOT, dir);
  if (!existsSync(absDir)) return results;
  const entries = readdirSync(absDir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(absDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTsFiles(path.join(dir, entry.name)));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

describe("Phase 5: 디렉토리 rename 검증", () => {
  describe("new-dashboard/ → dashboard/ rename", () => {
    it("src/components/dashboard/ 디렉토리가 존재해야 한다", () => {
      expect(fileExists("src/components/dashboard")).toBe(true);
    });

    it("src/components/new-dashboard/ 디렉토리가 존재하지 않아야 한다", () => {
      expect(fileExists("src/components/new-dashboard")).toBe(false);
    });
  });

  describe("핵심 파일이 dashboard/에 존재해야 한다", () => {
    const files = [
      "src/components/dashboard/new-dashboard-client.tsx",
      "src/components/dashboard/new-dashboard-client.test.tsx",
      "src/components/dashboard/bento-kpi-cards.tsx",
      "src/components/dashboard/bento-optimization-hero.tsx",
      "src/components/dashboard/index.ts",
      "src/components/dashboard/apps-by-category.tsx",
      "src/components/dashboard/recent-activity.tsx",
      "src/components/dashboard/cost-bar-chart.tsx",
      "src/components/dashboard/cost-apps-table.tsx",
      "src/components/dashboard/upcoming-renewals.tsx",
      "src/components/dashboard/seat-utilization-chart.tsx",
      "src/components/dashboard/per-user-license-apps-chart.tsx",
      "src/components/dashboard/department-spend-chart.tsx",
      "src/components/dashboard/dashboard-alert-banner.tsx",
    ];

    for (const f of files) {
      it(`${path.basename(f)} 존재`, () => {
        expect(fileExists(f), `파일 누락: ${f}`).toBe(true);
      });
    }
  });

  describe("import 경로가 @/components/dashboard를 사용해야 한다", () => {
    it("page.tsx가 @/components/dashboard에서 import해야 한다", () => {
      const content = readFileSync(
        path.resolve(PROJECT_ROOT, "src/app/(dashboard)/dashboard/page.tsx"),
        "utf-8"
      );
      expect(content).toContain('@/components/dashboard"');
      expect(content).not.toContain("@/components/new-dashboard");
    });
  });

  describe("코드베이스에 @/components/new-dashboard 참조가 없어야 한다", () => {
    it("소스 코드에서 new-dashboard import이 없어야 한다", () => {
      const dirs = ["src/app", "src/components", "src/actions", "src/lib"];
      const allFiles = dirs.flatMap((d) => collectTsFiles(d));
      const violations: string[] = [];
      for (const f of allFiles) {
        // 테스트 파일 자체는 검사 제외
        if (f.endsWith(".test.ts") || f.endsWith(".test.tsx")) continue;
        const content = readFileSync(f, "utf-8");
        if (content.includes("@/components/new-dashboard")) {
          violations.push(path.relative(PROJECT_ROOT, f));
        }
      }
      expect(
        violations,
        `@/components/new-dashboard 참조:\n${violations.join("\n")}`
      ).toHaveLength(0);
    });
  });
});
