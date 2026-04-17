"use client";

/**
 * AI Agent 플로팅 버튼
 * SMP-197 + SMP-198
 */

import { Button } from "@/components/ui/button";
import { useAiPanelStore } from "@/lib/ai/ai-panel-store";
import { Bot } from "lucide-react";

export function AiFloatingButton() {
  const { isOpen, toggle } = useAiPanelStore();

  if (isOpen) return null;

  return (
    <Button
      onClick={toggle}
      size="icon"
      className="fixed right-6 bottom-6 z-50 h-14 w-14 rounded-full shadow-lg transition-transform hover:scale-105"
      aria-label="AI 어시스턴트 열기"
    >
      <Bot className="h-6 w-6" />
    </Button>
  );
}
