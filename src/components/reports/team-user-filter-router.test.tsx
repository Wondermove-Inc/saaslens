// src/components/reports/team-user-filter-router.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TeamUserFilterRouter } from "./team-user-filter-router";

vi.mock("@/components/ui/select", () => {
  const Select = ({
    children,
    value,
    onValueChange,
    disabled,
  }: {
    children?: ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
  }) => (
    <select
      data-testid="select-mock"
      value={value ?? ""}
      onChange={(event) => onValueChange?.(event.target.value)}
      disabled={disabled}
    >
      {children}
    </select>
  );
  const SelectTrigger = ({ children }: { children?: ReactNode }) => (
    <>{children}</>
  );
  const SelectValue = ({ placeholder }: { placeholder?: string }) => (
    <option value="">{placeholder}</option>
  );
  const SelectContent = ({ children }: { children?: ReactNode }) => (
    <>{children}</>
  );
  const SelectItem = ({
    children,
    value,
  }: {
    children?: ReactNode;
    value: string;
  }) => <option value={value}>{children}</option>;
  return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
});

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams("foo=bar"),
}));

const teams = [
  { id: "team-1", name: "Team A" },
  { id: "team-2", name: "Team B" },
];

const users = [
  {
    id: "user-1",
    name: "User A",
    email: "user-a@example.com",
    teamId: "team-1",
    teamName: "Team A",
  },
  {
    id: "user-2",
    name: "User B",
    email: "user-b@example.com",
    teamId: "team-2",
    teamName: "Team B",
  },
];

describe("TeamUserFilterRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("pushes a team-only query when team changes", async () => {
    const user = userEvent.setup();
    render(
      <TeamUserFilterRouter
        basePath="/reports/cost"
        teamId="team-1"
        userId="user-1"
        teams={teams}
        users={users}
        includeAllOption
      />
    );

    const teamSelect = screen.getAllByTestId("select-mock")[0];
    await user.selectOptions(teamSelect, "team-2");

    const pushedUrl = mockPush.mock.calls[0][0] as string;
    expect(pushedUrl).toContain("/reports/cost");
    expect(pushedUrl).toContain("teamId=team-2");
    expect(pushedUrl).not.toContain("userId=");
  });

  it("keeps team query when user changes", async () => {
    const user = userEvent.setup();
    render(
      <TeamUserFilterRouter
        basePath="/reports/cost"
        teamId="team-1"
        userId={null}
        teams={teams}
        users={users}
        includeAllOption
      />
    );

    const userSelect = screen.getAllByTestId("select-mock")[1];
    await user.selectOptions(userSelect, "user-1");

    const pushedUrl = mockPush.mock.calls[0][0] as string;
    expect(pushedUrl).toContain("teamId=team-1");
    expect(pushedUrl).toContain("userId=user-1");
  });
});
