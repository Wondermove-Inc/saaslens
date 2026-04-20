"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

/**
 * StatusBalloon 변형 타입
 * - excellent: 👍 최고에요! / Excellent!
 * - perfect: 😍 완벽해요! / Perfect!
 * - outstanding: 🏆 훌륭해요! / Outstanding!
 */
export type StatusBalloonVariant = "excellent" | "perfect" | "outstanding";

interface StatusBalloonProps {
  variant: StatusBalloonVariant;
  className?: string;
}

const BALLOON_EMOJI: Record<StatusBalloonVariant, string> = {
  excellent: "👍",
  perfect: "😍",
  outstanding: "🏆",
};

/**
 * StatusBalloon
 * Figma 디자인 기반 상태 말풍선 컴포넌트
 * - 왼쪽 삼각형 화살표
 * - 흰색 배경 + 그림자
 * - 이모지 + 텍스트 (i18n)
 */
export function StatusBalloon({ variant, className }: StatusBalloonProps) {
  const t = useTranslations("common.statusBalloon");

  const emoji = BALLOON_EMOJI[variant];
  const text = t(variant);

  return (
    <div className={cn("flex items-center", className)}>
      {/* 왼쪽 삼각형 화살표 */}
      <div className="border-y-[5px] border-r-[6px] border-y-transparent border-r-white" />
      {/* 말풍선 박스 */}
      <div className="flex h-[22px] items-center rounded bg-white px-2 shadow-[0px_0px_4px_0px_rgba(0,0,0,0.25)]">
        <span className="text-[12px] leading-none whitespace-nowrap text-[#666]">
          {emoji} {text}
        </span>
      </div>
    </div>
  );
}
