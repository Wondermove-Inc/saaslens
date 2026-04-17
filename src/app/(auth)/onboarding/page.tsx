// src/app/(auth)/onboarding/page.tsx
// 조직 생성 페이지 (온보딩)

"use client";

import { createOrganization } from "@/actions/organization";
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
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CheckCircle2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useMemo, useState } from "react";

/**
 * 조직 생성 페이지
 * 첫 로그인 후 조직이 없는 사용자가 이동
 */
export default function OnboardingPage() {
  const t = useTranslations();
  const [, formAction, isPending] = useActionState(
    async (_prevState: unknown, formData: FormData) => {
      await createOrganization(formData);
      return null;
    },
    null
  );

  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const interests = useMemo(
    () => [
      { id: "security", label: t("auth.onboarding.interests.security") },
      { id: "renewal", label: t("auth.onboarding.interests.renewal") },
      { id: "cost", label: t("auth.onboarding.interests.cost") },
      { id: "shadow", label: t("auth.onboarding.interests.shadow") },
      { id: "inventory", label: t("auth.onboarding.interests.inventory") },
      { id: "automation", label: t("auth.onboarding.interests.automation") },
    ],
    [t]
  );

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  return (
    <div
      data-testid="onboarding-page"
      className="mx-auto flex max-w-4xl flex-col gap-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-primary text-sm font-medium">
            {t("auth.onboarding.step")}
          </p>
          <h1 className="text-3xl font-bold">{t("auth.onboarding.title")}</h1>
          <p className="text-muted-foreground">
            {t("auth.onboarding.description")}
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Sparkles className="h-4 w-4" />
          {t("auth.onboarding.interestBadge", {
            count: selectedInterests.length,
          })}
        </Badge>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t("auth.onboarding.org.title")}</CardTitle>
          <CardDescription>
            {t("auth.onboarding.org.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form action={formAction} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">{t("auth.onboarding.org.name")}</Label>
              <Input
                id="name"
                name="name"
                placeholder={t("auth.onboarding.org.placeholder")}
                required
                minLength={2}
                maxLength={50}
                disabled={isPending}
              />
              <p className="text-muted-foreground text-xs">
                {t("auth.onboarding.org.helper")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="domain">
                {t("auth.onboarding.org.domain", {
                  defaultValue: "회사 도메인",
                })}
              </Label>
              <Input
                id="domain"
                name="domain"
                placeholder={t("auth.onboarding.org.domainPlaceholder", {
                  defaultValue: "company.com",
                })}
                required
                disabled={isPending}
              />
              <p className="text-muted-foreground text-xs">
                {t("auth.onboarding.org.domainHelper", {
                  defaultValue:
                    "회사 이메일 도메인을 입력하세요. Extension 사용자 인증에 사용됩니다.",
                })}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {t("auth.onboarding.goals.title")}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {t("auth.onboarding.goals.description")}
                  </p>
                </div>
                <Badge variant="secondary">
                  {t("auth.onboarding.goals.selected", {
                    count: selectedInterests.length,
                  })}
                </Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {interests.map((item) => {
                  const active = selectedInterests.includes(item.id);
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => toggleInterest(item.id)}
                      className={cn(
                        "hover:border-primary/60 flex items-center justify-between rounded-lg border p-3 text-left transition",
                        active ? "border-primary bg-primary/5" : "border-muted"
                      )}
                    >
                      <span className="text-sm font-medium">{item.label}</span>
                      {active && (
                        <CheckCircle2 className="text-primary h-4 w-4" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending
                ? t("auth.onboarding.actions.creating")
                : t("auth.onboarding.actions.start")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
