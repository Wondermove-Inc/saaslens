// src/lib/erp-format-presets.ts
// ERP별 프리셋 레지스트리 - 3-Layer 범용 파싱 전략의 Layer 1

import type { PaymentCSVFormat } from "./payment-csv";

// ============================================================
// Types
// ============================================================

/** 복식부기 변환 모드 */
export type DoubleEntryMode =
  | "DEBIT_EXPENSE_ONLY" // 차변 중 비용 계정만 추출
  | "DEBIT_ALL" // 모든 차변 항목 추출
  | "NET_AMOUNT" // 차변 - 대변 순액 계산
  | "NONE"; // 복식부기 아님 (단건)

/** 복식부기 설정 */
export interface DoubleEntryConfig {
  mode: DoubleEntryMode;
  /** 차변 계정 코드/이름 컬럼 */
  debitAccountField?: string;
  /** 대변 계정 코드/이름 컬럼 */
  creditAccountField?: string;
  /** 비용 계정 접두사 (예: ["8", "6"] → 8xxx, 6xxx) */
  expenseAccountPrefixes: string[];
  /** 부가세 계정 코드 접두사 (매입세액 등 → 본 비용에 합산) */
  vatAccountPrefixes: string[];
}

/** SaaS명 추출 설정 */
export interface MerchantExtractConfig {
  /** 추출 우선순위 (필드명 배열, 앞에서부터 시도) */
  fieldPriority: string[];
  /** 무의미한 값 패턴 (이 패턴에 매칭되면 skip) */
  skipPatterns: string[];
}

/** 자동감지 규칙 */
export interface AutoDetectRule {
  /** 필수 헤더 (모두 존재해야 매칭) */
  requiredHeaders: string[];
  /** 선택적 구분 헤더 (존재하면 더 높은 우선순위) */
  distinctiveHeaders?: string[];
}

/** 헤더 매핑 설정 */
export interface HeaderMapping {
  date: string[];
  merchant: string[];
  amount: string[];
  category?: string[];
  memo?: string[];
  debitAccount?: string[];
  debitAccountName?: string[];
  creditAccount?: string[];
  creditAccountName?: string[];
  debitAmount?: string[];
  creditAmount?: string[];
  [key: string]: string[] | undefined;
}

/** ERP 포맷 프리셋 전체 */
export interface ERPFormatPreset {
  format: PaymentCSVFormat;
  name: string;
  description: string;
  headerMapping: HeaderMapping;
  doubleEntry: DoubleEntryConfig;
  merchantExtract: MerchantExtractConfig;
  autoDetect: AutoDetectRule;
}

// ============================================================
// Preset Definitions
// ============================================================

const DUZON_ICUBE_PRESET: ERPFormatPreset = {
  format: "ERP_DUZON_ICUBE",
  name: "더존 iCUBE",
  description: "더존 iCUBE 자동전표처리 엑셀 양식",
  headerMapping: {
    date: ["전표일자"],
    merchant: ["거래처명"],
    amount: ["금액"],
    memo: ["적요"],
    debitAccount: ["차변계정코드"],
    debitAccountName: ["차변계정명"],
    creditAccount: ["대변계정코드"],
    creditAccountName: ["대변계정명"],
  },
  doubleEntry: {
    mode: "DEBIT_EXPENSE_ONLY",
    debitAccountField: "차변계정코드",
    creditAccountField: "대변계정코드",
    expenseAccountPrefixes: ["8"], // 8xxx = 판관비/비용
    vatAccountPrefixes: ["135"], // 13500 = 매입세액
  },
  merchantExtract: {
    fieldPriority: ["적요", "거래처명", "비고"],
    skipPatterns: [
      "카드결제",
      "법인카드",
      "미지급금",
      "보통예금",
      "현금",
      "당좌예금",
    ],
  },
  autoDetect: {
    requiredHeaders: ["전표일자", "차변계정코드", "대변계정코드"],
    distinctiveHeaders: ["관리번호"],
  },
};

