/**
 * SMP AI Agent Chat API Route
 * SMP-197: streamText 기반 실시간 채팅 + Read Tool 자동 실행
 * SMP-198: Write Tool 통합 — 승인 대기 패턴 (pending_approval)
 * SMP-204: pending action 서버 저장 — onStepFinish에서 감지 후 store 등록
 *
 * POST /api/ai/chat → 스트리밍 응답 (useChat 훅과 연동)
 */

import { anthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, stepCountIs, streamText } from "ai";

import { storePendingAction } from "@/lib/ai/pending-action-store";
import { buildSystemPrompt } from "@/lib/ai/prompts/system-prompt";
import { readTools } from "@/lib/ai/read-tool";
import { writeTools } from "@/lib/ai/write-tool";
import { requireOrganization } from "@/lib/auth/require-auth";

const MODEL = process.env.AI_MODEL ?? "claude-haiku-4-5";

export async function POST(request: Request) {
  try {
    const { organizationId, userId, role } = await requireOrganization();

    const { messages } = await request.json();

    const result = streamText({
      model: anthropic(MODEL),
      system: buildSystemPrompt({
        organizationName: organizationId,
        role,
      }),
      messages: await convertToModelMessages(messages),
      tools: { ...readTools, ...writeTools },
      stopWhen: stepCountIs(5),
      // SMP-204: 각 step 완료 시 pending_approval 감지 → 서버 store 등록
      onStepFinish: ({ toolResults }) => {
        if (!toolResults) return;
        for (const tr of toolResults) {
          const output = tr.output as {
            type?: string;
            pendingAction?: {
              id: string;
              action: string;
              params: Record<string, unknown>;
            };
          };
          if (output?.type === "pending_approval" && output?.pendingAction) {
            storePendingAction(
              output.pendingAction.id,
              output.pendingAction.action,
              output.pendingAction.params,
              organizationId,
              userId
            );
          }
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("[AI Chat] Error:", error);
    return new Response(
      JSON.stringify({ error: "요청 처리 중 오류가 발생했습니다." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
