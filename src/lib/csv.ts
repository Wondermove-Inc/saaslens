// src/lib/csv.ts

// 유효한 앱 카테고리
const VALID_CATEGORIES = [
  "COLLABORATION",
  "PRODUCTIVITY",
  "DEVELOPMENT",
  "DESIGN",
  "MARKETING",
  "SALES",
  "HR",
  "FINANCE",
  "ANALYTICS",
  "SECURITY",
  "IT_INFRA",
  "COMMUNICATION",
  "OTHER",
] as const;

// 유효한 결제 주기
const VALID_BILLING_CYCLES = ["MONTHLY", "QUARTERLY", "YEARLY"] as const;

export interface AppCSVRow {
  name: string;
  category: string;
  vendor?: string;
  description?: string;
  website?: string;
}

export interface SubscriptionCSVRow {
  appName: string;
  planName: string;
  billingCycle: string;
  price?: string;
  renewalDate?: string;
  seats?: string;
}

export interface UserCSVRow {
  email: string;
  name?: string;
  role: string;
  department?: string;
  jobTitle?: string;
  employeeId?: string;
}

// 유효한 사용자 역할
const VALID_USER_ROLES = ["ADMIN", "MEMBER", "VIEWER"] as const;

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ValidationResult<T> {
  valid: T[];
  errors: ValidationError[];
}

/**
 * 구분자 자동 감지 (탭 vs 쉼표)
 */
function detectDelimiter(line: string): string {
  const commaCount = (line.match(/,/g) || []).length;
  const tabCount = (line.match(/\t/g) || []).length;
  return tabCount > commaCount ? "\t" : ",";
}

/**
 * CSV 문자열을 객체 배열로 파싱
 */
export function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return [];

  // 첫 줄에서 구분자 감지
  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCSVLine(lines[0], delimiter);
  const results: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line, delimiter);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim() || "";
    });

    results.push(row);
  }

  return results;
}

/**
 * CSV 라인 파싱 (인용 부호 처리)
 */
function parseCSVLine(line: string, delimiter: string = ","): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * 앱 CSV 데이터 유효성 검증
 */
export function validateAppCSV(
  rows: Record<string, string>[]
): ValidationResult<AppCSVRow> {
  const valid: AppCSVRow[] = [];
  const errors: ValidationError[] = [];

  rows.forEach((row, index) => {
    const rowNum = index + 1;

    // 필수 필드 검증
    if (!row.name?.trim()) {
      errors.push({
        row: rowNum,
        field: "name",
        message: `${rowNum}행: 앱 이름이 필요합니다`,
      });
      return;
    }

    if (!row.category?.trim()) {
      errors.push({
        row: rowNum,
        field: "category",
        message: `${rowNum}행: 카테고리가 필요합니다`,
      });
      return;
    }

    // 카테고리 유효성 검증
    const category = row.category.trim().toUpperCase();
    if (
      !VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])
    ) {
      errors.push({
        row: rowNum,
        field: "category",
        message: `${rowNum}행: 유효하지 않은 카테고리입니다 (${category}). 허용된 값: ${VALID_CATEGORIES.join(", ")}`,
      });
      return;
    }

    valid.push({
      name: row.name.trim(),
      category: category,
      vendor: row.vendor?.trim() || undefined,
      description: row.description?.trim() || undefined,
      website: row.website?.trim() || undefined,
    });
  });

  return { valid, errors };
}

/**
 * 구독 CSV 데이터 유효성 검증
 */
