// src/components/subscriptions/suggestion-user-assignment.test.tsx
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AvailableUser } from "./suggestion-user-assignment";
import { SuggestionUserAssignment } from "./suggestion-user-assignment";

// next-intl mock
vi.mock("next-intl", () => ({
  useTranslations:
    () => (key: string, values?: Record<string, string | number>) => {
      const msgs: Record<string, string> = {
        selectTeam: "팀 전체 선택",
        unassigned: "미배정",
        selectUsers: "사용자를 선택하세요",
        selectedCount: `{count}명 선택됨`,
        searchUsers: "사용자 검색...",
        noUsersFound: "사용자를 찾을 수 없습니다",
      };
      let result = msgs[key] ?? key;
      if (values) {
        Object.entries(values).forEach(([k, v]) => {
          result = result.replace(`{${k}}`, String(v));
        });
      }
      return result;
    },
  useLocale: () => "ko",
}));

// Mock shadcn/ui Popover (always open for test convenience)
vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverContent: ({ children }: { children: ReactNode }) => (
    <div data-testid="popover-content">{children}</div>
  ),
}));

vi.mock("@/components/ui/command", () => ({
  Command: ({ children }: { children: ReactNode }) => (
    <div data-testid="command">{children}</div>
  ),
  CommandInput: ({ placeholder }: { placeholder?: string }) => (
    <input placeholder={placeholder} data-testid="command-input" />
  ),
  CommandList: ({
    children,
    className,
    "data-testid": dataTestId,
  }: {
    children: ReactNode;
    className?: string;
    "data-testid"?: string;
  }) => (
    <div data-testid={dataTestId ?? "command-list"} className={className}>
      {children}
    </div>
  ),
  CommandEmpty: ({ children }: { children: ReactNode }) => (
    <div data-testid="command-empty">{children}</div>
  ),
  CommandGroup: ({
    children,
    heading,
  }: {
    children: ReactNode;
    heading?: string;
  }) => (
    <div data-testid="command-group">
      {heading && <div data-testid="command-group-heading">{heading}</div>}
      {children}
    </div>
  ),
  CommandItem: ({
    children,
    onSelect,
    value,
  }: {
    children: ReactNode;
    onSelect?: () => void;
    value?: string;
  }) => (
    <div
      data-testid="command-item"
      data-value={value}
      onClick={onSelect}
      role="option"
    >
      {children}
    </div>
  ),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ScrollArea: ({ children, className, ...props }: Record<string, any>) => (
    <div data-testid="scroll-area" className={className} {...props}>
      {children}
    </div>
  ),
  ScrollBar: () => null,
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    className,
  }: {
    checked?: boolean | "indeterminate";
    onCheckedChange?: (v: boolean) => void;
    className?: string;
  }) => (
    <input
      type="checkbox"
      checked={checked === true}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      className={className}
      data-testid="checkbox"
      data-state={
        checked === "indeterminate"
          ? "indeterminate"
          : checked
            ? "checked"
            : "unchecked"
      }
    />
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    className,
    variant,
  }: {
    children: ReactNode;
    className?: string;
    variant?: string;
  }) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}));

// Test data
const usersTeamA: AvailableUser[] = [
  {
    id: "u1",
    name: "Alice",
    email: "alice@example.com",
    teamId: "team-a",
    teamName: "Team A",
  },
  {
    id: "u2",
    name: "Bob",
    email: "bob@example.com",
    teamId: "team-a",
    teamName: "Team A",
  },
];

const usersTeamB: AvailableUser[] = [
  {
    id: "u3",
    name: "Charlie",
    email: "charlie@example.com",
    teamId: "team-b",
    teamName: "Team B",
  },
];

const usersUnassigned: AvailableUser[] = [
  {
    id: "u4",
    name: "Dave",
    email: "dave@example.com",
    teamId: null,
    teamName: null,
  },
];

