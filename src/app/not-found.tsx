"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

function NotFoundIllustration() {
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
      {/* Document/page shape */}
      <rect
        x="120"
        y="60"
        width="160"
        height="180"
        rx="8"
        fill="var(--muted)"
        stroke="var(--border)"
        strokeWidth="2"
      />
      {/* Content lines */}
      <rect
        x="145"
        y="100"
        width="110"
        height="8"
        rx="4"
        fill="var(--border)"
      />
      <rect x="145" y="120" width="80" height="8" rx="4" fill="var(--border)" />
      <rect x="145" y="140" width="95" height="8" rx="4" fill="var(--border)" />
      {/* Magnifying glass */}
      <circle
        cx="280"
        cy="140"
        r="40"
        fill="var(--background)"
        stroke="var(--foreground)"
        strokeWidth="3"
        opacity="0.8"
      />
      <line
        x1="308"
        y1="168"
        x2="335"
        y2="195"
        stroke="var(--foreground)"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.8"
      />
      {/* Question mark inside magnifying glass */}
      <text
        x="280"
        y="148"
        textAnchor="middle"
        fontSize="32"
        fontWeight="bold"
        fill="var(--muted-foreground)"
      >
        ?
      </text>
    </svg>
  );
}

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="mx-auto max-w-md text-center">
        <NotFoundIllustration />
        <h1 className="text-foreground mt-8 text-4xl font-bold tracking-tight">
          404
        </h1>
        <p className="text-muted-foreground mt-4 text-lg">
          요청하신 페이지를 찾을 수 없습니다
        </p>
        <Button asChild className="mt-8 rounded-full" size="default">
          <Link href="/">홈으로 돌아가기</Link>
        </Button>
      </div>
    </main>
  );
}
