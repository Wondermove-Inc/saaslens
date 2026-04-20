import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import { ChartContainer } from "@/components/ui/chart";
import { ChartAreaAxes } from "./area-chart-axes";
import { ChartAreaDefault } from "./area-chart-default";
import { ChartAreaGradient } from "./area-chart-gradient";
import { ChartAreaIcons } from "./area-chart-icons";
import { ChartAreaInteractive } from "./area-chart-interactive";
import { ChartAreaLegend } from "./area-chart-legend";
import { ChartAreaLinear } from "./area-chart-linear";
import { ChartAreaStacked } from "./area-chart-stacked";
import { ChartAreaStackedExpand } from "./area-chart-stacked-expand";
import { ChartAreaStep } from "./area-chart-step";

const meta = {
  title: "ui/Chart/Area Charts",
  component: ChartContainer,
  tags: ["autodocs"],
} satisfies Meta<typeof ChartContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Interactive area chart with time range selector
 */
export const Interactive: Story = {
  args: {
    config: {},
    children: <div />,
  },
  render: () => <ChartAreaInteractive />,
  parameters: {
    layout: "fullscreen",
  },
};

/**
 * A simple area chart showing desktop visitors
 */
export const Default: Story = {
  args: {
    config: {},
    children: <div />,
  },
  render: () => <ChartAreaDefault />,
  parameters: {
    layout: "fullscreen",
  },
};

/**
 * Area chart with linear interpolation
 */
export const Linear: Story = {
  args: {
    config: {},
    children: <div />,
  },
  render: () => <ChartAreaLinear />,
  parameters: {
    layout: "fullscreen",
  },
};

/**
 * Area chart with step interpolation
 */
export const Step: Story = {
  args: {
    config: {},
    children: <div />,
  },
  render: () => <ChartAreaStep />,
  parameters: {
    layout: "fullscreen",
  },
};

/**
 * Area chart with legend showing multiple data series
 */
export const Legend: Story = {
  args: {
    config: {},
    children: <div />,
  },
  render: () => <ChartAreaLegend />,
  parameters: {
    layout: "fullscreen",
  },
};

/**
 * Stacked area chart showing desktop and mobile visitors
 */
export const Stacked: Story = {
  args: {
    config: {},
    children: <div />,
  },
  render: () => <ChartAreaStacked />,
  parameters: {
    layout: "fullscreen",
  },
};

/**
 * Stacked area chart with expanded view (100% stacked)
 */
export const StackedExpanded: Story = {
  args: {
    config: {},
    children: <div />,
  },
  render: () => <ChartAreaStackedExpand />,
  parameters: {
    layout: "fullscreen",
  },
};

/**
 * Area chart with icons in the legend
 */
export const Icons: Story = {
  args: {
    config: {},
    children: <div />,
  },
  render: () => <ChartAreaIcons />,
  parameters: {
    layout: "fullscreen",
  },
};

/**
 * Area chart with gradient fill
 */
export const Gradient: Story = {
  args: {
    config: {},
    children: <div />,
  },
  render: () => <ChartAreaGradient />,
  parameters: {
    layout: "fullscreen",
  },
};

/**
 * Area chart with both X and Y axes
 */
export const Axes: Story = {
  args: {
    config: {},
    children: <div />,
  },
  render: () => <ChartAreaAxes />,
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
  render: () => <ChartAreaDefault />,
  play: async ({ canvasElement }) => {
    // 🎯 목적: Area Chart가 정상적으로 렌더링되고 Chart container가 존재하는지 확인

    // ChartContainer가 렌더링되었는지 확인
    const chartContainer = canvasElement.querySelector("[data-chart]");
    await expect(chartContainer).toBeInTheDocument();
  },
  parameters: {
    layout: "fullscreen",
  },
};
