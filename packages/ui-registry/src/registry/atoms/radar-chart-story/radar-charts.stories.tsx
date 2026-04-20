import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import { ChartContainer } from "@/components/ui/chart";
import { ChartRadarDefault } from "./radar-chart-default";
import { ChartRadarDots } from "./radar-chart-dots";
import { ChartRadarGridCircle } from "./radar-chart-grid-circle";
import { ChartRadarGridCircleFill } from "./radar-chart-grid-circle-fill";
import { ChartRadarGridCircleNoLines } from "./radar-chart-grid-circle-no-lines";
import { ChartRadarGridCustom } from "./radar-chart-grid-custom";
import { ChartRadarGridFill } from "./radar-chart-grid-fill";
import { ChartRadarGridNone } from "./radar-chart-grid-none";
import { ChartRadarLabelCustom } from "./radar-chart-label-custom";
import { ChartRadarLegend } from "./radar-chart-legend";
import { ChartRadarLinesOnly } from "./radar-chart-lines-only";
import { ChartRadarMultiple } from "./radar-chart-multiple";

const meta = {
  title: "ui/Chart/Radar Charts",
  component: ChartContainer,
  tags: ["autodocs"],
} satisfies Meta<typeof ChartContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * 기본 Radar Chart입니다. 데스크톱 방문자 데이터를 다각형 형태로 시각화하며,
 * 여러 지표를 동시에 비교할 수 있습니다. 성능 분석이나 다차원 데이터 표현에 적합합니다.
 */
export const RadarDefault: Story = {
  args: {
    config: {},
    children: <div />,
  },
  render: () => <ChartRadarDefault />,
  parameters: {
    layout: "fullscreen",
  },
};

/**
 * 데이터 포인트에 점이 표시되는 Radar Chart입니다. 각 지표의 정확한 위치를 점으로 강조하여
 * 데이터 값을 더 명확하게 파악할 수 있습니다. 세밀한 데이터 분석이 필요할 때 사용합니다.
 */
export const RadarDots: Story = {
  args: {
    config: {},
    children: <div />,
  },
  render: () => <ChartRadarDots />,
  parameters: {
    layout: "fullscreen",
  },
};

/**
 * 선만 표시되는 Radar Chart입니다. 영역 채우기 없이 윤곽선만 표시하여
 * 여러 데이터 시리즈를 겹쳐 비교할 때 가독성을 높입니다. 복잡한 비교 분석에 적합합니다.
 */
export const RadarLinesOnly: Story = {
  args: {
    config: {},
    children: <div />,
  },
  render: () => <ChartRadarLinesOnly />,
  parameters: {
    layout: "fullscreen",
  },
};

/**
 * 커스텀 레이블이 적용된 Radar Chart입니다. 축 레이블의 형식을 사용자 정의하여
 * 데이터를 더 직관적으로 표현할 수 있습니다. 특수한 단위나 표기법이 필요할 때 사용합니다.
 */
export const RadarLabelCustom: Story = {
  args: {
    config: {},
    children: <div />,
  },
  render: () => <ChartRadarLabelCustom />,
  parameters: {
    layout: "fullscreen",
  },
};

/**
 * 커스텀 그리드가 적용된 Radar Chart입니다. 그리드 선의 간격, 색상, 스타일을 조정하여
 * 차트의 가독성을 향상시킬 수 있습니다. 브랜드 아이덴티티에 맞춘 커스터마이징에 적합합니다.
 */
export const RadarGridCustom: Story = {
  args: {
    config: {},
    children: <div />,
  },
  render: () => <ChartRadarGridCustom />,
  parameters: {
    layout: "fullscreen",
  },
};

/**
 * 그리드가 없는 Radar Chart입니다. 배경 그리드를 제거하여 데이터 영역만 강조하고
 * 미니멀한 디자인을 구현합니다. 시각적 단순함이 필요하거나 프레젠테이션용으로 적합합니다.
 */
export const RadarGridNone: Story = {
  args: {
    config: {},
    children: <div />,
  },
  render: () => <ChartRadarGridNone />,
  parameters: {
    layout: "fullscreen",
  },
};

/**
 * 원형 그리드가 적용된 Radar Chart입니다. 기본 다각형 대신 동심원 그리드를 사용하여
 * 중심에서부터의 거리를 더 직관적으로 표현합니다. 균등 분포 데이터 분석에 적합합니다.
 */
export const RadarGridCircle: Story = {
  args: {
    config: {},
    children: <div />,
  },
  render: () => <ChartRadarGridCircle />,
  parameters: {
    layout: "fullscreen",
  },
};

/**
 * 방사선이 없는 원형 그리드 Radar Chart입니다. 동심원만 표시하고 방사선을 제거하여
 * 더욱 깔끔한 시각화를 제공합니다. 축 레이블이 충분할 때 시각적 노이즈를 줄이는 데 유용합니다.
 */
export const RadarGridCircleNoLines: Story = {
  args: {
    config: {},
    children: <div />,
  },
  render: () => <ChartRadarGridCircleNoLines />,
  parameters: {
    layout: "fullscreen",
  },
};

/**
 * 영역이 채워진 원형 그리드 Radar Chart입니다. 동심원 그리드와 함께 데이터 영역을 색으로 채워
 * 각 지표의 범위를 시각적으로 강조합니다. 전체적인 분포 패턴 파악에 효과적입니다.
 */
export const RadarGridCircleFill: Story = {
  args: {
    config: {},
    children: <div />,
  },
  render: () => <ChartRadarGridCircleFill />,
  parameters: {
    layout: "fullscreen",
  },
};

/**
 * 영역이 채워진 Radar Chart입니다. 다각형 그리드와 함께 데이터 영역을 색으로 채워
 * 각 축의 성능을 한눈에 파악할 수 있습니다. 종합적인 성능 비교나 리포팅에 적합합니다.
 */
export const RadarGridFill: Story = {
  args: {
    config: {},
    children: <div />,
  },
  render: () => <ChartRadarGridFill />,
  parameters: {
    layout: "fullscreen",
  },
};

/**
 * 여러 데이터 시리즈를 표시하는 Radar Chart입니다. 두 개 이상의 데이터셋을 겹쳐서 표시하여
 * 직접적인 비교가 가능합니다. 경쟁사 분석이나 시계열 비교에 효과적입니다.
 */
export const RadarMultiple: Story = {
  args: {
    config: {},
    children: <div />,
  },
  render: () => <ChartRadarMultiple />,
  parameters: {
    layout: "fullscreen",
  },
};

/**
 * 범례가 포함된 Radar Chart입니다. 여러 시리즈를 구분할 수 있도록 범례를 추가하여
 * 각 데이터셋의 의미를 명확히 전달합니다. 복잡한 다중 비교 차트에 필수적입니다.
 */
export const RadarLegend: Story = {
  args: {
    config: {},
    children: <div />,
  },
  render: () => <ChartRadarLegend />,
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
  render: () => <ChartRadarDefault />,
  play: async ({ canvasElement }) => {
    // 🎯 목적: Radar Chart가 정상적으로 렌더링되고 Chart container가 존재하는지 확인

    // ChartContainer가 렌더링되었는지 확인
    const chartContainer = canvasElement.querySelector("[data-chart]");
    await expect(chartContainer).toBeInTheDocument();
  },
  parameters: {
    layout: "fullscreen",
  },
};
