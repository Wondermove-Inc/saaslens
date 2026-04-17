// src/components/reports/audit/audit-log-table.test.tsx
import messages from "@/i18n/messages/ko.json";
import type { AuditLogEntry } from "@/types/audit";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import { AuditLogTable } from "./audit-log-table";

describe("AuditLogTable", () => {
  const renderWithIntl = (ui: React.ReactElement) =>
    render(
      <NextIntlClientProvider locale="ko" messages={messages}>
        {ui}
      </NextIntlClientProvider>
    );

  const baseLog: AuditLogEntry = {
    id: "log-1",
    action: "CREATE_APP",
    entityType: "App",
    entityId: "app-12345678",
    userId: "user-1",
    userName: "홍길동",
    userEmail: "hong@example.com",
    changes: null,
    metadata: { appName: "Slack" },
    ipAddress: "127.0.0.1",
    userAgent: "Mozilla/5.0",
    createdAt: "2025-01-01T00:00:00.000Z",
  };

  it("액션 배지가 필터 라벨과 동일한 텍스트(생성)를 보여줘야 한다", () => {
    renderWithIntl(<AuditLogTable logs={[baseLog]} onViewDetail={() => {}} />);

    expect(screen.getByText("생성")).toBeInTheDocument();
  });

  it("대상 컬럼에서 엔티티 유형 라벨과 사람이 읽기 쉬운 이름을 함께 보여줘야 한다", () => {
    renderWithIntl(<AuditLogTable logs={[baseLog]} onViewDetail={() => {}} />);

    // 대상 유형 라벨(앱)
    expect(screen.getByText("앱")).toBeInTheDocument();
    // metadata.appName 사용
    expect(screen.getByText("Slack")).toBeInTheDocument();
  });
});
