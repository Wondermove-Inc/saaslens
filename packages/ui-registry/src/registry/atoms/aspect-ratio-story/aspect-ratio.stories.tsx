import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Image from "next/image";
import { expect, within } from "storybook/test";

import { AspectRatio } from "@/components/ui/aspect-ratio";

export function AspectRatioDemo() {
  return (
    <div className="w-[450px]">
      <AspectRatio ratio={16 / 9} className="bg-muted rounded-lg">
        <Image
          src="https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&dpr=2&q=80"
          alt="Photo by Drew Beamer"
          fill
          className="h-full w-full rounded-lg object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </AspectRatio>
    </div>
  );
}

/**
 * Displays content within a desired ratio.
 */
const meta = {
  title: "ui/AspectRatio",
  component: AspectRatio,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  args: {
    ratio: 16 / 9,
    className: "bg-muted rounded-lg w-[450px]",
  },
  excludeStories: /.*Demo$/,
} satisfies Meta<typeof AspectRatio>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default 16:9 aspect ratio with Image.
 */
export const Default: Story = {
  render: (args) => (
    <div className="w-[450px]">
      <AspectRatio {...args}>
        <Image
          src="https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&dpr=2&q=80"
          alt="Photo by Drew Beamer"
          fill
          className="h-full w-full rounded-lg object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </AspectRatio>
    </div>
  ),
};

/**
 * 16:9 aspect ratio (Widescreen).
 */
export const Widescreen: Story = {
  args: {
    ratio: 16 / 9,
  },
  render: (args) => (
    <div className="w-[450px]">
      <AspectRatio {...args}>
        <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-lg font-semibold text-white">
          16:9
        </div>
      </AspectRatio>
    </div>
  ),
};

/**
 * 4:3 aspect ratio (Standard).
 */
export const Standard: Story = {
  args: {
    ratio: 4 / 3,
  },
  render: (args) => (
    <div className="w-[450px]">
      <AspectRatio {...args}>
        <div className="flex h-full items-center justify-center bg-gradient-to-br from-green-500 to-teal-600 text-lg font-semibold text-white">
          4:3
        </div>
      </AspectRatio>
    </div>
  ),
};

/**
 * 1:1 aspect ratio (Square).
 */
export const Square: Story = {
  args: {
    ratio: 1 / 1,
  },
  render: (args) => (
    <div className="w-[300px]">
      <AspectRatio {...args}>
        <div className="flex h-full items-center justify-center bg-gradient-to-br from-pink-500 to-rose-600 text-lg font-semibold text-white">
          1:1
        </div>
      </AspectRatio>
    </div>
  ),
};

/**
 * 21:9 aspect ratio (Ultrawide).
 */
export const Ultrawide: Story = {
  args: {
    ratio: 21 / 9,
  },
  render: (args) => (
    <div className="w-[600px]">
      <AspectRatio {...args}>
        <div className="flex h-full items-center justify-center bg-gradient-to-br from-orange-500 to-red-600 text-lg font-semibold text-white">
          21:9
        </div>
      </AspectRatio>
    </div>
  ),
};

export const ShouldMaintainAspectRatio: Story = {
  name: "when rendered with different ratios, should maintain correct aspect ratios",
  tags: ["!dev", "!autodocs"],
  render: () => (
    <div className="space-y-6" data-testid="aspect-ratio-container">
      <div className="space-y-2">
        <h4 className="text-sm font-medium">16:9 (Widescreen)</h4>
        <div className="w-[450px]" data-testid="ratio-16-9-container">
          <AspectRatio ratio={16 / 9} data-testid="ratio-16-9">
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-lg font-semibold text-white">
              16:9
            </div>
          </AspectRatio>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium">4:3 (Standard)</h4>
        <div className="w-[450px]" data-testid="ratio-4-3-container">
          <AspectRatio ratio={4 / 3} data-testid="ratio-4-3">
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-green-500 to-teal-600 text-lg font-semibold text-white">
              4:3
            </div>
          </AspectRatio>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium">1:1 (Square)</h4>
        <div className="w-[300px]" data-testid="ratio-1-1-container">
          <AspectRatio ratio={1 / 1} data-testid="ratio-1-1">
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-pink-500 to-rose-600 text-lg font-semibold text-white">
              1:1
            </div>
          </AspectRatio>
        </div>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 🎯 목적: AspectRatio 컴포넌트가 다양한 비율을 올바르게 유지하는지 확인

    // Container 확인
    const container = canvas.getByTestId("aspect-ratio-container");
    await expect(container).toBeInTheDocument();

    // 16:9 AspectRatio 확인
    const ratio169 = canvas.getByTestId("ratio-16-9");
    await expect(ratio169).toBeInTheDocument();
    await expect(ratio169).toHaveTextContent("16:9");

    // 16:9 컨테이너의 크기 확인
    const ratio169Container = canvas.getByTestId("ratio-16-9-container");
    const ratio169Element = ratio169Container.querySelector(
      '[data-testid="ratio-16-9"]',
    );
    if (ratio169Element) {
      const { width, height } = ratio169Element.getBoundingClientRect();
      // 16:9 비율 검증 (오차 허용 범위 ±2%)
      const expectedRatio = 16 / 9;
      const actualRatio = width / height;
      const ratioError = Math.abs(actualRatio - expectedRatio) / expectedRatio;
      await expect(ratioError).toBeLessThan(0.02);
    }

    // 4:3 AspectRatio 확인
    const ratio43 = canvas.getByTestId("ratio-4-3");
    await expect(ratio43).toBeInTheDocument();
    await expect(ratio43).toHaveTextContent("4:3");

    // 1:1 AspectRatio 확인
    const ratio11 = canvas.getByTestId("ratio-1-1");
    await expect(ratio11).toBeInTheDocument();
    await expect(ratio11).toHaveTextContent("1:1");

    // 1:1 정사각형 비율 검증
    const ratio11Container = canvas.getByTestId("ratio-1-1-container");
    const ratio11Element = ratio11Container.querySelector(
      '[data-testid="ratio-1-1"]',
    );
    if (ratio11Element) {
      const { width, height } = ratio11Element.getBoundingClientRect();
      // 1:1 비율 검증 (오차 허용 범위 ±2%)
      const actualRatio = width / height;
      const ratioError = Math.abs(actualRatio - 1);
      await expect(ratioError).toBeLessThan(0.02);
    }
  },
};
