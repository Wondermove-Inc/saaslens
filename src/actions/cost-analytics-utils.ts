// src/actions/cost-analytics-utils.ts

/**
 * Prisma Decimal 또는 객체에서 숫자 추출
 */
export function extractAmount(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "object" && "toNumber" in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value) || 0;
}

/**
 * 날짜를 YYYY-MM 형식으로 변환
 */
export function formatMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * YYYY-MM을 표시용 라벨로 변환
 */
export function formatDisplayLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return `${year}년 ${month}월`;
}

/**
 * 증감률에 따른 심각도 결정
 */
export function getSeverity(changeRate: number): "low" | "medium" | "high" {
  if (changeRate >= 200) return "high";
  if (changeRate >= 100) return "medium";
  return "low";
}

/**
 * 구독의 월별 비용 계산
 */
export function calculateMonthlyCost(sub: {
  amount: unknown;
  billingCycle: string;
}): number {
  const amount = extractAmount(sub.amount);

  switch (sub.billingCycle) {
    case "YEARLY":
      return Math.round(amount / 12);
    case "QUARTERLY":
      return Math.round(amount / 3);
    case "MONTHLY":
    default:
      return amount;
  }
}

/**
 * 날짜를 YYYYMMDD 형식 문자열로 변환
 */
export function formatDateStr(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

/**
 * SMP-134: PER_SEAT 구독의 Seat 단가 계산
 * amount ÷ totalLicenses (PER_SEAT 전용)
 */
export function calculatePerSeatPrice(sub: {
  amount: unknown;
  totalLicenses: number | null;
  billingType: string;
}): number | null {
  if (sub.billingType !== "PER_SEAT" || !sub.totalLicenses) return null;
  const amount = extractAmount(sub.amount);
  return Math.round(amount / sub.totalLicenses);
}

/**
 * SMP-134: 월간 Seat 단가 정규화 (연간/분기 → 월간)
 */
export function calculateMonthlyPerSeatPrice(sub: {
  amount: unknown;
  totalLicenses: number | null;
  billingType: string;
  billingCycle: string;
}): number | null {
  if (sub.billingType !== "PER_SEAT" || !sub.totalLicenses) return null;
  const monthlyCost = calculateMonthlyCost(sub);
  return Math.round(monthlyCost / sub.totalLicenses);
}

/**
 * SMP-134: Seat 단가 표시용 포맷
 */
export function formatPerSeatPrice(
  price: number | null,
  currency: string = "KRW"
): string {
  if (price === null) return "";
  const formatted = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(price);
  return `${formatted}/Seat`;
}
