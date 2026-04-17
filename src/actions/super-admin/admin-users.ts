// src/actions/super-admin/admin-users.ts
"use server";

import { requireSuperAdmin } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { withLogging } from "@/lib/logging";
import { sendInvitationEmail } from "@/lib/services/notification/email";
import type { ActionState } from "@/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export interface AdminUserInfo {
  id: string;
  name: string | null;
  email: string;
  role: string;
  status: string;
  createdAt: Date;
  lastLoginAt: Date | null;
}

/**
 * 테넌트 관리자(ADMIN role) 목록 조회
 */
async function _listTenantAdmins(): Promise<ActionState<AdminUserInfo[]>> {
  await requireSuperAdmin();

  const org = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!org) {
    return { success: false, message: "테넌트 정보를 찾을 수 없습니다." };
  }

  const admins = await prisma.user.findMany({
    where: {
      organizationId: org.id,
      role: "ADMIN",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      lastLoginAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return { success: true, data: admins as AdminUserInfo[] };
}

export const listTenantAdmins = withLogging(
  "listTenantAdmins",
  _listTenantAdmins
);

const inviteSchema = z.object({
  email: z.string().email("유효한 이메일을 입력하세요"),
});

/**
 * 테넌트 관리자 초대 (ADMIN role로 초대)
 */
async function _inviteTenantAdmin(email: string): Promise<ActionState> {
  await requireSuperAdmin();

  const parsed = inviteSchema.safeParse({ email });
  if (!parsed.success) {
    return { success: false, message: parsed.error.errors[0].message };
  }

  const org = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  if (!org) {
    return { success: false, message: "테넌트 정보를 찾을 수 없습니다." };
  }

  // 이미 조직에 속한 사용자인지 확인
  const existingUser = await prisma.user.findFirst({
    where: { email: parsed.data.email, organizationId: org.id },
  });

  if (existingUser) {
    return {
      success: false,
      message: "이미 조직에 속한 사용자입니다.",
    };
  }

  // 중복 초대 확인
  const existingInvitation = await prisma.invitation.findFirst({
    where: {
      email: parsed.data.email,
      organizationId: org.id,
      status: "PENDING",
    },
  });

  if (existingInvitation) {
    return {
      success: false,
      message: "이미 초대장이 발송된 이메일입니다.",
    };
  }

  // 초대 생성
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invitation = await prisma.invitation.create({
    data: {
      email: parsed.data.email,
      role: "ADMIN",
      organizationId: org.id,
      expiresAt,
    },
  });

  // 초대 이메일 발송
  try {
    await sendInvitationEmail({
      email: parsed.data.email,
      token: invitation.token,
      organizationName: org.name,
      role: "ADMIN",
    });
  } catch (error) {
    // 이메일 발송 실패 시 초대 삭제
    await prisma.invitation.delete({ where: { id: invitation.id } });
    return { success: false, message: "초대 이메일 발송에 실패했습니다." };
  }

  revalidatePath("/super-admin/admins");
  return { success: true, message: "초대장이 발송되었습니다." };
}

export const inviteTenantAdmin = withLogging(
  "inviteTenantAdmin",
  _inviteTenantAdmin
);

/**
 * 관리자 역할 변경 (ADMIN ↔ MEMBER)
 */
async function _changeAdminRole(
  userId: string,
  role: "ADMIN" | "MEMBER"
): Promise<ActionState> {
  await requireSuperAdmin();

  await prisma.user.update({
    where: { id: userId },
    data: { role },
  });

  revalidatePath("/super-admin/admins");
  return { success: true, message: "역할이 변경되었습니다." };
}

export const changeAdminRole = withLogging("changeAdminRole", _changeAdminRole);

export interface TenantInvitationInfo {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * 테넌트 초대 이력 조회
 */
async function _listTenantInvitations(): Promise<
  ActionState<TenantInvitationInfo[]>
> {
  await requireSuperAdmin();

  const org = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!org) {
    return { success: false, message: "테넌트 정보를 찾을 수 없습니다." };
  }

  const invitations = await prisma.invitation.findMany({
    where: { organizationId: org.id },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      expiresAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return { success: true, data: invitations as TenantInvitationInfo[] };
}

export const listTenantInvitations = withLogging(
  "listTenantInvitations",
  _listTenantInvitations
);

/**
 * 초대 재발송
 */
async function _resendTenantInvitation(
  invitationId: string
): Promise<ActionState> {
  await requireSuperAdmin();

  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: { organization: { select: { name: true } } },
  });

  if (!invitation || invitation.status !== "PENDING") {
    return { success: false, message: "유효하지 않은 초대입니다." };
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  const newToken = crypto.randomUUID();

  await prisma.invitation.update({
    where: { id: invitationId },
    data: { expiresAt, token: newToken },
  });

  await sendInvitationEmail({
    email: invitation.email,
    token: newToken,
    organizationName: invitation.organization.name,
    role: invitation.role as "ADMIN",
  });

  revalidatePath("/super-admin/admins");
  return { success: true, message: "초대장이 재발송되었습니다." };
}

export const resendTenantInvitation = withLogging(
  "resendTenantInvitation",
  _resendTenantInvitation
);