const DUZON_WEHAGO_PRESET: ERPFormatPreset = {
  format: "ERP_DUZON_WEHAGO",
  name: "더존 WEHAGO",
  description: "더존 WEHAGO/Amaranth10 자동전표 양식",
  headerMapping: {
    date: ["전표일자", "일자"],
    merchant: ["거래처명", "거래처"],
    amount: ["금액"],
    memo: ["적요"],
    debitAccount: ["차변계정코드", "차변코드"],
    debitAccountName: ["차변계정명", "차변과목"],
    creditAccount: ["대변계정코드", "대변코드"],
    creditAccountName: ["대변계정명", "대변과목"],
  },
  doubleEntry: {
    mode: "DEBIT_EXPENSE_ONLY",
    debitAccountField: "차변계정코드",
    creditAccountField: "대변계정코드",
    expenseAccountPrefixes: ["8"],
    vatAccountPrefixes: ["135"],
  },
  merchantExtract: {
    fieldPriority: ["적요", "거래처명", "비고"],
    skipPatterns: [
      "카드결제",
      "법인카드",
      "미지급금",
      "보통예금",
      "현금",
      "당좌예금",
    ],
  },
  autoDetect: {
    requiredHeaders: ["전표일자", "차변계정코드", "대변계정코드"],
  },
};

const SAP_FI_PRESET: ERPFormatPreset = {
  format: "ERP_SAP_FI",
  name: "SAP S/4HANA FI",
  description: "SAP S/4HANA Financial Accounting OData 양식",
  headerMapping: {
    date: ["PostingDate", "DocumentDate"],
    merchant: ["SupplierName", "Supplier"],
    amount: ["AmountInCompanyCodeCurrency", "Amount"],
    category: ["GLAccountName"],
    memo: ["DocumentItemText"],
    debitAccount: ["GLAccount"],
  },
  doubleEntry: {
    mode: "DEBIT_EXPENSE_ONLY",
    debitAccountField: "GLAccount",
    expenseAccountPrefixes: ["6", "8"], // 6xxx = 비용, 8xxx = 판관비
    vatAccountPrefixes: ["154"], // 매입세 관련
  },
  merchantExtract: {
    fieldPriority: ["SupplierName", "DocumentItemText", "GLAccountName"],
    skipPatterns: [
      "CLEARING",
      "PAYMENT",
      "BANK TRANSFER",
      "CASH",
      "PREPAYMENT",
    ],
  },
  autoDetect: {
    requiredHeaders: [
      "PostingDate",
      "GLAccount",
      "AmountInCompanyCodeCurrency",
    ],
  },
};

const ORACLE_JOURNAL_PRESET: ERPFormatPreset = {
  format: "ERP_ORACLE_JOURNAL",
  name: "Oracle ERP Cloud Journal",
  description: "Oracle ERP Cloud General Ledger Journal 양식",
  headerMapping: {
    date: ["AccountingDate", "JournalDate"],
    merchant: ["Description", "LineDescription"],
    amount: ["EnteredDebit", "DebitAmount"],
    category: ["AccountClass", "AccountType"],
    debitAmount: ["EnteredDebit", "DebitAmount"],
    creditAmount: ["EnteredCredit", "CreditAmount"],
  },
  doubleEntry: {
    mode: "DEBIT_EXPENSE_ONLY",
    debitAccountField: "AccountClass",
    expenseAccountPrefixes: ["EXPENSE"],
    vatAccountPrefixes: ["TAX"],
  },
  merchantExtract: {
    fieldPriority: ["Description", "LineDescription", "JournalName"],
    skipPatterns: [
      "CLEARING",
      "PAYMENT",
      "BANK",
      "CASH",
      "ACCRUAL",
      "REVERSAL",
    ],
  },
  autoDetect: {
    requiredHeaders: ["AccountingDate", "EnteredDebit"],
    distinctiveHeaders: ["EnteredCredit"],
  },
};

const ECOUNT_PRESET: ERPFormatPreset = {
  format: "ERP_ECOUNT",
  name: "이카운트",
  description: "이카운트 ERP 엑셀 Export 양식",
  headerMapping: {
    date: ["일자", "날짜"],
    merchant: ["거래처", "거래처명"],
    amount: ["금액", "출금"],
    category: ["계정과목"],
    memo: ["적요", "비고"],
  },
  doubleEntry: {
    mode: "NONE",
    expenseAccountPrefixes: [],
    vatAccountPrefixes: [],
  },
  merchantExtract: {
    fieldPriority: ["거래처명", "거래처", "적요", "비고"],
    skipPatterns: ["카드결제", "법인카드", "미지급금", "보통예금", "현금"],
  },
  autoDetect: {
    requiredHeaders: ["일자", "거래처", "금액", "계정과목"],
  },
};

