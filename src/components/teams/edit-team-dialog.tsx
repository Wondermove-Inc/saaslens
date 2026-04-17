"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  getTeamMembers,
  getTeams,
  updateTeam,
  type TeamWithStats,
} from "@/actions/teams";
import { getUsers } from "@/actions/users-read";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { UserListItem } from "@/types/user";
import { Loader2, Search, Users } from "lucide-react";
import { useTranslations } from "next-intl";

interface EditTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: TeamWithStats;
  onSuccess?: () => void;
}

export function EditTeamDialog({
  open,
  onOpenChange,
  team,
  onSuccess,
}: EditTeamDialogProps) {
  const t = useTranslations();
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description || "");
  const [parentId, setParentId] = useState<string>(team.parentId || "__none__");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");

  const [teams, setTeams] = useState<TeamWithStats[]>([]);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isPending, startTransition] = useTransition();

  // 연동 팀 여부 (Google Workspace)
  const isLinkedTeam = !!team.googleOrgUnitId;

  // 다이얼로그 열릴 때 데이터 로드
  useEffect(() => {
    if (open) {
      setIsLoadingData(true);
      setName(team.name);
      setDescription(team.description || "");
      setParentId(team.parentId || "__none__");

      Promise.all([
        getTeams(),
        getUsers({ limit: 100 }),
        getTeamMembers(team.id),
      ])
        .then(([teamsRes, usersRes, membersRes]) => {
          if (teamsRes.success && teamsRes.data) {
            setTeams(teamsRes.data);
          }
          if (usersRes.items) {
            setUsers(usersRes.items);
          }
          if (membersRes.success && membersRes.data) {
            setSelectedMembers(membersRes.data.map((m) => m.id));
          }
        })
        .finally(() => setIsLoadingData(false));
    } else {
      // 다이얼로그 닫힐 때 초기화
      setMemberSearch("");
    }
  }, [open, team]);

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error(t("teams.edit.nameRequired"));
      return;
    }

    startTransition(async () => {
      const result = await updateTeam(team.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        parentId: parentId && parentId !== "__none__" ? parentId : null,
        memberIds: selectedMembers,
      });

      if (result.success) {
        toast.success(result.message || t("teams.edit.success"));
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.message || t("teams.edit.error"));
      }
    });
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // 사용자가 다른 팀에 속해 있는지 확인 (현재 편집 중인 팀 제외)
  const getUserCurrentTeam = (user: UserListItem) => {
    if (user.team && user.team.id !== team.id) {
      return user.team.name;
    }
    return null;
  };

  // 부모 팀 후보에서 자기 자신과 하위 팀들을 제외
  const getAvailableParentTeams = () => {
    const descendantIds = new Set<string>();

    // 하위 팀 ID 수집 (재귀적으로)
    const collectDescendants = (parentId: string) => {
      teams.forEach((t) => {
        if (t.parentId === parentId) {
          descendantIds.add(t.id);
          collectDescendants(t.id);
        }
      });
    };

    descendantIds.add(team.id);
    collectDescendants(team.id);

    return teams.filter((t) => !descendantIds.has(t.id));
  };

  // 멤버 필터링 (검색어)
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      !memberSearch ||
      user.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
      user.email.toLowerCase().includes(memberSearch.toLowerCase());
    return matchesSearch;
  });

  const availableParentTeams = getAvailableParentTeams();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("teams.edit.title")}</DialogTitle>
          <DialogDescription>
            {t("teams.edit.description")}
            {isLinkedTeam && (
              <span className="text-muted-foreground mt-1 block">
                {t("teams.edit.linkedTeamNote")}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* 팀 이름 */}
            <div className="space-y-2">
              <Label htmlFor="edit-team-name">
                {t("teams.edit.teamName")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-team-name"
                placeholder={t("teams.edit.namePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLinkedTeam}
              />
              {isLinkedTeam && (
                <p className="text-muted-foreground text-xs">
                  {t("teams.edit.linkedTeamNameNote")}
                </p>
              )}
            </div>

            {/* 설명 */}
            <div className="space-y-2">
              <Label htmlFor="edit-team-description">
                {t("teams.edit.description")}
              </Label>
              <Textarea
                id="edit-team-description"
                placeholder={t("teams.edit.descriptionPlaceholder")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* 부모 팀 */}
            <div className="space-y-2">
              <Label>{t("teams.edit.parentTeam")}</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("teams.edit.parentTeamPlaceholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    {t("teams.edit.noParent")}
                  </SelectItem>
                  {availableParentTeams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 멤버 배정 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t("teams.edit.memberAssignment")}
                {selectedMembers.length > 0 && (
                  <span className="text-muted-foreground text-sm">
                    ({selectedMembers.length}
                    {t("teams.edit.selectedMembers")})
                  </span>
                )}
              </Label>

              {/* 멤버 검색 */}
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder={t("teams.edit.memberSearchPlaceholder")}
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* 멤버 목록 */}
              <ScrollArea className="h-[200px] rounded-md border">
                <div className="p-2">
                  {filteredUsers.length === 0 ? (
                    <div className="text-muted-foreground py-4 text-center text-sm">
                      {memberSearch
                        ? t("teams.edit.noSearchResults")
                        : t("teams.edit.noAvailableMembers")}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredUsers.map((user) => {
                        const currentTeamName = getUserCurrentTeam(user);
                        const isSelected = selectedMembers.includes(user.id);

                        return (
                          <label
                            key={user.id}
                            className="hover:bg-muted flex cursor-pointer items-center gap-3 rounded-md p-2"
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleMember(user.id)}
                            />
                            <div className="flex-1 overflow-hidden">
                              <div className="flex items-center gap-2">
                                <span className="truncate font-medium">
                                  {user.name || t("teams.edit.noName")}
                                </span>
                                {currentTeamName && isSelected && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {currentTeamName}
                                    {t("teams.edit.movingFrom")}
                                  </Badge>
                                )}
                                {currentTeamName && !isSelected && (
                                  <Badge variant="outline" className="text-xs">
                                    {t("teams.edit.current")} {currentTeamName}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-muted-foreground truncate text-sm">
                                {user.email}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t("teams.edit.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !name.trim()}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("teams.edit.saving")}
              </>
            ) : (
              t("teams.edit.save")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
