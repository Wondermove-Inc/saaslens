// src/actions/users.types.ts
/**
 * User 관련 타입 및 스키마 정의
 */

import type { UserFilterOptions, UserSortOptions } from "@/types/user";
import { z } from "zod";

/**
 * 사용자 목록 조회 파라미터
 */
export interface GetUsersParams {
  filter?: UserFilterOptions;
  sort?: UserSortOptions;
  page?: number;
  limit?: number;
}

/**
 * 사용자 수정 스키마
 */
export const updateUserSchema = z.object({
  name: z.string().min(1, "이름은 필수입니다").optional(),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "TERMINATED"]).optional(),
  department: z.string().optional(),
  jobTitle: z.string().optional(),
  employeeId: z.string().optional(),
});
