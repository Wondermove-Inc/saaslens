// src/components/common/v2-coming-soon.tsx
import { Construction } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

interface V2ComingSoonProps {
  /** 기능 이름 (예: "칸반 보드", "작업 관리") */
  feature: string;
  /** 기능 설명 (옵션) */
  description?: string;
}

/**
 * V2 Coming Soon 컴포넌트
 * V2 버전에서 제공될 기능에 대한 예고 페이지를 표시합니다.
 */
export function V2ComingSoon({ feature, description }: V2ComingSoonProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <div className="bg-muted mb-6 rounded-full p-6">
        <Construction className="text-muted-foreground h-12 w-12" />
      </div>
      <h1 className="mb-2 text-2xl font-bold">Coming Soon</h1>
      <p className="text-muted-foreground mb-1">{feature}</p>
      <p className="text-muted-foreground mb-6 text-sm">
        {description || "이 기능은 V2 버전에서 제공될 예정입니다."}
      </p>
      <Button asChild>
        <Link href="/dashboard">대시보드로 이동</Link>
      </Button>
    </div>
  );
}
