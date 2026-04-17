"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Task, TaskPriority } from "@/types/task";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MessageSquare, Paperclip } from "lucide-react";
import { useTranslations } from "next-intl";

interface KanbanCardProps {
  task: Task;
  onClick?: () => void;
  isDragging?: boolean;
}

const priorityColors: Record<TaskPriority, string> = {
  LOW: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  URGENT: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export function KanbanCard({
  task,
  onClick,
  isDragging: externalIsDragging,
}: KanbanCardProps) {
  const t = useTranslations("tasks");
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: internalIsDragging,
  } = useDraggable({
    id: task.id,
  });

  const isDragging = externalIsDragging ?? internalIsDragging;

  const getPriorityLabel = (priority: TaskPriority): string => {
    const priorityMap: Record<
      TaskPriority,
      "priority.urgent" | "priority.high" | "priority.medium" | "priority.low"
    > = {
      URGENT: "priority.urgent",
      HIGH: "priority.high",
      MEDIUM: "priority.medium",
      LOW: "priority.low",
    };
    return t(priorityMap[priority]);
  };

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // 데모용 진행률 계산 (랜덤)
  const progress = Math.floor(Math.random() * 100);
  const attachments = Math.floor(Math.random() * 5);
  const comments = Math.floor(Math.random() * 10);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-grab transition-all",
        isDragging
          ? "ring-primary opacity-50 shadow-lg ring-2"
          : "hover:shadow-md"
      )}
      onClick={onClick}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="flex-1 leading-snug font-medium">{task.title}</h4>
          <button
            className="text-muted-foreground hover:text-foreground cursor-grab touch-none"
            {...listeners}
            {...attributes}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </div>
        {task.description && (
          <p className="text-muted-foreground line-clamp-2 text-sm">
            {task.description}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-2">
        {/* 담당자 + 진행률 */}
        <div className="flex items-center justify-between">
          <div className="flex -space-x-2">
            {task.assignee ? (
              <Avatar className="border-background h-7 w-7 border-2">
                <AvatarImage src={task.assignee.image || undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(task.assignee.name)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <Avatar className="border-background h-7 w-7 border-2">
                <AvatarFallback className="text-xs">?</AvatarFallback>
              </Avatar>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Progress value={progress} className="h-1.5 w-12" />
            <span className="text-muted-foreground text-xs">{progress}%</span>
          </div>
        </div>

        {/* 우선순위 + 메타 정보 */}
        <div className="flex items-center justify-between">
          <Badge
            className={cn(
              "text-xs font-normal",
              priorityColors[task.priority as TaskPriority]
            )}
          >
            {getPriorityLabel(task.priority as TaskPriority)}
          </Badge>
          <div className="text-muted-foreground flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs">
              <Paperclip className="h-3 w-3" />
              {attachments}
            </div>
            <div className="flex items-center gap-1 text-xs">
              <MessageSquare className="h-3 w-3" />
              {comments}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
