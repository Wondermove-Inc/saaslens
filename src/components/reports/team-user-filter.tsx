"use client";

// src/components/reports/team-user-filter.tsx
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";

export interface TeamFilterOption {
  id: string;
  name: string;
}

export interface UserFilterOption {
  id: string;
  name: string | null;
  email: string;
  teamId: string | null;
  teamName: string | null;
}

interface TeamUserFilterProps {
  teamId: string | null;
  userId: string | null;
  teams: TeamFilterOption[];
  users: UserFilterOption[];
  onTeamChange: (teamId: string | null) => void;
  onUserChange: (userId: string | null) => void;
  includeAllOption?: boolean;
  teamLocked?: boolean;
}

export function TeamUserFilter({
  teamId,
  userId,
  teams,
  users,
  onTeamChange,
  onUserChange,
  includeAllOption = true,
  teamLocked = false,
}: TeamUserFilterProps) {
  const t = useTranslations("common.filter");
  const availableUsers = teamId
    ? users.filter((user) => user.teamId === teamId)
    : [];

  const teamValue = teamId ?? (includeAllOption ? "all" : "");
  const userValue = userId ?? "all";

  return (
    <Card className="rounded-sm border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <CardContent className="flex flex-wrap items-center gap-3 rounded-sm">
        <Select
          value={teamValue}
          onValueChange={(value) =>
            onTeamChange(value === "all" ? null : value)
          }
          disabled={teamLocked}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t("teamPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {includeAllOption && (
              <SelectItem value="all">{t("allTeams")}</SelectItem>
            )}
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={userValue}
          onValueChange={(value) =>
            onUserChange(value === "all" ? null : value)
          }
          disabled={!teamId || availableUsers.length === 0}
        >
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder={t("userPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allUsers")}</SelectItem>
            {availableUsers.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name || user.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
