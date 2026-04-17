// src/components/subscriptions/subscription-form-pricing.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ChevronsUpDown, Users, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import {
  Controller,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";
import type { UserOption } from "./subscription-form-assignment";
import type { SubscriptionFormValues } from "./subscription-form-schema";
import {
  getBillingCycleOptions,
  getBillingTypeOptions,
  getCurrencyOptions,
} from "./subscription-form.constants";

interface SubscriptionFormPricingProps {
  control: Control<SubscriptionFormValues>;
  register: UseFormRegister<SubscriptionFormValues>;
  setValue: UseFormSetValue<SubscriptionFormValues>;
  errors: FieldErrors<SubscriptionFormValues>;
  isPending: boolean;
  defaultCurrency: string;
  users: UserOption[];
  isAdmin: boolean;
  selectedUserIds: string[];
}

export function SubscriptionFormPricing({
  control,
  register,
  setValue,
  errors,
  isPending,
  defaultCurrency,
  users,
  isAdmin,
  selectedUserIds,
}: SubscriptionFormPricingProps) {
  const t = useTranslations();
  const watchedBillingType = useWatch({ control, name: "billingType" });
  const watchedTotalLicenses = useWatch({ control, name: "totalLicenses" });
  const [seatUserPopoverOpen, setSeatUserPopoverOpen] = useState(false);

  const selectedUsersForSeat = useMemo(() => {
    return users.filter((u) => selectedUserIds.includes(u.id));
  }, [users, selectedUserIds]);

  const toggleSeatUser = (userId: string) => {
    const current = selectedUserIds;
    const newValue = current.includes(userId)
      ? current.filter((id: string) => id !== userId)
      : [...current, userId];
    setValue("assignedUserIds", newValue);
  };

  const removeSeatUser = (userId: string) => {
    setValue(
      "assignedUserIds",
      selectedUserIds.filter((id: string) => id !== userId)
    );
  };

  return (
    <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle>{t("subscriptions.form.pricing.title")}</CardTitle>
        <CardDescription>
          {t("subscriptions.form.pricing.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 결제 주기 + 요금 유형 */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="billingCycle">
              {t("subscriptions.form.basicInfo.billingCycle")}
            </Label>
            <Controller
              control={control}
              name="billingCycle"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isPending}
                >
                  <SelectTrigger id="billingCycle">
                    <SelectValue
                      placeholder={t(
                        "subscriptions.form.basicInfo.billingCyclePlaceholder"
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {getBillingCycleOptions(t).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.billingCycle?.message && (
              <p className="text-destructive text-sm">
                {errors.billingCycle.message.toString()}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="billingType">
              {t("subscriptions.form.basicInfo.billingType")}
            </Label>
            <Controller
              control={control}
              name="billingType"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isPending}
                >
                  <SelectTrigger id="billingType">
                    <SelectValue
                      placeholder={t(
                        "subscriptions.form.basicInfo.billingTypePlaceholder"
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {getBillingTypeOptions(t).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        {/* PER_SEAT: Seat 관리 */}
        {watchedBillingType === "PER_SEAT" && (
          <div className="space-y-4 rounded-lg border p-4">
            <div className="space-y-2">
              <Label htmlFor="totalLicenses">
                {t("subscriptions.form.license.totalSeats")}
              </Label>
              <Input
                id="totalLicenses"
                type="number"
                placeholder={t(
                  "subscriptions.form.license.totalSeatsPlaceholder"
                )}
                disabled={isPending}
                {...register("totalLicenses")}
              />
              {errors.totalLicenses?.message && (
                <p className="text-destructive text-sm">
                  {errors.totalLicenses.message.toString()}
                </p>
              )}
            </div>

            {isAdmin && users.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t("subscriptions.form.license.assignUsers")}
                </Label>
                <Popover
                  open={seatUserPopoverOpen}
                  onOpenChange={setSeatUserPopoverOpen}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "border-input bg-background ring-offset-background flex min-h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-sm",
                        "focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none",
                        isPending && "cursor-not-allowed opacity-50"
                      )}
                      disabled={isPending}
                    >
                      <span className="text-muted-foreground">
                        {selectedUsersForSeat.length > 0
                          ? t("subscriptions.form.license.usersSelected", {
                              count: selectedUsersForSeat.length,
                            })
                          : t("subscriptions.form.license.selectUsers")}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder={t(
                          "subscriptions.form.license.searchUsers"
                        )}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {t("subscriptions.form.license.noUsersFound")}
                        </CommandEmpty>
                        <CommandGroup>
                          {users.map((user) => (
                            <CommandItem
                              key={user.id}
                              value={user.email}
                              onSelect={() => toggleSeatUser(user.id)}
                            >
                              <Checkbox
                                checked={selectedUserIds.includes(user.id)}
                                className="mr-2"
                              />
                              <div className="flex flex-col">
                                <span>{user.name ?? user.email}</span>
                                {user.name && (
                                  <span className="text-muted-foreground text-xs">
                                    {user.email}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {selectedUsersForSeat.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedUsersForSeat.map((user) => (
                      <Badge
                        key={user.id}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {user.name ?? user.email}
                        <button
                          type="button"
                          onClick={() => removeSeatUser(user.id)}
                          className="hover:bg-muted ml-1 rounded-full"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                <p className="text-muted-foreground text-sm">
                  {t("subscriptions.form.license.seatStatus", {
                    assigned: selectedUsersForSeat.length,
                    total: watchedTotalLicenses ?? "–",
                  })}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 통화 + 금액 가로 배치 */}
        <div className="grid grid-cols-[140px_1fr] gap-4">
          <div className="space-y-2">
            <Label htmlFor="currency">
              {t("subscriptions.form.basicInfo.currency")}
            </Label>
            <Select
              name="currency"
              defaultValue={defaultCurrency}
              onValueChange={(value) => setValue("currency", value)}
              disabled={isPending}
            >
              <SelectTrigger id="currency">
                <SelectValue
                  placeholder={t(
                    "subscriptions.form.basicInfo.currencyPlaceholder"
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                {getCurrencyOptions(t).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">
              {t("subscriptions.form.basicInfo.amount")}
            </Label>
            <Input
              id="amount"
              type="text"
              inputMode="decimal"
              placeholder={t("subscriptions.form.basicInfo.amountPlaceholder")}
              disabled={isPending}
              {...register("amount", {
                setValueAs: (v) => (v === "" ? "" : String(v)),
              })}
            />
            {errors.amount?.message && (
              <p className="text-destructive text-sm">
                {errors.amount.message.toString()}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
