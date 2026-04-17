// src/components/subscriptions/subscription-detail.utils.ts

/**
 * 금액을 통화 형식으로 포맷팅
 */
export function formatCurrency(amount: number, currency: string): string {
  if (currency === "KRW") {
    return `₩${amount.toLocaleString()}`;
  } else if (currency === "USD") {
    return `$${amount.toLocaleString()}`;
  } else {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

/**
 * 날짜를 YYYY.MM.DD 형식으로 포맷팅
 */
export function formatDate(date: Date | null): string {
  if (!date) return "-";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

/**
 * 갱신일까지 남은 일수 계산
 */
export function getDaysUntilRenewal(renewalDate: Date | null): number | null {
  if (!renewalDate) return null;
  const today = new Date();
  const renewal = new Date(renewalDate);
  const diff = Math.ceil(
    (renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  return diff;
}
