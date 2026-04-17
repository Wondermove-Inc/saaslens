import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import { ChartContainer } from "@/components/ui/chart";

// Import all line chart components
import { ChartLineDefault } from "./line-chart-default";
import { ChartLineDots } from "./line-chart-dots";
import { ChartLineDotsColors } from "./line-chart-dots-colors";
import { ChartLineDotsCustom } from "./line-chart-dots-custom";
import { ChartLineInteractive } from "./line-chart-interactive";
import { ChartLineLabel } from "./line-chart-label";
import { ChartLineLabelCustom } from "./line-chart-label-custom";
import { ChartLineLinear } from "./line-chart-linear";
import { ChartLineMultiple } from "./line-chart-multiple";
import { ChartLineStep } from "./line-chart-step";

const meta = {
  title: "ui/Chart/Line Charts",
  component: ChartContainer,
  tags: ["autodocs"],
} satisfies Meta<typeof ChartContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * 기본 Line Chart입니다. 시간에 따른 데이터 변화를 선으로 연결하여 표현하며,
 * 추세와 패턴을 직관적으로 파악할 수 있습니다. 시계열 데이터 분석에 가장 적합합니다.
 */
export const Default: Story = {
  // @ts-expect-error - Storybook 타입 시스템이 component: ChartContainer와 render 함수 조합을 올바르게 처리하지 못합니다
  args: {},
  render: () => <ChartLineDefault />,
};

/**
 * 인터랙티브 Line Chart입니다. 마우스 호버 시 툴팁으로 상세 값을 표시하고,
 * 클릭 등의 상호작용에 반응합니다. 동적인 데이터 탐색이 필요한 대시보드에 적합합니다.
 */
export const Interactive: Story = {
  // @ts-expect-error - Storybook 타입 시스템이 component: ChartContainer와 render 함수 조합을 올바르게 처리하지 못합니다
  args: {},
  render: () => <ChartLineInteractive />,
};

/**
 * 선형 보간이 적용된 Line Chart입니다. 데이터 포인트를 직선으로 연결하여
 * 명확하고 단순한 시각화를 제공합니다. 정확한 값의 변화를 표현할 때 사용합니다.
 */
export const Linear: Story = {
  // @ts-expect-error - Storybook 타입 시스템이 component: ChartContainer와 render 함수 조합을 올바르게 처리하지 못합니다
  args: {},
  render: () => <ChartLineLinear />,
};

/**
 * 계단형 Line Chart입니다. 데이터 포인트를 계단식으로 연결하여
 * 구간별로 일정한 값을 유지하는 데이터를 표현합니다. 상태 변화나 이벤트 기반 데이터에 적합합니다.
 */
export const Step: Story = {
  // @ts-expect-error - Storybook 타입 시스템이 component: ChartContainer와 render 함수 조합을 올바르게 처리하지 못합니다
  args: {},
  render: () => <ChartLineStep />,
};

/**
 * 여러 데이터 시리즈를 표시하는 Line Chart입니다. 여러 항목의 추세를 동시에 비교할 수 있으며,
 * 각 선을 다른 색상으로 구분합니다. 경쟁 분석이나 다중 지표 모니터링에 효과적입니다.
 */
export const Multiple: Story = {
  // @ts-expect-error - Storybook 타입 시스템이 component: ChartContainer와 render 함수 조합을 올바르게 처리하지 못합니다
  args: {},
  render: () => <ChartLineMultiple />,
};

/**
 * 데이터 포인트에 점이 표시되는 Line Chart입니다. 각 데이터 지점을 점으로 강조하여
 * 정확한 측정 위치를 시각화합니다. 개별 데이터 포인트가 중요한 분석에 적합합니다.
 */
export const Dots: Story = {
  // @ts-expect-error - Storybook 타입 시스템이 component: ChartContainer와 render 함수 조합을 올바르게 처리하지 못합니다
  args: {},
  render: () => <ChartLineDots />,
};

/**
 * 커스텀 스타일의 점이 표시되는 Line Chart입니다. 점의 크기, 색상, 모양을 사용자 정의하여
 * 특정 데이터 포인트를 강조하거나 브랜드 스타일에 맞출 수 있습니다. 맞춤형 시각화에 활용됩니다.
 */
export const DotsCustom: Story = {
  // @ts-expect-error - Storybook 타입 시스템이 component: ChartContainer와 render 함수 조합을 올바르게 처리하지 못합니다
  args: {},
  render: () => <ChartLineDotsCustom />,
};

/**
 * 다양한 색상의 점이 표시되는 Line Chart입니다. 각 데이터 포인트를 조건에 따라 다른 색상으로 표시하여
 * 특정 임계값이나 카테고리를 시각적으로 구분합니다. 조건부 데이터 분석에 효과적입니다.
 */
export const DotsColors: Story = {
  // @ts-expect-error - Storybook 타입 시스템이 component: ChartContainer와 render 함수 조합을 올바르게 처리하지 못합니다
  args: {},
  render: () => <ChartLineDotsColors />,
};

/**
 * 레이블이 표시되는 Line Chart입니다. 중요한 데이터 포인트에 값 레이블을 추가하여
 * 정확한 수치를 직접 확인할 수 있습니다. 핵심 지표나 이상치 강조에 유용합니다.
 */
export const Label: Story = {
  // @ts-expect-error - Storybook 타입 시스템이 component: ChartContainer와 render 함수 조합을 올바르게 처리하지 못합니다
  args: {},
  render: () => <ChartLineLabel />,
};

/**
 * 커스텀 레이블이 적용된 Line Chart입니다. 레이블의 형식, 위치, 스타일을 사용자 정의하여
 * 브랜드 요구사항이나 특수한 표기법에 맞출 수 있습니다. 맞춤형 프레젠테이션에 적합합니다.
 */
export const LabelCustom: Story = {
  // @ts-expect-error - Storybook 타입 시스템이 component: ChartContainer와 render 함수 조합을 올바르게 처리하지 못합니다
  args: {},
  render: () => <ChartLineLabelCustom />,
};

export const ShouldRenderChart: Story = {
  name: "when chart is rendered, should display chart container and content",
  tags: ["!dev", "!autodocs"],
  // @ts-expect-error - Storybook 타입 시스템이 component: ChartContainer와 render 함수 조합을 올바르게 처리하지 못합니다
  args: {},
  render: () => <ChartLineDefault />,
  play: async ({ canvasElement }) => {
    // 🎯 목적: Line Chart가 정상적으로 렌더링되고 Chart container가 존재하는지 확인

    // ChartContainer가 렌더링되었는지 확인
    const chartContainer = canvasElement.querySelector("[data-chart]");
    await expect(chartContainer).toBeInTheDocument();
  },
};
