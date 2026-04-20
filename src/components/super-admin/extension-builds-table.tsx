// src/components/super-admin/extension-builds-table.tsx
"use client";

import {
  listExtensionBuilds,
  triggerExtensionBuild,
  type ExtensionBuildSummary,
} from "@/actions/super-admin/extension-builds";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const STATUS_MAP: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  COMPLETED: { label: "완료", variant: "default" },
  BUILDING: { label: "빌드 중", variant: "secondary" },
  PENDING: { label: "대기", variant: "outline" },
  FAILED: { label: "실패", variant: "destructive" },
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

interface ExtensionBuildsTableProps {
  initialBuilds: ExtensionBuildSummary[];
}

export function ExtensionBuildsTable({
  initialBuilds,
}: ExtensionBuildsTableProps) {
  const [builds, setBuilds] = useState(initialBuilds);
  const [triggering, setTriggering] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleTriggerBuild = async () => {
    setTriggering(true);
    const result = await triggerExtensionBuild();
    setTriggering(false);

    if (result.success) {
      toast.success(result.message ?? "빌드가 시작되었습니다.");
      // 목록 새로고침
      handleRefresh();
    } else {
      toast.error(result.message ?? "빌드 시작에 실패했습니다.");
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    const result = await listExtensionBuilds();
    setRefreshing(false);

    if (result.success && result.data) {
      setBuilds(result.data);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">최근 20개 빌드 표시</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`mr-1 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            새로고침
          </Button>
          <Button size="sm" onClick={handleTriggerBuild} disabled={triggering}>
            {triggering ? "빌드 시작 중..." : "새 빌드 생성"}
          </Button>
        </div>
      </div>

      {builds.length === 0 ? (
        <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
          빌드 기록이 없습니다.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>버전</TableHead>
              <TableHead>플랫폼</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>파일 크기</TableHead>
              <TableHead>생성일</TableHead>
              <TableHead>완료일</TableHead>
              <TableHead className="w-24">다운로드</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {builds.map((build) => {
              const status = STATUS_MAP[build.status] ?? {
                label: build.status,
                variant: "outline" as const,
              };
              return (
                <TableRow key={build.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">
                        v{build.version}
                      </span>
                      {build.isLatest && (
                        <Badge variant="default" className="text-xs">
                          최신
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {build.platform}
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatFileSize(build.fileSize)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(build.createdAt).toLocaleDateString("ko-KR")}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {build.completedAt
                      ? new Date(build.completedAt).toLocaleDateString("ko-KR")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {build.downloadUrl && build.status === "COMPLETED" ? (
                      <Button variant="ghost" size="sm" asChild>
                        <a
                          href={build.downloadUrl}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
