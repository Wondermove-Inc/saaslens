// src/lib/services/terminated-users/terminatedUsersScan.ts
import { prisma } from "@/lib/db";
import { sendTerminatedUserAlertEmail } from "@/lib/services/notification/email";

// 조직 설정 타입
interface OrganizationSettings {
  notifications?: {
    emailEnabled?: boolean;
    offboardingAlerts?: boolean;
  };
}

// 스캔 결과 타입
export interface TerminatedUserScanResult {
  success: boolean;
  processedAt: Date;
  processedOrganizations: number;
  totalTerminatedUsers: number;
  totalUnrevokedAccess: number;
  emailsSent: number;
  errors: string[];
}

// 퇴사자 미회수 계정 스캔 처리
export async function processTerminatedUsersScan(): Promise<TerminatedUserScanResult> {
  const result: TerminatedUserScanResult = {
    success: true,
    processedAt: new Date(),
    processedOrganizations: 0,
    totalTerminatedUsers: 0,
    totalUnrevokedAccess: 0,
    emailsSent: 0,
    errors: [],
  };

  try {
    // 모든 조직 조회 (알림 설정 포함)
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        settings: true,
        users: {
          where: { role: "ADMIN", status: "ACTIVE" },
          select: { email: true, role: true },
        },
      },
    });

    result.processedOrganizations = organizations.length;

    for (const org of organizations) {
      try {
        await processOrganization(
          {
            id: org.id,
            name: org.name,
            settings: org.settings,
            members: org.users,
          },
          result
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "알 수 없는 오류";
        result.errors.push(`${org.id}: ${errorMessage}`);
      }
    }
  } catch (error) {
    result.success = false;
    const errorMessage =
      error instanceof Error ? error.message : "알 수 없는 오류";
    result.errors.push(errorMessage);
  }

  return result;
}

// 개별 조직 처리
async function processOrganization(
  org: {
    id: string;
    name: string;
    settings: unknown;
    members: Array<{ email: string; role: string }>;
  },
  result: TerminatedUserScanResult
): Promise<void> {
  const settings = org.settings as OrganizationSettings;
  const offboardingAlerts = settings?.notifications?.offboardingAlerts ?? true;
  const emailEnabled = settings?.notifications?.emailEnabled ?? true;

  // 퇴사자이면서 미회수 접근권한이 있는 사용자 조회
  const terminatedUsers = await prisma.user.findMany({
    where: {
      organizationId: org.id,
      status: "TERMINATED",
      appAccesses: { some: {} },
    },
    include: {
      _count: {
        select: { appAccesses: true },
      },
      appAccesses: {
        include: {
          app: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (terminatedUsers.length === 0) {
    return;
  }

  result.totalTerminatedUsers += terminatedUsers.length;

  const totalAccess = terminatedUsers.reduce(
    (sum, user) => sum + user._count.appAccesses,
    0
  );
  result.totalUnrevokedAccess += totalAccess;

  // 알림 비활성화된 경우 스킵
  if (!offboardingAlerts || !emailEnabled) {
    return;
  }

  // 관리자가 없는 경우
  const admins = org.members.filter((m) => m.role === "ADMIN");
  if (admins.length === 0) {
    result.errors.push(`${org.id}: 관리자 없음`);
    return;
  }

  // 각 퇴사자에 대해 알림 발송
  for (const user of terminatedUsers) {
    const unrevokedApps = user.appAccesses.map((access) => access.app.name);

    for (const admin of admins) {
      const emailResult = await sendTerminatedUserAlertEmail({
        to: admin.email,
        terminatedUserName: user.name || user.email,
        terminatedUserEmail: user.email,
        unrevokedApps,
        terminatedAt: user.terminatedAt!,
        organizationName: org.name,
      });

      if (emailResult.success) {
        result.emailsSent++;
      } else {
        result.errors.push(
          `${org.id}/${user.id}: 이메일 발송 실패 - ${emailResult.error}`
        );
      }
    }
  }
}
