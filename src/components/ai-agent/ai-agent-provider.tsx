"use client";

/**
 * AI Agent 전역 Provider — 모든 페이지에 플로팅 버튼 + 사이드 패널 마운트
 * SMP-197 + SMP-198
 */

import { AiFloatingButton } from "./ai-floating-button";
import { AiSidePanel } from "./ai-side-panel";

export function AiAgentProvider() {
  return (
    <>
      <AiFloatingButton />
      <AiSidePanel />
    </>
  );
}
