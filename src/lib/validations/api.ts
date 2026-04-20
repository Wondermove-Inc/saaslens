// src/lib/validations/api.ts
import { z } from "zod";

const integrationTypes = [
  "GOOGLE_WORKSPACE",
  "MICROSOFT_ENTRA",
  "OKTA",
] as const;
const syncFrequencies = ["daily", "weekly", "monthly"] as const;

export const createIntegrationApiSchema = z.object({
  type: z.enum(integrationTypes),
  credentials: z.record(z.any()),
  metadata: z
    .object({
      domain: z.string().optional(),
      syncFrequency: z.enum(syncFrequencies).optional(),
      totalUsers: z.number().min(0).optional(),
    })
    .optional(),
});

export const updateIntegrationApiSchema = z.object({
  credentials: z.record(z.any()).optional(),
  metadata: z
    .object({
      domain: z.string().optional(),
      syncFrequency: z.enum(syncFrequencies).optional(),
      totalUsers: z.number().min(0).optional(),
    })
    .optional(),
});

export const uuidParamSchema = z.string().refine(
  (val) =>
    /^[0-9a-fA-F-]{36}$/.test(val) || // UUID v4
    /^c[a-z0-9]{24,}$/i.test(val) || // cuid-ish
    /^c[^\s]{8,}$/i.test(val), // 넉넉한 cuid 허용
  "Invalid ID format"
);

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

/**
 * API 에러 응답 헬퍼
 */
export function formatValidationError(error: z.ZodError) {
  return {
    error: "입력 검증 실패",
    details: error.flatten(),
  };
}
