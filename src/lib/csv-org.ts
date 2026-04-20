// src/lib/csv-org.ts
/**
 * 조직/사용자 연동 CSV 파싱 유틸리티
 * parseCSV(), detectDelimiter()는 src/lib/csv.ts 재사용
 */

import type { ValidationError, ValidationResult } from "./csv";
import { parseCSV } from "./csv";

export type { ValidationError, ValidationResult };

// ==================== 타입 정의 ====================

export interface OrgCSVRow {
  org_code: string;
  parent_code: string;
  org_name: string;
}

export interface UserSyncCSVRow {
  employee_id: string;
  name: string;
  email: string;
  org_code: string;
}

// ==================== 유효성 검증 ====================

/**
 * 조직 CSV 유효성 검증
 * - org_code, org_name 필수
 * - 순환 참조 DFS 감지
 */
export function validateOrgCSV(
  rows: Record<string, string>[]
): ValidationResult<OrgCSVRow> {
  const valid: OrgCSVRow[] = [];
  const errors: ValidationError[] = [];
  const seenCodes = new Set<string>();

  rows.forEach((row, index) => {
    const rowNum = index + 1;

    const org_code = row.org_code?.trim();
    const parent_code = row.parent_code?.trim() || "";
    const org_name = row.org_name?.trim();

    if (!org_code) {
      errors.push({
        row: rowNum,
        field: "org_code",
        message: `${rowNum}행: org_code가 필요합니다`,
      });
      return;
    }

    if (!org_name) {
      errors.push({
        row: rowNum,
        field: "org_name",
        message: `${rowNum}행: org_name이 필요합니다`,
      });
      return;
    }

    if (seenCodes.has(org_code)) {
      errors.push({
        row: rowNum,
        field: "org_code",
        message: `${rowNum}행: 중복된 org_code입니다 (${org_code})`,
      });
      return;
    }

    seenCodes.add(org_code);
    valid.push({ org_code, parent_code, org_name });
  });

  // 순환 참조 DFS 감지
  if (valid.length > 0) {
    const circularErrors = detectCircularReferences(valid);
    errors.push(...circularErrors);

    if (circularErrors.length > 0) {
      return { valid: [], errors };
    }
  }

  return { valid, errors };
}

/**
 * DFS로 순환 참조 감지
 */
function detectCircularReferences(rows: OrgCSVRow[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const codeMap = new Map<string, OrgCSVRow>();
  rows.forEach((r) => codeMap.set(r.org_code, r));

  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(code: string): boolean {
    if (inStack.has(code)) return true; // 순환 참조
    if (visited.has(code)) return false;

    visited.add(code);
    inStack.add(code);

    const row = codeMap.get(code);
    if (row?.parent_code && codeMap.has(row.parent_code)) {
      if (dfs(row.parent_code)) {
        return true;
      }
    }

    inStack.delete(code);
    return false;
  }

  for (const row of rows) {
    if (dfs(row.org_code)) {
      errors.push({
        row: 0,
        field: "parent_code",
        message: `순환 참조가 감지되었습니다 (${row.org_code})`,
      });
      break;
    }
  }

  return errors;
}

/**
 * 사용자 연동 CSV 유효성 검증
 * - name, email, org_code 필수
 * - 이메일 형식 검증
 */
export function validateUserSyncCSV(
  rows: Record<string, string>[]
): ValidationResult<UserSyncCSVRow> {
  const valid: UserSyncCSVRow[] = [];
  const errors: ValidationError[] = [];
  const seenEmails = new Set<string>();

  rows.forEach((row, index) => {
    const rowNum = index + 1;

    const name = row.name?.trim();
    const email = row.email?.trim().toLowerCase();
    const org_code = row.org_code?.trim();
    const employee_id = row.employee_id?.trim() || "";

    if (!name) {
      errors.push({
        row: rowNum,
        field: "name",
        message: `${rowNum}행: name이 필요합니다`,
      });
      return;
    }

    if (!email) {
      errors.push({
        row: rowNum,
        field: "email",
        message: `${rowNum}행: email이 필요합니다`,
      });
      return;
    }

    if (!isValidEmail(email)) {
      errors.push({
        row: rowNum,
        field: "email",
        message: `${rowNum}행: 유효한 이메일 형식이 아닙니다 (${email})`,
      });
      return;
    }

    if (seenEmails.has(email)) {
      errors.push({
        row: rowNum,
        field: "email",
        message: `${rowNum}행: 중복된 이메일입니다 (${email})`,
      });
      return;
    }

    if (!org_code) {
      errors.push({
        row: rowNum,
        field: "org_code",
        message: `${rowNum}행: org_code가 필요합니다`,
      });
      return;
    }

    seenEmails.add(email);
    valid.push({ employee_id, name, email, org_code });
  });

  return { valid, errors };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ==================== CSV 파서 재수출 ====================

export { parseCSV };

// ==================== 템플릿 생성 ====================

export function generateOrgCSVTemplate(): string {
  return `org_code,parent_code,org_name
ORG001,,본사
ORG002,ORG001,개발팀
ORG003,ORG001,영업팀
ORG004,ORG002,프론트엔드팀`;
}

export function generateUserSyncCSVTemplate(): string {
  return `employee_id,name,email,org_code
EMP001,홍길동,hong@company.com,ORG002
EMP002,김철수,kim@company.com,ORG003`;
}
