import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Bold, Code, Italic, SearchIcon, Underline } from "lucide-react";

/**
 * Used to display textual user input from keyboard.
 * Shows keyboard keys and shortcuts in a visually distinct style.
 */
const meta = {
  title: "ui/Kbd",
  component: Kbd,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * KbdGroup을 사용한 키보드 단축키 표시입니다.
 * 문장 내에서 여러 키 조합을 보여줍니다.
 */
export const Group: Story = {
  render: () => (
    <div className="flex flex-col items-center gap-4">
      <p className="text-muted-foreground text-sm">
        Use{" "}
        <KbdGroup>
          <Kbd>Ctrl + B</Kbd>
          <Kbd>Ctrl + K</Kbd>
        </KbdGroup>{" "}
        to open the command palette
      </p>
    </div>
  ),
};

/**
 * 버튼 내부에서 Kbd 사용 예제입니다.
 * 버튼의 액션과 관련된 키보드 단축키를 표시합니다.
 */
export const ButtonExample: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button variant="outline" size="sm" className="pr-2">
        Accept <Kbd>⏎</Kbd>
      </Button>
      <Button variant="outline" size="sm" className="pr-2">
        Cancel <Kbd>Esc</Kbd>
      </Button>
    </div>
  ),
};

/**
 * 툴팁과 함께 Kbd를 사용하는 예제입니다.
 * 툴팁 내부에서 키보드 단축키 정보를 제공합니다.
 */
export const TooltipExample: Story = {
  render: () => (
    <ButtonGroup>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant="outline">
            <Bold />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Bold <Kbd>⌘ B</Kbd>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant="outline">
            <Italic />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Italic <Kbd>⌘ I</Kbd>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant="outline">
            <Underline />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Underline <Kbd>⌘ U</Kbd>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant="outline">
            <Code />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Code <Kbd>⌘ `</Kbd>
        </TooltipContent>
      </Tooltip>
    </ButtonGroup>
  ),
};

/**
 * Input Group과 함께 Kbd를 사용하는 예제입니다.
 * 검색 입력 필드에 키보드 단축키를 표시합니다.
 */
export const InputGroupExample: Story = {
  render: () => (
    <div className="flex w-full max-w-xs flex-col gap-6">
      <InputGroup>
        <InputGroupInput placeholder="Search..." />
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </InputGroupAddon>
      </InputGroup>
    </div>
  ),
};
