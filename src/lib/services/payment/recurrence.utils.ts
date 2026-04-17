// src/lib/services/payment/recurrence.utils.ts

/**
 * 결제일(day of month) 파싱
 */
export function parseDayOfMonth(useDt: string): number | null {
  if (!useDt || useDt.length < 8) return null;
  const day = Number(useDt.slice(-2));
  return Number.isNaN(day) ? null : day;
}

/**
 * 월 키(YYYYMM) 파싱
 */
export function parseMonthKey(useDt: string): string | null {
  if (!useDt || useDt.length < 6) return null;
  return useDt.slice(0, 6);
}

/**
 * 거래 시간을 분 단위로 파싱
 */
export function parseMinutes(useTm?: string | null): number | null {
  if (!useTm || useTm.length < 4) return null;
  const hour = Number(useTm.slice(0, 2));
  const minute = Number(useTm.slice(2, 4));
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  const total = hour * 60 + minute;
  if (total < 0 || total >= 24 * 60) return null;
  return total;
}

/**
 * 날짜 문자열 파싱 (YYYYMMDD → Date)
 */
export function parseDateString(useDt: string): Date | null {
  if (!useDt || useDt.length < 8) return null;
  const year = Number(useDt.slice(0, 4));
  const month = Number(useDt.slice(4, 6)) - 1; // 0-indexed
  const day = Number(useDt.slice(6, 8));
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day))
    return null;
  return new Date(year, month, day);
}

/**
 * 금액 편차율 계산 (평균 대비 표준편차 비율)
 */
export function calculateVariation(values: number[], avg: number): number {
  if (values.length <= 1 || avg === 0) return 0;

  const squaredDiffs = values.map((v) => Math.pow(v - avg, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return stdDev / avg;
}

/**
 * 일자 편차 계산 (평균 대비 평균 절대 편차)
 */
export function calculateDayVariation(days: number[]): number {
  if (days.length <= 1) return 0;

  // 월말 처리: 28일 이후는 월말로 취급
  const normalizedDays = days.map((d) => (d >= 28 ? 28 : d));
  const normalizedAvg =
    normalizedDays.reduce((a, b) => a + b, 0) / normalizedDays.length;

  const absDiffs = normalizedDays.map((d) => Math.abs(d - normalizedAvg));
  return absDiffs.reduce((a, b) => a + b, 0) / absDiffs.length;
}
