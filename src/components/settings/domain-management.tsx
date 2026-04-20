// src/components/settings/domain-management.tsx
"use client";

import { updateOrganizationDomains } from "@/actions/organization";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Globe, Loader2, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface DomainManagementProps {
  initialDomains: string[];
  primaryDomain: string;
}

const DOMAIN_REGEX = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function DomainManagement({
  initialDomains,
  primaryDomain,
}: DomainManagementProps) {
  const t = useTranslations();
  const [domains, setDomains] = useState<string[]>(initialDomains);
  const [newDomain, setNewDomain] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleAddDomain = () => {
    const trimmed = newDomain.trim().toLowerCase();
    if (!trimmed) {
      toast.error(t("settings.domains.toast.empty"));
      return;
    }
    if (!DOMAIN_REGEX.test(trimmed)) {
      toast.error(t("settings.domains.toast.invalid"));
      return;
    }
    if (trimmed === primaryDomain.toLowerCase()) {
      toast.error(t("settings.domains.toast.samePrimary"));
      return;
    }
    if (domains.includes(trimmed)) {
      toast.error(t("settings.domains.toast.duplicate"));
      return;
    }

    const updatedDomains = [...domains, trimmed];
    saveDomains(updatedDomains);
    setNewDomain("");
  };

  const handleRemoveDomain = (domainToRemove: string) => {
    const updatedDomains = domains.filter((d) => d !== domainToRemove);
    saveDomains(updatedDomains);
  };

  const saveDomains = (updatedDomains: string[]) => {
    startTransition(async () => {
      const result = await updateOrganizationDomains(updatedDomains);
      if (result.success) {
        setDomains(updatedDomains);
        toast.success(result.message || t("settings.domains.toast.updated"));
      } else {
        toast.error(result.message || t("settings.domains.toast.saveFailed"));
      }
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddDomain();
    }
  };

  return (
    <div className="max-w-lg space-y-4">
      <Card className="border-border rounded-sm shadow-sm transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t("settings.domains.title")}
          </CardTitle>
          <CardDescription>{t("settings.domains.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 기본 도메인 (삭제 불가) - info-muted로 강조 */}
          {primaryDomain && (
            <div className="border-info/50 bg-info-muted flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Badge variant="default">{primaryDomain}</Badge>
                <span className="text-info-muted-foreground text-xs">
                  {t("settings.domains.primary")}
                </span>
              </div>
            </div>
          )}

          {/* 도메인 추가 입력 */}
          <div className="flex gap-2">
            <Input
              placeholder={t("settings.domains.addPlaceholder")}
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isPending}
            />
            <Button
              type="button"
              onClick={handleAddDomain}
              disabled={isPending || !newDomain.trim()}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* 추가 도메인 목록 */}
          {domains.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
              <Globe className="text-muted-foreground mb-2 h-8 w-8" />
              <p className="text-muted-foreground text-sm">
                {t("settings.domains.empty.title")}
              </p>
              <p className="text-muted-foreground text-xs">
                {t("settings.domains.empty.description")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {domains.map((domain) => (
                <div
                  key={domain}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{domain}</Badge>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveDomain(domain)}
                    disabled={isPending}
                    className="text-muted-foreground hover:text-destructive h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* 도메인 수 표시 */}
          {domains.length > 0 && (
            <p className="text-muted-foreground text-xs">
              {t("settings.domains.count", { count: domains.length })}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
