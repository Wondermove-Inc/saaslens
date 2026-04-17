// src/hooks/use-count-up.ts
"use client";

import { animate } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseCountUpOptions {
  /** 최종 값 */
  to: number;
  /** 애니메이션 시작 값 (기본: 0) */
  from?: number;
  /** 애니메이션 지속 시간 (초, 기본: 1) */
  duration?: number;
  /** 소수점 자리수 (기본: 0) */
  decimals?: number;
  /** 천 단위 구분기호 사용 여부 (기본: true) */
  separator?: boolean;
  /** 접두사 (예: "$", "₩") */
  prefix?: string;
  /** 접미사 (예: "%") */
  suffix?: string;
}

/**
 * 숫자 카운트업 애니메이션 훅
 * viewport에 진입할 때 자동으로 시작 (IntersectionObserver 사용)
 */
export function useCountUp({
  to,
  from = 0,
  duration = 1,
  decimals = 0,
  separator = true,
  prefix = "",
  suffix = "",
}: UseCountUpOptions) {
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);
  const [displayValue, setDisplayValue] = useState(
    formatNumber(from, decimals, separator, prefix, suffix)
  );

  const startAnimation = useCallback(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const controls = animate(from, to, {
      duration,
      ease: [0.25, 0.46, 0.45, 0.94],
      onUpdate: (latest) => {
        setDisplayValue(
          formatNumber(latest, decimals, separator, prefix, suffix)
        );
      },
    });

    return () => controls.stop();
  }, [to, from, duration, decimals, separator, prefix, suffix]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          startAnimation();
          observer.disconnect();
        }
      },
      { rootMargin: "-50px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [startAnimation]);

  return { ref, displayValue };
}

function formatNumber(
  value: number,
  decimals: number,
  separator: boolean,
  prefix: string,
  suffix: string
): string {
  const rounded =
    decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
  const formatted = separator
    ? Number(rounded).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : rounded;
  return `${prefix}${formatted}${suffix}`;
}
