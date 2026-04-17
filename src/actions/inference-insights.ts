// src/actions/inference-insights.ts
"use server";

import { requireOrganization } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import { Prisma } from "@prisma/client";
import { Resend } from "resend";

// Lazy initialization to avoid build-time errors
let resendClient: Resend | null = null;
function getResend(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY || "dummy-key-for-build";
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export interface InferenceMetrics {
  totalCalls: number;
  successfulCalls: number;
  successRate: number;
  averageTokens: {
    prompt: number | null;
    completion: number | null;
    total: number | null;
  };
  errorCounts: Record<string, number>;
  recentFailures: Array<{
    merchantName: string;
    errorCode: string | null;
    createdAt: Date;
    reasoning: string | null;
    confidence: number;
  }>;
}

/**
 * VendorInferenceLog 기반 LLM 호출 메트릭 조회
 * - 성공: rawResult가 존재하는 건
 * - 실패: errorCode 존재 또는 rawResult 없음
 */
export async function getInferenceMetrics(): Promise<InferenceMetrics> {
  const { organizationId } = await requireOrganization();

  const [totalCalls, successfulCalls, tokenAgg, errorBuckets, recentFailures] =
    await Promise.all([
      prisma.vendorInferenceLog.count({ where: { organizationId } }),
      prisma.vendorInferenceLog.count({
        where: {
          organizationId,
          NOT: { rawResult: { equals: Prisma.DbNull } },
        },
      }),
      prisma.vendorInferenceLog.aggregate({
        where: { organizationId },
        _avg: {
          promptTokens: true,
          completionTokens: true,
          totalTokens: true,
        },
      }),
      prisma.vendorInferenceLog.groupBy({
        by: ["errorCode"],
        where: { organizationId, errorCode: { not: null } },
        _count: { _all: true },
      }),
      prisma.vendorInferenceLog.findMany({
        where: {
          organizationId,
          OR: [
            { errorCode: { not: null } },
            { rawResult: { equals: Prisma.DbNull } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          merchantName: true,
          errorCode: true,
          createdAt: true,
          reasoning: true,
          confidence: true,
        },
      }),
    ]);

  const errorCounts = errorBuckets.reduce<Record<string, number>>(
    (acc, bucket) => {
      const key = bucket.errorCode || "unknown";
      acc[key] = (acc[key] || 0) + bucket._count._all;
      return acc;
    },
    {}
  );

  const successRate =
    totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 1000) / 10 : 0;

  return {
    totalCalls,
    successfulCalls,
    successRate,
    averageTokens: {
      prompt: tokenAgg._avg.promptTokens
        ? Number(tokenAgg._avg.promptTokens)
        : null,
      completion: tokenAgg._avg.completionTokens
        ? Number(tokenAgg._avg.completionTokens)
        : null,
      total: tokenAgg._avg.totalTokens
        ? Number(tokenAgg._avg.totalTokens)
        : null,
    },
    errorCounts,
    recentFailures: recentFailures.map((item) => ({
      merchantName: item.merchantName,
      errorCode: item.errorCode,
      createdAt: item.createdAt,
      reasoning: item.reasoning,
      confidence: item.confidence,
    })),
  };
}

interface SendInferenceMetricsEmailResult {
  success: boolean;
  message: string;
}

async function _sendInferenceMetricsEmail(): Promise<SendInferenceMetricsEmailResult> {
  const { organizationId, role, session } = await requireOrganization();

  if (role !== "ADMIN") {
    return {
      success: false,
      message: "관리자만 이메일 알림을 발송할 수 있습니다.",
    };
  }

  const [organization, metrics] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        name: true,
        users: {
          where: { role: "ADMIN" },
          select: { email: true, name: true },
        },
      },
    }),
    getInferenceMetrics(),
  ]);

  const recipients =
    organization?.users
      .map((u) => u.email)
      .filter((e): e is string => Boolean(e)) ?? [];
  if (recipients.length === 0 && session.user.email) {
    recipients.push(session.user.email);
  }
  if (recipients.length === 0) {
    return {
      success: false,
      message: "발송할 관리자 이메일을 찾을 수 없습니다.",
    };
  }

  const errorEntries = Object.entries(metrics.errorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const resend = getResend();
  const today = new Date().toLocaleDateString("ko-KR");
  const orgName = organization?.name || "SaaS Management Platform";
  const subject = `[${orgName}] LLM 매칭 메트릭 알림 - ${today}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 640px;">
      <h2>LLM 매칭 메트릭 알림</h2>
      <p>${orgName}의 최근 LLM 매칭 메트릭입니다.</p>
      <ul>
        <li>총 호출: ${metrics.totalCalls}건</li>
        <li>성공(결과 존재): ${metrics.successfulCalls}건 (${metrics.successRate.toFixed(1)}%)</li>
        <li>평균 토큰: prompt ${metrics.averageTokens.prompt ?? "-"} / completion ${
          metrics.averageTokens.completion ?? "-"
        } / total ${metrics.averageTokens.total ?? "-"}</li>
      </ul>
      <h4>최근 에러 Top 5</h4>
      <ul>
        ${
          errorEntries.length === 0
            ? "<li>에러 없음</li>"
            : errorEntries
                .map(([code, count]) => `<li>${code}: ${count}건</li>`)
                .join("")
        }
      </ul>
      <p style="color:#666;font-size:12px;">관리자 알림용 자동 발송 이메일입니다.</p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: "SaaS Management Platform <reports@resend.dev>",
      to: recipients,
      subject,
      html,
    });
    return { success: true, message: "이메일을 발송했습니다." };
  } catch (error) {
    logger.error({ err: error }, "[Inference Email] 발송 실패");
    return { success: false, message: "이메일 발송에 실패했습니다." };
  }
}
export const sendInferenceMetricsEmail = withLogging(
  "sendInferenceMetricsEmail",
  _sendInferenceMetricsEmail
);
