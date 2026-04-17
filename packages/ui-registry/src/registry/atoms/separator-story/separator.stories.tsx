import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { Separator } from "@/components/ui/separator";

// Demo component from official docs
export function SeparatorDemo() {
  return (
    <div>
      <div className="space-y-1">
        <h4 className="text-sm leading-none font-medium">Radix Primitives</h4>
        <p className="text-muted-foreground text-sm">
          An open-source UI component library.
        </p>
      </div>
      <Separator className="my-4" />
      <div className="flex h-5 items-center space-x-4 text-sm">
        <div>Blog</div>
        <Separator orientation="vertical" />
        <div>Docs</div>
        <Separator orientation="vertical" />
        <div>Source</div>
      </div>
    </div>
  );
}

/**
 * Visually or semantically separates content.
 */
const meta = {
  title: "ui/Separator",
  component: Separator,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  args: {
    orientation: "horizontal",
    decorative: true,
    className: "w-64",
  },
  excludeStories: /.*Demo$/,
  argTypes: {
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
    orientation: {
      control: { type: "radio" },
      options: ["horizontal", "vertical"],
      description: "The orientation of the separator",
    },
    decorative: {
      control: "boolean",
      description: "Whether the separator is purely decorative",
    },
  },
} satisfies Meta<typeof Separator>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default form of the separator demonstrating both orientations.
 */
export const Default: Story = {
  render: () => <SeparatorDemo />,
};

/**
 * Basic horizontal separator.
 */
export const Horizontal: Story = {
  args: {
    orientation: "horizontal",
    className: "w-64",
  },
};

/**
 * Vertical separator.
 */
export const Vertical: Story = {
  args: {
    orientation: "vertical",
    className: "h-16",
  },
};

/**
 * Horizontal separator with custom width.
 */
export const CustomWidth: Story = {
  args: {
    orientation: "horizontal",
    className: "w-96",
  },
};

/**
 * Vertical separator with custom height.
 */
export const CustomHeight: Story = {
  args: {
    orientation: "vertical",
    className: "h-24",
  },
};

/**
 * Separator with custom styling.
 */
export const CustomStyling: Story = {
  render: () => (
    <div className="w-full max-w-md space-y-4">
      <Separator className="bg-primary" />
      <Separator className="bg-secondary h-0.5" />
      <Separator className="from-primary to-secondary h-1 bg-gradient-to-r" />
      <div className="flex items-center space-x-4">
        <span className="text-sm">Left</span>
        <Separator orientation="vertical" className="bg-primary h-6" />
        <span className="text-sm">Right</span>
      </div>
    </div>
  ),
};

/**
 * Separator in a card layout.
 */
export const InCard: Story = {
  render: () => (
    <div className="w-[350px] rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Notifications</h3>
        <span className="text-muted-foreground text-sm">3 unread</span>
      </div>
      <Separator className="my-3" />
      <div className="space-y-3">
        <div className="flex items-start space-x-2">
          <div className="size-2 translate-y-1 rounded-full bg-sky-500" />
          <div className="space-y-1">
            <p className="text-sm leading-none font-medium">New message</p>
            <p className="text-muted-foreground text-sm">
              You have a new message from Alex
            </p>
          </div>
        </div>
        <Separator />
        <div className="flex items-start space-x-2">
          <div className="size-2 translate-y-1 rounded-full bg-sky-500" />
          <div className="space-y-1">
            <p className="text-sm leading-none font-medium">Meeting reminder</p>
            <p className="text-muted-foreground text-sm">
              Team standup in 30 minutes
            </p>
          </div>
        </div>
      </div>
    </div>
  ),
};

/**
 * Separator in a toolbar.
 */
export const InToolbar: Story = {
  render: () => (
    <div className="flex items-center rounded-md border px-3">
      <button className="hover:bg-accent hover:text-accent-foreground flex h-10 items-center justify-center rounded-md px-2 text-sm">
        Bold
      </button>
      <button className="hover:bg-accent hover:text-accent-foreground flex h-10 items-center justify-center rounded-md px-2 text-sm">
        Italic
      </button>
      <Separator orientation="vertical" className="mx-2 h-6" />
      <button className="hover:bg-accent hover:text-accent-foreground flex h-10 items-center justify-center rounded-md px-2 text-sm">
        Left
      </button>
      <button className="hover:bg-accent hover:text-accent-foreground flex h-10 items-center justify-center rounded-md px-2 text-sm">
        Center
      </button>
      <button className="hover:bg-accent hover:text-accent-foreground flex h-10 items-center justify-center rounded-md px-2 text-sm">
        Right
      </button>
    </div>
  ),
};

export const ShouldRenderBothOrientations: Story = {
  name: "when rendered, should display both horizontal and vertical separators",
  tags: ["!dev", "!autodocs"],
  render: () => (
    <div className="space-y-6" data-testid="separator-container">
      <div className="space-y-4">
        <h4 className="text-sm font-medium">Horizontal Separator</h4>
        <div className="text-muted-foreground text-sm">
          Content before separator
        </div>
        <Separator
          orientation="horizontal"
          data-testid="horizontal-separator"
        />
        <div className="text-muted-foreground text-sm">
          Content after separator
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-medium">Vertical Separator</h4>
        <div className="flex items-center space-x-4 text-sm">
          <span data-testid="item-1">Item 1</span>
          <Separator
            orientation="vertical"
            className="h-6"
            data-testid="vertical-separator-1"
          />
          <span data-testid="item-2">Item 2</span>
          <Separator
            orientation="vertical"
            className="h-6"
            data-testid="vertical-separator-2"
          />
          <span data-testid="item-3">Item 3</span>
        </div>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 🎯 목적: Separator 컴포넌트가 horizontal과 vertical 방향을 올바르게 렌더링하는지 확인

    // Container 확인
    const container = canvas.getByTestId("separator-container");
    await expect(container).toBeInTheDocument();

    // Horizontal Separator 확인
    const horizontalSeparator = canvas.getByTestId("horizontal-separator");
    await expect(horizontalSeparator).toBeInTheDocument();
    await expect(horizontalSeparator).toHaveAttribute(
      "data-orientation",
      "horizontal",
    );

    // Vertical Separator 확인
    const verticalSeparator1 = canvas.getByTestId("vertical-separator-1");
    await expect(verticalSeparator1).toBeInTheDocument();
    await expect(verticalSeparator1).toHaveAttribute(
      "data-orientation",
      "vertical",
    );

    const verticalSeparator2 = canvas.getByTestId("vertical-separator-2");
    await expect(verticalSeparator2).toBeInTheDocument();
    await expect(verticalSeparator2).toHaveAttribute(
      "data-orientation",
      "vertical",
    );

    // Separated items 확인
    const item1 = canvas.getByTestId("item-1");
    await expect(item1).toHaveTextContent("Item 1");

    const item2 = canvas.getByTestId("item-2");
    await expect(item2).toHaveTextContent("Item 2");

    const item3 = canvas.getByTestId("item-3");
    await expect(item3).toHaveTextContent("Item 3");
  },
};
