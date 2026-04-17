// src/components/reports/team-user-filter.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TeamUserFilter } from "./team-user-filter";

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

describe("TeamUserFilter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("disables user selection when no team is selected", () => {
    render(
      <TeamUserFilter
        teamId={null}
        userId={null}
        teams={teams}
        users={users}
        onTeamChange={vi.fn()}
        onUserChange={vi.fn()}
      />
    );

    const selects = screen.getAllByTestId("select-mock");
    const userSelect = selects[1];

    expect(userSelect).toBeDisabled();
  });

  it("filters users by selected team", () => {
    render(
      <TeamUserFilter
        teamId="team-1"
        userId={null}
        teams={teams}
        users={users}
        onTeamChange={vi.fn()}
        onUserChange={vi.fn()}
      />
    );

    expect(screen.getByText("User A")).toBeInTheDocument();
    expect(screen.queryByText("User B")).not.toBeInTheDocument();
  });

  it("calls callbacks on team and user change", async () => {
    const user = userEvent.setup();
    const onTeamChange = vi.fn();
    const onUserChange = vi.fn();

    const { rerender } = render(
      <TeamUserFilter
        teamId={null}
        userId={null}
        teams={teams}
        users={users}
        onTeamChange={onTeamChange}
        onUserChange={onUserChange}
      />
    );

    const teamSelect = screen.getAllByTestId("select-mock")[0];
    await user.selectOptions(teamSelect, "team-2");
    expect(onTeamChange).toHaveBeenCalledWith("team-2");

    rerender(
      <TeamUserFilter
        teamId="team-1"
        userId={null}
        teams={teams}
        users={users}
        onTeamChange={onTeamChange}
        onUserChange={onUserChange}
      />
    );

    const userSelect = screen.getAllByTestId("select-mock")[1];
    await user.selectOptions(userSelect, "user-1");
    expect(onUserChange).toHaveBeenCalledWith("user-1");
  });
});
