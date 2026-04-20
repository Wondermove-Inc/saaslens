"use client";

/**
 * AI Agent 사이드 패널 — useChat() 기반 Chat UI + Write Tool 승인 플로우
 * SMP-197 (Read Tool + Chat UI) + SMP-198 (Write Tool + Approval)
 * SMP-204: React duplicate key 수정 — msg.id + msgIndex
 * SMP-206: AI 응답 마크다운 렌더링 — react-markdown 통합
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAiPanelStore } from "@/lib/ai/ai-panel-store";
import type {
  WriteToolPendingAction,
  WriteToolResult,
} from "@/lib/ai/write-tool.types";
import { cn } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Bot, Loader2, Send, User, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AiApprovalDialog } from "./ai-approval-dialog";
import { AiMarkdown } from "./ai-markdown";

export function AiSidePanel() {
  const { isOpen, close } = useAiPanelStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [pendingAction, setPendingAction] =
    useState<WriteToolPendingAction | null>(null);
  const processedToolCallIds = useRef<Set<string>>(new Set());

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/ai/chat" }),
    []
  );

  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport,
  });

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Write Tool pending_approval 감지 → 승인 다이얼로그 트리거
  // AI SDK v6: tool parts = type "tool-<name>" or "dynamic-tool", state "output-available", result in "output"
  useEffect(() => {
    for (const msg of messages) {
      if (msg.role !== "assistant") continue;
      for (const part of msg.parts) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = part as any;
        const isToolPart =
          p.type === "dynamic-tool" || p.type?.startsWith("tool-");
        if (!isToolPart) continue;
        if (p.state !== "output-available") continue;

        const output = p.output;
        if (
          output?.type === "pending_approval" &&
          output?.pendingAction &&
          !processedToolCallIds.current.has(p.toolCallId)
        ) {
          processedToolCallIds.current.add(p.toolCallId);
          setPendingAction(output.pendingAction as WriteToolPendingAction);
        }
      }
    }
  }, [messages]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage({ text });
  };

  function handleApprovalConfirm(result: WriteToolResult) {
    setPendingAction(null);
    const content = result.success
      ? `✅ ${result.message}`
      : `❌ ${result.message}`;
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "assistant" as const,
        parts: [{ type: "text" as const, text: content }],
      },
    ]);
  }

  function handleApprovalCancel() {
    setPendingAction(null);
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "assistant" as const,
        parts: [{ type: "text" as const, text: "작업이 취소되었습니다." }],
      },
    ]);
  }

  if (!isOpen) return null;

  return (
    <>
      <div className="bg-background fixed top-[55px] right-0 z-40 flex h-[calc(100vh-55px)] w-[400px] flex-col border-l shadow-lg transition-transform duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Bot className="text-primary h-5 w-5" />
            <h3 className="font-semibold">AI 어시스턴트</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={close}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="text-muted-foreground flex h-full items-center justify-center">
              <p className="text-center text-sm">
                안녕하세요! SMP AI 어시스턴트입니다.
                <br />
                앱, 구독, 비용 등을 자연어로 조회하거나
                <br />앱 등록/수정/삭제를 요청해보세요.
              </p>
            </div>
          )}
          {messages.map((msg, msgIndex) => (
            <div
              key={`${msg.id}-${msgIndex}`}
              className={cn(
                "flex gap-2",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "assistant" && (
                <Bot className="text-primary mt-1 h-5 w-5 shrink-0" />
              )}
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {msg.parts.map((part, i) =>
                  part.type === "text" ? (
                    msg.role === "assistant" ? (
                      <AiMarkdown key={i} content={part.text} />
                    ) : (
                      <p key={i} className="whitespace-pre-wrap">
                        {part.text}
                      </p>
                    )
                  ) : null
                )}
              </div>
              {msg.role === "user" && (
                <User className="text-muted-foreground mt-1 h-5 w-5 shrink-0" />
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-2">
              <Bot className="text-primary mt-1 h-5 w-5 shrink-0" />
              <div className="bg-muted flex items-center gap-2 rounded-lg px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-muted-foreground text-sm">
                  생각 중...
                </span>
              </div>
            </div>
          )}
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm">
              오류가 발생했습니다. 다시 시도해주세요.
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2 border-t p-4">
          <Input
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setInput(e.target.value)
            }
            placeholder="메시지를 입력하세요..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* Write Tool 승인 다이얼로그 */}
      <AiApprovalDialog
        open={!!pendingAction}
        pendingAction={pendingAction}
        onConfirm={handleApprovalConfirm}
        onCancel={handleApprovalCancel}
      />
    </>
  );
}
