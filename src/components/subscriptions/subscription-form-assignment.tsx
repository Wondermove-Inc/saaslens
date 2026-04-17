// src/components/subscriptions/subscription-form-assignment.tsx
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
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { type Control, Controller, useWatch } from "react-hook-form";
import type { SubscriptionFormValues } from "./subscription-form-schema";

export interface TeamOption {
  id: string;
  name: string;
}

export interface UserOption {
  id: string;
  name: string | null;
  email: string;
  teamId: string | null;
}

export interface AppWithTeams {
  id: string;
  name: string;
  teams: TeamOption[];
}

interface SubscriptionFormAssignmentProps {
  control: Control<SubscriptionFormValues>;
  apps: AppWithTeams[];
  users: UserOption[];
  isAdmin: boolean;
  isPending: boolean;
  billingType?: string;
  setValue: (
    name: keyof SubscriptionFormValues,
    value: string | string[] | null
  ) => void;
}

export function SubscriptionFormAssignment({
  control,
  apps,
  users,
  isAdmin,
  isPending,
  billingType,
  setValue,
}: SubscriptionFormAssignmentProps) {
  const isPerSeat = billingType === "PER_SEAT";
  const t = useTranslations("subscriptions.form.assignment");
  const [userPopoverOpen, setUserPopoverOpen] = useState(false);
  const [teamPopoverOpen, setTeamPopoverOpen] = useState(false);

  // 선택된 앱 ID 감시
  const selectedAppId = useWatch({ control, name: "appId" });
  const watchedTeamIds = useWatch({ control, name: "teamIds" });
  const selectedTeamIds = useMemo(() => watchedTeamIds ?? [], [watchedTeamIds]);
  const watchedUserIds = useWatch({ control, name: "assignedUserIds" });
  const selectedUserIds = useMemo(() => watchedUserIds ?? [], [watchedUserIds]);

  // 선택된 앱의 배정 팀 목록
  const availableTeams = useMemo(() => {
    if (!selectedAppId) return [];
    const selectedApp = apps.find((app) => app.id === selectedAppId);
    return selectedApp?.teams ?? [];
  }, [selectedAppId, apps]);

  // 앱이 변경되면 이전 팀 선택 초기화
  useEffect(() => {
    if (availableTeams.length === 0 && selectedTeamIds.length > 0) {
      setValue("teamIds", []);
    }
  }, [availableTeams, selectedTeamIds, setValue]);

  // 선택된 팀에 속한 사용자만 필터링 (선택된 팀 중 하나에라도 속하면 표시)
  const availableUsers = useMemo(() => {
    if (selectedTeamIds.length === 0) return [];
    return users.filter(
      (user) => user.teamId && selectedTeamIds.includes(user.teamId)
    );
  }, [users, selectedTeamIds]);

  // 선택된 사용자 정보
  const selectedUsers = useMemo(() => {
    return availableUsers.filter((user) => selectedUserIds.includes(user.id));
  }, [availableUsers, selectedUserIds]);

  // 팀 변경 시 선택된 사용자 초기화 (선택된 팀에 속하지 않는 사용자 제거)
  // PER_SEAT 구독에서는 유저 배정이 Pricing 카드에서 독립적으로 관리되므로 팀 기반 필터링 스킵
  useEffect(() => {
    if (isPerSeat) return;
    if (selectedUserIds.length > 0 && selectedTeamIds.length > 0) {
      const validUserIds = selectedUserIds.filter((id) =>
        users.some(
          (u) => u.id === id && u.teamId && selectedTeamIds.includes(u.teamId)
        )
      );
      if (validUserIds.length !== selectedUserIds.length) {
        setValue("assignedUserIds", validUserIds);
      }
    }
  }, [isPerSeat, selectedTeamIds, selectedUserIds, users, setValue]);

  // 팀 선택/해제 토글
  const toggleTeam = (teamId: string) => {
    const newValue = selectedTeamIds.includes(teamId)
      ? selectedTeamIds.filter((id) => id !== teamId)
      : [...selectedTeamIds, teamId];
    setValue("teamIds", newValue);
  };

  // 팀 제거
  const removeTeam = (teamId: string) => {
    setValue(
      "teamIds",
      selectedTeamIds.filter((id) => id !== teamId)
    );
  };

  // 사용자 선택/해제 토글
  const toggleUser = (userId: string) => {
    const newValue = selectedUserIds.includes(userId)
      ? selectedUserIds.filter((id) => id !== userId)
      : [...selectedUserIds, userId];
    setValue("assignedUserIds", newValue);
  };

  // 사용자 제거
  const removeUser = (userId: string) => {
    setValue(
      "assignedUserIds",
      selectedUserIds.filter((id) => id !== userId)
    );
  };

  // 선택된 팀 정보
  const selectedTeams = useMemo(() => {
    return availableTeams.filter((team) => selectedTeamIds.includes(team.id));
  }, [availableTeams, selectedTeamIds]);

  // ADMIN만 배정 카드 표시
  if (!isAdmin) {
    return null;
  }

  return (
    <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Team 다중 선택 */}
        <div className="space-y-2">
          <Label>{t("teamLabel")}</Label>
          {availableTeams.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {selectedAppId ? t("noTeamsForApp") : t("selectAppFirst")}
            </p>
          ) : (
            <Controller
              control={control}
              name="teamIds"
              render={() => (
                <>
                  <Popover
                    open={teamPopoverOpen}
                    onOpenChange={setTeamPopoverOpen}
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "border-input bg-background ring-offset-background flex min-h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-sm",
                          "focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none",
                          "disabled:cursor-not-allowed disabled:opacity-50",
                          isPending && "cursor-not-allowed opacity-50"
                        )}
                        disabled={isPending}
                      >
                        <span className="text-muted-foreground">
                          {selectedTeams.length > 0
                            ? selectedTeams.map((t) => t.name).join(", ")
                            : t("teamPlaceholder")}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder={t("teamPlaceholder")} />
                        <CommandList>
                          <CommandEmpty>{t("noTeamsForApp")}</CommandEmpty>
                          <CommandGroup>
                            {availableTeams.map((team) => (
                              <CommandItem
                                key={team.id}
                                value={team.name}
                                onSelect={() => toggleTeam(team.id)}
                              >
                                <Checkbox
                                  checked={selectedTeamIds.includes(team.id)}
                                  className="mr-2"
                                />
                                {team.name}
                                {selectedTeamIds.includes(team.id) && (
                                  <Check className="ml-auto h-4 w-4" />
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {/* 선택된 팀 목록 */}
                  {selectedTeams.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2">
                      {selectedTeams.map((team) => (
                        <Badge
                          key={team.id}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {team.name}
                          <button
                            type="button"
                            onClick={() => removeTeam(team.id)}
                            className="hover:bg-muted ml-1 rounded-full"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </>
              )}
            />
          )}
        </div>

        {/* User 배정 (ADMIN만, PER_SEAT일 때는 라이선스 카드에서 관리) */}
        {isAdmin && !isPerSeat && (
          <div className="space-y-2">
            <Label>{t("userLabel")}</Label>
            {selectedTeamIds.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {t("selectTeamFirst")}
              </p>
            ) : availableUsers.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {t("noUsersForTeam")}
              </p>
            ) : (
              <>
                <Popover
                  open={userPopoverOpen}
                  onOpenChange={setUserPopoverOpen}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "border-input bg-background ring-offset-background flex min-h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-sm",
                        "focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        isPending && "cursor-not-allowed opacity-50"
                      )}
                      disabled={isPending}
                    >
                      <span className="text-muted-foreground">
                        {selectedUsers.length > 0
                          ? t("usersSelected", { count: selectedUsers.length })
                          : t("selectUsersPlaceholder")}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder={t("searchUsers")} />
                      <CommandList>
                        <CommandEmpty>{t("noUsersFound")}</CommandEmpty>
                        <CommandGroup>
                          {availableUsers.map((user) => (
                            <CommandItem
                              key={user.id}
                              value={user.email}
                              onSelect={() => toggleUser(user.id)}
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

                {/* 선택된 사용자 목록 */}
                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-2">
                    {selectedUsers.map((user) => (
                      <Badge
                        key={user.id}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {user.name ?? user.email}
                        <button
                          type="button"
                          onClick={() => removeUser(user.id)}
                          className="hover:bg-muted ml-1 rounded-full"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
