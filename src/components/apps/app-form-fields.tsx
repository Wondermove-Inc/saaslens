import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { getAppStatusOptions } from "@/lib/app-status";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";
import { Controller } from "react-hook-form";
import type { AppFormValues } from "./app-form-schema";

interface TeamOption {
  id: string;
  name: string;
}

interface AppFormFieldsProps {
  register: UseFormRegister<AppFormValues>;
  control: Control<AppFormValues>;
  errors: FieldErrors<AppFormValues>;
  includeStatus?: boolean;
  disabled?: boolean;
  teamOptions?: TeamOption[];
  /** MEMBER/VIEWER 역할 여부 (팀 선택 제한용) */
  isRestricted?: boolean;
  /** 사용자의 팀 ID (팀 미소속 시 null) */
  userTeamId?: string | null;
}

export function AppFormFields({
  register,
  control,
  errors,
  includeStatus = false,
  disabled = false,
  teamOptions = [],
  isRestricted = false,
  userTeamId = null,
}: AppFormFieldsProps) {
  const t = useTranslations();

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">{t("apps.form.fields.name")}</Label>
        <Input
          id="name"
          placeholder={t("apps.form.fields.namePlaceholder")}
          required
          disabled={disabled}
          {...register("name")}
          aria-invalid={errors.name ? "true" : "false"}
        />
        {errors.name?.message && (
          <p id="name-error" className="text-destructive text-sm">
            {errors.name.message}
          </p>
        )}
      </div>

      {includeStatus && (
        <div className="space-y-2">
          <Label htmlFor="status">{t("apps.form.fields.status")}</Label>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? undefined}
                onValueChange={field.onChange}
                disabled={disabled}
              >
                <SelectTrigger id="status">
                  <SelectValue
                    placeholder={t("apps.form.fields.statusPlaceholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {getAppStatusOptions(t).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="category">{t("apps.form.fields.category")}</Label>
        <Input
          id="category"
          placeholder={t("apps.form.fields.categoryPlaceholder")}
          disabled={disabled}
          {...register("category", {
            setValueAs: (value) => (value ? String(value).trim() : ""),
          })}
        />
        {errors.category?.message && (
          <p className="text-destructive text-sm">{errors.category.message}</p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customLogoUrl">{t("apps.form.fields.logoUrl")}</Label>
          <Input
            id="customLogoUrl"
            type="url"
            placeholder={t("apps.form.fields.logoUrlPlaceholder")}
            disabled={disabled}
            {...register("customLogoUrl", {
              setValueAs: (value) => (value ? String(value).trim() : ""),
            })}
          />
          {errors.customLogoUrl?.message && (
            <p className="text-destructive text-sm">
              {errors.customLogoUrl.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="customWebsite">{t("apps.form.fields.website")}</Label>
          <Input
            id="customWebsite"
            type="url"
            placeholder={t("apps.form.fields.websitePlaceholder")}
            disabled={disabled}
            {...register("customWebsite", {
              setValueAs: (value) => (value ? String(value).trim() : ""),
            })}
          />
          {errors.customWebsite?.message && (
            <p className="text-destructive text-sm">
              {errors.customWebsite.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">{t("apps.form.fields.tags")}</Label>
        <Input
          id="tags"
          placeholder={t("apps.form.fields.tagsPlaceholder")}
          disabled={disabled}
          {...register("tags", {
            setValueAs: (value) => (value ? String(value).trim() : ""),
          })}
        />
        <p className="text-muted-foreground text-xs">
          {t("apps.form.fields.tagsHint")}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">{t("apps.form.fields.description")}</Label>
        <Textarea
          id="notes"
          placeholder={t("apps.form.fields.descriptionPlaceholder")}
          rows={4}
          disabled={disabled}
          {...register("notes")}
        />
        {errors.notes?.message && (
          <p className="text-destructive text-sm">{errors.notes.message}</p>
        )}
      </div>

      {/* Team 배정 - MultiSelect */}
      <div className="space-y-2">
        <Label>{t("apps.form.fields.assignedTeam")}</Label>
        {isRestricted && !userTeamId ? (
          <p className="text-muted-foreground text-sm">
            {t("apps.form.fields.assignedTeamNoTeam")}
          </p>
        ) : teamOptions.length > 0 ? (
          <Controller
            name="teamIds"
            control={control}
            render={({ field }) => {
              const selectedIds = field.value ?? [];
              const selectedNames = teamOptions
                .filter((team) => selectedIds.includes(team.id))
                .map((team) => team.name);

              return (
                <>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between",
                          !selectedIds.length && "text-muted-foreground"
                        )}
                        disabled={disabled}
                      >
                        {selectedIds.length > 0
                          ? selectedNames.length <= 2
                            ? selectedNames.join(", ")
                            : `${selectedNames.slice(0, 2).join(", ")}${t("apps.form.fields.assignedTeamMultiple", { count: selectedNames.length - 2 })}`
                          : t("apps.form.fields.assignedTeamPlaceholder")}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder={t("apps.form.fields.assignedTeamSearch")}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {t("apps.form.fields.assignedTeamEmpty")}
                          </CommandEmpty>
                          <CommandGroup>
                            {teamOptions.map((team) => {
                              const isSelected = selectedIds.includes(team.id);
                              return (
                                <CommandItem
                                  key={team.id}
                                  value={team.name}
                                  onSelect={() => {
                                    const updated = isSelected
                                      ? selectedIds.filter(
                                          (id: string) => id !== team.id
                                        )
                                      : [...selectedIds, team.id];
                                    field.onChange(updated);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      isSelected ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {team.name}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <p className="text-muted-foreground text-xs">
                    {t("apps.form.fields.assignedTeamHelper")}
                  </p>
                </>
              );
            }}
          />
        ) : (
          <p className="text-muted-foreground text-sm">
            {t("apps.form.fields.assignedTeamNoTeams")}
          </p>
        )}
      </div>
    </>
  );
}
