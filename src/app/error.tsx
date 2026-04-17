"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

function ErrorIllustration() {
  return (
    <svg
      className="mx-auto h-64 w-full max-w-md"
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Background shape */}
      <ellipse
        cx="200"
        cy="250"
        rx="160"
        ry="20"
        fill="var(--muted)"
        opacity="0.6"
      />
      {/* Monitor */}
      <rect
        x="100"
        y="50"
        width="200"
        height="140"
        rx="8"
        fill="var(--muted)"
        stroke="var(--border)"
        strokeWidth="2"
      />
      {/* Screen */}
      <rect
        x="115"
        y="65"
        width="170"
        height="105"
        rx="4"
        fill="var(--background)"
      />
      {/* Monitor stand */}
      <rect x="175" y="190" width="50" height="20" fill="var(--border)" />
      <rect
        x="150"
        y="210"
        width="100"
        height="8"
        rx="4"
        fill="var(--border)"
      />
      {/* Warning triangle on screen */}
      <path
        d="M200 90 L230 140 L170 140 Z"
        fill="none"
        stroke="var(--foreground)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Exclamation mark */}
      <line
        x1="200"
        y1="106"
        x2="200"
        y2="124"
        stroke="var(--foreground)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="200" cy="133" r="2" fill="var(--foreground)" />
    </svg>
  );
}

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="mx-auto max-w-md text-center">
        <ErrorIllustration />
        <h1 className="text-foreground mt-8 text-4xl font-bold tracking-tight">
          오류가 발생했습니다
        </h1>
        <p className="text-muted-foreground mt-4 text-lg whitespace-nowrap">
          예기치 않은 문제가 발생했습니다. 다시 시도하거나 홈으로 돌아가 주세요.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button onClick={reset} className="rounded-full" size="default">
            다시 시도
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-full"
            size="default"
          >
            <Link href="/">홈으로</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
