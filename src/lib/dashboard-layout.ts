// src/lib/dashboard-layout.ts
// 대시보드 위젯의 동적 레이아웃 계산 유틸리티

export type WidgetSlot = {
  key: string;
  baseSpan: number;
};

/**
 * 대시보드 섹션별 레이아웃 정의 (12컬럼 기준)
 */
export const DASHBOARD_LAYOUT = {
  topRow: [
    { key: "priorityCard", baseSpan: 6 },
    { key: "pendingConfirmations", baseSpan: 6 },
  ],
  chartsRow: [
    { key: "monthlyCostTrend", baseSpan: 8 },
    { key: "topAppsCostChart", baseSpan: 4 },
  ],
  costRow1: [
    { key: "costRow1Left", baseSpan: 8 },
    { key: "costRow1Right", baseSpan: 4 },
  ],
  costRow2: [
    { key: "savingsOpportunity", baseSpan: 4 },
    { key: "securityStatCards", baseSpan: 8 },
  ],
  discoveryRow: [
    { key: "appsByCategory", baseSpan: 4 },
    { key: "discoverySources", baseSpan: 8 },
  ],
  departmentRow: [
    { key: "departmentOverview", baseSpan: 8 },
    { key: "recentActivity", baseSpan: 4 },
  ],
} as const;

/**
 * visibility 상태에 따라 보이는 위젯들의 col-span을 동적으로 계산
 *
 * - 모두 보일 때: 기본 비율 유지 (예: 6:6, 8:4)
 * - 일부 숨김: 나머지 위젯이 12칸을 비율 기반으로 재분배
 * - 하나만 보일 때: 전체 너비 (12)
 * - 모두 숨김: 빈 Map 반환
 */
export function getRowSpans(
  widgets: readonly WidgetSlot[],
  visibility: Record<string, boolean | undefined>
): Map<string, number> {
  const visible = widgets.filter((w) => visibility[w.key] !== false);

  if (visible.length === 0) return new Map();
  if (visible.length === 1) return new Map([[visible[0].key, 12]]);

  const totalBase = visible.reduce((sum, w) => sum + w.baseSpan, 0);
  const result = new Map<string, number>();

  for (const w of visible) {
    result.set(w.key, Math.round((w.baseSpan / totalBase) * 12));
  }

  // 반올림 오차 보정: 마지막 위젯에 나머지 할당
  const assigned = [...result.values()].reduce((a, b) => a + b, 0);
  if (assigned !== 12) {
    const lastKey = visible[visible.length - 1].key;
    result.set(lastKey, result.get(lastKey)! + (12 - assigned));
  }

  return result;
}

/**
 * col-span 값을 반응형 Tailwind 클래스로 변환
 * 인라인 스타일 대신 클래스를 사용하여 반응형 브레이크포인트가 정상 동작하도록 함
 *
 * 지원 breakpoint: 'lg' (1024px+), 'xl' (1280px+)
 * 지원 span: 4, 6, 8, 12
 */

// Tailwind 정적 분석을 위해 모든 가능한 클래스를 명시적으로 매핑
// lg:col-span-4 lg:col-span-6 lg:col-span-8 lg:col-span-12
// xl:col-span-4 xl:col-span-6 xl:col-span-8 xl:col-span-12
const LG_SPAN: Record<number, string> = {
  4: "lg:col-span-4",
  6: "lg:col-span-6",
  8: "lg:col-span-8",
  12: "lg:col-span-12",
};

const XL_SPAN: Record<number, string> = {
  4: "xl:col-span-4",
  6: "xl:col-span-6",
  8: "xl:col-span-8",
  12: "xl:col-span-12",
};

export function gridColClass(
  span: number,
  breakpoint: "lg" | "xl" = "lg"
): string {
  const map = breakpoint === "xl" ? XL_SPAN : LG_SPAN;
  return map[span] ?? "";
}
