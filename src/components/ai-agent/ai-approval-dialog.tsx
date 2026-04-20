/**
 * AI Write Tool 승인 다이얼로그
 * SMP-198: 사용자 confirm 후 실제 Write 작업 실행
 * SMP-203: 타임아웃(5분) + 동시성(중복 승인) 방지
 *
 * - 작업 내용 + 영향 범위 표시
 * - 남은 시간 카운트다운 (5분)
 * - [취소] / [확인] 버튼
 * - 확인 클릭 → PUT /api/ai/write 호출 → 결과 콜백
 */

"use client";

import { AlertTriangle, Clock } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type {
  WriteToolPendingAction,
  WriteToolResult,
} from "@/lib/ai/write-tool.types";

/** 승인 타임아웃: 5분 (초) */
const APPROVAL_TIMEOUT_SECONDS = 5 * 60;

interface AiApprovalDialogProps {
  open: boolean;
  pendingAction: WriteToolPendingAction | null;
  onConfirm: (result: WriteToolResult) => void;
  onCancel: () => void;
}

export function AiApprovalDialog({
  open,
  pendingAction,
  onConfirm,
  onCancel,
}: AiApprovalDialogProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(
    APPROVAL_TIMEOUT_SECONDS
  );
  // SMP-203: 동시성 방지 — 실행 중인 pendingAction.id 추적
  const executingIdRef = useRef<string | null>(null);

  // 타이머 리셋: 다이얼로그가 열릴 때마다
  useEffect(() => {
    if (open && pendingAction) {
      setRemainingSeconds(APPROVAL_TIMEOUT_SECONDS);
      executingIdRef.current = null;
      setIsExecuting(false);
    }
  }, [open, pendingAction?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // SMP-203: 카운트다운 타이머
  useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [open]);

  // SMP-203: 타임아웃 시 자동 취소
  const handleTimeout = useCallback(() => {
    onConfirm({
      success: false,
      message: "시간 초과로 승인이 취소되었습니다. 다시 요청해주세요.",
    });
  }, [onConfirm]);

  useEffect(() => {
    if (remainingSeconds === 0 && open && !isExecuting) {
      handleTimeout();
    }
  }, [remainingSeconds, open, isExecuting, handleTimeout]);

  if (!pendingAction) return null;

  const isDestructive =
    pendingAction.action === "delete_app" ||
    pendingAction.action === "delete_subscription";

  const isTimedOut = remainingSeconds === 0;

  // 남은 시간 포맷팅
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  async function handleConfirm() {
    if (!pendingAction) return;

    // SMP-203: 동시성 방지 — 같은 액션이 이미 실행 중이면 무시
    if (executingIdRef.current === pendingAction.id) return;
    if (isTimedOut) return;

    executingIdRef.current = pendingAction.id;
    setIsExecuting(true);

    try {
      const response = await fetch("/api/ai/write", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingAction }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "실행 실패");
      onConfirm(data.result as WriteToolResult);
    } catch (error) {
      onConfirm({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "실행 중 오류가 발생했습니다.",
      });
    } finally {
      setIsExecuting(false);
      executingIdRef.current = null;
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open: boolean) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle
              className={isDestructive ? "text-destructive" : "text-warning"}
              size={20}
            />
            작업 확인
          </DialogTitle>
          <DialogDescription className="text-base">
            {pendingAction.description}
          </DialogDescription>
        </DialogHeader>

        {pendingAction.impact && (
          <div className="bg-muted rounded-sm p-3 text-sm">
            <p className="text-muted-foreground mb-1 font-medium">영향 범위</p>
            <p>{pendingAction.impact}</p>
          </div>
        )}

        {/* SMP-203: 남은 시간 표시 */}
        <div className="flex items-center gap-2 text-sm">
          <Clock size={14} className="text-muted-foreground" />
          <span
            className={
              remainingSeconds <= 60
                ? "text-destructive font-medium"
                : "text-muted-foreground"
            }
          >
            남은 시간: {timeDisplay}
          </span>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel} disabled={isExecuting}>
            취소
          </Button>
          <Button
            variant={isDestructive ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isExecuting || isTimedOut}
          >
            {isExecuting ? "실행 중..." : isTimedOut ? "시간 초과" : "확인"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
