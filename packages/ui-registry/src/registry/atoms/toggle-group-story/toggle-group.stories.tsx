import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Bold, Italic, Underline } from "lucide-react";
import { expect, userEvent, within } from "storybook/test";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// Default example from official docs
export function ToggleGroupDemo() {
  return (
    <ToggleGroup variant="outline" type="multiple">
      <ToggleGroupItem value="bold" aria-label="Toggle bold">
        <Bold className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Toggle italic">
        <Italic className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="strikethrough" aria-label="Toggle strikethrough">
        <Underline className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

// Outline example from official docs
export function ToggleGroupOutline() {
  return (
    <ToggleGroup type="multiple" variant="outline">
      <ToggleGroupItem value="bold" aria-label="Toggle bold">
        <Bold className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Toggle italic">
        <Italic className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="strikethrough" aria-label="Toggle strikethrough">
        <Underline className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

// Single example from official docs
export function ToggleGroupSingle() {
  return (
    <ToggleGroup type="single">
      <ToggleGroupItem value="bold" aria-label="Toggle bold">
        <Bold className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Toggle italic">
        <Italic className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="strikethrough" aria-label="Toggle strikethrough">
        <Underline className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

// Small size example from official docs
export function ToggleGroupSmall() {
  return (
    <ToggleGroup type="single" size="sm">
      <ToggleGroupItem value="bold" aria-label="Toggle bold">
        <Bold className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Toggle italic">
        <Italic className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="strikethrough" aria-label="Toggle strikethrough">
        <Underline className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

// Large size example from official docs
export function ToggleGroupLarge() {
  return (
    <ToggleGroup type="multiple" size="lg">
      <ToggleGroupItem value="bold" aria-label="Toggle bold">
        <Bold className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Toggle italic">
        <Italic className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="strikethrough" aria-label="Toggle strikethrough">
        <Underline className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

// Disabled example from official docs
export function ToggleGroupDisabled() {
  return (
    <ToggleGroup type="multiple" disabled>
      <ToggleGroupItem value="bold" aria-label="Toggle bold">
        <Bold className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Toggle italic">
        <Italic className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="strikethrough" aria-label="Toggle strikethrough">
        <Underline className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

/**
 * A set of two-state buttons that can be toggled on or off.
 */
const meta = {
  title: "ui/ToggleGroup",
  component: ToggleGroup,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof ToggleGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default form of the toggle group.
 */
export const Default: Story = {
  args: {
    type: "multiple",
    variant: "outline",
  },
  render: () => <ToggleGroupDemo />,
};

/**
 * Toggle group with outline variant.
 */
export const Outline: Story = {
  args: {
    type: "multiple",
    variant: "outline",
  },
  render: () => <ToggleGroupOutline />,
};

/**
 * Single selection toggle group.
 */
export const Single: Story = {
  args: {
    type: "single",
  },
  render: () => <ToggleGroupSingle />,
};

/**
 * Small sized toggle group.
 */
export const Small: Story = {
  args: {
    type: "single",
    size: "sm",
  },
  render: () => <ToggleGroupSmall />,
};

/**
 * Large sized toggle group.
 */
export const Large: Story = {
  args: {
    type: "multiple",
    size: "lg",
  },
  render: () => <ToggleGroupLarge />,
};

/**
 * Disabled toggle group.
 */
export const Disabled: Story = {
  args: {
    type: "multiple",
    disabled: true,
  },
  render: () => <ToggleGroupDisabled />,
};

export const ShouldSelectItem: Story = {
  name: "when toggle group item is clicked, should toggle selection",
  tags: ["!dev", "!autodocs"],
  args: {
    type: "multiple",
    variant: "outline",
  },
  render: () => <ToggleGroupDemo />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step("click 'Toggle bold' button", async () => {
      const boldButton = canvas.getByLabelText(/toggle bold/i);
      await userEvent.click(boldButton);
    });

    await step("verify bold button is selected", async () => {
      const boldButton = canvas.getByLabelText(/toggle bold/i);
      await expect(boldButton).toHaveAttribute("data-state", "on");
    });

    await step("click 'Toggle italic' button", async () => {
      const italicButton = canvas.getByLabelText(/toggle italic/i);
      await userEvent.click(italicButton);
    });

    await step(
      "verify both bold and italic are selected (multiple type)",
      async () => {
        const boldButton = canvas.getByLabelText(/toggle bold/i);
        const italicButton = canvas.getByLabelText(/toggle italic/i);
        await expect(boldButton).toHaveAttribute("data-state", "on");
        await expect(italicButton).toHaveAttribute("data-state", "on");
      },
    );
  },
};
