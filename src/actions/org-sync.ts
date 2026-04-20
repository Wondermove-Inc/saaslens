// src/actions/org-sync.ts
/**
 * 조직/사용자 CSV 연동 Server Actions
 * - Admin 전용
 */

"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-auth";
import {
  parseCSV,
  validateOrgCSV,
  validateUserSyncCSV,
  type OrgCSVRow,
  type ValidationError,
} from "@/lib/csv-org";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import type { ActionState } from "@/types";

// ==================== 타입 ====================

export interface OrgSyncResult {
  created: number;
  updated: number;
  errors: ValidationError[];
}

// ==================== 내부 구현 ====================

/**
 * 조직 CSV → Team 계층 upsert
 * BFS 순서로 부모부터 생성
 */
async function _syncOrgsFromCSV(
  csvContent: string
): Promise<ActionState<OrgSyncResult>> {
  try {
    const { organizationId } = await requireAdmin("/dashboard");

    const rows = parseCSV(csvContent);

    if (rows.length === 0) {
      return { success: false, message: "등록할 데이터가 없습니다" };
    }

    const { valid, errors } = validateOrgCSV(rows);

    if (errors.length > 0 && valid.length === 0) {
      return {
        success: false,
        message: "유효한 데이터가 없습니다",
        data: { created: 0, updated: 0, errors },
      };
    }

    // BFS 처리를 위한 준비
    // 루트 노드: parent_code가 없거나 CSV에 없는 노드
    const codeSet = new Set(valid.map((r) => r.org_code));
    const roots = valid.filter(
      (r) => !r.parent_code || !codeSet.has(r.parent_code)
    );
    const childrenMap = new Map<string, OrgCSVRow[]>();

    for (const row of valid) {
      if (row.parent_code && codeSet.has(row.parent_code)) {
        const arr = childrenMap.get(row.parent_code) ?? [];
        arr.push(row);
        childrenMap.set(row.parent_code, arr);
      }
    }

    // DB에 존재하는 팀을 externalId 기준으로 미리 조회
    const existingTeams = await prisma.team.findMany({
      where: { organizationId, externalId: { not: null } },
      select: { id: true, externalId: true },
    });
    const existingMap = new Map(
      existingTeams.map((t) => [t.externalId!, t.id])
    );

    // BFS 순회
    const queue: { row: OrgCSVRow; parentDbId: string | null }[] = roots.map(
      (r) => ({ row: r, parentDbId: null })
    );
    let created = 0;
    let updated = 0;

    while (queue.length > 0) {
      const item = queue.shift()!;
      const { row, parentDbId } = item;

      const existingId = existingMap.get(row.org_code);

      if (existingId) {
        // 업데이트
        await prisma.team.update({
          where: { id: existingId },
          data: {
            name: row.org_name,
            parentId: parentDbId,
            source: "CSV_IMPORT",
          },
        });
        existingMap.set(row.org_code, existingId);
        updated++;
      } else {
        // 생성
        const newTeam = await prisma.team.create({
          data: {
            name: row.org_name,
            externalId: row.org_code,
            source: "CSV_IMPORT",
            parentId: parentDbId,
            organizationId,
          },
        });
        existingMap.set(row.org_code, newTeam.id);
        created++;
      }

      // 자식 노드를 큐에 추가
      const children = childrenMap.get(row.org_code) ?? [];
      const parentDbIdForChildren = existingMap.get(row.org_code)!;
      for (const child of children) {
        queue.push({ row: child, parentDbId: parentDbIdForChildren });
      }
    }

    revalidatePath("/teams");

    return {
      success: true,
      message: `조직 동기화 완료: 생성 ${created}개, 업데이트 ${updated}개`,
      data: { created, updated, errors },
    };
  } catch (error) {
    logger.error({ err: error }, "조직 CSV 동기화 오류");
    return {
      success: false,
      message: "조직 동기화 중 오류가 발생했습니다",
    };
  }
}

/**
 * 사용자 연동 CSV → User upsert + 팀 배정
 * org_code → Team.externalId 조회 → teamId 업데이트
 * 팀이 없으면 자동 생성
 */
async function _syncUsersFromCSV(
  csvContent: string
): Promise<ActionState<OrgSyncResult>> {
  try {
    const { organizationId } = await requireAdmin("/dashboard");

    const rows = parseCSV(csvContent);

    if (rows.length === 0) {
      return { success: false, message: "등록할 데이터가 없습니다" };
    }

    const { valid, errors } = validateUserSyncCSV(rows);

    if (errors.length > 0 && valid.length === 0) {
      return {
        success: false,
        message: "유효한 데이터가 없습니다",
        data: { created: 0, updated: 0, errors },
      };
    }

    // org_code별로 Team 조회 (없으면 자동 생성)
    const orgCodes = [...new Set(valid.map((r) => r.org_code))];
    const teamMap = new Map<string, string>(); // org_code → teamId

    for (const orgCode of orgCodes) {
      // externalId로 조회
      let team = await prisma.team.findFirst({
        where: { organizationId, externalId: orgCode },
        select: { id: true },
      });

      if (!team) {
        // 없으면 자동 생성 (flat, source=CSV_IMPORT)
        team = await prisma.team.create({
          data: {
            name: orgCode,
            externalId: orgCode,
            source: "CSV_IMPORT",
            organizationId,
          },
          select: { id: true },
        });
      }

      teamMap.set(orgCode, team.id);
    }

    let created = 0;
    let updated = 0;

    for (const row of valid) {
      const teamId = teamMap.get(row.org_code);

      const existingUser = await prisma.user.findFirst({
        where: { email: row.email, organizationId },
        select: { id: true },
      });

      if (existingUser) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name: row.name,
            teamId: teamId ?? null,
            ...(row.employee_id ? { employeeId: row.employee_id } : {}),
          },
        });
        updated++;
      } else {
        await prisma.user.create({
          data: {
            email: row.email,
            name: row.name,
            role: "MEMBER",
            organizationId,
            teamId: teamId ?? null,
            ...(row.employee_id ? { employeeId: row.employee_id } : {}),
          },
        });
        created++;
      }
    }

    revalidatePath("/users");
    revalidatePath("/teams");

    return {
      success: true,
      message: `사용자 동기화 완료: 생성 ${created}명, 업데이트 ${updated}명`,
      data: { created, updated, errors },
    };
  } catch (error) {
    logger.error({ err: error }, "사용자 CSV 동기화 오류");
    return {
      success: false,
      message: "사용자 동기화 중 오류가 발생했습니다",
    };
  }
}

// ==================== 공개 Server Actions ====================

export const syncOrgsFromCSV = withLogging("syncOrgsFromCSV", _syncOrgsFromCSV);

export const syncUsersFromCSV = withLogging(
  "syncUsersFromCSV",
  _syncUsersFromCSV
);