export function validateSubscriptionCSV(
  rows: Record<string, string>[]
): ValidationResult<SubscriptionCSVRow> {
  const valid: SubscriptionCSVRow[] = [];
  const errors: ValidationError[] = [];

  rows.forEach((row, index) => {
    const rowNum = index + 1;

    // 필수 필드 검증
    if (!row.appName?.trim()) {
      errors.push({
        row: rowNum,
        field: "appName",
        message: `${rowNum}행: 앱 이름이 필요합니다`,
      });
      return;
    }

    if (!row.planName?.trim()) {
      errors.push({
        row: rowNum,
        field: "planName",
        message: `${rowNum}행: 플랜 이름이 필요합니다`,
      });
      return;
    }

    if (!row.billingCycle?.trim()) {
      errors.push({
        row: rowNum,
        field: "billingCycle",
        message: `${rowNum}행: 결제 주기가 필요합니다`,
      });
      return;
    }

    // 결제 주기 유효성 검증
    const billingCycle = row.billingCycle.trim().toUpperCase();
    if (
      !VALID_BILLING_CYCLES.includes(
        billingCycle as (typeof VALID_BILLING_CYCLES)[number]
      )
    ) {
      errors.push({
        row: rowNum,
        field: "billingCycle",
        message: `${rowNum}행: 유효하지 않은 결제 주기입니다 (${billingCycle}). 허용된 값: ${VALID_BILLING_CYCLES.join(", ")}`,
      });
      return;
    }

    // 가격 유효성 검증 (선택사항)
    if (row.price?.trim()) {
      const price = parseFloat(row.price.trim());
      if (isNaN(price) || price < 0) {
        errors.push({
          row: rowNum,
          field: "price",
          message: `${rowNum}행: 가격은 유효한 숫자여야 합니다`,
        });
        return;
      }
    }

    // 갱신일 유효성 검증 (선택사항)
    if (row.renewalDate?.trim()) {
      const date = new Date(row.renewalDate.trim());
      if (isNaN(date.getTime())) {
        errors.push({
          row: rowNum,
          field: "renewalDate",
          message: `${rowNum}행: 날짜 형식이 유효하지 않습니다 (YYYY-MM-DD)`,
        });
        return;
      }
    }

    valid.push({
      appName: row.appName.trim(),
      planName: row.planName.trim(),
      billingCycle: billingCycle,
      price: row.price?.trim() || undefined,
      renewalDate: row.renewalDate?.trim() || undefined,
      seats: row.seats?.trim() || undefined,
    });
  });

  return { valid, errors };
}

/**
 * 이메일 유효성 검증
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 사용자 CSV 데이터 유효성 검증
 */
export function validateUserCSV(
  rows: Record<string, string>[]
): ValidationResult<UserCSVRow> {
  const valid: UserCSVRow[] = [];
  const errors: ValidationError[] = [];
  const seenEmails = new Set<string>();

  rows.forEach((row, index) => {
    const rowNum = index + 1;

    // 이메일 필수 검증
    const email = row.email?.trim().toLowerCase();
    if (!email) {
      errors.push({
        row: rowNum,
        field: "email",
        message: `${rowNum}행: 이메일이 필요합니다`,
      });
      return;
    }

    // 이메일 형식 검증
    if (!isValidEmail(email)) {
      errors.push({
        row: rowNum,
        field: "email",
        message: `${rowNum}행: 유효한 이메일 형식이 아닙니다`,
      });
      return;
    }

    // 이메일 중복 검증
    if (seenEmails.has(email)) {
      errors.push({
        row: rowNum,
        field: "email",
        message: `${rowNum}행: 중복된 이메일입니다 (${email})`,
      });
      return;
    }

    // 역할 필수 검증
    if (!row.role?.trim()) {
      errors.push({
        row: rowNum,
        field: "role",
        message: `${rowNum}행: 역할이 필요합니다`,
      });
      return;
    }

    // 역할 유효성 검증
    const role = row.role.trim().toUpperCase();
    if (!VALID_USER_ROLES.includes(role as (typeof VALID_USER_ROLES)[number])) {
      errors.push({
        row: rowNum,
        field: "role",
        message: `${rowNum}행: 유효하지 않은 역할입니다 (${role}). 허용된 값: ${VALID_USER_ROLES.join(", ")}`,
      });
      return;
    }

    // 중복 체크용 이메일 추가
    seenEmails.add(email);

    valid.push({
      email: email,
      name: row.name?.trim() || undefined,
      role: role,
      department: row.department?.trim() || undefined,
      jobTitle: row.jobTitle?.trim() || undefined,
      employeeId: row.employeeId?.trim() || undefined,
    });
  });

  return { valid, errors };
}
