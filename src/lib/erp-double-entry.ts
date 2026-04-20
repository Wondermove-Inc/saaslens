// src/lib/erp-double-entry.ts
// 복식부기 → 단건 변환 엔진
// ERP 데이터의 차변/대변 구조를 SMP PaymentCSVRow 단건으로 변환

import type { DoubleEntryConfig } from "./erp-format-presets";

/** 복식부기 원본 행 */
export interface DoubleEntryRow {
  /** 원본 CSV 행 데이터 */
  rawData: Record<string, string>;
  /** 날짜 문자열 */
  date: string;
  /** 금액 (파싱 전 문자열) */
  amount: string;
  /** 차변 계정 코드 */
  debitAccount?: string;
  /** 차변 계정명 */
  debitAccountName?: string;
  /** 대변 계정 코드 */
  creditAccount?: string;
  /** 대변 계정명 */
  creditAccountName?: string;
  /** 적요/메모 */
  memo?: string;
  /** 거래처명 */
  merchant?: string;
}

/** 변환 결과 행 */
export interface ConvertedEntry {
  date: string;
  amount: number;
  merchant: string;
  category?: string;
  memo?: string;
  rawData: Record<string, string>;
  /** 부가세 합산 금액 (별도 추적용) */
  vatAmount?: number;
}

/**
 * 계정 코드가 지정된 접두사 중 하나와 매칭되는지 확인
 */
function matchesAccountPrefix(
  accountCode: string | undefined,
  prefixes: string[]
): boolean {
  if (!accountCode) return false;
  const cleaned = accountCode.replace(/^0+/, "").trim();
  return prefixes.some((prefix) => cleaned.startsWith(prefix));
}

/**
 * 비용 계정 행인지 확인
 */
function isExpenseRow(row: DoubleEntryRow, config: DoubleEntryConfig): boolean {
  if (config.expenseAccountPrefixes.length === 0) return true;
  return matchesAccountPrefix(row.debitAccount, config.expenseAccountPrefixes);
}

/**
 * 부가세(매입세액) 행인지 확인
 */
function isVATRow(row: DoubleEntryRow, config: DoubleEntryConfig): boolean {
  if (config.vatAccountPrefixes.length === 0) return false;
  return matchesAccountPrefix(row.debitAccount, config.vatAccountPrefixes);
}

/**
 * 금액 문자열을 숫자로 변환 (간단 버전, 기존 parsePaymentAmount와 호환)
 */
function parseAmount(amountStr: string): number {
  if (!amountStr || !amountStr.trim()) return 0;
  let cleaned = amountStr.trim().replace(/[₩$€£¥,\s]/g, "");
  const isNegative = /^\(.*\)$/.test(cleaned);
  if (isNegative) cleaned = cleaned.replace(/[()]/g, "");
  const value = parseFloat(cleaned);
  if (isNaN(value)) return 0;
  return isNegative ? -value : value;
}

/**
 * 날짜별로 행을 그룹핑 (같은 전표의 차변/대변을 묶기 위함)
 */
function groupByDate(rows: DoubleEntryRow[]): Map<string, DoubleEntryRow[]> {
  const groups = new Map<string, DoubleEntryRow[]>();
  for (const row of rows) {
    const key = row.date;
    const group = groups.get(key) || [];
    group.push(row);
    groups.set(key, group);
  }
  return groups;
}

/**
 * DEBIT_EXPENSE_ONLY 모드: 차변 중 비용 계정만 추출
 * 같은 날짜의 부가세(매입세액) 행이 있으면 비용에 합산
 */
function convertDebitExpenseOnly(
  rows: DoubleEntryRow[],
  config: DoubleEntryConfig
): ConvertedEntry[] {
  const results: ConvertedEntry[] = [];
  const dateGroups = groupByDate(rows);

  for (const [, group] of dateGroups) {
    const expenseRows = group.filter((r) => isExpenseRow(r, config));
    const vatRows = group.filter((r) => isVATRow(r, config));

    // 부가세 총액 (비용 행 수로 나눠서 배분)
    const totalVAT = vatRows.reduce((sum, r) => sum + parseAmount(r.amount), 0);
    const vatPerExpense =
      expenseRows.length > 0 ? totalVAT / expenseRows.length : 0;

    for (const row of expenseRows) {
      const baseAmount = parseAmount(row.amount);
      results.push({
        date: row.date,
        amount: baseAmount + vatPerExpense,
        merchant: row.merchant || row.memo || "",
        category: row.debitAccountName || row.debitAccount,
        memo: row.memo,
        rawData: row.rawData,
        vatAmount: vatPerExpense > 0 ? vatPerExpense : undefined,
      });
    }
  }

  return results;
}

/**
 * DEBIT_ALL 모드: 모든 차변 항목 추출
 */
function convertDebitAll(
  rows: DoubleEntryRow[],
  config: DoubleEntryConfig
): ConvertedEntry[] {
  return rows
    .filter((row) => {
      // 차변 계정이 있는 행만 (대변 전용 행 제외)
      return row.debitAccount && row.debitAccount.trim() !== "";
    })
    .filter((row) => !isVATRow(row, config))
    .map((row) => ({
      date: row.date,
      amount: parseAmount(row.amount),
      merchant: row.merchant || row.memo || "",
      category: row.debitAccountName || row.debitAccount,
      memo: row.memo,
      rawData: row.rawData,
    }));
}

/**
 * NET_AMOUNT 모드: 차변 - 대변 순액 계산
 */
function convertNetAmount(rows: DoubleEntryRow[]): ConvertedEntry[] {
  const dateGroups = groupByDate(rows);
  const results: ConvertedEntry[] = [];

  for (const [date, group] of dateGroups) {
    let totalDebit = 0;
    let totalCredit = 0;
    let merchant = "";
    let category = "";
    let memo = "";
    const rawData: Record<string, string> = {};

    for (const row of group) {
      const amount = parseAmount(row.amount);
      if (row.debitAccount && row.debitAccount.trim() !== "") {
        totalDebit += amount;
        if (!merchant) merchant = row.merchant || row.memo || "";
        if (!category)
          category = row.debitAccountName || row.debitAccount || "";
        if (!memo) memo = row.memo || "";
      }
      if (row.creditAccount && row.creditAccount.trim() !== "") {
        totalCredit += amount;
      }
      Object.assign(rawData, row.rawData);
    }

    const netAmount = totalDebit - totalCredit;
    if (netAmount > 0) {
      results.push({
        date,
        amount: netAmount,
        merchant,
        category,
        memo,
        rawData,
      });
    }
  }

  return results;
}

/**
 * 복식부기 행 배열을 단건 배열로 변환
 *
 * @param rows - 복식부기 원본 행 배열
 * @param config - 복식부기 설정 (프리셋에서 가져옴)
 * @returns 단건 변환 결과 배열
 */
export function convertDoubleEntry(
  rows: DoubleEntryRow[],
  config: DoubleEntryConfig
): ConvertedEntry[] {
  switch (config.mode) {
    case "DEBIT_EXPENSE_ONLY":
      return convertDebitExpenseOnly(rows, config);
    case "DEBIT_ALL":
      return convertDebitAll(rows, config);
    case "NET_AMOUNT":
      return convertNetAmount(rows);
    case "NONE":
      // 복식부기가 아닌 경우 그대로 반환
      return rows.map((row) => ({
        date: row.date,
        amount: parseAmount(row.amount),
        merchant: row.merchant || row.memo || "",
        category: row.debitAccountName,
        memo: row.memo,
        rawData: row.rawData,
      }));
  }
}
