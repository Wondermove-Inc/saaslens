// src/actions/super-admin/tenant-settings.ts
"use server";

import { requireSuperAdmin } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { withLogging } from "@/lib/logging";
import type { ActionState } from "@/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export interface TenantInfo {
  id: string;
  name: string;
  domain: string | null;
  logoUrl: string | null;
  createdAt: Date;
  userCount: number;
  subscriptionCount: number;
}

/**
 * 현재 테넌트(Organization) 정보 조회
 * SUPER_ADMIN 전용
 */
async function _getTenantInfo(): Promise<ActionState<TenantInfo>> {
  await requireSuperAdmin();

  const org = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
    include: {
      _count: {
        select: {
          users: true,
          subscriptions: true,
        },
      },
    },
  });

  if (!org) {
    return { success: false, message: "테넌트 정보를 찾을 수 없습니다." };
  }

  return {
    success: true,
    data: {
      id: org.id,
      name: org.name,
      domain: org.domain,
      logoUrl: org.logoUrl,
      createdAt: org.createdAt,
      userCount: org._count.users,
      subscriptionCount: org._count.subscriptions,
    },
  };
}

export const getTenantInfo = withLogging("getTenantInfo", _getTenantInfo);

const createTenantSchema = z.object({
  name: z.string().min(1, "회사명을 입력해주세요").max(100),
  domain: z
    .string()
    .regex(
      /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      "올바른 도메인 형식을 입력해주세요 (예: example.com)"
    )
    .optional()
    .or(z.literal("")),
  logoUrl: z
    .string()
    .url("올바른 URL을 입력해주세요")
    .optional()
    .or(z.literal("")),
});

/**
 * 신규 테넌트(Organization) 생성
 * SUPER_ADMIN 전용
 */
async function _createTenant(
  name: string,
  domain?: string,
  logoUrl?: string
): Promise<ActionState<TenantInfo>> {
  await requireSuperAdmin();

  const parsed = createTenantSchema.safeParse({ name, domain, logoUrl });
  if (!parsed.success) {
    return { success: false, message: parsed.error.errors[0].message };
  }

  const org = await prisma.organization.create({
    data: {
      name: parsed.data.name,
      domain: parsed.data.domain || null,
      logoUrl: parsed.data.logoUrl || null,
    },
    include: {
      _count: { select: { users: true, subscriptions: true } },
    },
  });

  revalidatePath("/super-admin");
  revalidatePath("/super-admin/tenant");
  revalidatePath("/super-admin/admins");

  return {
    success: true,
    message: "테넌트가 생성되었습니다.",
    data: {
      id: org.id,
      name: org.name,
      domain: org.domain,
      logoUrl: org.logoUrl,
      createdAt: org.createdAt,
      userCount: org._count.users,
      subscriptionCount: org._count.subscriptions,
    },
  };
}

export const createTenant = withLogging("createTenant", _createTenant);

const updateDomainSchema = z.object({
  domain: z
    .string()
    .min(1, "도메인을 입력해주세요")
    .regex(
      /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      "올바른 도메인 형식을 입력해주세요 (예: example.com)"
    ),
});

/**
 * 테넌트 도메인 업데이트
 */
async function _updateTenantDomain(
  orgId: string,
  domain: string
): Promise<ActionState> {
  await requireSuperAdmin();

  const parsed = updateDomainSchema.safeParse({ domain });
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.errors[0].message,
    };
  }

  await prisma.organization.update({
    where: { id: orgId },
    data: { domain: parsed.data.domain },
  });

  revalidatePath("/super-admin/tenant");
  return { success: true, message: "도메인이 업데이트되었습니다." };
}

export const updateTenantDomain = withLogging(
  "updateTenantDomain",
  _updateTenantDomain
);

const updateNameSchema = z.object({
  name: z.string().min(1, "회사명을 입력해주세요").max(100),
});

/**
 * 테넌트 회사명 업데이트
 */
async function _updateTenantName(
  orgId: string,
  name: string
): Promise<ActionState> {
  await requireSuperAdmin();

  const parsed = updateNameSchema.safeParse({ name });
  if (!parsed.success) {
    return { success: false, message: parsed.error.errors[0].message };
  }

  await prisma.organization.update({
    where: { id: orgId },
    data: { name: parsed.data.name },
  });

  revalidatePath("/super-admin/tenant");
  return { success: true, message: "회사명이 업데이트되었습니다." };
}

export const updateTenantName = withLogging(
  "updateTenantName",
  _updateTenantName
);

const updateLogoSchema = z.object({
  logoUrl: z.string().url("올바른 URL을 입력해주세요").or(z.literal("")),
});

/**
 * 테넌트 로고 URL 업데이트
 */
async function _updateTenantLogoUrl(
  orgId: string,
  logoUrl: string
): Promise<ActionState> {
  await requireSuperAdmin();

  const parsed = updateLogoSchema.safeParse({ logoUrl });
  if (!parsed.success) {
    return { success: false, message: parsed.error.errors[0].message };
  }

  await prisma.organization.update({
    where: { id: orgId },
    data: { logoUrl: parsed.data.logoUrl || null },
  });

  revalidatePath("/super-admin/tenant");
  return { success: true, message: "로고 URL이 업데이트되었습니다." };
}

export const updateTenantLogoUrl = withLogging(
  "updateTenantLogoUrl",
  _updateTenantLogoUrl
);
