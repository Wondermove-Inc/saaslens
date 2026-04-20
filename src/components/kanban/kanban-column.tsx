"use client";

import { KanbanCard } from "@/components/kanban/kanban-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/types/task";
import { useDroppable } from "@dnd-kit/core";
import { GripVertical, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onAddTask?: () => void;
  onTaskClick?: (task: Task) => void;
}

const columnColors: Record<TaskStatus, string> = {
  TODO: "border-t-slate-400",
  IN_PROGRESS: "border-t-blue-500",
  IN_REVIEW: "border-t-yellow-500",
  DONE: "border-t-green-500",
  CANCELLED: "border-t-red-500",
};

export function KanbanColumn({
  status,
  tasks,
  onAddTask,
  onTaskClick,
}: KanbanColumnProps) {
  const t = useTranslations("kanban");
  const tTasks = useTranslations("tasks");
  const { isOver, setNodeRef } = useDroppable({
    id: status,
  });

  const getStatusLabel = (status: TaskStatus): string => {
    const statusMap: Record<
      TaskStatus,
      | "status.todo"
      | "status.inProgress"
      | "status.inReview"
      | "status.done"
      | "status.cancelled"
    > = {
      TODO: "status.todo",
      IN_PROGRESS: "status.inProgress",
      IN_REVIEW: "status.inReview",
      DONE: "status.done",
      CANCELLED: "status.cancelled",
    };
    return tTasks(statusMap[status]);
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "bg-muted/30 flex w-80 shrink-0 flex-col rounded-lg border-t-4 transition-colors",
        columnColors[status],
        isOver && "bg-muted/60 ring-primary/20 ring-2"
      )}
    >
      {/* 컬럼 헤더 */}
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-2">
          <span className="font-medium">{getStatusLabel(status)}</span>
          <span className="bg-muted flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium">
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <GripVertical className="text-muted-foreground h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onAddTask}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 카드 목록 */}
      <div className="min-h-[200px] flex-1 space-y-3 overflow-y-auto p-3">
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick?.(task)}
          />
        ))}

        {tasks.length === 0 && (
          <div className="text-muted-foreground flex flex-col items-center justify-center py-8">
            <p className="text-sm">{t("column.empty")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
