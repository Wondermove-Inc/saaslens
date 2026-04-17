// src/app/api/cron/agent-reminder/route.ts
import { prisma } from "@/lib/db";
import { getUsersWithoutAgent } from "@/lib/services/fleetdm/deviceService";
import { sendAgentInstallationReminderEmail } from "@/lib/services/notification";
import { NextRequest, NextResponse } from "next/server";

interface ProcessResult {
  organizationId: string;
  organizationName: string;
  usersWithoutAgent: number;
  emailsSent: number;
  errors: string[];
}

import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import { withCronAuth } from "@/lib/middleware";

export const GET = withCronAuth(
  withLogging("cron:agent-reminder", async (request: NextRequest) => {
    try {
      logger.info("[Cron] 에이전트 설치 리마인더 처리 시작");

      // 모든 조직 조회
      const organizations = await prisma.organization.findMany({
        select: {
          id: true,
          name: true,
        },
      });

      const results: ProcessResult[] = [];

      for (const org of organizations) {
        const result: ProcessResult = {
          organizationId: org.id,
          organizationName: org.name,
          usersWithoutAgent: 0,
          emailsSent: 0,
          errors: [],
        };

        try {
          // 에이전트 미설치 사용자 조회
          const usersWithoutAgent = await getUsersWithoutAgent(org.id);
          result.usersWithoutAgent = usersWithoutAgent.length;

          // 각 사용자에게 리마인더 이메일 발송
          for (const user of usersWithoutAgent) {
            try {
              const emailResult = await sendAgentInstallationReminderEmail({
                to: user.email,
                userName: user.name,
                organizationName: org.name,
              });

              if (emailResult.success) {
                result.emailsSent++;
                logger.info(
                  `[Cron] 리마인더 발송 완료: ${user.email} (${org.name})`
                );
              } else {
                result.errors.push(
                  `${user.email}: ${emailResult.error || "발송 실패"}`
                );
              }
            } catch (error) {
              result.errors.push(
                `${user.email}: ${error instanceof Error ? error.message : "알 수 없는 오류"}`
              );
            }
          }
        } catch (error) {
          result.errors.push(
            `조직 처리 오류: ${error instanceof Error ? error.message : "알 수 없는 오류"}`
          );
        }

        results.push(result);
      }

      // 요약 로그
      const summary = {
        totalOrganizations: results.length,
        totalUsersWithoutAgent: results.reduce(
          (sum, r) => sum + r.usersWithoutAgent,
          0
        ),
        totalEmailsSent: results.reduce((sum, r) => sum + r.emailsSent, 0),
        totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
      };

      logger.info({ summary }, "[Cron] 에이전트 설치 리마인더 처리 완료");

      return NextResponse.json({
        success: true,
        summary,
        results,
      });
    } catch (error) {
      logger.error({ err: error }, "[Cron] 에이전트 설치 리마인더 처리 오류");

      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "알 수 없는 오류",
        },
        { status: 500 }
      );
    }
  })
);
