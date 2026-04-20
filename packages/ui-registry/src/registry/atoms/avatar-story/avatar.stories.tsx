import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, waitFor, within } from "storybook/test";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AvatarDemo() {
  return (
    <div className="flex flex-row flex-wrap items-center gap-12">
      <Avatar>
        <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
      <Avatar className="rounded-lg">
        <AvatarImage
          src="https://github.com/evilrabbit.png"
          alt="@evilrabbit"
        />
        <AvatarFallback>ER</AvatarFallback>
      </Avatar>
      <div className="*:data-[slot=avatar]:ring-background flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:grayscale">
        <Avatar>
          <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarImage src="https://github.com/leerob.png" alt="@leerob" />
          <AvatarFallback>LR</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarImage
            src="https://github.com/evilrabbit.png"
            alt="@evilrabbit"
          />
          <AvatarFallback>ER</AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}

/**
 * An image element with a fallback for representing the user.
 */
const meta = {
  title: "ui/Avatar",
  component: Avatar,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  excludeStories: /.*Demo$/,
  argTypes: {
    className: {
      control: "text",
      description:
        "Additional CSS classes (e.g., 'h-16 w-16' for large size, 'rounded-lg' for square)",
    },
  },
  args: {
    className: "",
  },
  render: (args) => (
    <Avatar className={args.className}>
      <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar>
  ),
} satisfies Meta<typeof Avatar>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default form of the avatar.
 */
export const Default: Story = {};

/**
 * Basic avatar with image and fallback.
 */
export const Basic: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar>
  ),
};

/**
 * Avatar with rounded corners.
 */
export const Rounded: Story = {
  render: () => (
    <Avatar className="rounded-lg">
      <AvatarImage src="https://github.com/evilrabbit.png" alt="@evilrabbit" />
      <AvatarFallback>ER</AvatarFallback>
    </Avatar>
  ),
};

/**
 * Stacked avatars with grayscale effect.
 */
export const Stacked: Story = {
  render: () => (
    <div className="*:data-[slot=avatar]:ring-background flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:grayscale">
      <Avatar>
        <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarImage src="https://github.com/leerob.png" alt="@leerob" />
        <AvatarFallback>LR</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarImage
          src="https://github.com/evilrabbit.png"
          alt="@evilrabbit"
        />
        <AvatarFallback>ER</AvatarFallback>
      </Avatar>
    </div>
  ),
};

/**
 * Avatar with only fallback (no image).
 */
export const FallbackOnly: Story = {
  render: () => (
    <Avatar>
      <AvatarFallback>AB</AvatarFallback>
    </Avatar>
  ),
};

/**
 * Avatar 이미지 폴백을 테스트합니다.
 */
export const ShouldShowFallbackOnImageError: Story = {
  name: "when image fails to load, should display fallback text",
  tags: ["!dev", "!autodocs"],
  render: () => (
    <div className="flex gap-4">
      <Avatar>
        <AvatarImage
          src="https://invalid-url-that-will-fail.example/image.png"
          alt="@invalid"
        />
        <AvatarFallback data-testid="fallback">FB</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 🎯 목적: 이미지 로딩 실패 시 fallback 텍스트가 표시되는지 확인

    // Fallback이 표시될 때까지 대기
    await waitFor(
      async () => {
        const fallback = await canvas.findByTestId("fallback");
        await expect(fallback).toBeInTheDocument();
        await expect(fallback).toHaveTextContent("FB");
      },
      { timeout: 3000 },
    );

    // 두 번째 Avatar는 정상 이미지이므로 img가 로드되어야 함
    const images = canvas.getAllByRole("img");
    await waitFor(
      () => {
        // 최소 하나의 이미지가 로드됨
        expect(images.length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );
  },
};
