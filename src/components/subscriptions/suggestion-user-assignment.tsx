// src/components/subscriptions/suggestion-user-assignment.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ChevronsUpDown, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

export interface AvailableUser {
  id: string;
  name: string | null;
  email: string;
  teamId: string | null;
  teamName: string | null;
}

export interface SuggestionUserAssignmentProps {
  availableUsers: AvailableUser[];
  selectedUserIds: string[];
  onSelectedUserIdsChange: (userIds: string[]) => void;
  disabled?: boolean;
  maxUsers?: number;
  onSeatLimitReached?: () => void;
}

interface TeamGroup {
  teamId: string | null;
  teamName: string | null;
  users: AvailableUser[];
}

const UNASSIGNED_KEY = "__unassigned__";

export function SuggestionUserAssignment({
  availableUsers,
  selectedUserIds,
  onSelectedUserIdsChange,
  disabled,
  maxUsers,
  onSeatLimitReached,
}: SuggestionUserAssignmentProps) {
  const t = useTranslations("subscriptionSuggestions");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [teamPopoverOpen, setTeamPopoverOpen] = useState(false);

  // 팀별 그룹핑
  const teamGroups = useMemo<TeamGroup[]>(() => {
    const map = new Map<string, TeamGroup>();

    for (const user of availableUsers) {
      const key = user.teamId ?? UNASSIGNED_KEY;
      if (!map.has(key)) {
        map.set(key, {
          teamId: user.teamId,
          teamName: user.teamName,
          users: [],
        });
      }
      map.get(key)!.users.push(user);
    }

    // 팀 그룹을 먼저, 미배정을 마지막에 정렬
    const groups = Array.from(map.values());
    groups.sort((a, b) => {
      if (a.teamId === null) return 1;
      if (b.teamId === null) return -1;
      return (a.teamName ?? "").localeCompare(b.teamName ?? "");
    });

    return groups;
  }, [availableUsers]);

  // 팀이 있는 그룹만 (미배정 제외)
  const namedTeamGroups = useMemo(
    () => teamGroups.filter((g) => g.teamId !== null),
    [teamGroups]
  );

  // 팀 선택 Select는 namedTeamGroups가 2개 이상일 때만 표시
  const showTeamSelect = namedTeamGroups.length >= 2;

  // 선택된 사용자 객체 목록
  const selectedUsers = useMemo(
    () => availableUsers.filter((u) => selectedUserIds.includes(u.id)),
    [availableUsers, selectedUserIds]
  );

  const toggleUser = (userId: string) => {
    const isSelected = selectedUserIds.includes(userId);
    if (isSelected) {
      onSelectedUserIdsChange(selectedUserIds.filter((id) => id !== userId));
    } else {
      if (maxUsers !== undefined && selectedUserIds.length >= maxUsers) {
        onSeatLimitReached?.();
        return;
      }
      onSelectedUserIdsChange([...selectedUserIds, userId]);
    }
  };

  const removeUser = (userId: string) => {
    onSelectedUserIdsChange(selectedUserIds.filter((id) => id !== userId));
  };

  const isTeamAllSelected = (group: TeamGroup): boolean =>
    group.users.length > 0 &&
    group.users.every((u) => selectedUserIds.includes(u.id));

  const isTeamPartiallySelected = (group: TeamGroup): boolean =>
    group.users.some((u) => selectedUserIds.includes(u.id)) &&
    !isTeamAllSelected(group);

  const handleTeamSelect = (value: string) => {
    const group =
      value === UNASSIGNED_KEY
        ? teamGroups.find((g) => g.teamId === null)
        : teamGroups.find((g) => g.teamId === value);

    if (!group) return;

    if (isTeamAllSelected(group)) {
      // 전체 선택 상태면 팀 멤버 전원 제거
      const teamUserIds = new Set(group.users.map((u) => u.id));
      onSelectedUserIdsChange(
        selectedUserIds.filter((id) => !teamUserIds.has(id))
      );
    } else {
      // 부분 또는 미선택 상태면 팀 멤버 전원 추가
      const newIds = group.users
        .map((u) => u.id)
        .filter((id) => !selectedUserIds.includes(id));

      if (maxUsers !== undefined) {
        const remaining = maxUsers - selectedUserIds.length;
        if (remaining <= 0) {
          onSeatLimitReached?.();
          return;
        }
        const toAdd = newIds.slice(0, remaining);
        onSelectedUserIdsChange([...selectedUserIds, ...toAdd]);
      } else {
        onSelectedUserIdsChange([...selectedUserIds, ...newIds]);
      }
    }
  };

  const getGroupHeading = (group: TeamGroup): string => {
    const name =
      group.teamId === null ? t("unassigned") : (group.teamName ?? "");
    return `${name} (${group.users.length}명)`;
  };

  return (
    <div className="space-y-2">
      {/* 팀 전체 선택 Popover (팀 2개 이상일 때만 표시) */}
      {showTeamSelect && (
        <Popover open={teamPopoverOpen} onOpenChange={setTeamPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              data-testid="team-select"
              className={cn(
                "border-input bg-background ring-offset-background flex min-h-9 w-full items-center justify-between rounded-sm border px-3 py-2 text-sm",
                "focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
              disabled={disabled}
            >
              <span className="text-muted-foreground">{t("selectTeam")}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command className="overflow-visible">
              <CommandList data-testid="team-command-list">
                {namedTeamGroups.map((group) => {
                  const allSelected = isTeamAllSelected(group);
                  const partial = isTeamPartiallySelected(group);
                  return (
                    <CommandItem
                      key={group.teamId!}
                      value={group.teamId!}
                      onSelect={() => handleTeamSelect(group.teamId!)}
                    >
                      <Checkbox
                        checked={partial ? "indeterminate" : allSelected}
                        className="mr-2"
                      />
                      {`${group.teamName} (${group.users.length}명)`}
                    </CommandItem>
                  );
                })}
                {teamGroups.some((g) => g.teamId === null) &&
                  (() => {
                    const unassignedGroup = teamGroups.find(
                      (g) => g.teamId === null
                    )!;
                    const allSelected = isTeamAllSelected(unassignedGroup);
                    const partial = isTeamPartiallySelected(unassignedGroup);
                    return (
                      <CommandItem
                        key={UNASSIGNED_KEY}
                        value={UNASSIGNED_KEY}
                        onSelect={() => handleTeamSelect(UNASSIGNED_KEY)}
                      >
                        <Checkbox
                          checked={partial ? "indeterminate" : allSelected}
                          className="mr-2"
                        />
                        {`${t("unassigned")} (${unassignedGroup.users.length}명)`}
                      </CommandItem>
                    );
                  })()}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {/* 사용자 선택 Popover + Command */}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "border-input bg-background ring-offset-background flex min-h-9 w-full items-center justify-between rounded-sm border px-3 py-2 text-sm",
              "focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
            disabled={disabled}
          >
            <span className="text-muted-foreground">
              {selectedUsers.length > 0
                ? t("selectedCount", { count: selectedUsers.length })
                : t("selectUsers")}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command className="h-auto overflow-visible">
            <CommandInput placeholder={t("searchUsers")} />
            <CommandList className="max-h-none overflow-visible">
              <ScrollArea
                className="h-[250px]"
                onWheel={(e) => {
                  const viewport = e.currentTarget.querySelector(
                    "[data-radix-scroll-area-viewport]"
                  ) as HTMLElement;
                  if (viewport) {
                    viewport.scrollTop += e.deltaY;
                    e.stopPropagation();
                  }
                }}
              >
                <div className="p-1">
                  <CommandEmpty>{t("noUsersFound")}</CommandEmpty>
                  {teamGroups.map((group) => (
                    <CommandGroup
                      key={group.teamId ?? UNASSIGNED_KEY}
                      heading={getGroupHeading(group)}
                    >
                      {group.users.map((user) => {
                        const displayName = user.name ?? user.email;
                        const searchValue = [
                          group.teamName ?? "",
                          user.name ?? "",
                          user.email,
                        ]
                          .join(" ")
                          .trim();

                        return (
                          <CommandItem
                            key={user.id}
                            value={searchValue}
                            onSelect={() => toggleUser(user.id)}
                          >
                            <Checkbox
                              checked={selectedUserIds.includes(user.id)}
                              className="mr-2"
                            />
                            <div className="flex flex-col">
                              <span>{displayName}</span>
                              {user.name && (
                                <span className="text-muted-foreground text-xs">
                                  {user.email}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  ))}
                </div>
              </ScrollArea>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* 선택된 사용자 Badge 목록 */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-1">
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
    </div>
  );
}
