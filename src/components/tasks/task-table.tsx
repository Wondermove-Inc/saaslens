"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Task, TaskPriority, TaskStatus } from "@/types/task";
import { taskPriorityColors, taskStatusColors } from "@/types/task";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  ArrowUpDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Edit,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

interface TaskTableProps {
  tasks: Task[];
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  canManage?: boolean;
}

export function TaskTable({
  tasks,
  onEdit,
  onDelete,
  canManage = false,
}: TaskTableProps) {
  const t = useTranslations("tasks");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // 페이지네이션 계산
  const totalPages = Math.ceil(tasks.length / pageSize);
  const paginatedTasks = useMemo(() => {
    const start = pageIndex * pageSize;
    return tasks.slice(start, start + pageSize);
  }, [tasks, pageIndex, pageSize]);

  const toggleAll = () => {
    if (selectedIds.size === tasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tasks.map((t) => t.id)));
    }
  };

  const toggleOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDueDate = (date: Date | string | null | undefined) => {
    if (!date) return "-";
    const d = new Date(date);
    const now = new Date();
    const isOverdue = d < now;
    const formatted = format(d, "MM/dd", { locale: ko });

    return (
      <span
        className={cn("flex items-center gap-1", isOverdue && "text-red-500")}
      >
        <Calendar className="h-3 w-3" />
        {formatted}
      </span>
    );
  };

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
    return t(statusMap[status]);
  };

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

  if (tasks.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center justify-center py-12">
        <p>{t("table.empty")}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {selectedIds.size > 0 && (
        <div className="text-muted-foreground mb-2 flex items-center gap-2 px-4 text-sm">
          <span>{t("table.selected", { count: selectedIds.size })}</span>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedIds.size === tasks.length}
                onCheckedChange={toggleAll}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead className="min-w-[200px]">
              <Button variant="ghost" size="sm" className="-ml-3 h-8">
                {t("table.columns.title")}{" "}
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead className="w-28">{t("table.columns.status")}</TableHead>
            <TableHead className="w-24">
              {t("table.columns.priority")}
            </TableHead>
            <TableHead className="w-32">
              {t("table.columns.assignee")}
            </TableHead>
            <TableHead className="w-28">{t("table.columns.dueDate")}</TableHead>
            {canManage && <TableHead className="w-12" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedTasks.map((task) => (
            <TableRow key={task.id}>
              <TableCell>
                <Checkbox
                  checked={selectedIds.has(task.id)}
                  onCheckedChange={() => toggleOne(task.id)}
                  aria-label={`Select ${task.title}`}
                />
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <p className="font-medium">{task.title}</p>
                  {task.description && (
                    <p className="text-muted-foreground line-clamp-1 text-sm">
                      {task.description}
                    </p>
                  )}
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex gap-1">
                      {task.tags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {task.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{task.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  className={cn(
                    "font-normal",
                    taskStatusColors[task.status as TaskStatus]
                  )}
                >
                  {getStatusLabel(task.status as TaskStatus)}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  className={cn(
                    "font-normal",
                    taskPriorityColors[task.priority as TaskPriority]
                  )}
                >
                  {getPriorityLabel(task.priority as TaskPriority)}
                </Badge>
              </TableCell>
              <TableCell>
                {task.assignee ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={task.assignee.image || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(task.assignee.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="max-w-[80px] truncate text-sm">
                      {task.assignee.name || task.assignee.email}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>{formatDueDate(task.dueDate)}</TableCell>
              {canManage && (
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">
                          {t("table.actions.menuOpen")}
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit?.(task)}>
                        <Edit className="mr-2 h-4 w-4" />
                        {t("table.actions.edit")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDelete?.(task.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t("table.actions.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* 페이지네이션 */}
      <div className="flex items-center justify-between px-4 py-4">
        <div className="text-muted-foreground text-sm">
          {selectedIds.size > 0 ? (
            <span>
              {t("table.pagination.rowsSelected", {
                selected: selectedIds.size,
                total: tasks.length,
              })}
            </span>
          ) : (
            <span>
              {t("table.pagination.itemsRange", {
                start: pageIndex * pageSize + 1,
                end: Math.min((pageIndex + 1) * pageSize, tasks.length),
                total: tasks.length,
              })}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">
              {t("table.pagination.rowsPerPage")}
            </p>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPageIndex(0);
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={pageSize.toString()} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 50].map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex w-[100px] items-center justify-center text-sm font-medium">
              {t("table.pagination.page", {
                current: pageIndex + 1,
                total: totalPages,
              })}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPageIndex((prev) => Math.max(0, prev - 1))}
              disabled={pageIndex <= 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() =>
                setPageIndex((prev) => Math.min(totalPages - 1, prev + 1))
              }
              disabled={pageIndex >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
