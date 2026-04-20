import { expect, fn, userEvent, within } from "storybook/test";
// Replace nextjs-vite with the name of your framework
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Displays a form input field or a component that looks like an input field.
 */
const meta = {
  title: "ui/Input",
  component: Input,
  tags: ["autodocs"],
  argTypes: {},
  args: {
    className: "w-96",
    type: "email",
    placeholder: "Email",
    disabled: false,
    onChange: fn(),
  },
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * 기본 input 필드 스타일입니다. 이메일, 텍스트 등 다양한 타입의 입력을 받을 수 있으며,
 * placeholder로 입력 안내를 제공합니다. 폼에서 가장 기본적인 입력 컴포넌트입니다.
 */
export const Default: Story = {};

/**
 * 파일 업로드를 위한 input 필드입니다. type="file"을 사용하여 사용자가 로컬 파일을 선택할 수 있으며,
 * Label과 함께 사용하여 접근성을 향상시킵니다. 프로필 사진, 문서 첨부 등에 활용됩니다.
 */
export const File: Story = {
  args: {
    type: "file",
    placeholder: undefined,
    className: "max-w-sm",
  },
  render: (args) => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="picture">Picture</Label>
      <Input {...args} id="picture" />
    </div>
  ),
};

/**
 * 비활성화된 input 필드입니다. disabled prop을 사용하여 입력을 막고 흐릿하게 표시하며,
 * 현재 입력을 받을 수 없는 상태임을 시각적으로 나타냅니다. 조건부 폼에서 사용됩니다.
 */
export const Disabled: Story = {
  args: { disabled: true },
};

/**
 * Label과 함께 사용하는 input 필드입니다. Label 컴포넌트를 input 위나 옆에 배치하여
 * 사용자에게 명확한 입력 안내를 제공합니다. htmlFor와 id를 연결하여 접근성을 보장합니다.
 */
export const WithLabel: Story = {
  render: (args) => (
    <div className="grid items-center gap-1.5">
      <Label htmlFor="email">{args.placeholder}</Label>
      <Input {...args} id="email" />
    </div>
  ),
};

/**
 * 도움말 텍스트가 있는 input 필드입니다. input 아래에 설명 텍스트를 배치하여
 * 추가 안내나 입력 형식 정보를 제공합니다. 복잡한 입력 요구사항을 설명할 때 유용합니다.
 */
export const WithHelperText: Story = {
  render: (args) => (
    <div className="grid items-center gap-1.5">
      <Label htmlFor="email-2">{args.placeholder}</Label>
      <Input {...args} id="email-2" />
      <p className="text-foreground/60 text-sm">Enter your email address.</p>
    </div>
  ),
};

/**
 * Button과 함께 사용하는 input 필드입니다. input 옆에 제출 버튼을 배치하여
 * 즉시 액션을 수행할 수 있습니다. 검색, 구독, 빠른 입력 폼 등에 적합합니다.
 */
export const WithButton: Story = {
  render: (args) => (
    <div className="flex w-full max-w-sm items-center space-x-2">
      <Input {...args} />
      <Button type="submit" variant="outline">
        Subscribe
      </Button>
    </div>
  ),
};

export const ShouldEnterText: Story = {
  name: "when user enters text, should see it in the input field",
  tags: ["!dev", "!autodocs"],
  play: async ({ canvas, step }) => {
    const input = await canvas.findByPlaceholderText(/email/i);
    const mockedInput = "mocked@shadcn.com";

    await step("focus and type into the input field", async () => {
      await userEvent.click(input);
      await userEvent.type(input, mockedInput);
    });

    expect(input).toHaveValue(mockedInput);
  },
};

/**
 * Ref 사용 예제: Input에 ref를 전달하여 DOM 요소에 직접 접근합니다.
 * 이 예제는 ref를 통한 focus와 select 제어를 보여줍니다.
 */
export const WithRef: Story = {
  render: () => {
    // 🎯 목적: HTMLInputElement에 대한 ref를 생성하여 focus()와 select() 메서드 접근
    const inputRef = useRef<HTMLInputElement>(null);

    return (
      <div className="grid w-full max-w-sm items-center gap-4">
        <div className="grid items-center gap-1.5">
          <Label htmlFor="target-input">Target Input</Label>
          <Input
            ref={inputRef}
            id="target-input"
            type="text"
            placeholder="Type something..."
            defaultValue="Example text"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.focus()}
          >
            Focus Input
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.select()}
          >
            Select Text
          </Button>
        </div>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    // 🎯 목적: play function을 통해 ref 동작을 자동으로 테스트
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText("Target Input") as HTMLInputElement;
    const focusButton = canvas.getByRole("button", { name: "Focus Input" });
    const selectButton = canvas.getByRole("button", { name: "Select Text" });

    // "Focus Input" 버튼 클릭하여 input에 focus 트리거
    await userEvent.click(focusButton);
    await expect(input).toHaveFocus();

    // "Select Text" 버튼 클릭하여 텍스트 선택 트리거
    await userEvent.click(selectButton);
    await expect(input.selectionStart).toBe(0);
    await expect(input.selectionEnd).toBe(input.value.length);
  },
};
