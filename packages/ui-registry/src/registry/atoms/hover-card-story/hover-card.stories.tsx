import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

/**
 * A hover card with avatar and profile information.
 */
const meta = {
  title: "ui/HoverCard",
  component: HoverCard,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    openDelay: {
      control: "number",
      description:
        "The duration from when the mouse enters the trigger until the hover card opens (ms)",
    },
    closeDelay: {
      control: "number",
      description:
        "The duration from when the mouse leaves the trigger until the hover card closes (ms)",
    },
  },
  args: {
    openDelay: 700,
    closeDelay: 300,
  },
  render: (args) => (
    <HoverCard openDelay={args.openDelay} closeDelay={args.closeDelay}>
      <HoverCardTrigger asChild>
        <Button variant="link">@nextjs</Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="flex justify-between gap-4">
          <Avatar>
            <AvatarImage src="https://github.com/vercel.png" />
            <AvatarFallback>VC</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">@nextjs</h4>
            <p className="text-sm">
              The React Framework – created and maintained by @vercel.
            </p>
            <div className="text-muted-foreground text-xs">
              Joined December 2021
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
} satisfies Meta<typeof HoverCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default hover card showing user profile information.
 */
export const Default: Story = {
  render: (args) => (
    <HoverCard openDelay={args.openDelay} closeDelay={args.closeDelay}>
      <HoverCardTrigger asChild>
        <Button variant="link">@nextjs</Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="flex justify-between gap-4">
          <Avatar>
            <AvatarImage src="https://github.com/vercel.png" />
            <AvatarFallback>VC</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">@nextjs</h4>
            <p className="text-sm">
              The React Framework – created and maintained by @vercel.
            </p>
            <div className="text-muted-foreground text-xs">
              Joined December 2021
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
};

export const ShouldShowHoverCard: Story = {
  name: "when hovering over trigger, should show hover card content",
  tags: ["!dev", "!autodocs"],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 🎯 목적: Hover Card가 트리거에 호버 시 열리고, 콘텐츠가 표시되는지 확인
    const trigger = canvas.getByRole("button", { name: /@nextjs/i });
    await expect(trigger).toBeInTheDocument();

    // 트리거에 호버하여 Hover Card 열기
    await userEvent.hover(trigger);

    // Hover Card 콘텐츠가 표시되는지 확인
    await waitFor(async () => {
      const heading = await canvas.findByRole("heading", {
        name: /@nextjs/i,
      });
      await expect(heading).toBeInTheDocument();
    });

    // 추가 콘텐츠 확인
    const description = canvas.getByText(
      /the react framework – created and maintained by @vercel/i,
    );
    await expect(description).toBeInTheDocument();

    // 호버 해제
    await userEvent.unhover(trigger);
  },
};

export const ShouldHideOnUnhover: Story = {
  name: "when unhover from trigger, should hide hover card content",
  tags: ["!dev", "!autodocs"],
  render: () => (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button variant="link" data-testid="hover-trigger">
          @nextjs
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80" data-testid="hover-content">
        <div className="flex justify-between gap-4">
          <Avatar>
            <AvatarImage src="https://github.com/vercel.png" />
            <AvatarFallback>VC</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold" data-testid="profile-name">
              @nextjs
            </h4>
            <p className="text-sm" data-testid="profile-description">
              The React Framework – created and maintained by @vercel.
            </p>
            <div
              className="text-muted-foreground text-xs"
              data-testid="joined-date"
            >
              Joined December 2021
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 🎯 목적: Hover Card가 호버 해제 시 사라지고, 모든 콘텐츠가 올바르게 표시되는지 확인

    // 트리거 확인
    const trigger = canvas.getByTestId("hover-trigger");
    await expect(trigger).toBeInTheDocument();

    // Hover Card 콘텐츠가 초기에는 보이지 않음
    const content = canvas.queryByTestId("hover-content");
    expect(content).not.toBeInTheDocument();

    // 트리거에 호버하여 Hover Card 열기
    await userEvent.hover(trigger);

    // Hover Card 콘텐츠가 표시될 때까지 대기
    await waitFor(
      async () => {
        const profileName = await canvas.findByTestId("profile-name");
        await expect(profileName).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    // 모든 콘텐츠 확인
    const profileName = canvas.getByTestId("profile-name");
    await expect(profileName).toHaveTextContent("@nextjs");

    const profileDescription = canvas.getByTestId("profile-description");
    await expect(profileDescription).toHaveTextContent(
      "The React Framework – created and maintained by @vercel.",
    );

    const joinedDate = canvas.getByTestId("joined-date");
    await expect(joinedDate).toHaveTextContent("Joined December 2021");

    // 호버 해제
    await userEvent.unhover(trigger);

    // Hover Card 콘텐츠가 사라지는지 확인
    await waitFor(
      () => {
        const hiddenContent = canvas.queryByTestId("hover-content");
        expect(hiddenContent).not.toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  },
};
