// src/components/reports/audit/audit-log-detail-dialog.test.tsx
import messages from "@/i18n/messages/ko.json";
import type { AuditLogEntry } from "@/types/audit";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import { AuditLogDetailDialog } from "./audit-log-detail-dialog";

describe("AuditLogDetailDialog", () => {
  const renderWithIntl = (ui: React.ReactElement) =>
    render(
      <NextIntlClientProvider locale="ko" messages={messages}>
        {ui}
      </NextIntlClientProvider>
    );

  const baseLog: AuditLogEntry = {
    id: "log-1",
    action: "CREATE_SUBSCRIPTION",
    entityType: "Subscription",
    entityId: "sub-12345678",
    userId: "user-1",
    userName: "관리자",
    userEmail: "admin@example.com",
    changes: null,
    metadata: { appName: "Slack", amount: 10000 },
    ipAddress: "127.0.0.1",
    userAgent: "Mozilla/5.0",
    createdAt: "2025-01-01T00:00:00.000Z",
  };

  it("액션 뱃지에 생성 라벨이 표시되어야 한다", () => {
    renderWithIntl(
      <AuditLogDetailDialog log={baseLog} open onOpenChange={() => {}} />
    );

    expect(screen.getByText("생성")).toBeInTheDocument();
  });

  it("대상 이름 섹션에 사람이 읽기 쉬운 이름이 표시되어야 한다", () => {
    renderWithIntl(
      <AuditLogDetailDialog log={baseLog} open onOpenChange={() => {}} />
    );

    // 필드 라벨
    expect(screen.getByText("대상 이름")).toBeInTheDocument();
    // metadata 기반 표시 이름
    expect(screen.getByText(/Slack/)).toBeInTheDocument();
  });
});
