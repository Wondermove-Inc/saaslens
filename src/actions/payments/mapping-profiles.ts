// src/actions/payments/mapping-profiles.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withLogging } from "@/lib/logging";
import type { ActionState } from "@/types";
import { revalidatePath } from "next/cache";

// ============================================================
// Types
// ============================================================

export interface MappingProfileData {
  id: string;
  name: string;
  sourceFormat: string;
  fieldMappings: Record<string, string>;
  doubleEntry: {
    enabled: boolean;
    debitAccountColumn?: string;
    creditAccountColumn?: string;
    expensePrefix?: string;
  } | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// Read
// ============================================================

async function _getMappingProfiles(): Promise<
  ActionState<MappingProfileData[]>
> {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return { success: false, message: "인증이 필요합니다" };
  }

  const profiles = await prisma.csvMappingProfile.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });

  return {
    success: true,
    data: profiles.map((p) => ({
      id: p.id,
      name: p.name,
      sourceFormat: p.sourceFormat,
      fieldMappings: p.fieldMappings as Record<string, string>,
      doubleEntry: p.doubleEntry as MappingProfileData["doubleEntry"],
      isDefault: p.isDefault,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
  };
}

export const getMappingProfiles = withLogging(
  "getMappingProfiles",
  _getMappingProfiles
);

// ============================================================
// Create
// ============================================================

async function _createMappingProfile(
  _prevState: ActionState<{ id: string }>,
  formData: FormData
): Promise<ActionState<{ id: string }>> {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return { success: false, message: "인증이 필요합니다" };
  }

  const name = formData.get("name") as string;
  const sourceFormat = (formData.get("sourceFormat") as string) || "CUSTOM";
  const fieldMappingsJson = formData.get("fieldMappings") as string;
  const doubleEntryJson = formData.get("doubleEntry") as string | null;
  const isDefault = formData.get("isDefault") === "true";

  if (!name || !fieldMappingsJson) {
    return { success: false, message: "프로필 이름과 매핑 정보가 필요합니다" };
  }

  let fieldMappings: Record<string, string>;
  let doubleEntry: Record<string, unknown> | null = null;

  try {
    fieldMappings = JSON.parse(fieldMappingsJson);
    if (doubleEntryJson) {
      doubleEntry = JSON.parse(doubleEntryJson);
    }
  } catch {
    return { success: false, message: "매핑 정보 형식이 올바르지 않습니다" };
  }

  const profile = await prisma.$transaction(async (tx) => {
    // isDefault 설정 시 기존 default 해제
    if (isDefault) {
      await tx.csvMappingProfile.updateMany({
        where: {
          organizationId: session.user!.organizationId!,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    return tx.csvMappingProfile.create({
      data: {
        organizationId: session.user!.organizationId!,
        name,
        sourceFormat,
        fieldMappings,
        ...(doubleEntry ? { doubleEntry: doubleEntry as object } : {}),
        isDefault,
      },
    });
  });

  revalidatePath("/settings/import");
  return {
    success: true,
    message: `매핑 프로필 "${name}"이 저장되었습니다`,
    data: { id: profile.id },
  };
}

export const createMappingProfile = withLogging(
  "createMappingProfile",
  _createMappingProfile
);

// ============================================================
// Update
// ============================================================

async function _updateMappingProfile(
  _prevState: ActionState<void>,
  formData: FormData
): Promise<ActionState<void>> {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return { success: false, message: "인증이 필요합니다" };
  }

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const fieldMappingsJson = formData.get("fieldMappings") as string;
  const doubleEntryJson = formData.get("doubleEntry") as string | null;
  const isDefault = formData.get("isDefault") === "true";

  if (!id) {
    return { success: false, message: "프로필 ID가 필요합니다" };
  }

  // 소유권 확인
  const existing = await prisma.csvMappingProfile.findFirst({
    where: { id, organizationId: session.user.organizationId },
  });

  if (!existing) {
    return { success: false, message: "프로필을 찾을 수 없습니다" };
  }

  const updateData: Record<string, unknown> = {};
  if (name) updateData.name = name;
  if (fieldMappingsJson) {
    try {
      updateData.fieldMappings = JSON.parse(fieldMappingsJson);
    } catch {
      return {
        success: false,
        message: "매핑 정보 형식이 올바르지 않습니다",
      };
    }
  }
  if (doubleEntryJson) {
    try {
      updateData.doubleEntry = JSON.parse(doubleEntryJson);
    } catch {
      return {
        success: false,
        message: "복식부기 설정 형식이 올바르지 않습니다",
      };
    }
  }

  if (isDefault) {
    updateData.isDefault = true;
  }

  await prisma.$transaction(async (tx) => {
    // isDefault 설정 시 기존 default 해제
    if (isDefault) {
      await tx.csvMappingProfile.updateMany({
        where: {
          organizationId: session.user!.organizationId!,
          isDefault: true,
          id: { not: id },
        },
        data: { isDefault: false },
      });
    }

    await tx.csvMappingProfile.update({
      where: { id },
      data: updateData,
    });
  });

  revalidatePath("/settings/import");
  return { success: true, message: "매핑 프로필이 업데이트되었습니다" };
}

export const updateMappingProfile = withLogging(
  "updateMappingProfile",
  _updateMappingProfile
);

// ============================================================
// Delete
// ============================================================

async function _deleteMappingProfile(
  _prevState: ActionState<void>,
  formData: FormData
): Promise<ActionState<void>> {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return { success: false, message: "인증이 필요합니다" };
  }

  const id = formData.get("id") as string;
  if (!id) {
    return { success: false, message: "프로필 ID가 필요합니다" };
  }

  // 소유권 확인
  const existing = await prisma.csvMappingProfile.findFirst({
    where: { id, organizationId: session.user.organizationId },
  });

  if (!existing) {
    return { success: false, message: "프로필을 찾을 수 없습니다" };
  }

  await prisma.csvMappingProfile.delete({ where: { id } });

  revalidatePath("/settings/import");
  return { success: true, message: "매핑 프로필이 삭제되었습니다" };
}

export const deleteMappingProfile = withLogging(
  "deleteMappingProfile",
  _deleteMappingProfile
);
