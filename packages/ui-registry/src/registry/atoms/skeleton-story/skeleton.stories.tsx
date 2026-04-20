import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import { expect, waitFor, within } from "storybook/test";

import { Skeleton } from "@/components/ui/skeleton";

// Default example from official docs
export function SkeletonDemo() {
  return (
    <div className="flex items-center space-x-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    </div>
  );
}

// Card example from official docs
export function SkeletonCard() {
  return (
    <div className="flex flex-col space-y-3">
      <Skeleton className="h-[125px] w-[250px] rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    </div>
  );
}

/**
 * Use to show a placeholder while content is loading.
 */
const meta = {
  title: "ui/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  excludeStories: /.*Demo$|SkeletonCard/,
  argTypes: {
    className: {
      control: "text",
      description:
        "Additional CSS classes for styling (e.g., 'h-12 w-12 rounded-full')",
    },
  },
  args: {
    className: "h-12 w-[250px]",
  },
  render: (args) => <Skeleton className={args.className} />,
} satisfies Meta<typeof Skeleton>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default form of the skeleton.
 */
export const Default: Story = {};

/**
 * Skeleton as a card placeholder.
 */
export const Card: Story = {
  render: () => <SkeletonCard />,
};

/**
 * Skeleton 로딩 상태를 테스트합니다.
 */
export const ShouldShowLoadingState: Story = {
  name: "when loading, should display skeleton, then show actual content",
  tags: ["!dev", "!autodocs"],
  render: () => {
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
      const timer = setTimeout(() => setLoading(false), 2000);
      return () => clearTimeout(timer);
    }, []);

    return (
      <div className="flex items-center space-x-4">
        {loading ? (
          <>
            <Skeleton
              className="h-12 w-12 rounded-full"
              data-testid="skeleton-avatar"
            />
            <div className="space-y-2">
              <Skeleton
                className="h-4 w-[250px]"
                data-testid="skeleton-line1"
              />
              <Skeleton
                className="h-4 w-[200px]"
                data-testid="skeleton-line2"
              />
            </div>
          </>
        ) : (
          <>
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700"
              data-testid="actual-avatar"
            >
              👤
            </div>
            <div className="space-y-2">
              <div className="h-4 w-[250px]" data-testid="actual-line1">
                John Doe
              </div>
              <div className="h-4 w-[200px]" data-testid="actual-line2">
                Software Engineer
              </div>
            </div>
          </>
        )}
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 🎯 목적: 로딩 중일 때 Skeleton이 표시되고, 로딩 완료 후 실제 콘텐츠가 표시되는지 확인

    // 초기 로딩 상태 확인 (Skeleton 표시)
    const skeletonAvatar = canvas.getByTestId("skeleton-avatar");
    await expect(skeletonAvatar).toBeInTheDocument();

    const skeletonLine1 = canvas.getByTestId("skeleton-line1");
    await expect(skeletonLine1).toBeInTheDocument();

    const skeletonLine2 = canvas.getByTestId("skeleton-line2");
    await expect(skeletonLine2).toBeInTheDocument();

    // 로딩 완료 대기 (2초 후 실제 콘텐츠 표시)
    await waitFor(
      async () => {
        const actualAvatar = await canvas.findByTestId("actual-avatar");
        await expect(actualAvatar).toBeInTheDocument();

        const actualLine1 = canvas.getByTestId("actual-line1");
        await expect(actualLine1).toHaveTextContent("John Doe");

        const actualLine2 = canvas.getByTestId("actual-line2");
        await expect(actualLine2).toHaveTextContent("Software Engineer");
      },
      { timeout: 3000 },
    );
  },
};
