import { Badge } from "@/components/ui/badge";
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
  InputGroupButton,
  InputGroupInput,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Item, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ArrowUp as ArrowUpIcon, FileDown } from "lucide-react";

/**
 * Displays an animated loading indicator.
 * Used to communicate ongoing processes or data fetching.
 */
const meta = {
  title: "ui/Spinner",
  component: Spinner,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 기본 사용 예제입니다.
 * 결제 처리 중과 같은 실제 사용 사례를 보여줍니다.
 */
export const BasicUsage: Story = {
  render: () => (
    <div className="flex w-full max-w-xs flex-col gap-4 [--radius:1rem]">
      <Item variant="muted">
        <ItemMedia>
          <Spinner />
        </ItemMedia>
        <ItemContent>
          <ItemTitle className="line-clamp-1">Processing payment...</ItemTitle>
        </ItemContent>
        <ItemContent className="flex-none justify-end">
          <span className="text-sm tabular-nums">$100.00</span>
        </ItemContent>
      </Item>
    </div>
  ),
};

/**
 * 다양한 크기의 스피너입니다.
 * size-3부터 size-8까지 다양한 크기로 사용할 수 있습니다.
 */
export const Size: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <Spinner className="size-3" />
      <Spinner className="size-4" />
      <Spinner className="size-6" />
      <Spinner className="size-8" />
    </div>
  ),
};

/**
 * 다양한 색상의 스피너입니다.
 * Tailwind 텍스트 색상 클래스를 사용하여 색상을 변경할 수 있습니다.
 */
export const Color: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <Spinner className="size-6 text-red-500" />
      <Spinner className="size-6 text-green-500" />
      <Spinner className="size-6 text-blue-500" />
      <Spinner className="size-6 text-yellow-500" />
      <Spinner className="size-6 text-purple-500" />
    </div>
  ),
};

/**
 * 버튼 로딩 상태입니다.
 * 버튼 내부에 스피너를 표시하여 진행 중인 작업을 나타냅니다.
 */
export const ButtonLoading: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Button size="sm" disabled>
        <Spinner />
        Loading...
      </Button>
      <Button variant="outline" disabled>
        <Spinner />
        Please wait
      </Button>
      <Button variant="secondary" disabled>
        <Spinner />
        Processing
      </Button>
    </div>
  ),
};

/**
 * 배지 로딩 상태입니다.
 * 배지 내부에 스피너를 표시하여 상태를 나타냅니다.
 */
export const BadgeLoading: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge>
        <Spinner />
        Syncing
      </Badge>
      <Badge variant="secondary">
        <Spinner />
        Updating
      </Badge>
      <Badge variant="outline">
        <Spinner />
        Processing
      </Badge>
    </div>
  ),
};

/**
 * 입력 그룹과 함께 사용하는 예제입니다.
 * 입력 필드 내에서 검증이나 검색 중임을 표시합니다.
 */
export const InputGroupExample: Story = {
  render: () => (
    <div className="flex w-full max-w-md flex-col gap-4">
      <InputGroup>
        <InputGroupInput placeholder="Send a message..." disabled />
        <InputGroupAddon align="inline-end">
          <Spinner />
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupTextarea placeholder="Send a message..." disabled />
        <InputGroupAddon align="block-end">
          <Spinner /> Validating...
          <InputGroupButton className="ml-auto" variant="default">
            <ArrowUpIcon />
            <span className="sr-only">Send</span>
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  ),
};

/**
 * 빈 상태에서 사용하는 예제입니다.
 * 콘텐츠를 로딩 중일 때 Empty 컴포넌트와 함께 사용합니다.
 */
export const EmptyState: Story = {
  render: () => (
    <Empty className="w-full">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Spinner />
        </EmptyMedia>
        <EmptyTitle>Processing your request</EmptyTitle>
        <EmptyDescription>
          Please wait while we process your request. Do not refresh the page.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" disabled>
          Cancel
        </Button>
      </EmptyContent>
    </Empty>
  ),
};

/**
 * 아이템 로딩 상태입니다.
 * 다운로드나 처리 중인 아이템을 표시합니다.
 */
export const ItemLoading: Story = {
  render: () => (
    <div className="w-full max-w-md">
      <Item>
        <ItemMedia variant="icon">
          <FileDown />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Report_Q4_2023.pdf</ItemTitle>
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Spinner className="size-3" />
            Downloading...
          </div>
        </ItemContent>
      </Item>
    </div>
  ),
};
