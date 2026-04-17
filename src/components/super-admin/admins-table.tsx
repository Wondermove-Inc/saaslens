// src/components/super-admin/admins-table.tsx
"use client";

import {
  changeAdminRole,
  type AdminUserInfo,
} from "@/actions/super-admin/admin-users";
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
import { useState } from "react";
import { toast } from "sonner";

interface AdminsTableProps {
  admins: AdminUserInfo[];
}

export function AdminsTable({ admins: initialAdmins }: AdminsTableProps) {
  const [admins, setAdmins] = useState(initialAdmins);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleRoleChange = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "ADMIN" ? "MEMBER" : "ADMIN";
    setLoadingId(userId);

    const result = await changeAdminRole(userId, newRole as "ADMIN" | "MEMBER");
    setLoadingId(null);

    if (result.success) {
      setAdmins((prev) =>
        prev.map((a) => (a.id === userId ? { ...a, role: newRole } : a))
      );
      toast.success(result.message ?? "역할이 변경되었습니다.");
    } else {
      toast.error(result.message ?? "오류가 발생했습니다.");
    }
  };

  if (admins.length === 0) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        관리자가 없습니다.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>이름</TableHead>
          <TableHead>이메일</TableHead>
          <TableHead>역할</TableHead>
          <TableHead>가입일</TableHead>
          <TableHead>마지막 로그인</TableHead>
          <TableHead className="w-24">관리</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {admins.map((admin) => (
          <TableRow key={admin.id}>
            <TableCell className="font-medium">{admin.name ?? "-"}</TableCell>
            <TableCell className="text-muted-foreground">
              {admin.email}
            </TableCell>
            <TableCell>
              <Badge variant={admin.role === "ADMIN" ? "default" : "secondary"}>
                {admin.role === "ADMIN" ? "관리자" : "멤버"}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {new Date(admin.createdAt).toLocaleDateString("ko-KR")}
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {admin.lastLoginAt
                ? new Date(admin.lastLoginAt).toLocaleDateString("ko-KR")
                : "-"}
            </TableCell>
            <TableCell>
              <Button
                variant="outline"
                size="sm"
                disabled={loadingId === admin.id}
                onClick={() => handleRoleChange(admin.id, admin.role)}
              >
                {loadingId === admin.id
                  ? "변경 중..."
                  : admin.role === "ADMIN"
                    ? "멤버로"
                    : "관리자로"}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
