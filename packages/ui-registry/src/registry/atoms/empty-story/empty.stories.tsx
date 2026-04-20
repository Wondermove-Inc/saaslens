import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ArrowUpRight, Bell, Cloud, FolderCode, Search } from "lucide-react";

/**
 * Use the Empty component to display a empty state.
 * Provides a flexible and visually appealing way to show empty or placeholder states.
 */
const meta = {
  title: "ui/Empty",
  component: Empty,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Empty>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 공식 문서의 기본 Demo 예제입니다.
 * 프로젝트가 없을 때 표시되며 생성 및 가져오기 액션을 제공합니다.
 */
export const Demo: Story = {
  render: () => (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderCode />
        </EmptyMedia>
        <EmptyTitle>No Projects Yet</EmptyTitle>
        <EmptyDescription>
          You haven't created any projects yet. Get started by creating your
          first project.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div className="flex gap-2">
          <Button>Create Project</Button>
          <Button variant="outline">Import Project</Button>
        </div>
      </EmptyContent>
      <Button
        variant="link"
        asChild
        className="text-muted-foreground"
        size="sm"
      >
        <a href="#">
          Learn More <ArrowUpRight className="ml-1 h-3 w-3" />
        </a>
      </Button>
    </Empty>
  ),
};

/**
 * Outline 변형입니다.
 * 점선 테두리로 빈 상태를 강조합니다.
 */
export const Outline: Story = {
  render: () => (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Cloud />
        </EmptyMedia>
        <EmptyTitle>Cloud Storage Empty</EmptyTitle>
        <EmptyDescription>
          Upload files to your cloud storage to access them anywhere.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" size="sm">
          Upload Files
        </Button>
      </EmptyContent>
    </Empty>
  ),
};

/**
 * Background 변형입니다.
 * 그라데이션 배경을 사용하여 시각적 효과를 제공합니다.
 */
export const Background: Story = {
  render: () => (
    <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30%">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Bell />
        </EmptyMedia>
        <EmptyTitle>No Notifications</EmptyTitle>
        <EmptyDescription>You're all caught up.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  ),
};

/**
 * Avatar를 사용한 빈 상태입니다.
 * 단일 아바타를 표시합니다.
 */
export const WithAvatar: Story = {
  render: () => (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <Avatar className="size-24">
            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
        </EmptyMedia>
        <EmptyTitle>Welcome to Your Profile</EmptyTitle>
        <EmptyDescription>
          Complete your profile to get started with the platform.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button>Complete Profile</Button>
      </EmptyContent>
    </Empty>
  ),
};

/**
 * Avatar Group을 사용한 빈 상태입니다.
 * 여러 아바타를 표시하여 팀 멤버 초대를 유도합니다.
 */
export const AvatarGroup: Story = {
  render: () => (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <div className="*:data-[slot=avatar]:ring-background flex -space-x-2 *:data-[slot=avatar]:size-12 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:grayscale">
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarImage
                src="https://github.com/maxleiter.png"
                alt="@maxleiter"
              />
              <AvatarFallback>ML</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarImage
                src="https://github.com/evilrabbit.png"
                alt="@evilrabbit"
              />
              <AvatarFallback>ER</AvatarFallback>
            </Avatar>
          </div>
        </EmptyMedia>
        <EmptyTitle>No Team Members</EmptyTitle>
        <EmptyDescription>Invite your team to collaborate</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button>Invite Team</Button>
      </EmptyContent>
    </Empty>
  ),
};

/**
 * InputGroup을 포함한 빈 상태입니다.
 * 검색 기능을 제공하는 빈 상태를 표시합니다.
 */
export const WithInputGroup: Story = {
  render: () => (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Search />
        </EmptyMedia>
        <EmptyTitle>No Pages Found</EmptyTitle>
        <EmptyDescription>
          Try searching for different keywords
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <InputGroup className="sm:w-3/4">
          <InputGroupInput placeholder="Try searching for pages..." />
          <InputGroupAddon>
            <Search className="h-4 w-4" />
          </InputGroupAddon>
          <InputGroupAddon align="inline-end">
            <Kbd>/</Kbd>
          </InputGroupAddon>
        </InputGroup>
      </EmptyContent>
    </Empty>
  ),
};
