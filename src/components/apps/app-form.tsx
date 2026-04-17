// src/components/apps/app-form.tsx
"use client";

import { getTeams, type TeamWithStats } from "@/actions/teams";
import {
  appFormSchema,
  type AppFormValues,
} from "@/components/apps/app-form-schema";
import { ImageUpload } from "@/components/common/image-upload";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { type HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { AlertCircle, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller } from "react-hook-form";

interface AppFormProps {
  userRole?: string;
  userTeamId?: string | null;
  hideActions?: boolean;
  formId?: string;
  onPendingChange?: (isPending: boolean) => void;
  initialName?: string;
  onSuccess?: (createdAppId?: string) => void;
}

const normalizePayload = (values: AppFormValues) => {
  const trimmed = {
    ...values,
    name: values.name.trim(),
    category: values.category?.trim() || undefined,
    customLogoUrl: values.customLogoUrl?.trim() || undefined,
    customWebsite: values.customWebsite?.trim() || undefined,
    notes: values.notes?.trim() || undefined,
    tags: values.tags?.trim() || undefined,
  };

  if (!trimmed.tags) {
    delete trimmed.tags;
  }

  return trimmed;
};

const extractErrorMessage = (
  error: unknown,
  t: (key: string) => string
): string => {
  if (!error) return t("apps.form.error.request");
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (
    typeof error === "object" &&
    "message" in (error as Record<string, unknown>)
  ) {
    return String((error as { message?: unknown }).message);
  }
  return t("apps.form.error.request");
};

export function AppForm({
  userRole,
  userTeamId,
  hideActions = false,
  formId,
  onPendingChange,
  initialName,
  onSuccess,
}: AppFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [teams, setTeams] = useState<TeamWithStats[]>([]);
  const [templateLogoPath, setTemplateLogoPath] = useState<string | null>(null);
  const [urlInputValue, setUrlInputValue] = useState<string>("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categorySearchValue, setCategorySearchValue] = useState<string>("");

  // 역할 기반 제한 여부
  const isRestricted = userRole === "MEMBER" || userRole === "VIEWER";

  // 팀 목록 로드 (역할 기반 필터링)
  useEffect(() => {
    const loadTeams = async () => {
      const result = await getTeams();
      if (result.success && result.data) {
        let filteredTeams = result.data;

        // MEMBER/VIEWER는 본인 팀만 표시
        if (isRestricted && userTeamId) {
          filteredTeams = result.data.filter((team) => team.id === userTeamId);
        }

        setTeams(filteredTeams);
      }
    };
    loadTeams();
  }, [isRestricted, userTeamId]);

  const {
    refineCore: { onFinish, formLoading },
    handleSubmit,
    register,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AppFormValues, HttpError, AppFormValues>({
    refineCoreProps: {
      resource: "apps",
      action: "create",
      redirect: false,
      onMutationError: (error) => setSubmitError(extractErrorMessage(error, t)),
    },
    resolver: zodResolver(appFormSchema),
    defaultValues: {
      name: initialName ?? "",
      category: "",
      customLogoUrl: "",
      customWebsite: "",
      notes: "",
      tags: "",
      teamIds: [],
    },
  });

  // MEMBER/VIEWER의 경우 본인 팀 자동 선택
  useEffect(() => {
    if (isRestricted && userTeamId) {
      setValue("teamIds", [userTeamId]);
    }
  }, [isRestricted, userTeamId, setValue]);

  const isPending = formLoading || isSubmitting;
  const errorMessage = submitError;

  useEffect(() => {
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      // 템플릿 로고가 있고 customLogoUrl이 비어있으면 템플릿 로고 사용
      const finalValues = {
        ...values,
        customLogoUrl: values.customLogoUrl || templateLogoPath || "",
      };
      const result = await onFinish(normalizePayload(finalValues));

      // 성공 여부 확인 후 redirect (실패 시 onMutationError 콜백에서 처리됨)
      if (!result?.data) {
        return;
      }

      const createdId =
        (result.data as { id?: string })?.id ??
        (result.data as { data?: { id?: string } })?.data?.id;

      if (onSuccess) {
        onSuccess(createdId);
        return;
      }

      router.push(createdId ? `/apps/${createdId}` : "/apps");
    } catch (error) {
      setSubmitError(extractErrorMessage(error, t));
    }
  });

  const handleCancel = () => {
    router.back();
  };

  // 팀 옵션 변환
  const teamOptions = teams.map((team) => ({
    id: team.id,
    name: team.name,
  }));

  return (
    <form onSubmit={onSubmit} id={formId}>
      {/* 상단 액션 버튼 (레퍼런스: Discard / Save Draft / Publish) */}
      {!hideActions && (
        <div className="bg-background/80 sticky top-0 z-10 mb-6 flex items-center justify-end gap-3 border-b py-3 backdrop-blur supports-[backdrop-filter]:backdrop-blur">
          <Button type="button" variant="outline" onClick={handleCancel}>
            {t("apps.actions.cancel")}
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("apps.form.create.actions.register")}
          </Button>
        </div>
      )}

      {errorMessage && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* 1컬럼 레이아웃 */}
      <div className="space-y-6">
        {/* 기본 정보 카드 (상태, 태그, 담당자 통합) */}
        <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle>{t("apps.form.create.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("apps.form.fields.name")}</Label>
              <Input
                id="name"
                placeholder={t("apps.form.fields.namePlaceholder")}
                required
                disabled={isPending}
                {...register("name")}
                aria-invalid={errors.name ? "true" : "false"}
              />
              {errors.name?.message && (
                <p id="name-error" className="text-destructive text-sm">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* 카테고리 - Combobox (드롭다운 + 직접 입력) */}
            <div className="space-y-2">
              <Label htmlFor="category">{t("apps.form.fields.category")}</Label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => {
                  const categoryOptions = [
                    {
                      value: "collaboration",
                      label: t(
                        "apps.form.fields.categoryOptions.collaboration"
                      ),
                    },
                    {
                      value: "design",
                      label: t("apps.form.fields.categoryOptions.design"),
                    },
                    {
                      value: "ai",
                      label: t("apps.form.fields.categoryOptions.ai"),
                    },
                    {
                      value: "productivity",
                      label: t("apps.form.fields.categoryOptions.productivity"),
                    },
                    {
                      value: "development",
                      label: t("apps.form.fields.categoryOptions.development"),
                    },
                    {
                      value: "marketing",
                      label: t("apps.form.fields.categoryOptions.marketing"),
                    },
                    {
                      value: "analytics",
                      label: t("apps.form.fields.categoryOptions.analytics"),
                    },
                    {
                      value: "security",
                      label: t("apps.form.fields.categoryOptions.security"),
                    },
                    {
                      value: "finance",
                      label: t("apps.form.fields.categoryOptions.finance"),
                    },
                    {
                      value: "hr",
                      label: t("apps.form.fields.categoryOptions.hr"),
                    },
                  ];

                  const currentValue = field.value || "";
                  const selectedOption = categoryOptions.find(
                    (opt) => opt.value === currentValue
                  );
                  const displayValue = selectedOption
                    ? selectedOption.label
                    : currentValue;

                  return (
                    <>
                      <Popover
                        open={categoryOpen}
                        onOpenChange={(open) => {
                          setCategoryOpen(open);
                          if (open) {
                            setCategorySearchValue(currentValue);
                          } else {
                            if (categorySearchValue.trim()) {
                              field.onChange(categorySearchValue.trim());
                            }
                            setCategorySearchValue("");
                          }
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between",
                              !currentValue && "text-muted-foreground"
                            )}
                            disabled={isPending}
                          >
                            {displayValue ||
                              t("apps.form.fields.categoryPlaceholder")}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command
                            shouldFilter={false}
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" &&
                                categorySearchValue.trim()
                              ) {
                                e.preventDefault();
                                field.onChange(categorySearchValue.trim());
                                setCategoryOpen(false);
                                setCategorySearchValue("");
                              }
                            }}
                          >
                            <CommandInput
                              placeholder={t("apps.form.fields.categorySearch")}
                              value={categorySearchValue}
                              onValueChange={setCategorySearchValue}
                            />
                            <CommandList>
                              <CommandEmpty>
                                {categorySearchValue.trim()
                                  ? t("apps.form.fields.categoryDirectInput", {
                                      value: categorySearchValue,
                                    })
                                  : t("apps.form.fields.categoryEmptyHint")}
                              </CommandEmpty>
                              <CommandGroup>
                                {categoryOptions
                                  .filter((option) =>
                                    categorySearchValue.trim()
                                      ? option.label
                                          .toLowerCase()
                                          .includes(
                                            categorySearchValue.toLowerCase()
                                          ) ||
                                        option.value
                                          .toLowerCase()
                                          .includes(
                                            categorySearchValue.toLowerCase()
                                          )
                                      : true
                                  )
                                  .map((option) => (
                                    <CommandItem
                                      key={option.value}
                                      value={option.value}
                                      onSelect={() => {
                                        field.onChange(option.value);
                                        setCategoryOpen(false);
                                        setCategorySearchValue("");
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          currentValue === option.value
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      {option.label}
                                    </CommandItem>
                                  ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <p className="text-muted-foreground text-xs">
                        {t("apps.form.fields.categoryHelper")}
                      </p>
                      {errors.category?.message && (
                        <p className="text-destructive text-sm">
                          {errors.category.message}
                        </p>
                      )}
                    </>
                  );
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customWebsite">
                {t("apps.form.fields.website")}
              </Label>
              <Input
                id="customWebsite"
                type="url"
                placeholder={t("apps.form.fields.websitePlaceholder")}
                disabled={isPending}
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

            <div className="space-y-2">
              <Label htmlFor="notes">{t("apps.form.fields.description")}</Label>
              <Textarea
                id="notes"
                placeholder={t("apps.form.fields.descriptionPlaceholder")}
                rows={4}
                disabled={isPending}
                {...register("notes")}
              />
              {errors.notes?.message && (
                <p className="text-destructive text-sm">
                  {errors.notes.message}
                </p>
              )}
            </div>

            {/* 상태 */}
            <div className="space-y-2">
              <Label>{t("apps.form.fields.status")}</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? "ACTIVE"}
                    onValueChange={field.onChange}
                    disabled={isPending}
                  >
                    <SelectTrigger>
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

            {/* 태그 */}
            <div className="space-y-2">
              <Label htmlFor="tags">{t("apps.form.fields.tags")}</Label>
              <Input
                id="tags"
                placeholder={t("apps.form.fields.tagsPlaceholder")}
                disabled={isPending}
                {...register("tags", {
                  setValueAs: (value) => (value ? String(value).trim() : ""),
                })}
              />
              <p className="text-muted-foreground text-xs">
                {t("apps.form.fields.tagsHint")}
              </p>
            </div>

            {/* 배정 팀 - MultiSelect */}
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
                              disabled={isPending}
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
                                placeholder={t(
                                  "apps.form.fields.assignedTeamSearch"
                                )}
                              />
                              <CommandList>
                                <CommandEmpty>
                                  {t("apps.form.fields.assignedTeamEmpty")}
                                </CommandEmpty>
                                <CommandGroup>
                                  {teamOptions.map((team) => {
                                    const isSelected = selectedIds.includes(
                                      team.id
                                    );
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
                                            isSelected
                                              ? "opacity-100"
                                              : "opacity-0"
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

            {/* 담당자 (향후 확장용) */}
            <div className="space-y-2">
              <Label>{t("apps.form.fields.owner")}</Label>
              <p className="text-muted-foreground text-sm">
                {t("apps.form.fields.ownerComingSoon")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 앱 로고 카드 */}
        <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle>{t("apps.form.fields.logo")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Controller
              name="customLogoUrl"
              control={control}
              render={({ field }) => (
                <ImageUpload
                  value={field.value || templateLogoPath || ""}
                  onChange={(url) => {
                    field.onChange(url);
                    // 사용자가 직접 로고를 업로드하면 템플릿 로고 및 URL 입력 초기화
                    if (url) {
                      setTemplateLogoPath(null);
                      setUrlInputValue("");
                    }
                  }}
                  aspectRatio="square"
                  disabled={isPending}
                  placeholder={t("apps.form.fields.logoUploadPlaceholder")}
                  className="max-w-[200px]"
                />
              )}
            />
            {errors.customLogoUrl?.message && (
              <p className="text-destructive mt-2 text-sm">
                {errors.customLogoUrl.message}
              </p>
            )}
            <p className="text-muted-foreground mt-2 text-xs">
              {t("apps.form.fields.logoUrlInputLabel")}
            </p>
            <Input
              type="text"
              placeholder={t("apps.form.fields.logoUrlPlaceholder")}
              disabled={isPending}
              className="mt-2"
              value={urlInputValue}
              onChange={(e) => {
                const value = e.target.value;
                setUrlInputValue(value);
              }}
              onBlur={() => {
                // blur 시에만 유효한 URL을 form에 반영
                const trimmedValue = urlInputValue.trim();
                if (trimmedValue) {
                  try {
                    new URL(trimmedValue);
                    setValue("customLogoUrl", trimmedValue);
                    setTemplateLogoPath(null);
                  } catch {
                    // 유효하지 않은 URL은 무시
                  }
                } else {
                  setValue("customLogoUrl", "");
                }
              }}
            />
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
