import { AppStatus } from "@prisma/client";
import { z } from "zod";

// URL 또는 상대 경로(/로 시작) 검증 함수
const isValidUrlOrPath = (val: string) => {
  if (!val || val === "") return true;
  if (val.startsWith("/")) return true; // 상대 경로 허용
  try {
    new URL(val);
    return true;
  } catch {
    return false;
  }
};

export const appFormSchema = z.object({
  name: z
    .string()
    .min(2, "앱 이름은 2자 이상이어야 합니다")
    .max(100, "앱 이름은 100자 이하여야 합니다"),
  status: z.nativeEnum(AppStatus).optional(),
  category: z.string().optional(),
  customLogoUrl: z
    .string()
    .refine(isValidUrlOrPath, { message: "유효한 URL을 입력하세요" })
    .optional(),
  customWebsite: z
    .string()
    .url("유효한 URL을 입력하세요")
    .or(z.literal(""))
    .optional(),
  notes: z.string().max(1000, "메모는 1000자 이하여야 합니다").optional(),
  tags: z.string().optional(),
  ownerId: z.string().optional(),
  catalogId: z.string().optional(),
  teamIds: z.array(z.string()).optional(),
});

export type AppFormValues = z.infer<typeof appFormSchema>;
