"use client";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { Calendar } from "@/components/ui/calendar";

export function CalendarDemo() {
  const [date, setDate] = React.useState<Date | undefined>(new Date());

  return (
    <Calendar
      mode="single"
      selected={date}
      onSelect={setDate}
      className="rounded-md border"
    />
  );
}

/**
 * A date field component that allows users to enter and edit date.
 */
const meta = {
  title: "ui/Calendar",
  component: Calendar,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  excludeStories: /.*Demo$/,
  render: () => <CalendarDemo />,
} satisfies Meta<typeof Calendar>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default form of the calendar.
 */
export const Default: Story = {};

/**
 * Calendar with form example.
 */
export const Form: Story = {
  render: () => {
    const [date, setDate] = React.useState<Date | undefined>();

    return (
      <form className="space-y-8">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="rounded-md border"
        />
      </form>
    );
  },
};

export const ShouldSelectDate: Story = {
  name: "when user clicks a date, should select it",
  tags: ["!dev", "!autodocs"],
  render: () => <CalendarDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 🎯 목적: Calendar에서 날짜를 클릭하면 선택되고 시각적으로 표시되는지 확인
    // 날짜 버튼 찾기 (현재 월의 15일 찾기)
    const dateButtons = canvas.getAllByRole("button");
    const date15Button = dateButtons.find(
      (button) => button.textContent?.trim() === "15",
    );

    if (date15Button) {
      // 날짜 클릭
      await userEvent.click(date15Button);

      // 선택된 날짜가 aria-selected 속성을 가지는지 확인
      await waitFor(() => {
        expect(date15Button).toHaveAttribute("aria-selected", "true");
      });
    }
  },
};
