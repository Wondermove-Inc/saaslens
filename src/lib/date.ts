export type DateInput = Date | string | number | null | undefined;

function normalizeDate(date: DateInput): Date | null {
  if (!date) {
    return null;
  }

  const parsed = date instanceof Date ? date : new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatKoreanDate(date: DateInput): string {
  const normalized = normalizeDate(date);
  if (!normalized) {
    return "-";
  }

  const year = normalized.getFullYear();
  const month = String(normalized.getMonth() + 1).padStart(2, "0");
  const day = String(normalized.getDate()).padStart(2, "0");

  return `${year}.${month}.${day}`;
}

export function formatKoreanDateTime(date: DateInput): string {
  const normalized = normalizeDate(date);
  if (!normalized) {
    return "-";
  }

  const hours = String(normalized.getHours()).padStart(2, "0");
  const minutes = String(normalized.getMinutes()).padStart(2, "0");

  return `${formatKoreanDate(normalized)} ${hours}:${minutes}`;
}
