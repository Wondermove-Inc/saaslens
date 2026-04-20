// Replace nextjs-vite with the name of your framework
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

type SliderProps = React.ComponentProps<typeof Slider>;

export function SliderDemo({ className, ...props }: SliderProps) {
  return (
    <div className="w-[350px]">
      <Slider
        defaultValue={[50]}
        max={100}
        step={1}
        className={cn("w-full", className)}
        {...props}
      />
    </div>
  );
}

/**
 * An input where the user selects a value from within a given range.
 */
const meta = {
  title: "ui/Slider",
  component: Slider,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  excludeStories: /.*Demo$/,
  argTypes: {
    min: {
      control: "number",
      description: "The minimum value of the slider",
    },
    max: {
      control: "number",
      description: "The maximum value of the slider",
    },
    step: {
      control: "number",
      description: "The step increment for the slider",
    },
    disabled: {
      control: "boolean",
      description: "Whether the slider is disabled",
    },
  },
  args: {
    min: 0,
    max: 100,
    step: 1,
    disabled: false,
  },
  render: (args) => (
    <div className="w-[350px]">
      <Slider
        defaultValue={[50]}
        min={args.min}
        max={args.max}
        step={args.step}
        disabled={args.disabled}
        className="w-full"
      />
    </div>
  ),
} satisfies Meta<typeof Slider>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default form of the slider.
 */
export const Default: Story = {};

/**
 * Use the `inverted` prop to have the slider fill from right to left.
 */
export const Inverted: Story = {
  render: () => <SliderDemo inverted />,
};

/**
 * Use the `disabled` prop to disable the slider.
 */
export const Disabled: Story = {
  render: () => <SliderDemo disabled />,
};

export const ShouldChangeValue: Story = {
  name: "when user interacts with slider, should change value",
  tags: ["!dev", "!autodocs"],
  render: () => <SliderDemo />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step("focus slider and press arrow key", async () => {
      const slider = canvas.getByRole("slider");
      await userEvent.click(slider);

      // Get initial value
      const initialValue = slider.getAttribute("aria-valuenow");

      // Press right arrow key to increase value
      await userEvent.keyboard("{ArrowRight}");

      // Verify value changed
      const newValue = slider.getAttribute("aria-valuenow");
      await expect(Number(newValue)).toBeGreaterThan(Number(initialValue));
    });
  },
};
