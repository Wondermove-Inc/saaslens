// src/components/super-admin/tenant-settings-form.tsx
"use client";

import {
  updateTenantDomain,
  updateTenantLogoUrl,
  updateTenantName,
  type TenantInfo,
} from "@/actions/super-admin/tenant-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";

interface TenantSettingsFormProps {
  tenant: TenantInfo;
}

export function TenantSettingsForm({ tenant }: TenantSettingsFormProps) {
  const [name, setName] = useState(tenant.name);
  const [domain, setDomain] = useState(tenant.domain ?? "");
  const [logoUrl, setLogoUrl] = useState(tenant.logoUrl ?? "");
  const [loading, setLoading] = useState<string | null>(null);

  const handleSaveName = async () => {
    setLoading("name");
    const result = await updateTenantName(tenant.id, name);
    setLoading(null);
    if (result.success) {
      toast.success(result.message ?? "저장되었습니다.");
    } else {
      toast.error(result.message ?? "오류가 발생했습니다.");
    }
  };

  const handleSaveDomain = async () => {
    setLoading("domain");
    const result = await updateTenantDomain(tenant.id, domain);
    setLoading(null);
    if (result.success) {
      toast.success(result.message ?? "저장되었습니다.");
    } else {
      toast.error(result.message ?? "오류가 발생했습니다.");
    }
  };

  const handleSaveLogo = async () => {
    setLoading("logo");
    const result = await updateTenantLogoUrl(tenant.id, logoUrl);
    setLoading(null);
    if (result.success) {
      toast.success(result.message ?? "저장되었습니다.");
    } else {
      toast.error(result.message ?? "오류가 발생했습니다.");
    }
  };

  return (
    <div className="space-y-6">
      {/* 회사명 */}
      <div className="space-y-2">
        <Label htmlFor="name">회사명</Label>
        <div className="flex gap-2">
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="회사명을 입력하세요"
          />
          <Button
            onClick={handleSaveName}
            disabled={loading === "name" || name === tenant.name}
            size="sm"
          >
            {loading === "name" ? "저장 중..." : "저장"}
          </Button>
        </div>
      </div>

      {/* 도메인 */}
      <div className="space-y-2">
        <Label htmlFor="domain">도메인</Label>
        <div className="flex gap-2">
          <Input
            id="domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="example.com"
          />
          <Button
            onClick={handleSaveDomain}
            disabled={loading === "domain" || domain === (tenant.domain ?? "")}
            size="sm"
          >
            {loading === "domain" ? "저장 중..." : "저장"}
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          예: example.com (https:// 제외)
        </p>
      </div>

      {/* 로고 URL */}
      <div className="space-y-2">
        <Label htmlFor="logo">로고 URL</Label>
        <div className="flex gap-2">
          <Input
            id="logo"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
          />
          <Button
            onClick={handleSaveLogo}
            disabled={loading === "logo" || logoUrl === (tenant.logoUrl ?? "")}
            size="sm"
          >
            {loading === "logo" ? "저장 중..." : "저장"}
          </Button>
        </div>
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt="로고 미리보기"
            className="h-12 w-auto rounded border object-contain p-1"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
      </div>
    </div>
  );
}
