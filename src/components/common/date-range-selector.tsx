"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { enUS, ko } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface DateRangeSelectorProps {
  /** Current period value (e.g. "30d", "90d", "1y", "custom") */
  currentPeriod: string;
  /** Current start date in yyyy-MM-dd format */
  startDate: string;
  /** Current end date in yyyy-MM-dd format */
  endDate: string;
  /** Available period presets */
  presets: Array<{ value: string; label: string }>;
  /** Base path for URL navigation (e.g. "/reports/browsing-usage") */
  basePath: string;
  /** Additional URL params to preserve */
  preserveParams?: Record<string, string>;
}

export function DateRangeSelector({
  currentPeriod,
  startDate,
  endDate,
  presets,
  basePath,
  preserveParams = {},
}: DateRangeSelectorProps) {
  const router = useRouter();
  const t = useTranslations("common.dateRangeSelector");
  const locale = useLocale();
  const dateLocale = locale === "en" ? enUS : ko;

  const [period, setPeriod] = useState(currentPeriod);
  const [customStart, setCustomStart] = useState<Date | undefined>(
    startDate ? new Date(startDate + "T00:00:00") : undefined
  );
  const [customEnd, setCustomEnd] = useState<Date | undefined>(
    endDate ? new Date(endDate + "T00:00:00") : undefined
  );
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  const navigateWithParams = (params: Record<string, string>) => {
    const urlParams = new URLSearchParams();
    // Merge preserved params first
    Object.entries(preserveParams).forEach(([k, v]) => {
      if (v) urlParams.set(k, v);
    });
    // Then apply new params
    Object.entries(params).forEach(([k, v]) => {
      if (v) urlParams.set(k, v);
    });
    const qs = urlParams.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  };

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    if (value !== "custom") {
      navigateWithParams({ period: value });
    }
  };

  const applyCustomRange = () => {
    if (customStart && customEnd) {
      navigateWithParams({
        period: "custom",
        startDate: format(customStart, "yyyy-MM-dd"),
        endDate: format(customEnd, "yyyy-MM-dd"),
      });
      setIsCustomOpen(false);
    }
  };

  // Get display label for current period
  const currentLabel =
    period === "custom"
      ? `${startDate} ~ ${endDate}`
      : presets.find((p) => p.value === period)?.label || period;

  return (
    <div className="flex items-center gap-2">
      <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            <span>{currentLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="end">
          <div className="space-y-4">
            {/* Period presets */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("period")}</label>
              <Select value={period} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {presets.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">{t("custom")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom date range */}
            {period === "custom" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("start")}</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !customStart && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customStart
                          ? format(customStart, "yyyy-MM-dd", {
                              locale: dateLocale,
                            })
                          : t("start")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customStart}
                        onSelect={setCustomStart}
                        locale={dateLocale}
                        disabled={(date) =>
                          customEnd ? date > customEnd : false
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("end")}</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !customEnd && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customEnd
                          ? format(customEnd, "yyyy-MM-dd", {
                              locale: dateLocale,
                            })
                          : t("end")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customEnd}
                        onSelect={setCustomEnd}
                        locale={dateLocale}
                        disabled={(date) =>
                          customStart ? date < customStart : false
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <Button onClick={applyCustomRange} className="w-full" size="sm">
                  {t("apply")}
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
