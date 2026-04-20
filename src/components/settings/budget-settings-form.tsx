"use client";

import { updateBudgetSettings } from "@/actions/budget-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  BudgetSettings,
  CURRENCIES,
  Currency,
  formatCurrencyAmount,
} from "@/types/budget";
import { Info, Loader2, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";

interface BudgetSettingsFormProps {
  initialSettings: BudgetSettings;
}

export function BudgetSettingsForm({
  initialSettings,
}: BudgetSettingsFormProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [settings, setSettings] = useState<BudgetSettings>(initialSettings);
  const [isAutoMode, setIsAutoMode] = useState(
    initialSettings.monthlyBudget === null
  );

  // 숫자 포맷팅 (1000 -> 1,000)
  const formatNumber = useCallback((value: number | null): string => {
    if (value === null || value === 0) return "";
    return value.toLocaleString();
  }, []);

  // 숫자 파싱 (1,000 -> 1000)
  const parseNumber = useCallback((value: string): number => {
    const cleaned = value.replace(/[^\d]/g, "");
    return parseInt(cleaned, 10) || 0;
  }, []);

  const handleCurrencyChange = (currency: Currency) => {
    setSettings((prev) => ({ ...prev, currency }));
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseNumber(e.target.value);
    setSettings((prev) => ({ ...prev, monthlyBudget: value }));
  };

  const handleAutoModeChange = (checked: boolean) => {
    setIsAutoMode(checked);
    if (checked) {
      setSettings((prev) => ({ ...prev, monthlyBudget: null }));
    } else {
      setSettings((prev) => ({ ...prev, monthlyBudget: 0 }));
    }
  };

  const handleThresholdChange = (value: number[]) => {
    setSettings((prev) => ({ ...prev, alertThreshold: value[0] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      const result = await updateBudgetSettings(settings);

      if (result.success) {
        toast.success(t("settings.budget.toast.saved"));
      } else {
        toast.error(result.message || t("settings.budget.toast.saveFailed"));
      }
    });
  };

  const currencyInfo = CURRENCIES.find((c) => c.code === settings.currency);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 통화 단위 선택 */}
      <div className="space-y-2">
        <Label htmlFor="currency">{t("settings.budget.currency.label")}</Label>
        <Select
          value={settings.currency}
          onValueChange={(value) => handleCurrencyChange(value as Currency)}
        >
          <SelectTrigger id="currency" className="w-full max-w-xs">
            <SelectValue
              placeholder={t("settings.budget.currency.placeholder")}
            />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((currency) => (
              <SelectItem key={currency.code} value={currency.code}>
                <span className="flex items-center gap-2">
                  <span className="font-mono">{currency.symbol}</span>
                  <span>{currency.name}</span>
                  <span className="text-muted-foreground">
                    ({currency.code})
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 자동 예산 설정 토글 */}
      <div className="hover:bg-purple-gray flex items-center justify-between rounded-lg border p-4 transition-colors">
        <div className="space-y-0.5">
          <Label htmlFor="auto-budget" className="text-base">
            {t("settings.budget.auto.title")}
          </Label>
          <p className="text-muted-foreground text-sm">
            {t("settings.budget.auto.description")}
          </p>
        </div>
        <Switch
          id="auto-budget"
          checked={isAutoMode}
          onCheckedChange={handleAutoModeChange}
        />
      </div>

      {/* 자동 설정 상태 메시지 */}
      {isAutoMode && (
        <div className="bg-muted flex items-start gap-3 rounded-lg p-4">
          <Info className="text-muted-foreground mt-0.5 h-4 w-4" />
          <div className="text-muted-foreground text-sm">
            <p>{t("settings.budget.auto.noticeLine1")}</p>
            <p className="mt-1">{t("settings.budget.auto.noticeLine2")}</p>
          </div>
        </div>
      )}

      {/* 월별 예산 입력 (자동 모드가 아닐 때만) */}
      {!isAutoMode && (
        <div className="space-y-2">
          <Label htmlFor="monthly-budget">
            {t("settings.budget.monthly.label")}
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-lg font-medium">
              {currencyInfo?.symbol}
            </span>
            <Input
              id="monthly-budget"
              type="text"
              inputMode="numeric"
              value={formatNumber(settings.monthlyBudget)}
              onChange={handleBudgetChange}
              placeholder={t("settings.budget.monthly.placeholder")}
              className="max-w-xs font-mono"
              aria-label={t("settings.budget.monthly.ariaLabel")}
            />
          </div>
          <p className="text-muted-foreground text-sm">
            {t("settings.budget.monthly.helper")}
          </p>
        </div>
      )}

      {/* 알림 임계값 */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t("settings.budget.threshold.label")}</Label>
          <p className="text-muted-foreground text-sm">
            {t("settings.budget.threshold.description", {
              percent: settings.alertThreshold,
            })}
          </p>
        </div>
        <Slider
          value={[settings.alertThreshold]}
          onValueChange={handleThresholdChange}
          min={50}
          max={100}
          step={5}
          className="max-w-xs"
        />
        <div className="text-muted-foreground flex max-w-xs justify-between text-xs">
          <span>50%</span>
          <span className="text-foreground font-medium">
            {settings.alertThreshold}%
          </span>
          <span>100%</span>
        </div>
      </div>

      {/* 현재 설정 요약 */}
      <div className="rounded-lg border p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Wallet className="h-4 w-4" />
          {t("settings.budget.summary.title")}
        </div>
        <div className="text-muted-foreground mt-2 space-y-1 text-sm">
          <p>
            {t("settings.budget.summary.currency", {
              name: currencyInfo?.name ?? "",
              symbol: currencyInfo?.symbol ?? "",
            })}
          </p>
          <p>
            {t("settings.budget.summary.budgetPrefix")}{" "}
            {isAutoMode
              ? t("settings.budget.summary.auto")
              : settings.monthlyBudget
                ? formatCurrencyAmount(
                    settings.monthlyBudget,
                    settings.currency
                  )
                : t("settings.budget.summary.unset")}
          </p>
          <p>
            {t("settings.budget.summary.threshold", {
              percent: settings.alertThreshold,
            })}
          </p>
        </div>
      </div>

      {/* 저장 버튼 */}
      <Button type="submit" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("settings.budget.actions.saving")}
          </>
        ) : (
          t("settings.budget.actions.save")
        )}
      </Button>
    </form>
  );
}
