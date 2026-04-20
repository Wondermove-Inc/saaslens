// src/components/super-admin/invite-admin-form.tsx
"use client";

import { inviteTenantAdmin } from "@/actions/super-admin/admin-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";

export function InviteAdminForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    const result = await inviteTenantAdmin(email.trim());
    setLoading(false);

    if (result.success) {
      toast.success(result.message ?? "초대장이 발송되었습니다.");
      setEmail("");
    } else {
      toast.error(result.message ?? "오류가 발생했습니다.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="invite-email">초대할 이메일</Label>
        <div className="flex gap-2">
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !email.trim()}>
            {loading ? "발송 중..." : "초대 발송"}
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          ADMIN 역할로 초대됩니다. 초대 링크는 7일간 유효합니다.
        </p>
      </div>
    </form>
  );
}
