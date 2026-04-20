import { IntegrationStatus, IntegrationType } from "@prisma/client";
import { z } from "zod";

export const integrationCreateSchema = z.object({
  type: z.nativeEnum(IntegrationType, {
    required_error: "연동 유형을 선택하세요",
  }),
  domain: z.string().optional(),
  adminEmail: z.string().email("올바른 이메일을 입력하세요").optional(),
  serviceAccountEmail: z
    .string()
    .email("올바른 이메일을 입력하세요")
    .optional(),
  privateKey: z.string().optional(),
});

export const integrationStatusSchema = z.object({
  status: z.nativeEnum(IntegrationStatus, {
    required_error: "상태를 선택하세요",
  }),
});

export type IntegrationCreateValues = z.infer<typeof integrationCreateSchema>;
export type IntegrationStatusValues = z.infer<typeof integrationStatusSchema>;
