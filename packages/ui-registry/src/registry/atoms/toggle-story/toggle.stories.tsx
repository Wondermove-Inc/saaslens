import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Bold, Italic, Underline } from "lucide-react";
import { expect, userEvent, within } from "storybook/test";

import { Toggle } from "@/components/ui/toggle";

// Default example from official docs
export function ToggleDemo() {
  return (
    <Toggle aria-label="Toggle italic">
      <Bold className="h-4 w-4" />
    </Toggle>
  );
}

// Outline example from official docs
export function ToggleOutline() {
  return (
    <Toggle variant="outline" aria-label="Toggle italic">
      <Italic className="h-4 w-4" />
    </Toggle>
  );
}

// With Text example from official docs
export function ToggleWithText() {
  return (
    <Toggle aria-label="Toggle italic">
      <Italic className="h-4 w-4" />
      Italic
    </Toggle>
  );
}

// Small size example from official docs
export function ToggleSm() {
  return (
    <Toggle size="sm" aria-label="Toggle italic">
      <Italic className="h-4 w-4" />
    </Toggle>
  );
}

// Large size example from official docs
export function ToggleLg() {
  return (
    <Toggle size="lg" aria-label="Toggle italic">
      <Italic className="h-4 w-4" />
    </Toggle>
  );
}

// Disabled example from official docs
export function ToggleDisabled() {
  return (
    <Toggle aria-label="Toggle italic" disabled>
      <Underline className="h-4 w-4" />
    </Toggle>
  );
}

/**
 * A two-state button that can be either on or off.
 */
const meta = {
  title: "ui/Toggle",
  component: Toggle,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  excludeStories: /.*Demo$|.*Outline$|.*WithText$|.*Sm$|.*Lg$|.*Disabled$/,
  render: () => <ToggleDemo />,
} satisfies Meta<typeof Toggle>;

export default meta;

type Story = StoryObj<typeof Toggle>;

/**
 * The default form of the toggle.
 */
export const Default: Story = {};

/**
 * Toggle with outline variant.
 */
export const Outline: Story = {
  render: () => <ToggleOutline />,
};

/**
 * Toggle with text label.
 */
export const WithText: Story = {
  render: () => <ToggleWithText />,
};

/**
 * Small sized toggle.
 */
export const Small: Story = {
  render: () => <ToggleSm />,
};

/**
 * Large sized toggle.
 */
export const Large: Story = {
  render: () => <ToggleLg />,
};

/**
 * Disabled toggle.
 */
export const Disabled: Story = {
  render: () => <ToggleDisabled />,
};

export const ShouldToggleState: Story = {
  name: "when toggle is clicked, should change pressed state",
  tags: ["!dev", "!autodocs"],
  render: () => <ToggleDemo />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step("verify toggle is initially not pressed", async () => {
      const toggle = canvas.getByRole("button");
      await expect(toggle).toHaveAttribute("data-state", "off");
    });

    await step("click toggle to press it", async () => {
      const toggle = canvas.getByRole("button");
      await userEvent.click(toggle);
    });

    await step("verify toggle is now pressed", async () => {
      const toggle = canvas.getByRole("button");
      await expect(toggle).toHaveAttribute("data-state", "on");
    });
  },
};