const GENERIC_ERP_PRESET: ERPFormatPreset = {
  format: "ERP_GENERIC",
  name: "범용 ERP",
  description: "범용 ERP 포맷 (기본 한글 헤더)",
  headerMapping: {
    date: ["거래일자", "일자", "전표일자"],
    merchant: ["거래처명", "거래처", "상대계정"],
    amount: ["출금액", "지출액", "금액", "차변"],
    category: ["계정과목", "계정", "과목"],
    memo: ["비고", "적요", "메모"],
  },
  doubleEntry: {
    mode: "NONE",
    expenseAccountPrefixes: [],
    vatAccountPrefixes: [],
  },
  merchantExtract: {
    fieldPriority: ["거래처명", "거래처", "적요", "비고"],
    skipPatterns: ["카드결제", "법인카드", "미지급금", "보통예금", "현금"],
  },
  autoDetect: {
    requiredHeaders: ["거래일자", "거래처명", "출금액"],
  },
};

// ============================================================
// Registry
// ============================================================

const PRESET_REGISTRY: Map<PaymentCSVFormat, ERPFormatPreset> = new Map([
  ["ERP_DUZON_ICUBE", DUZON_ICUBE_PRESET],
  ["ERP_DUZON_WEHAGO", DUZON_WEHAGO_PRESET],
  ["ERP_SAP_FI", SAP_FI_PRESET],
  ["ERP_ORACLE_JOURNAL", ORACLE_JOURNAL_PRESET],
  ["ERP_ECOUNT", ECOUNT_PRESET],
  ["ERP_GENERIC", GENERIC_ERP_PRESET],
]);

/**
 * 포맷에 해당하는 프리셋을 반환
 */
export function getPreset(
  format: PaymentCSVFormat
): ERPFormatPreset | undefined {
  return PRESET_REGISTRY.get(format);
}

/**
 * CSV 헤더로 가장 적합한 프리셋을 자동감지
 * 구체적인 벤더부터 매칭 시도 → 범용으로 폴백
 */
export function detectPreset(headers: string[]): ERPFormatPreset | undefined {
  const lowerHeaders = headers.map((h) => h.toLowerCase().trim());

  // 구체적인 벤더부터 매칭 (distinctive 헤더가 있는 것 우선)
  const presetsWithDistinctive: ERPFormatPreset[] = [];
  const presetsWithoutDistinctive: ERPFormatPreset[] = [];

  for (const preset of PRESET_REGISTRY.values()) {
    if (
      preset.autoDetect.distinctiveHeaders &&
      preset.autoDetect.distinctiveHeaders.length > 0
    ) {
      presetsWithDistinctive.push(preset);
    } else {
      presetsWithoutDistinctive.push(preset);
    }
  }

  // 1단계: distinctive 헤더가 있는 프리셋 먼저 확인
  for (const preset of presetsWithDistinctive) {
    const requiredMatch = preset.autoDetect.requiredHeaders.every((rh) =>
      lowerHeaders.some(
        (h) => h === rh.toLowerCase() || h.includes(rh.toLowerCase())
      )
    );
    const distinctiveMatch = preset.autoDetect.distinctiveHeaders!.every((dh) =>
      lowerHeaders.some(
        (h) => h === dh.toLowerCase() || h.includes(dh.toLowerCase())
      )
    );
    if (requiredMatch && distinctiveMatch) {
      return preset;
    }
  }

  // 2단계: required만으로 매칭
  for (const preset of [
    ...presetsWithDistinctive,
    ...presetsWithoutDistinctive,
  ]) {
    const requiredMatch = preset.autoDetect.requiredHeaders.every((rh) =>
      lowerHeaders.some(
        (h) => h === rh.toLowerCase() || h.includes(rh.toLowerCase())
      )
    );
    if (requiredMatch) {
      return preset;
    }
  }

  return undefined;
}

/**
 * 등록된 모든 프리셋 반환
 */
export function getAllPresets(): ERPFormatPreset[] {
  return Array.from(PRESET_REGISTRY.values());
}

/**
 * 커스텀 프리셋 등록 (런타임에 새 프리셋 추가 가능)
 */
export function registerPreset(preset: ERPFormatPreset): void {
  PRESET_REGISTRY.set(preset.format, preset);
}
