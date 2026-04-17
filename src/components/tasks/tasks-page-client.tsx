"use client";

import { KpiCard, KpiCardsGrid } from "@/components/common/kpi-card";
import { PageHeader } from "@/components/common/page-header";
import { TaskTable } from "@/components/tasks/task-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Task } from "@/types/task";
import { AlertTriangle, Circle, Clock, ListTodo, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

// 데모 데이터
const demoTasks: Task[] = [
  {
    id: "1",
    title: "Slack 라이선스 최적화",
    description: "미사용 라이선스 정리 및 플랜 다운그레이드 검토",
    status: "TODO",
    priority: "HIGH",
    assignee: { id: "1", name: "김철수", email: "kim@company.com" },
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    tags: ["비용절감", "Slack"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    title: "Notion 팀 워크스페이스 통합",
    description: "분산된 워크스페이스를 단일 엔터프라이즈로 통합",
    status: "IN_PROGRESS",
    priority: "MEDIUM",
    assignee: { id: "2", name: "이영희", email: "lee@company.com" },
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    tags: ["Notion", "통합"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "3",
    title: "퇴사자 계정 회수 - Q4",
    description: "4분기 퇴사자 미회수 SaaS 계정 정리",
    status: "IN_REVIEW",
    priority: "URGENT",
    assignee: { id: "1", name: "김철수", email: "kim@company.com" },
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    tags: ["보안", "계정관리"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "4",
    title: "Figma 연간 계약 검토",
    description: "갱신일 전 라이선스 수 및 플랜 재검토",
    status: "DONE",
    priority: "MEDIUM",
    assignee: { id: "3", name: "박지민", email: "park@company.com" },
    tags: ["Figma", "갱신"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "5",
    title: "AWS 비용 분석 리포트",
    description: "월간 AWS 비용 분석 및 최적화 기회 도출",
    status: "TODO",
    priority: "LOW",
    assignee: null,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    tags: ["AWS", "비용분석"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

interface TasksPageClientProps {
  canManage?: boolean;
}

export function TasksPageClient({ canManage = false }: TasksPageClientProps) {
  const t = useTranslations("tasks");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // 통계 계산
  const stats = useMemo(() => {
    const todoCount = demoTasks.filter((t) => t.status === "TODO").length;
    const inProgressCount = demoTasks.filter(
      (t) => t.status === "IN_PROGRESS"
    ).length;
    const doneCount = demoTasks.filter((t) => t.status === "DONE").length;
    const urgentCount = demoTasks.filter((t) => t.priority === "URGENT").length;
    return { todoCount, inProgressCount, doneCount, urgentCount };
  }, []);

  // 필터링
  const filteredTasks = useMemo(() => {
    let result = demoTasks;

    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }

    if (priorityFilter !== "all") {
      result = result.filter((t) => t.priority === priorityFilter);
    }

    return result;
  }, [statusFilter, priorityFilter]);

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("page.title")}
        description={t("page.description")}
        actions={[
          {
            label: t("actions.add"),
            icon: Plus,
            href: "/tasks/new",
            disabled: !canManage,
          },
        ]}
      />

      {/* KPI 카드 */}
      <KpiCardsGrid columns={4}>
        <KpiCard
          title={t("kpi.total")}
          value={demoTasks.length}
          icon={ListTodo}
          href="/tasks"
        />
        <KpiCard
          title={t("kpi.todo")}
          value={stats.todoCount}
          icon={Circle}
          change={
            demoTasks.length > 0
              ? {
                  value: Math.round((stats.todoCount / demoTasks.length) * 100),
                  type: "neutral",
                }
              : undefined
          }
        />
        <KpiCard
          title={t("kpi.inProgress")}
          value={stats.inProgressCount}
          icon={Clock}
        />
        <KpiCard
          title={t("kpi.urgent")}
          value={stats.urgentCount}
          icon={AlertTriangle}
        />
      </KpiCardsGrid>

      {/* 필터 바 */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("filter.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filter.allStatuses")}</SelectItem>
            <SelectItem value="TODO">{t("status.todo")}</SelectItem>
            <SelectItem value="IN_PROGRESS">
              {t("status.inProgress")}
            </SelectItem>
            <SelectItem value="IN_REVIEW">{t("status.inReview")}</SelectItem>
            <SelectItem value="DONE">{t("status.done")}</SelectItem>
            <SelectItem value="CANCELLED">{t("status.cancelled")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("filter.priority")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filter.allPriorities")}</SelectItem>
            <SelectItem value="URGENT">{t("priority.urgent")}</SelectItem>
            <SelectItem value="HIGH">{t("priority.high")}</SelectItem>
            <SelectItem value="MEDIUM">{t("priority.medium")}</SelectItem>
            <SelectItem value="LOW">{t("priority.low")}</SelectItem>
          </SelectContent>
        </Select>

        {(statusFilter !== "all" || priorityFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter("all");
              setPriorityFilter("all");
            }}
          >
            {t("filter.reset")}
          </Button>
        )}

        <div className="ml-auto">
          <Badge variant="outline">
            {t("filter.count", { count: filteredTasks.length })}
          </Badge>
        </div>
      </div>

      {/* 작업 테이블 */}
      <Card>
        <CardContent className="p-0">
          <TaskTable
            tasks={filteredTasks}
            canManage={canManage}
            onEdit={(task) => console.log("Edit:", task)}
            onDelete={(id) => console.log("Delete:", id)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
