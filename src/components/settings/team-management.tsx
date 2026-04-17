// src/components/settings/team-management.tsx
"use client";

import { updateOrganizationTeams } from "@/actions/organization";
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
import { Loader2, Plus, Trash2, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface TeamManagementProps {
  initialTeams: string[];
}

export function TeamManagement({ initialTeams }: TeamManagementProps) {
  const t = useTranslations();
  const [teams, setTeams] = useState<string[]>(initialTeams);
  const [newTeam, setNewTeam] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleAddTeam = () => {
    const trimmedName = newTeam.trim();
    if (!trimmedName) {
      toast.error(t("settings.team.toast.empty"));
      return;
    }
    if (teams.includes(trimmedName)) {
      toast.error(t("settings.team.toast.duplicate"));
      return;
    }

    const updatedTeams = [...teams, trimmedName];
    saveTeams(updatedTeams);
    setNewTeam("");
  };

  const handleRemoveTeam = (teamToRemove: string) => {
    const updatedTeams = teams.filter((t) => t !== teamToRemove);
    saveTeams(updatedTeams);
  };

  const saveTeams = (updatedTeams: string[]) => {
    startTransition(async () => {
      const result = await updateOrganizationTeams(updatedTeams);
      if (result.success) {
        setTeams(updatedTeams);
        toast.success(result.message || t("settings.team.toast.updated"));
      } else {
        toast.error(result.message || t("settings.team.toast.saveFailed"));
      }
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTeam();
    }
  };

  return (
    <div className="max-w-lg space-y-4">
      <Card className="border-border rounded-sm shadow-sm transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("settings.team.title")}
          </CardTitle>
          <CardDescription>{t("settings.team.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 팀 추가 입력 */}
          <div className="flex gap-2">
            <Input
              placeholder={t("settings.team.new.placeholder")}
              value={newTeam}
              onChange={(e) => setNewTeam(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isPending}
            />
            <Button
              type="button"
              onClick={handleAddTeam}
              disabled={isPending || !newTeam.trim()}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* 팀 목록 */}
          {teams.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
              <Users className="text-muted-foreground mb-2 h-8 w-8" />
              <p className="text-muted-foreground text-sm">
                {t("settings.team.empty.title")}
              </p>
              <p className="text-muted-foreground text-xs">
                {t("settings.team.empty.description")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {teams.map((team) => (
                <div
                  key={team}
                  className="hover:bg-purple-gray flex items-center justify-between rounded-lg border p-3 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{team}</Badge>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveTeam(team)}
                    disabled={isPending}
                    className="text-muted-foreground hover:text-destructive h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* 팀 수 표시 */}
          {teams.length > 0 && (
            <p className="text-muted-foreground text-xs">
              {t("settings.team.count", { count: teams.length })}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
