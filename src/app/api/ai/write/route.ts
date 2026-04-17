/**
 * SMP AI Agent Write Tool API Route
 * SMP-198: 자연어 명령 → Write Tool 파싱 → 승인 대기 응답
 * SMP-203: AI SDK v6 호환성 정비 — prompt → messages 전환, ctx 전달
 * SMP-204: 서버 측 pending action 검증 — TTL + 1회 소비 + 변조 감지
 *
 * POST /api/ai/write  → 자연어 파싱 + 승인 대기 응답
 * PUT  /api/ai/write  → 사용자 승인 후 실제 실행 (서버 검증 포함)
 */

import { anthropic } from "@ai-sdk/anthropic";
import { generateText, stepCountIs } from "ai";
import { NextRequest, NextResponse } from "next/server";

import {
  storePendingAction,
  validateAndConsume,
} from "@/lib/ai/pending-action-store";
import { executeWriteTool, writeTools } from "@/lib/ai/write-tool";
import type { WriteToolPendingAction } from "@/lib/ai/write-tool.types";
import { requireOrganization } from "@/lib/auth/require-auth";

const MODEL = process.env.AI_MODEL ?? "claude-haiku-4-5";

const SYSTEM_PROMPT = `당신은 SMP(SaaS Management Platform) AI 어시스턴트입니다.
사용자의 자연어 명령을 분석하여 앱 등록/수정/삭제 또는 구독 변경 작업을 수행합니다.

중요 규칙:
- Write 작업(등록/수정/삭제)은 반드시 사용자 승인 후 실행됩니다
- 작업 전 영향 범위를 명확히 설명하세요
- 앱 ID나 구독 ID가 필요한 경우, 사용자에게 확인을 요청하세요
- 불명확한 명령은 명확히 해달라고 요청하세요

응답은 한국어로 합니다.`;

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const { organizationId, userId } = await requireOrganization();

    const body = await request.json();
    const { message } = body as { message: string };

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "message가 필요합니다." },
        { status: 400 }
      );
    }

    // SMP-203: prompt → messages 오버로드 전환 (AI SDK v6 호환)
    const { text, toolResults } = await generateText({
      model: anthropic(MODEL),
      system: SYSTEM_PROMPT,
      messages: [{ role: "user" as const, content: message }],
      tools: writeTools,
      stopWhen: stepCountIs(1),
    });

    // pendingAction 추출
    const pendingActions = toolResults
      ?.filter(
        (r) => (r.output as { type?: string })?.type === "pending_approval"
      )
      .map(
        (r) =>
          (r.output as { pendingAction?: WriteToolPendingAction })
            ?.pendingAction
      )
      .filter(Boolean);

    // SMP-204: pending action을 서버 store에 저장
    if (pendingActions && pendingActions.length > 0) {
      for (const action of pendingActions) {
        if (action) {
          storePendingAction(
            action.id,
            action.action,
            action.params as unknown as Record<string, unknown>,
            organizationId,
            userId
          );
        }
      }

      return NextResponse.json({
        message: text || "작업을 실행하려면 아래 내용을 확인하고 승인해주세요.",
        pendingActions,
      });
    }

    return NextResponse.json({ message: text });
  } catch (error) {
    console.error("[AI Write Tool POST] Error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "요청 처리 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // SMP-203: 인증 정보를 ctx로 서비스에 전달
    const { organizationId, userId, role } = await requireOrganization();

    const body = await request.json();
    const { pendingAction } = body as { pendingAction: WriteToolPendingAction };

    if (!pendingAction) {
      return NextResponse.json(
        { error: "pendingAction이 필요합니다." },
        { status: 400 }
      );
    }

    // SMP-204: 서버 측 검증 — TTL + 1회 소비 + 변조 감지 + 권한 확인
    const validation = validateAndConsume(
      pendingAction.id,
      pendingAction.params as unknown as Record<string, unknown>,
      organizationId,
      userId
    );

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const result = await executeWriteTool(pendingAction, {
      organizationId,
      userId,
      role,
    });
    return NextResponse.json({ result });
  } catch (error) {
    console.error("[AI Write Tool PUT] Error:", error);
    const message =
      error instanceof Error ? error.message : "실행 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
