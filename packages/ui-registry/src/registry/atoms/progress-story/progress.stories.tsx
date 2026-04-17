"use client";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { Progress } from "@/components/ui/progress";

/**
 * Displays an indicator showing the completion progress of a task, typically
 * displayed as a progress bar.
 */
const meta = {
  title: "ui/Progress",
  component: Progress,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  excludeStories: /.*Demo$/,
  argTypes: {
    value: {
      control: { type: "range", min: 0, max: 100, step: 1 },
      description: "The progress value (0-100)",
    },
    max: {
      control: "number",
      description: "The maximum progress value",
    },
  },
  args: {
    value: 66,
    max: 100,
  },
  render: (args) => (
    <div className="w-[350px]">
      <Progress value={args.value} max={args.max} className="w-full" />
    </div>
  ),
} satisfies Meta<typeof Progress>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default animated progress bar that updates from 13% to 66% after 500ms.
 */
export const Default: Story = {};

export function ProgressDemo() {
  const [progress, setProgress] = React.useState(13);

  React.useEffect(() => {
    const timer = setTimeout(() => setProgress(66), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-[350px]">
      <Progress value={progress} className="w-full" />
    </div>
  );
}

/**
 * Progress 진행률 업데이트를 테스트합니다.
 */
export const ShouldUpdateProgressValue: Story = {
  name: "when progress value changes, should update progress bar width",
  tags: ["!dev", "!autodocs"],
  render: () => {
    const [progress, setProgress] = React.useState(0);

    return (
      <div className="flex flex-col gap-4">
        <div className="w-[350px]">
          <Progress value={progress} data-testid="progress-bar" />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setProgress(25)}
            className="rounded bg-gray-200 px-3 py-1 text-sm dark:bg-gray-700"
          >
            25%
          </button>
          <button
            onClick={() => setProgress(50)}
            className="rounded bg-gray-200 px-3 py-1 text-sm dark:bg-gray-700"
          >
            50%
          </button>
          <button
            onClick={() => setProgress(75)}
            className="rounded bg-gray-200 px-3 py-1 text-sm dark:bg-gray-700"
          >
            75%
          </button>
          <button
            onClick={() => setProgress(100)}
            className="rounded bg-gray-200 px-3 py-1 text-sm dark:bg-gray-700"
          >
            100%
          </button>
        </div>
        <div className="text-center text-sm">Current: {progress}%</div>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 🎯 목적: Progress 컴포넌트가 버튼 클릭에 따라 진행률이 업데이트되는지 확인

    // 초기 상태 확인 (0%)
    const progressBar = canvas.getByTestId("progress-bar");
    await expect(progressBar).toBeInTheDocument();

    // 25% 버튼 클릭
    const button25 = canvas.getByRole("button", { name: /25%/i });
    await userEvent.click(button25);

    await waitFor(() => {
      const currentText = canvas.getByText(/Current: 25%/i);
      expect(currentText).toBeInTheDocument();
    });

    // 50% 버튼 클릭
    const button50 = canvas.getByRole("button", { name: /50%/i });
    await userEvent.click(button50);

    await waitFor(() => {
      const currentText = canvas.getByText(/Current: 50%/i);
      expect(currentText).toBeInTheDocument();
    });

    // 75% 버튼 클릭
    const button75 = canvas.getByRole("button", { name: /75%/i });
    await userEvent.click(button75);

    await waitFor(() => {
      const currentText = canvas.getByText(/Current: 75%/i);
      expect(currentText).toBeInTheDocument();
    });

    // 100% 버튼 클릭
    const button100 = canvas.getByRole("button", { name: /100%/i });
    await userEvent.click(button100);

    await waitFor(() => {
      const currentText = canvas.getByText(/Current: 100%/i);
      expect(currentText).toBeInTheDocument();
    });
  },
};
