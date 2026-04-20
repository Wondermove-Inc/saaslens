import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChevronRight, Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { expect, fn, userEvent, within } from "storybook/test";

export function ButtonDemo() {
  return <Button>Button</Button>;
}

/**
 * Displays a button or a component that looks like a button.
 */
const meta = {
  title: "ui/Button",
  component: Button,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    design: {
      type: "figma",
      url: "https://www.figma.com/file/Q7c53iozMSDxpPnunZsEM6/shadcn-ui-kit-for-Figma---August-2025?node-id=580-9181",
    },
  },
  args: {
    children: "Button",
    variant: "default",
    size: "default",
    disabled: false,
    onClick: fn(),
  },
  excludeStories: /.*Demo$/,
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * 기본 버튼 스타일입니다. 주요 액션이나 제출 버튼으로 사용하며,
 * 가장 눈에 띄는 시각적 강조를 제공합니다.
 */
export const Default: Story = {};

/**
 * 보조 액션에 사용하는 secondary variant입니다.
 * 주요 버튼보다 덜 강조되며, 취소나 뒤로가기 같은 부차적인 액션에 적합합니다.
 */
export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: "Secondary",
  },
};

/**
 * 삭제나 파괴적인 액션에 사용하는 destructive variant입니다.
 * 빨간색 계열로 표시되어 사용자에게 신중한 결정을 유도합니다.
 */
export const Destructive: Story = {
  args: {
    variant: "destructive",
    children: "Destructive",
  },
};

/**
 * 테두리만 있는 outline variant입니다.
 * 배경이 투명하여 가벼운 느낌을 주며, 보조 액션이나 필터 버튼에 적합합니다.
 */
export const Outline: Story = {
  args: {
    variant: "outline",
    children: "Outline",
  },
};

/**
 * 테두리와 배경이 없는 ghost variant입니다.
 * 호버 시에만 배경이 나타나며, 네비게이션이나 드롭다운 메뉴에 사용됩니다.
 */
export const Ghost: Story = {
  args: {
    variant: "ghost",
    children: "Ghost",
  },
};

/**
 * 링크처럼 보이는 link variant입니다.
 * 밑줄이 있는 텍스트 스타일로, 인라인 텍스트 내에서 버튼 기능이 필요할 때 사용합니다.
 */
export const LinkVariant: Story = {
  args: {
    variant: "link",
    children: "Link",
  },
};

/**
 * 아이콘만 표시하는 버튼입니다. size="icon"을 사용하여 정사각형 모양으로 만들며,
 * 툴바나 액션 아이콘 버튼에 적합합니다. 접근성을 위해 aria-label 추가를 권장합니다.
 */
export const Icon: Story = {
  render: () => (
    <Button variant="outline" size="icon">
      <ChevronRight className="h-4 w-4" />
    </Button>
  ),
};

/**
 * 텍스트와 아이콘을 함께 표시하는 버튼입니다.
 * 아이콘을 텍스트 앞에 배치하여 버튼의 기능을 시각적으로 강조할 수 있습니다.
 */
export const WithIcon: Story = {
  render: () => (
    <Button>
      <Mail className="mr-2 h-4 w-4" /> Login with Email
    </Button>
  ),
};

/**
 * 로딩 상태를 표시하는 버튼입니다. disabled 상태와 함께 spinner 아이콘을 표시하여
 * 비동기 작업이 진행 중임을 사용자에게 알립니다.
 */
export const Loading: Story = {
  render: () => (
    <Button disabled>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Please wait
    </Button>
  ),
};

/**
 * asChild prop을 사용하여 Button의 스타일을 다른 컴포넌트에 적용합니다.
 * Next.js Link나 React Router Link 등을 버튼처럼 스타일링할 때 유용합니다.
 */
export const AsChild: Story = {
  render: () => (
    <Button asChild>
      <Link href="/login">Login</Link>
    </Button>
  ),
};

/**
 * Ref 사용 예제: Button에 ref를 전달하여 DOM 요소에 직접 접근합니다.
 * 이 예제는 ref를 통한 focus 제어를 보여줍니다.
 */
export const WithRef: Story = {
  render: () => {
    // 🎯 목적: HTMLButtonElement에 대한 ref를 생성하여 focus() 메서드 접근
    const buttonRef = useRef<HTMLButtonElement>(null);

    return (
      <div className="flex flex-col gap-4">
        <Button ref={buttonRef}>Target Button</Button>
        <Button variant="outline" onClick={() => buttonRef.current?.focus()}>
          Focus Button Above
        </Button>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    // 🎯 목적: play function을 통해 ref 동작을 자동으로 테스트
    const canvas = within(canvasElement);
    const buttons = canvas.getAllByRole("button");

    // "Focus Button Above" 버튼 클릭하여 첫 번째 버튼에 focus 트리거
    await userEvent.click(buttons[1]);

    // 첫 번째 버튼이 포커스를 받았는지 검증
    await expect(buttons[0]).toHaveFocus();
  },
};
