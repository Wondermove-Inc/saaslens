import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import { ChartContainer } from "@/components/ui/chart";

// Import all pie chart components
import { ChartPieDonut } from "./pie-chart-donut";
import { ChartPieDonutActive } from "./pie-chart-donut-active";
import { ChartPieDonutText } from "./pie-chart-donut-text";
import { ChartPieInteractive } from "./pie-chart-interactive";
import { ChartPieLabel } from "./pie-chart-label";
import { ChartPieLabelCustom } from "./pie-chart-label-custom";
import { ChartPieLabelList } from "./pie-chart-label-list";
import { ChartPieLegend } from "./pie-chart-legend";
import { ChartPieSeparatorNone } from "./pie-chart-separator-none";
import { ChartPieSimple } from "./pie-chart-simple";
import { ChartPieStacked } from "./pie-chart-stacked";

const meta = {
  title: "ui/Chart/Pie Charts",
  component: ChartContainer,
  tags: ["autodocs"],
} satisfies Meta<typeof ChartContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * 기본 Pie Chart입니다. 전체에서 각 항목이 차지하는 비율을 원형 차트로 표현하며,
 * 데이터의 구성 비율을 직관적으로 파악할 수 있습니다. 카테고리별 분포 분석에 적합합니다.
 */
export const Simple: Story = {
  // @ts-expect-error - Storybook 타입 시스템이 component: ChartContainer와 render 함수 조합을 올바르게 처리하지 못합니다
  args: {},
  render: () => <ChartPieSimple />,
};

/**
 * 구분선이 없는 Pie Chart입니다. 조각 사이의 경계선을 제거하여
 * 더욱 부드럽고 미니멀한 디자인을 구현합니다. 시각적 단순함이 필요한 대시보드에 적합합니다.
 */
export const SeparatorNone: Story = {
  // @ts-expect-error - Storybook 타입 시스템이 component: ChartContainer와 render 함수 조합을 올바르게 처리하지 못합니다
  args: {},
  render: () => <ChartPieSeparatorNone />,
};

/**
 * 레이블이 표시되는 Pie Chart입니다. 각 조각에 데이터 레이블을 추가하여
 * 정확한 값이나 비율을 직접 확인할 수 있습니다. 상세한 수치 전달이 필요할 때 사용합니다.
 */
export const Label: Story = {
  // @ts-expect-error - Storybook 타입 시스템이 component: ChartContainer와 render 함수 조합을 올바르게 처리하지 못합니다
  args: {},
  render: () => <ChartPieLabel />,
};

/**
 * 커스텀 레이블이 적용된 Pie Chart입니다. 레이블의 형식, 위치, 스타일을 사용자 정의하여
 * 브랜드나 용도에 맞게 조정할 수 있습니다. 특수한 표기법이나 디자인이 필요할 때 활용합니다.
 */
export const LabelCustom: Story = {
  // @ts-expect-error - Storybook 타입 시스템이 component: ChartContainer와 render 함수 조합을 올바르게 처리하지 못합니다
  args: {},
  render: () => <ChartPieLabelCustom />,
};

/**
 * 레이블 목록이 표시되는 Pie Chart입니다. 모든 항목의 레이블을 한 번에 표시하여
 * 전체 구성을 빠르게 파악할 수 있습니다. 많은 카테고리를 포함하는 데이터 표현에 유용합니다.
 */
export const LabelList: Story = {
  // @ts-expect-error - Storybook 타입 시스템이 component: ChartContainer와 render 함수 조합을 올바르게 처리하지 못합니다
  args: {},
  render: () => <ChartPieLabelList />,
};

/**
 * 범례가 포함된 Pie Chart입니다. 차트 외부에 범례를 배치하여
 * 각 색상이 어떤 카테고리를 나타내는지 명확하게 표시합니다. 표준적인 차트 레이아웃에 적합합니다.
 */
export const Legend: Story = {
  // @ts-expect-error - Storybook 타입 시스템이 component: ChartContainer와 render 함수 조합을 올바르게 처리하지 못합니다
  args: {},
  render: () => <ChartPieLegend />,
};

/**
 * Donut Chart입니다. 중앙에 빈 공간이 있는 원형 차트로 비율을 표시하며,
 * 중앙 영역을 활용하여 총합이나 추가 정보를 배치할 수 있습니다. 현대적인 디자인에 적합합니다.
 */
export const Donut: Story = {
  // @ts-expect-error - Storybook 타입 시스템이 component: ChartContainer와 render 함수 조합을 올바르게 처리하지 못합니다
  args: {},
  render: () => <ChartPieDonut />,
};

/**
 * 활성 상태가 있는 Donut Chart입니다. 특정 조각을 강조하거나 선택 상태를 표시할 수 있으며,
 * 사용자 인터랙션에 반응하여 시각적 피드백을 제공합니다. 대화형 대시보드에 적합합니다.
 */
export const DonutActive: Story = {
  // @ts-expect-error - Storybook 타입 시스템이 component: ChartContainer와 render 함수 조합을 올바르게 처리하지 못합니다
  args: {},
  render: () => <ChartPieDonutActive />,
};

/**
 * 중앙에 텍스트가 표시되는 Donut Chart입니다. 중앙 빈 공간에 총합, 평균, 제목 등을 배치하여
 * 추가 정보를 효과적으로 전달합니다. KPI 표시나 요약 대시보드에 활용됩니다.
 */
export const DonutText: Story = {
  // @ts-expect-error - Storybook 타입 시스템이 component: ChartContainer와 render 함수 조합을 올바르게 처리하지 못합니다
  args: {},
  render: () => <ChartPieDonutText />,
};

/**
 * 중첩된 Pie Chart입니다. 여러 계층의 데이터를 동심원으로 표현하여
 * 상위-하위 카테고리 관계를 시각화합니다. 계층적 데이터 구조 표현에 효과적입니다.
 */
export const Stacked: Story = {
  // @ts-expect-error - Storybook 타입 시스템이 component: ChartContainer와 render 함수 조합을 올바르게 처리하지 못합니다
  args: {},
  render: () => <ChartPieStacked />,
};

/**
 * 인터랙티브 Pie Chart입니다. 마우스 오버, 클릭 등 사용자 상호작용에 반응하며,
 * 동적인 데이터 탐색 경험을 제공합니다. 상세 정보 탐색이 필요한 분석 도구에 적합합니다.
 */
export const Interactive: Story = {
  // @ts-expect-error - Storybook 타입 시스템이 component: ChartContainer와 render 함수 조합을 올바르게 처리하지 못합니다
  args: {},
  render: () => <ChartPieInteractive />,
};

export const ShouldRenderChart: Story = {
  name: "when chart is rendered, should display chart container and content",
  tags: ["!dev", "!autodocs"],
  // @ts-expect-error - Storybook 타입 시스템이 component: ChartContainer와 render 함수 조합을 올바르게 처리하지 못합니다
  args: {},
  render: () => <ChartPieSimple />,
  play: async ({ canvasElement }) => {
    // 🎯 목적: Pie Chart가 정상적으로 렌더링되고 Chart container가 존재하는지 확인

    // ChartContainer가 렌더링되었는지 확인
    const chartContainer = canvasElement.querySelector("[data-chart]");
    await expect(chartContainer).toBeInTheDocument();
  },
};
