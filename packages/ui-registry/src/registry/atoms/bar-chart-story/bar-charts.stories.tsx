import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import { ChartContainer } from "@/components/ui/chart";
import { ChartBarActive } from "./bar-chart-active";
import { ChartBarDefault } from "./bar-chart-default";
import { ChartBarHorizontal } from "./bar-chart-horizontal";
import { ChartBarInteractive } from "./bar-chart-interactive";
import { ChartBarLabel } from "./bar-chart-label";
import { ChartBarLabelCustom } from "./bar-chart-label-custom";
import { ChartBarMixed } from "./bar-chart-mixed";
import { ChartBarMultiple } from "./bar-chart-multiple";
import { ChartBarNegative } from "./bar-chart-negative";
import { ChartBarStacked } from "./bar-chart-stacked";

const meta = {
  title: "ui/Chart/Bar Charts",
  component: ChartContainer,
  tags: ["autodocs"],
} satisfies Meta<typeof ChartContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Interactive bar chart with chart type selector
 */
export const Interactive: Story = {
  args: {
    config: {},
    children: <div />,
  },
  render: () => <ChartBarInteractive />,
  parameters: {
    layout: "fullscreen",
  },
};

/**
 * A simple bar chart
 */
export const Default: Story = {
  args: {
    config: {},
    children: <div />,
  },
  render: () => <ChartBarDefault />,
  parameters: {
    layout: "fullscreen",
  },
};

/**
 * Horizontal bar chart
 */
export const Horizontal: Story = {
  args: {
    config: {},
    children: <div />,
  },
  render: () => <ChartBarHorizontal />,
  parameters: {
    layout: "fullscreen",
  },
};

/**
 * Multiple bars side by side
 */
export const Multiple: Story = {
  args: {
    config: {},
    children: <div />,
  },
  render: () => <ChartBarMultiple />,
  parameters: {
    layout: "fullscreen",
  },
};

/**
 * Stacked bar chart with legend
 */
export const Stacked: Story = {
  args: {
    config: {},
    children: <div />,
  },
  render: () => <ChartBarStacked />,
  parameters: {
    layout: "fullscreen",
  },
};

/**
 * Bar chart with labels on top
 */
export const Label: Story = {
  args: {
    config: {},
    children: <div />,
  },
  render: () => <ChartBarLabel />,
  parameters: {
    layout: "fullscreen",
  },
};

/**
 * Bar chart with custom label positioning
 */
export const LabelCustom: Story = {
  args: {
    config: {},
    children: <div />,
  },
  render: () => <ChartBarLabelCustom />,
  parameters: {
    layout: "fullscreen",
  },
};

/**
 * Bar chart with different colors for each bar
 */
export const Mixed: Story = {
  args: {
    config: {},
    children: <div />,
  },
  render: () => <ChartBarMixed />,
  parameters: {
    layout: "fullscreen",
  },
};

/**
 * Bar chart with active state highlighting
 */
export const Active: Story = {
  args: {
    config: {},
    children: <div />,
  },
  render: () => <ChartBarActive />,
  parameters: {
    layout: "fullscreen",
  },
};

/**
 * Bar chart supporting negative values
 */
export const Negative: Story = {
  args: {
    config: {},
    children: <div />,
  },
  render: () => <ChartBarNegative />,
  parameters: {
    layout: "fullscreen",
  },
};

export const ShouldRenderChart: Story = {
  name: "when chart is rendered, should display chart container and content",
  tags: ["!dev", "!autodocs"],
  args: {
    config: {},
    children: <div />,
  },
  render: () => <ChartBarDefault />,
  play: async ({ canvasElement }) => {
    // 🎯 목적: Bar Chart가 정상적으로 렌더링되고 Chart container가 존재하는지 확인

    // ChartContainer가 렌더링되었는지 확인
    const chartContainer = canvasElement.querySelector("[data-chart]");
    await expect(chartContainer).toBeInTheDocument();
  },
  parameters: {
    layout: "fullscreen",
  },
};