const allUsers: AvailableUser[] = [
  ...usersTeamA,
  ...usersTeamB,
  ...usersUnassigned,
];

const singleTeamUsers: AvailableUser[] = [
  {
    id: "u1",
    name: "Alice",
    email: "alice@example.com",
    teamId: "team-a",
    teamName: "Team A",
  },
  {
    id: "u2",
    name: "Bob",
    email: "bob@example.com",
    teamId: "team-a",
    teamName: "Team A",
  },
];

describe("SuggestionUserAssignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("팀별 CommandGroup 헤더 렌더링", () => {
    it("각 팀 CommandGroup 헤더에 팀명과 멤버수가 표시되어야 한다", () => {
      render(
        <SuggestionUserAssignment
          availableUsers={allUsers}
          selectedUserIds={[]}
          onSelectedUserIdsChange={vi.fn()}
        />
      );

      const headings = screen.getAllByTestId("command-group-heading");
      const headingTexts = headings.map((h) => h.textContent);

      expect(
        headingTexts.some((t) => t?.includes("Team A") && t?.includes("2"))
      ).toBe(true);
      expect(
        headingTexts.some((t) => t?.includes("Team B") && t?.includes("1"))
      ).toBe(true);
    });

    it("미배정 그룹 헤더에 미배정과 멤버수가 표시되어야 한다", () => {
      render(
        <SuggestionUserAssignment
          availableUsers={allUsers}
          selectedUserIds={[]}
          onSelectedUserIdsChange={vi.fn()}
        />
      );

      const headings = screen.getAllByTestId("command-group-heading");
      const headingTexts = headings.map((h) => h.textContent);

      expect(
        headingTexts.some((t) => t?.includes("미배정") && t?.includes("1"))
      ).toBe(true);
    });
  });

  describe("팀 선택 Popover 표시 여부", () => {
    it("팀이 2개 이상일 때 팀 선택 버튼이 표시되어야 한다", () => {
      render(
        <SuggestionUserAssignment
          availableUsers={allUsers}
          selectedUserIds={[]}
          onSelectedUserIdsChange={vi.fn()}
        />
      );

      expect(screen.getByTestId("team-select")).toBeInTheDocument();
    });

    it("팀이 1개 이하일 때 팀 선택 버튼이 미표시되어야 한다", () => {
      render(
        <SuggestionUserAssignment
          availableUsers={singleTeamUsers}
          selectedUserIds={[]}
          onSelectedUserIdsChange={vi.fn()}
        />
      );

      expect(screen.queryByTestId("team-select")).not.toBeInTheDocument();
    });

    it("팀이 없는 사용자만 있을 때 팀 선택 버튼이 미표시되어야 한다", () => {
      render(
        <SuggestionUserAssignment
          availableUsers={usersUnassigned}
          selectedUserIds={[]}
          onSelectedUserIdsChange={vi.fn()}
        />
      );

      expect(screen.queryByTestId("team-select")).not.toBeInTheDocument();
    });
  });

  describe("팀 선택 시 팀 멤버 전체 추가", () => {
    it("팀을 선택하면 해당 팀의 모든 멤버가 selectedUserIds에 추가되어야 한다", () => {
      const onSelectedUserIdsChange = vi.fn();
      render(
        <SuggestionUserAssignment
          availableUsers={allUsers}
          selectedUserIds={[]}
          onSelectedUserIdsChange={onSelectedUserIdsChange}
        />
      );

      const teamCommandList = screen.getByTestId("team-command-list");
      const teamItems = within(teamCommandList).getAllByTestId("command-item");
      const teamAItem = teamItems.find(
        (item) => item.getAttribute("data-value") === "team-a"
      );
      expect(teamAItem).toBeTruthy();
      fireEvent.click(teamAItem!);

      expect(onSelectedUserIdsChange).toHaveBeenCalledWith(
        expect.arrayContaining(["u1", "u2"])
      );
    });

    it("이미 선택된 사용자가 있을 때 팀 선택이 additive로 동작해야 한다", () => {
      const onSelectedUserIdsChange = vi.fn();
      render(
        <SuggestionUserAssignment
          availableUsers={allUsers}
          selectedUserIds={["u3"]}
          onSelectedUserIdsChange={onSelectedUserIdsChange}
        />
      );

      const teamCommandList = screen.getByTestId("team-command-list");
      const teamItems = within(teamCommandList).getAllByTestId("command-item");
      const teamAItem = teamItems.find(
        (item) => item.getAttribute("data-value") === "team-a"
      );
      expect(teamAItem).toBeTruthy();
      fireEvent.click(teamAItem!);

      const called = onSelectedUserIdsChange.mock.calls[0][0] as string[];
      expect(called).toContain("u3");
      expect(called).toContain("u1");
      expect(called).toContain("u2");
    });

    it("팀 전체 선택 상태에서 다시 선택하면 팀 멤버 전원이 제거되어야 한다", () => {
      const onSelectedUserIdsChange = vi.fn();
      render(
        <SuggestionUserAssignment
          availableUsers={allUsers}
          selectedUserIds={["u1", "u2", "u3"]}
          onSelectedUserIdsChange={onSelectedUserIdsChange}
        />
      );

      const teamCommandList = screen.getByTestId("team-command-list");
      const teamItems = within(teamCommandList).getAllByTestId("command-item");
      const teamAItem = teamItems.find(
        (item) => item.getAttribute("data-value") === "team-a"
      );
      expect(teamAItem).toBeTruthy();
      fireEvent.click(teamAItem!);

      const called = onSelectedUserIdsChange.mock.calls[0][0] as string[];
      expect(called).not.toContain("u1");
      expect(called).not.toContain("u2");
      expect(called).toContain("u3");
    });
  });

  describe("미배정 그룹 별도 표시", () => {
    it("teamId가 null인 사용자가 미배정 그룹에 표시되어야 한다", () => {
      render(
        <SuggestionUserAssignment
          availableUsers={allUsers}
          selectedUserIds={[]}
          onSelectedUserIdsChange={vi.fn()}
        />
      );

      const headings = screen.getAllByTestId("command-group-heading");
      const unassignedHeading = headings.find((h) =>
        h.textContent?.includes("미배정")
      );
      expect(unassignedHeading).toBeInTheDocument();

      // Dave는 미배정 그룹의 CommandItem에 있어야 함
      expect(screen.getByText("Dave")).toBeInTheDocument();
    });
  });

  describe("개별 사용자 토글", () => {
    it("사용자 CommandItem 클릭 시 onSelectedUserIdsChange가 추가 상태로 호출되어야 한다", () => {
      const onSelectedUserIdsChange = vi.fn();
      render(
        <SuggestionUserAssignment
          availableUsers={singleTeamUsers}
          selectedUserIds={[]}
          onSelectedUserIdsChange={onSelectedUserIdsChange}
        />
      );

      // Alice의 CommandItem 클릭
      const items = screen.getAllByTestId("command-item");
      const aliceItem = items.find((item) =>
        item.textContent?.includes("Alice")
      );
      expect(aliceItem).toBeTruthy();
      fireEvent.click(aliceItem!);

      expect(onSelectedUserIdsChange).toHaveBeenCalledWith(["u1"]);
    });

    it("이미 선택된 사용자 CommandItem 클릭 시 선택이 해제되어야 한다", () => {
      const onSelectedUserIdsChange = vi.fn();
      render(
        <SuggestionUserAssignment
          availableUsers={singleTeamUsers}
          selectedUserIds={["u1"]}
          onSelectedUserIdsChange={onSelectedUserIdsChange}
        />
      );

      const items = screen.getAllByTestId("command-item");
      const aliceItem = items.find((item) =>
        item.textContent?.includes("Alice")
      );
      expect(aliceItem).toBeTruthy();
      fireEvent.click(aliceItem!);

      expect(onSelectedUserIdsChange).toHaveBeenCalledWith([]);
    });
  });

  describe("Badge에서 X로 사용자 제거", () => {
    it("Badge의 X 버튼 클릭 시 해당 사용자가 selectedUserIds에서 제거되어야 한다", () => {
      const onSelectedUserIdsChange = vi.fn();
      render(
        <SuggestionUserAssignment
          availableUsers={singleTeamUsers}
          selectedUserIds={["u1", "u2"]}
          onSelectedUserIdsChange={onSelectedUserIdsChange}
        />
      );

      // Badge 목록에서 Alice badge 찾기
      const badges = screen.getAllByTestId("badge");
      const aliceBadge = badges.find((b) => b.textContent?.includes("Alice"));
      expect(aliceBadge).toBeTruthy();

      // X 버튼 클릭
      const removeButton = within(aliceBadge!).getByRole("button");
      fireEvent.click(removeButton);

      expect(onSelectedUserIdsChange).toHaveBeenCalledWith(["u2"]);
    });
  });

  describe("팀 일괄 선택 시 maxUsers 제한", () => {
    it("팀 전체 선택 시 잔여 seat만큼만 추가되어야 한다", () => {
      const onSelectedUserIdsChange = vi.fn();
      const onSeatLimitReached = vi.fn();
      render(
        <SuggestionUserAssignment
          availableUsers={allUsers}
          selectedUserIds={["u3"]}
          onSelectedUserIdsChange={onSelectedUserIdsChange}
          maxUsers={2}
          onSeatLimitReached={onSeatLimitReached}
        />
      );

      // Team A (u1, u2) 선택 시도 → 잔여 seat = 2 - 1 = 1이므로 1명만 추가
      const teamCommandList = screen.getByTestId("team-command-list");
      const teamItems = within(teamCommandList).getAllByTestId("command-item");
      const teamAItem = teamItems.find(
        (item) => item.getAttribute("data-value") === "team-a"
      );
      fireEvent.click(teamAItem!);

      const called = onSelectedUserIdsChange.mock.calls[0][0] as string[];
      expect(called).toHaveLength(2); // 기존 1 + 신규 1
      expect(called).toContain("u3"); // 기존 유지
    });

    it("잔여 seat가 0일 때 팀 선택 시 onSeatLimitReached가 호출되어야 한다", () => {
      const onSelectedUserIdsChange = vi.fn();
      const onSeatLimitReached = vi.fn();
      render(
        <SuggestionUserAssignment
          availableUsers={allUsers}
          selectedUserIds={["u3"]}
          onSelectedUserIdsChange={onSelectedUserIdsChange}
          maxUsers={1}
          onSeatLimitReached={onSeatLimitReached}
        />
      );

      const teamCommandList = screen.getByTestId("team-command-list");
      const teamItems = within(teamCommandList).getAllByTestId("command-item");
      const teamAItem = teamItems.find(
        (item) => item.getAttribute("data-value") === "team-a"
      );
      fireEvent.click(teamAItem!);

      expect(onSeatLimitReached).toHaveBeenCalled();
      expect(onSelectedUserIdsChange).not.toHaveBeenCalled();
    });

    it("maxUsers가 undefined일 때 팀 전체가 제한 없이 추가되어야 한다", () => {
      const onSelectedUserIdsChange = vi.fn();
      render(
        <SuggestionUserAssignment
          availableUsers={allUsers}
          selectedUserIds={[]}
          onSelectedUserIdsChange={onSelectedUserIdsChange}
        />
      );

      const teamCommandList = screen.getByTestId("team-command-list");
      const teamItems = within(teamCommandList).getAllByTestId("command-item");
      const teamAItem = teamItems.find(
        (item) => item.getAttribute("data-value") === "team-a"
      );
      fireEvent.click(teamAItem!);

      const called = onSelectedUserIdsChange.mock.calls[0][0] as string[];
      expect(called).toContain("u1");
      expect(called).toContain("u2");
    });
  });

  describe("팀 체크박스 indeterminate 상태", () => {
    it("팀 일부만 선택 시 체크박스가 indeterminate 상태여야 한다", () => {
      render(
        <SuggestionUserAssignment
          availableUsers={allUsers}
          selectedUserIds={["u1"]}
          onSelectedUserIdsChange={vi.fn()}
        />
      );

      const teamCommandList = screen.getByTestId("team-command-list");
      const teamAItem = within(teamCommandList)
        .getAllByTestId("command-item")
        .find((item) => item.getAttribute("data-value") === "team-a");
      const checkbox = within(teamAItem!).getByTestId("checkbox");

      expect(checkbox).toHaveAttribute("data-state", "indeterminate");
    });

    it("팀 전체 선택 시 체크박스가 checked 상태여야 한다", () => {
      render(
        <SuggestionUserAssignment
          availableUsers={allUsers}
          selectedUserIds={["u1", "u2"]}
          onSelectedUserIdsChange={vi.fn()}
        />
      );

      const teamCommandList = screen.getByTestId("team-command-list");
      const teamAItem = within(teamCommandList)
        .getAllByTestId("command-item")
        .find((item) => item.getAttribute("data-value") === "team-a");
      const checkbox = within(teamAItem!).getByTestId("checkbox");

      expect(checkbox).toHaveAttribute("data-state", "checked");
    });

    it("팀 미선택 시 체크박스가 unchecked 상태여야 한다", () => {
      render(
        <SuggestionUserAssignment
          availableUsers={allUsers}
          selectedUserIds={[]}
          onSelectedUserIdsChange={vi.fn()}
        />
      );

      const teamCommandList = screen.getByTestId("team-command-list");
      const teamAItem = within(teamCommandList)
        .getAllByTestId("command-item")
        .find((item) => item.getAttribute("data-value") === "team-a");
      const checkbox = within(teamAItem!).getByTestId("checkbox");

      expect(checkbox).toHaveAttribute("data-state", "unchecked");
    });
  });

  describe("maxUsers 제한", () => {
    it("maxUsers에 도달했을 때 새 사용자 추가 시 onSeatLimitReached가 호출되어야 한다", () => {
      const onSeatLimitReached = vi.fn();
      const onSelectedUserIdsChange = vi.fn();
      render(
        <SuggestionUserAssignment
          availableUsers={singleTeamUsers}
          selectedUserIds={["u1"]}
          onSelectedUserIdsChange={onSelectedUserIdsChange}
          maxUsers={1}
          onSeatLimitReached={onSeatLimitReached}
        />
      );

      // Bob을 추가하려고 시도
      const items = screen.getAllByTestId("command-item");
      const bobItem = items.find((item) => item.textContent?.includes("Bob"));
      expect(bobItem).toBeTruthy();
      fireEvent.click(bobItem!);

      expect(onSeatLimitReached).toHaveBeenCalled();
      expect(onSelectedUserIdsChange).not.toHaveBeenCalled();
    });

    it("maxUsers에 도달하지 않았을 때 사용자를 정상 추가해야 한다", () => {
      const onSeatLimitReached = vi.fn();
      const onSelectedUserIdsChange = vi.fn();
      render(
        <SuggestionUserAssignment
          availableUsers={singleTeamUsers}
          selectedUserIds={[]}
          onSelectedUserIdsChange={onSelectedUserIdsChange}
          maxUsers={2}
          onSeatLimitReached={onSeatLimitReached}
        />
      );

      const items = screen.getAllByTestId("command-item");
      const aliceItem = items.find((item) =>
        item.textContent?.includes("Alice")
      );
      fireEvent.click(aliceItem!);

      expect(onSeatLimitReached).not.toHaveBeenCalled();
      expect(onSelectedUserIdsChange).toHaveBeenCalledWith(["u1"]);
    });
  });
});
