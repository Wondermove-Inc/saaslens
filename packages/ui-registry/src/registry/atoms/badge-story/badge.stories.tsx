import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BadgeCheckIcon } from "lucide-react";
import * as React from "react";
import { expect, userEvent, within } from "storybook/test";

import { Badge } from "@/components/ui/badge";

export function BadgeDemo() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex w-full flex-wrap gap-2">
        <Badge>Badge</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="outline">Outline</Badge>
      </div>
      <div className="flex w-full flex-wrap gap-2">
        <Badge
          variant="secondary"
          className="bg-blue-500 text-white dark:bg-blue-600"
        >
          <BadgeCheckIcon />
          Verified
        </Badge>
        <Badge className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums">
          8
        </Badge>
        <Badge
          className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums"
          variant="destructive"
        >
          99
        </Badge>
        <Badge
          className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums"
          variant="outline"
        >
          20+
        </Badge>
      </div>
    </div>
  );
}

/**
 * Displays a badge or a component that looks like a badge.
 */
const meta = {
  title: "ui/Badge",
  component: Badge,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  args: {
    children: "Badge",
    variant: "default",
  },
  excludeStories: /.*Demo$/,
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default form of the badge.
 */
export const Default: Story = {};

/**
 * Secondary badge variant.
 */
export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: "Secondary",
  },
};

/**
 * Destructive badge variant.
 */
export const Destructive: Story = {
  args: {
    variant: "destructive",
    children: "Destructive",
  },
};

/**
 * Outline badge variant.
 */
export const Outline: Story = {
  args: {
    variant: "outline",
    children: "Outline",
  },
};

/**
 * Badge with icon.
 */
export const WithIcon: Story = {
  render: () => (
    <Badge
      variant="secondary"
      className="bg-blue-500 text-white dark:bg-blue-600"
    >
      <BadgeCheckIcon />
      Verified
    </Badge>
  ),
};

/**
 * Numeric badge examples.
 */
export const Numeric: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums">
        8
      </Badge>
      <Badge
        className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums"
        variant="destructive"
      >
        99
      </Badge>
      <Badge
        className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums"
        variant="outline"
      >
        20+
      </Badge>
    </div>
  ),
};

/**
 * Badge variant 변경을 테스트합니다.
 */
export const ShouldChangeVariant: Story = {
  name: "when user clicks buttons, should change badge variant dynamically",
  tags: ["!dev", "!autodocs"],
  render: () => {
    const [variant, setVariant] = React.useState<
      "default" | "secondary" | "destructive" | "outline"
    >("default");

    return (
      <div className="flex flex-col items-center gap-4">
        <Badge variant={variant} data-testid="badge">
          {variant.charAt(0).toUpperCase() + variant.slice(1)} Badge
        </Badge>
        <div className="flex gap-2">
          <button
            onClick={() => setVariant("default")}
            className="rounded bg-gray-200 px-3 py-1 text-sm dark:bg-gray-700"
          >
            Default
          </button>
          <button
            onClick={() => setVariant("secondary")}
            className="rounded bg-gray-200 px-3 py-1 text-sm dark:bg-gray-700"
          >
            Secondary
          </button>
          <button
            onClick={() => setVariant("destructive")}
            className="rounded bg-gray-200 px-3 py-1 text-sm dark:bg-gray-700"
          >
            Destructive
          </button>
          <button
            onClick={() => setVariant("outline")}
            className="rounded bg-gray-200 px-3 py-1 text-sm dark:bg-gray-700"
          >
            Outline
          </button>
        </div>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 🎯 목적: Badge variant가 버튼 클릭에 따라 동적으로 변경되는지 확인

    // 초기 상태 확인 (default)
    const badge = canvas.getByTestId("badge");
    await expect(badge).toBeInTheDocument();
    await expect(badge).toHaveTextContent("Default Badge");

    // Secondary 버튼 클릭
    const secondaryButton = canvas.getByRole("button", { name: /Secondary/i });
    await userEvent.click(secondaryButton);
    await expect(badge).toHaveTextContent("Secondary Badge");

    // Destructive 버튼 클릭
    const destructiveButton = canvas.getByRole("button", {
      name: /Destructive/i,
    });
    await userEvent.click(destructiveButton);
    await expect(badge).toHaveTextContent("Destructive Badge");

    // Outline 버튼 클릭
    const outlineButton = canvas.getByRole("button", { name: /Outline/i });
    await userEvent.click(outlineButton);
    await expect(badge).toHaveTextContent("Outline Badge");

    // 다시 Default로 돌아가기
    const defaultButton = canvas.getByRole("button", { name: /Default/i });
    await userEvent.click(defaultButton);
    await expect(badge).toHaveTextContent("Default Badge");
  },
};
