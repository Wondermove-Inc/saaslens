"use client";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const meta: Meta = {
  title: "ui/Calendar/Blocks/Month and Year Selector",
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [dropdown, setDropdown] =
      React.useState<React.ComponentProps<typeof Calendar>["captionLayout"]>(
        "dropdown",
      );
    const [date, setDate] = React.useState<Date | undefined>(
      new Date(2025, 5, 12),
    );

    return (
      <div className="flex flex-col gap-4">
        <Calendar
          mode="single"
          defaultMonth={date}
          selected={date}
          onSelect={setDate}
          captionLayout={dropdown}
          className="rounded-lg border shadow-sm"
        />
        <div className="flex flex-col gap-3">
          <Label htmlFor="dropdown" className="px-1">
            Dropdown
          </Label>
          <Select
            value={dropdown}
            onValueChange={(value) =>
              setDropdown(
                value as React.ComponentProps<typeof Calendar>["captionLayout"],
              )
            }
          >
            <SelectTrigger
              id="dropdown"
              size="sm"
              className="bg-background w-full"
            >
              <SelectValue placeholder="Dropdown" />
            </SelectTrigger>
            <SelectContent align="center">
              <SelectItem value="dropdown">Month and Year</SelectItem>
              <SelectItem value="dropdown-months">Month Only</SelectItem>
              <SelectItem value="dropdown-years">Year Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  },
};

export const ShouldChangeDropdownMode: Story = {
  name: "when changing dropdown mode, should update calendar display",
  tags: ["!dev", "!autodocs"],
  render: () => {
    const [dropdown, setDropdown] =
      React.useState<React.ComponentProps<typeof Calendar>["captionLayout"]>(
        "dropdown",
      );
    const [date, setDate] = React.useState<Date | undefined>(
      new Date(2025, 5, 12),
    );

    return (
      <div className="flex flex-col gap-4">
        <Calendar
          mode="single"
          defaultMonth={date}
          selected={date}
          onSelect={setDate}
          captionLayout={dropdown}
          className="rounded-lg border shadow-sm"
        />
        <div className="flex flex-col gap-3">
          <Label htmlFor="dropdown" className="px-1">
            Dropdown
          </Label>
          <Select
            value={dropdown}
            onValueChange={(value) =>
              setDropdown(
                value as React.ComponentProps<typeof Calendar>["captionLayout"],
              )
            }
          >
            <SelectTrigger
              id="dropdown"
              size="sm"
              className="bg-background w-full"
              data-testid="dropdown-trigger"
            >
              <SelectValue placeholder="Dropdown" />
            </SelectTrigger>
            <SelectContent align="center">
              <SelectItem value="dropdown">Month and Year</SelectItem>
              <SelectItem value="dropdown-months">Month Only</SelectItem>
              <SelectItem value="dropdown-years">Year Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 🎯 목적: Dropdown 모드 변경 시 Calendar가 올바르게 업데이트되는지 확인
    const dropdownTrigger = canvas.getByTestId("dropdown-trigger");
    await expect(dropdownTrigger).toBeInTheDocument();

    // Dropdown 열기
    await userEvent.click(dropdownTrigger);

    await waitFor(
      () => {
        // "Month Only" 옵션 선택
        const monthOnlyOption = canvas.getByRole("option", {
          name: /month only/i,
        });
        expect(monthOnlyOption).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    // "Month Only" 선택
    const monthOnlyOption = canvas.getByRole("option", { name: /month only/i });
    await userEvent.click(monthOnlyOption);

    await waitFor(
      () => {
        // Dropdown이 "Month Only"로 변경되었는지 확인
        expect(dropdownTrigger).toHaveTextContent(/month only/i);
      },
      { timeout: 2000 },
    );
  },
};
