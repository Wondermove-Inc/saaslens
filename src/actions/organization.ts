// src/actions/organization.ts
// 조직 관련 Server Actions

"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withLogging } from "@/lib/logging";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

/**
 * 조직 생성 스키마
 */
const createOrgSchema = z.object({
  name: z.string().min(2, "조직명은 2자 이상이어야 합니다").max(50),
  domain: z
    .string()
    .min(1, "도메인은 필수 입력입니다")
    .regex(
      /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      "도메인 형식이 올바르지 않습니다 (예: company.com)"
    ),
});

const updateOrgSchema = z.object({
  name: z.string().min(2, "조직명은 2자 이상이어야 합니다").max(50),
  domain: z
    .string()
    .regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "도메인 형식이 올바르지 않습니다")
    .optional()
    .or(z.literal("")),
  logoUrl: z
    .string()
    .url("유효한 URL을 입력하세요")
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .max(200, "주소는 200자 이하여야 합니다")
    .optional()
    .or(z.literal("")),
});

/**
 * 새 조직을 생성하고 사용자를 ADMIN으로 설정합니다.
 * 인증되지 않은 사용자는 로그인 페이지로 redirect 합니다.
 * @param formData - name 필드를 포함한 FormData
 * @throws {Error} 이미 조직에 소속된 경우
 * @throws {ZodError} 유효성 검사 실패 시
 */
async function _createOrganization(formData: FormData) {
  // 인증 확인 - 인증 실패 시 로그인 페이지로 redirect
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // 이미 조직이 있는지 확인
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { organizationId: true },
  });

  if (user?.organizationId) {
    throw new Error("이미 조직에 소속되어 있습니다");
  }

  // 입력 유효성 검사
  const validated = createOrgSchema.parse({
    name: formData.get("name"),
    domain: formData.get("domain"),
  });

  // 도메인 중복 체크
  const existingOrg = await prisma.organization.findFirst({
    where: { domain: validated.domain },
  });
  if (existingOrg) {
    throw new Error("이미 사용 중인 도메인입니다");
  }

  // 트랜잭션: Organization 생성 + User 업데이트
  await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: { name: validated.name, domain: validated.domain },
    });

    await tx.user.update({
      where: { id: session.user.id },
      data: {
        organizationId: org.id,
        role: "ADMIN", // 조직 생성자는 ADMIN
      },
    });
  });

  revalidatePath("/");
  redirect("/dashboard");
}
export const createOrganization = withLogging(
  "createOrganization",
  _createOrganization
);

/**
 * 조직 정보 업데이트 (현재는 이름만)
 */
async function _updateOrganization(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (!session.user.organizationId) {
    redirect("/onboarding");
  }

  if (session.user.role !== "ADMIN") {
    return {
      success: false,
      message: "관리자만 조직 정보를 수정할 수 있습니다",
    };
  }

  const validated = updateOrgSchema.safeParse({
    name: formData.get("name"),
    domain: formData.get("domain"),
    logoUrl: formData.get("logoUrl"),
  });

  if (!validated.success) {
    return {
      success: false,
      message: "입력값을 확인해주세요",
      errors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const current = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { settings: true },
  });
  const currentSettings =
    (current?.settings as Record<string, unknown> | null) ?? {};
  const addressInput = formData.get("address");
  const address =
    typeof addressInput === "string" && addressInput.length > 0
      ? addressInput
      : ((currentSettings.address as string | undefined) ?? "");

  // domain 중복 체크 (빈 값이 아닌 경우에만)
  if (validated.data.domain) {
    const existingOrg = await prisma.organization.findFirst({
      where: {
        domain: validated.data.domain,
        id: { not: session.user.organizationId },
      },
    });
    if (existingOrg) {
      return { success: false, message: "이미 사용 중인 도메인입니다" };
    }
  }

  await prisma.organization.update({
    where: { id: session.user.organizationId },
    data: {
      name: validated.data.name,
      // 빈 문자열이면 업데이트하지 않음 (unique constraint 회피)
      ...(validated.data.domain ? { domain: validated.data.domain } : {}),
      logoUrl: validated.data.logoUrl || null,
      settings: { ...currentSettings, address },
    },
  });

  revalidatePath("/settings/organization");
  revalidatePath("/settings");

  return { success: true, message: "조직 정보가 업데이트되었습니다" };
}
export const updateOrganization = withLogging(
  "updateOrganization",
  _updateOrganization
);

/**
 * 조직의 팀/부서 목록 업데이트
 * settings.teams 배열에 저장됩니다.
 */
async function _updateOrganizationTeams(teams: string[]) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (!session.user.organizationId) {
    redirect("/onboarding");
  }

  if (session.user.role !== "ADMIN") {
    return { success: false, message: "관리자만 팀/부서를 관리할 수 있습니다" };
  }

  // 팀 이름 유효성 검사
  const validTeams = teams
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t.length <= 50);

  // 중복 제거
  const uniqueTeams = [...new Set(validTeams)];

  const current = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { settings: true },
  });
  const currentSettings =
    (current?.settings as Record<string, unknown> | null) ?? {};

  await prisma.organization.update({
    where: { id: session.user.organizationId },
    data: {
      settings: { ...currentSettings, teams: uniqueTeams },
    },
  });

  revalidatePath("/settings/organization");

  return { success: true, message: "팀/부서가 업데이트되었습니다" };
}
export const updateOrganizationTeams = withLogging(
  "updateOrganizationTeams",
  _updateOrganizationTeams
);

/**
 * 조직의 추가 도메인 목록 업데이트
 * settings.domains 배열에 저장됩니다.
 * 기본 도메인(organization.domain)과 동일한 항목은 자동 필터링됩니다.
 */
const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

async function _updateOrganizationDomains(domains: string[]) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (!session.user.organizationId) {
    redirect("/onboarding");
  }

  if (session.user.role !== "ADMIN") {
    return {
      success: false,
      message: "관리자만 도메인을 관리할 수 있습니다",
    };
  }

  const current = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { domain: true, settings: true },
  });

  const primaryDomain = current?.domain?.toLowerCase() || "";
  const currentSettings =
    (current?.settings as Record<string, unknown> | null) ?? {};

  // 도메인 유효성 검사 + 정규화
  const validDomains = domains
    .map((d) => d.trim().toLowerCase())
    .filter((d) => d.length > 0 && domainRegex.test(d))
    .filter((d) => d !== primaryDomain); // 기본 도메인과 동일한 항목 제거

  // 중복 제거
  const uniqueDomains = [...new Set(validDomains)];

  await prisma.organization.update({
    where: { id: session.user.organizationId },
    data: {
      settings: { ...currentSettings, domains: uniqueDomains },
    },
  });

  revalidatePath("/settings/organization");

  return { success: true, message: "도메인이 업데이트되었습니다" };
}
export const updateOrganizationDomains = withLogging(
  "updateOrganizationDomains",
  _updateOrganizationDomains
);
