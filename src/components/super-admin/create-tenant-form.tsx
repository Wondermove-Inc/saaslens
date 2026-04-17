// src/components/super-admin/create-tenant-form.tsx
"use client";

import { createTenant } from "@/actions/super-admin/tenant-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function CreateTenantForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("회사명을 입력해주세요.");
      return;
    }

    setLoading(true);
    const result = await createTenant(
      name.trim(),
      domain.trim() || undefined,
      logoUrl.trim() || undefined
    );
    setLoading(false);

    if (result.success) {
      toast.success("테넌트가 생성되었습니다.");
      router.refresh();
    } else {
      toast.error(result.message ?? "테넌트 생성에 실패했습니다.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 회사명 (필수) */}
      <div className="space-y-2">
        <Label htmlFor="name">
          회사명 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: My Company"
          required
        />
      </div>

      {/* 도메인 (선택) */}
      <div className="space-y-2">
        <Label htmlFor="domain">도메인 (선택)</Label>
        <Input
          id="domain"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="예: example.com"
        />
        <p className="text-muted-foreground text-xs">
          https:// 제외하고 입력해주세요
        </p>
      </div>

      {/* 로고 URL (선택) */}
      <div className="space-y-2">
        <Label htmlFor="logoUrl">로고 URL (선택)</Label>
        <Input
          id="logoUrl"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://example.com/logo.png"
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "생성 중..." : "테넌트 생성"}
      </Button>
    </form>
  );
}
