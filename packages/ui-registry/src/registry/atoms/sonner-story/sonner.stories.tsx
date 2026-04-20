"use client";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { toast } from "sonner";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

// Default example from official docs
export function SonnerDemo() {
  return (
    <Button
      variant="outline"
      onClick={() =>
        toast("Event has been created", {
          description: "Sunday, December 03, 2023 at 9:00 AM",
          action: {
            label: "Undo",
            onClick: () => console.log("Undo"),
          },
        })
      }
    >
      Show Toast
    </Button>
  );
}

/**
 * An opinionated toast component for React.
 */
const meta = {
  title: "ui/Sonner",
  component: Toaster,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  excludeStories: /.*Demo$/,
  render: () => (
    <div className="flex min-h-[350px] items-center justify-center">
      <SonnerDemo />
      <Toaster />
    </div>
  ),
} satisfies Meta<typeof Toaster>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default form of the sonner toast.
 */
export const Default: Story = {};

export const ShouldShowToast: Story = {
  name: "when button clicked, should display toast",
  tags: ["!dev", "!autodocs"],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement.ownerDocument.body);

    // 🎯 목적: Toast 버튼 클릭 시 Toast가 표시되고 내용이 올바른지 확인
    const button = canvas.getByText("Show Toast");
    await userEvent.click(button);

    // Toast가 표시될 때까지 대기
    await waitFor(
      () => {
        const toastTitle = canvas.getByText("Event has been created");
        expect(toastTitle).toBeVisible();
      },
      { timeout: 3000 },
    );

    // Toast description 확인
    const toastDescription = canvas.getByText(
      "Sunday, December 03, 2023 at 9:00 AM",
    );
    await expect(toastDescription).toBeVisible();

    // Undo 버튼 확인
    const undoButton = canvas.getByRole("button", { name: /undo/i });
    await expect(undoButton).toBeVisible();
  },
};
