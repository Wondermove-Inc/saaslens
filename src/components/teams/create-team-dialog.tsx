"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { createTeam, getTeams, type TeamWithStats } from "@/actions/teams";
import { getUsers } from "@/actions/users-read";
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

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateTeamDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateTeamDialogProps) {
  const t = useTranslations();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState<string>("__none__");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");

  const [teams, setTeams] = useState<TeamWithStats[]>([]);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isPending, startTransition] = useTransition();

  // 다이얼로그 열릴 때 데이터 로드
  useEffect(() => {
    if (open) {
      setIsLoadingData(true);
      Promise.all([getTeams(), getUsers({ limit: 100 })])
        .then(([teamsRes, usersRes]) => {
          if (teamsRes.success && teamsRes.data) {
            setTeams(teamsRes.data);
          }
          if (usersRes.items) {
            setUsers(usersRes.items);
          }
        })
        .finally(() => setIsLoadingData(false));
    } else {
      // 다이얼로그 닫힐 때 초기화
      setName("");
      setDescription("");
      setParentId("__none__");
      setSelectedMembers([]);
      setMemberSearch("");
    }
  }, [open]);

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error(t("teams.create.nameRequired"));
      return;
    }

    startTransition(async () => {
      const result = await createTeam({
        name: name.trim(),
        description: description.trim() || undefined,
        parentId: parentId && parentId !== "__none__" ? parentId : undefined,
        memberIds: selectedMembers.length > 0 ? selectedMembers : undefined,
      });

      if (result.success) {
        toast.success(result.message || t("teams.create.success"));
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.message || t("teams.create.error"));
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

  // 멤버 필터링 (팀이 없는 멤버 + 검색어)
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      !memberSearch ||
      user.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
      user.email.toLowerCase().includes(memberSearch.toLowerCase());
    return matchesSearch;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("teams.create.title")}</DialogTitle>
          <DialogDescription>{t("teams.create.description")}</DialogDescription>
        </DialogHeader>

        {isLoadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* 팀 이름 */}
            <div className="space-y-2">
              <Label htmlFor="team-name">
                {t("teams.create.teamName")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="team-name"
                placeholder={t("teams.create.namePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* 설명 */}
            <div className="space-y-2">
              <Label htmlFor="team-description">
                {t("teams.create.description")}
              </Label>
              <Textarea
                id="team-description"
                placeholder={t("teams.create.descriptionPlaceholder")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* 부모 팀 */}
            <div className="space-y-2">
              <Label>{t("teams.create.parentTeam")}</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("teams.create.parentTeamPlaceholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    {t("teams.create.noParent")}
                  </SelectItem>
                  {teams.map((team) => (
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
                {t("teams.create.memberAssignment")}
                {selectedMembers.length > 0 && (
                  <span className="text-muted-foreground text-sm">
                    ({selectedMembers.length}
                    {t("teams.create.selectedMembers")})
                  </span>
                )}
              </Label>

              {/* 멤버 검색 */}
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder={t("teams.create.memberSearchPlaceholder")}
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
                        ? t("teams.create.noSearchResults")
                        : t("teams.create.noAvailableMembers")}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredUsers.map((user) => (
                        <label
                          key={user.id}
                          className="hover:bg-muted flex cursor-pointer items-center gap-3 rounded-md p-2"
                        >
                          <Checkbox
                            checked={selectedMembers.includes(user.id)}
                            onCheckedChange={() => toggleMember(user.id)}
                          />
                          <div className="flex-1 overflow-hidden">
                            <div className="truncate font-medium">
                              {user.name || t("teams.create.noName")}
                            </div>
                            <div className="text-muted-foreground truncate text-sm">
                              {user.email}
                            </div>
                          </div>
                        </label>
                      ))}
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
            {t("teams.create.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !name.trim()}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("teams.create.creating")}
              </>
            ) : (
              t("teams.create.create")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
