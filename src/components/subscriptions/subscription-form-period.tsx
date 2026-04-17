// src/components/subscriptions/subscription-form-period.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Control, FieldErrors } from "react-hook-form";
import { Controller } from "react-hook-form";
import type { SubscriptionFormValues } from "./subscription-form-schema";

interface SubscriptionFormPeriodProps {
  control: Control<SubscriptionFormValues>;
  errors: FieldErrors<SubscriptionFormValues>;
  isPending: boolean;
}

function toDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  try {
    return parseISO(value);
  } catch {
    return undefined;
  }
}

function toDateString(date: Date | undefined): string {
  if (!date) return "";
  return format(date, "yyyy-MM-dd");
}

export function SubscriptionFormPeriod({
  control,
  errors,
  isPending,
}: SubscriptionFormPeriodProps) {
  const t = useTranslations("subscriptions.form.period");

  return (
    <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Start Date */}
        <div className="space-y-2">
          <Label>{t("startDate")}</Label>
          <Controller
            control={control}
            name="startDate"
            render={({ field }) => (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={isPending}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {field.value
                      ? format(parseISO(field.value), "yyyy-MM-dd")
                      : t("datePlaceholder")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={toDate(field.value)}
                    onSelect={(date) => field.onChange(toDateString(date))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}
          />
          {errors.startDate?.message && (
            <p className="text-destructive text-sm">
              {errors.startDate.message.toString()}
            </p>
          )}
        </div>

        {/* End Date */}
        <div className="space-y-2">
          <Label>{t("endDate")}</Label>
          <Controller
            control={control}
            name="endDate"
            render={({ field }) => (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={isPending}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {field.value
                      ? format(parseISO(field.value), "yyyy-MM-dd")
                      : t("datePlaceholder")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={toDate(field.value)}
                    onSelect={(date) => field.onChange(toDateString(date))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}
          />
        </div>

        {/* Renewal Date */}
        <div className="space-y-2">
          <Label>{t("renewalDate")}</Label>
          <Controller
            control={control}
            name="renewalDate"
            render={({ field }) => (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={isPending}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {field.value
                      ? format(parseISO(field.value), "yyyy-MM-dd")
                      : t("datePlaceholder")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={toDate(field.value)}
                    onSelect={(date) => field.onChange(toDateString(date))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
