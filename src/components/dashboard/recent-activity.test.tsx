// src/components/dashboard/recent-activity.test.tsx
import messages from "@/i18n/messages/ko.json";
import type { RecentActivityItem } from "@/types/dashboard";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RecentActivity } from "./recent-activity";

describe("RecentActivity", () => {
  const renderWithIntl = (ui: React.ReactElement) =>
    render(
      <NextIntlClientProvider locale="ko" messages={messages}>
        {ui}
      </NextIntlClientProvider>
    );

  const now = new Date("2025-11-30T12:00:00Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockActivities: RecentActivityItem[] = [
    {
      id: "log-1",
      action: "CREATE_APP",
      entityType: "App",
      entityId: "app-1",
      userName: "홍길동",
      userEmail: "hong@test.com",
      createdAt: new Date("2025-11-30T11:30:00Z"),
      description: "앱을 추가했습니다",
    },
    {
      id: "log-2",
      action: "USER_TERMINATED",
      entityType: "User",
      entityId: "user-2",
      userName: undefined,
      userEmail: "system@test.com",
      createdAt: new Date("2025-11-30T10:00:00Z"),
      description: "사용자를 퇴사 처리했습니다",
    },
    {
      id: "log-3",
      action: "CREATE_SUBSCRIPTION",
      entityType: "Subscription",
      entityId: "sub-1",
      userName: "김철수",
      userEmail: undefined,
      createdAt: new Date("2025-11-30T09:00:00Z"),
      description: "구독을 등록했습니다",
    },
  ];

  describe("렌더링", () => {
    it("카드 제목이 표시되어야 한다", () => {
      renderWithIntl(<RecentActivity activities={mockActivities} />);

      expect(screen.getByText("최근 활동")).toBeInTheDocument();
    });

    it("활동 목록이 표시되어야 한다", () => {
      renderWithIntl(<RecentActivity activities={mockActivities} />);

      expect(screen.getByText("홍길동")).toBeInTheDocument();
      expect(screen.getByText("앱을 추가했습니다")).toBeInTheDocument();
    });

    it("사용자 이름이 없으면 이메일이 표시되어야 한다", () => {
      renderWithIntl(<RecentActivity activities={mockActivities} />);

      expect(screen.getByText("system@test.com")).toBeInTheDocument();
    });

    it("사용자 이름과 이메일이 없으면 시스템이 표시되어야 한다", () => {
      const activitiesWithNoUser: RecentActivityItem[] = [
        {
          id: "log-4",
          action: "SYSTEM_UPDATE",
          entityType: "System",
          createdAt: new Date("2025-11-30T08:00:00Z"),
          description: "시스템 업데이트",
        },
      ];

      renderWithIntl(<RecentActivity activities={activitiesWithNoUser} />);

      expect(screen.getByText("시스템")).toBeInTheDocument();
    });
  });

  describe("빈 데이터 처리", () => {
    it("활동 내역이 없을 때 안내 메시지가 표시되어야 한다", () => {
      renderWithIntl(<RecentActivity activities={[]} />);

      expect(
        screen.getByText("아직 활동 내역이 없습니다.")
      ).toBeInTheDocument();
    });
  });

  describe("활동 설명", () => {
    it("각 활동의 설명이 표시되어야 한다", () => {
      renderWithIntl(<RecentActivity activities={mockActivities} />);

      expect(screen.getByText("앱을 추가했습니다")).toBeInTheDocument();
      expect(
        screen.getByText("사용자를 퇴사 처리했습니다")
      ).toBeInTheDocument();
      expect(screen.getByText("구독을 등록했습니다")).toBeInTheDocument();
    });
  });
});
