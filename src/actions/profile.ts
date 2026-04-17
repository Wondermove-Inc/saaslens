// src/actions/profile.ts
"use server";

import { requireAuth } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { withLogging } from "@/lib/logging";
import type { ActionState } from "@/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().min(2, "이름은 2자 이상이어야 합니다").max(50),
  // 주석 처리: 직함, 부서, 아바타 필드
  // title: z
  //   .string()
  //   .max(50, "직함은 50자 이하여야 합니다")
  //   .optional()
  //   .or(z.literal("")),
  // department: z
  //   .string()
  //   .max(50, "부서는 50자 이하여야 합니다")
  //   .optional()
  //   .or(z.literal("")),
  // avatarUrl: z
  //   .string()
  //   .url("유효한 URL을 입력하세요")
  //   .optional()
  //   .or(z.literal("")),
});

async function _updateProfile(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireAuth();

  const result = profileSchema.safeParse({
    name: formData.get("name"),
    // 주석 처리: 직함, 부서, 아바타 필드
    // title: formData.get("title"),
    // department: formData.get("department"),
    // avatarUrl: formData.get("avatarUrl"),
  });

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors as Record<string, string[]>,
      message: "입력값을 확인해주세요",
    };
  }

  const { name } = result.data;
  // 주석 처리: 직함, 부서, 아바타 필드
  // const { name, title, department, avatarUrl } = result.data;

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name,
      // 주석 처리: 직함, 부서, 아바타 필드
      // jobTitle: title || null,
      // department: department || null,
      // avatarUrl: avatarUrl || null,
    },
  });

  revalidatePath("/settings");

  return { success: true, message: "프로필이 업데이트되었습니다" };
}
export const updateProfile = withLogging("updateProfile", _updateProfile);
