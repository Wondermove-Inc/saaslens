"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import {
  getTeamHierarchy,
  getTeamMembers,
  getTeamStats,
  type TeamMember,
  type TeamNode,
  type TeamWithStats,
} from "@/actions/teams";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronDown,
  ChevronRight,
  FolderTree,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { CreateTeamDialog } from "./create-team-dialog";
import { DeleteTeamDialog } from "./delete-team-dialog";
import { EditTeamDialog } from "./edit-team-dialog";

interface TeamsPageClientProps {
  initialTeams?: TeamNode[];
}

interface TeamStats {
  totalTeams: number;
  teamsWithMembers: number;
  avgMembersPerTeam: number;
  maxDepth: number;
}

export function TeamsPageClient({ initialTeams }: TeamsPageClientProps) {
  const t = useTranslations();
  const [teams, setTeams] = useState<TeamNode[]>(initialTeams || []);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(!initialTeams);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamWithStats | null>(null);
  // #6: 팀 멤버 표시 기능
  const [teamMembers, setTeamMembers] = useState<Record<string, TeamMember[]>>(
    {}
  );
  const [loadingMembers, setLoadingMembers] = useState<Set<string>>(new Set());
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(
    new Set()
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [teamsResult, statsResult] = await Promise.all([
        getTeamHierarchy(),
        getTeamStats(),
      ]);

      if (teamsResult.success && teamsResult.data) {
        setTeams(teamsResult.data);
        // 기본적으로 1단계까지 펼침
        const firstLevel = new Set(teamsResult.data.map((t) => t.id));
        setExpandedTeams(firstLevel);
      }

      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialTeams) {
      loadData();
    }
  }, [initialTeams, loadData]);

  const handleRefresh = () => {
    startTransition(() => {
      loadData();
    });
  };

  const toggleExpand = (teamId: string) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (nodes: TeamNode[]) => {
      nodes.forEach((node) => {
        allIds.add(node.id);
        if (node.children) {
          collectIds(node.children);
        }
      });
    };
    collectIds(teams);
    setExpandedTeams(allIds);
    setExpandedMembers(new Set(allIds));
    // 아직 로드되지 않은 팀의 멤버 데이터 로드
    allIds.forEach((id) => loadTeamMembers(id));
  };

  const collapseAll = () => {
    setExpandedTeams(new Set());
    setExpandedMembers(new Set());
  };

  // 팀 멤버 로드
  const loadTeamMembers = useCallback(
    async (teamId: string) => {
      if (teamMembers[teamId]) return; // 이미 로드됨
      setLoadingMembers((prev) => new Set(prev).add(teamId));
      try {
        const result = await getTeamMembers(teamId);
        if (result.success && result.data) {
          setTeamMembers((prev) => ({ ...prev, [teamId]: result.data! }));
        }
      } finally {
        setLoadingMembers((prev) => {
          const next = new Set(prev);
          next.delete(teamId);
          return next;
        });
      }
    },
    [teamMembers]
  );

  // 팀 멤버 토글
  const toggleMembers = useCallback(
    (teamId: string) => {
      const isCurrentlyExpanded = expandedMembers.has(teamId);

      setExpandedMembers((prev) => {
        const next = new Set(prev);
        if (next.has(teamId)) {
          next.delete(teamId);
        } else {
          next.add(teamId);
        }
        return next;
      });

      // Side effect를 state updater 외부에서 실행
      if (!isCurrentlyExpanded) {
        loadTeamMembers(teamId);
      }
    },
    [loadTeamMembers, expandedMembers]
  );

  // 검색 필터링
  const filterTeams = (nodes: TeamNode[], query: string): TeamNode[] => {
    if (!query) return nodes;

    const lowerQuery = query.toLowerCase();

    const matchesQuery = (node: TeamNode): boolean => {
      if (node.name.toLowerCase().includes(lowerQuery)) return true;
      if (node.description?.toLowerCase().includes(lowerQuery)) return true;
      if (node.googleOrgUnitPath?.toLowerCase().includes(lowerQuery))
        return true;
      return false;
    };

    const filterNode = (node: TeamNode): TeamNode | null => {
      const filteredChildren = node.children
        .map((child) => filterNode(child))
        .filter((c): c is TeamNode => c !== null);

      if (matchesQuery(node) || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    };

    return nodes
      .map((node) => filterNode(node))
      .filter((n): n is TeamNode => n !== null);
  };

  const filteredTeams = filterTeams(teams, searchQuery);

  // 수정 다이얼로그 열기
  const openEditDialog = (team: TeamNode) => {
    setSelectedTeam(team);
    setIsEditDialogOpen(true);
  };

  // 삭제 다이얼로그 열기
  const openDeleteDialog = (team: TeamNode) => {
    setSelectedTeam(team);
    setIsDeleteDialogOpen(true);
  };

  const renderTeamNode = (node: TeamNode, depth: number = 0) => {
    const isExpanded = expandedTeams.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isManualTeam = !node.googleOrgUnitId; // 수동 생성 팀 여부
    const isMembersExpanded = expandedMembers.has(node.id);

    return (
      <div key={node.id} style={{ paddingLeft: `${depth * 24}px` }}>
        <div
          className={`group hover:bg-purple-gray flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 transition-colors ${isMembersExpanded ? "bg-purple-tertiary" : ""}`}
          onClick={() => toggleMembers(node.id)}
        >
          {/* 자식 팀 펼침/접힘 버튼 (자식 있을 때만) */}
          <div className="w-5">
            {hasChildren ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(node.id);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            ) : (
              <div className="w-5" />
            )}
          </div>

          {/* 팀 아이콘 */}
          <FolderTree className="text-muted-foreground h-4 w-4" />

          {/* 팀 이름 */}
          <span className="flex-1 font-medium">{node.name}</span>

          {/* 멤버 수 (정보 표시용 Badge) */}
          <Badge
            variant="secondary"
            className="flex items-center gap-1 text-xs"
          >
            <Users className="h-3 w-3" />
            <span>{node._count?.members || 0}</span>
          </Badge>

          {/* Google OU 배지 */}
          {node.googleOrgUnitPath && (
            <Badge variant="outline" className="text-xs">
              OU
            </Badge>
          )}

          {/* 멤버 펼침 상태 아이콘 */}
          {isMembersExpanded ? (
            <ChevronDown className="text-muted-foreground h-4 w-4" />
          ) : (
            <ChevronRight className="text-muted-foreground h-4 w-4" />
          )}

          {/* 수동 팀: 수정/삭제 메뉴 */}
          {isManualTeam && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditDialog(node);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  {t("teams.tree.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    openDeleteDialog(node);
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("teams.tree.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* 팀 멤버 목록 (팀 행 바로 아래, 자식 팀 위) */}
        <div
          className="grid transition-[grid-template-rows] duration-200 ease-in-out"
          style={{ gridTemplateRows: isMembersExpanded ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <div className="bg-purple-gray border-border mr-2 ml-10 rounded-md border p-3">
              {loadingMembers.has(node.id) ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              ) : teamMembers[node.id]?.length ? (
                <div className="space-y-1">
                  {teamMembers[node.id].map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Users className="text-muted-foreground h-3 w-3" />
                      <span className="font-medium">{member.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {member.email}
                      </span>
                      {member.role && (
                        <Badge variant="outline" className="text-xs">
                          {member.role}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {t("teams.tree.noMembers")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 자식 팀 렌더링 (멤버 패널 아래) */}
        {isExpanded && hasChildren && (
          <div className="border-muted ml-5 border-l">
            {node.children.map((child) => renderTeamNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="border-border/50 shadow-sm">
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-2 h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tree Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="border-l-primary/50 border-border/50 h-full rounded-sm border-l-4 shadow-sm transition-shadow hover:shadow-md">
            <CardContent className="flex h-full flex-col justify-between p-4">
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 rounded-lg p-2">
                  <FolderTree className="text-primary h-4 w-4" />
                </div>
                <span className="text-muted-foreground text-xs font-medium">
                  {t("teams.stats.totalTeams")}
                </span>
              </div>
              <div className="mt-2">
                <p className="text-3xl font-bold">{stats.totalTeams}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-primary/50 border-border/50 h-full rounded-sm border-l-4 shadow-sm transition-shadow hover:shadow-md">
            <CardContent className="flex h-full flex-col justify-between p-4">
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 rounded-lg p-2">
                  <Users className="text-primary h-4 w-4" />
                </div>
                <span className="text-muted-foreground text-xs font-medium">
                  {t("teams.stats.teamsWithMembers")}
                </span>
              </div>
              <div className="mt-2">
                <p className="text-3xl font-bold">{stats.teamsWithMembers}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 팀 트리 */}
      <Card className="border-l-primary/50 border-border/50 rounded-sm border-l-4 shadow-sm transition-shadow hover:shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              {t("teams.tree.title")}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t("teams.tree.addTeam")}
              </Button>
              <Button variant="outline" size="sm" onClick={expandAll}>
                {t("teams.tree.expandAll")}
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                {t("teams.tree.collapseAll")}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isPending}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>
          {/* 검색 */}
          <div className="relative mt-4">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder={t("teams.tree.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredTeams.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              {searchQuery
                ? t("teams.tree.noSearchResults")
                : t("teams.tree.empty")}
            </div>
          ) : (
            <ScrollArea className="min-h-[450px]">
              <div className="space-y-1">
                {filteredTeams.map((team) => renderTeamNode(team))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* 팀 생성 다이얼로그 */}
      <CreateTeamDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={loadData}
      />

      {/* 팀 수정 다이얼로그 */}
      {selectedTeam && (
        <EditTeamDialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) setSelectedTeam(null);
          }}
          team={selectedTeam}
          onSuccess={loadData}
        />
      )}

      {/* 팀 삭제 다이얼로그 */}
      {selectedTeam && (
        <DeleteTeamDialog
          open={isDeleteDialogOpen}
          onOpenChange={(open) => {
            setIsDeleteDialogOpen(open);
            if (!open) setSelectedTeam(null);
          }}
          team={selectedTeam}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
