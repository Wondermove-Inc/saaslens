import type { BillingCycle } from "@prisma/client";

/**
 * 다음 갱신일 계산 헬퍼
 * 현재 갱신일에서 billingCycle 한 주기를 더한 날짜를 반환합니다.
 * 결과가 현재 시점보다 과거인 경우 미래가 될 때까지 반복 계산합니다.
 */
export function calculateNextRenewalDate(
  lastPaymentDate: Date,
  billingCycle: BillingCycle
): Date {
  const next = new Date(lastPaymentDate);

  switch (billingCycle) {
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
    case "QUARTERLY":
      next.setMonth(next.getMonth() + 3);
      break;
    case "YEARLY":
      next.setFullYear(next.getFullYear() + 1);
      break;
    case "ONE_TIME":
    default:
      break;
  }

  const now = new Date();
  while (next < now) {
    switch (billingCycle) {
      case "MONTHLY":
        next.setMonth(next.getMonth() + 1);
        break;
      case "QUARTERLY":
        next.setMonth(next.getMonth() + 3);
        break;
      case "YEARLY":
        next.setFullYear(next.getFullYear() + 1);
        break;
      default:
        return next;
    }
  }

  return next;
}

/**
 * 과거 갱신일을 현재 이후 날짜로 전진시킵니다.
 * calculateNextRenewalDate와 달리 첫 주기를 더하지 않고,
 * 이미 과거인 날짜를 미래로 끌어올리는 데에만 사용합니다.
 */
export function advanceToFutureDate(
  renewalDate: Date,
  billingCycle: BillingCycle
): Date {
  const next = new Date(renewalDate);
  const now = new Date();

  if (next >= now) {
    return next;
  }

  while (next < now) {
    switch (billingCycle) {
      case "MONTHLY":
        next.setMonth(next.getMonth() + 1);
        break;
      case "QUARTERLY":
        next.setMonth(next.getMonth() + 3);
        break;
      case "YEARLY":
        next.setFullYear(next.getFullYear() + 1);
        break;
      case "ONE_TIME":
      default:
        return next;
    }
  }

  return next;
}
