import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  ArrowUpIcon,
  ChevronDownIcon,
  Copy,
  Eye,
  EyeOff,
  InfoIcon,
  LoaderIcon,
  PlusIcon,
  Search,
  XIcon,
} from "lucide-react";
import * as React from "react";

/**
 * Groups input elements with related buttons, icons, or text.
 * Provides a consistent way to enhance inputs with additional functionality.
 */
const meta = {
  title: "ui/InputGroup",
  component: InputGroup,
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
} satisfies Meta<typeof InputGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 기본 입력 그룹입니다.
 * 입력 필드와 관련 요소들을 그룹화합니다.
 */
export const Default: Story = {
  render: () => (
    <InputGroup className="w-[300px]">
      <InputGroupInput placeholder="Search..." />
    </InputGroup>
  ),
};

/**
 * InputGroupDemo 예제입니다.
 * 다양한 입력 그룹 패턴을 보여줍니다.
 */
export const Demo: Story = {
  render: () => (
    <div className="grid w-full max-w-sm gap-6">
      <InputGroup>
        <InputGroupInput placeholder="Search..." />
        <InputGroupAddon>
          <Search className="h-4 w-4" />
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">12 results</InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput placeholder="example.com" className="!pl-1" />
        <InputGroupAddon>
          <InputGroupText>https://</InputGroupText>
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <InputGroupButton className="rounded-full" size="icon-xs">
                <InfoIcon className="h-4 w-4" />
              </InputGroupButton>
            </TooltipTrigger>
            <TooltipContent>This is content in a tooltip.</TooltipContent>
          </Tooltip>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupTextarea placeholder="Ask, Search or Chat..." />
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="icon-xs">
            <ArrowUpIcon />
          </InputGroupButton>
          <Kbd>Enter</Kbd>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupAddon>
          <InputGroupButton size="icon-xs">
            <PlusIcon />
          </InputGroupButton>
          <span className="h-3 w-px border-r" />
        </InputGroupAddon>
        <InputGroupInput placeholder="0" />
        <InputGroupAddon align="inline-end">
          <span className="h-3 w-px border-r" />
          <InputGroupButton size="icon-xs">
            <XIcon />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  ),
};

/**
 * 검색 입력 그룹입니다.
 * 검색 아이콘과 함께 사용합니다.
 */
export const SearchInput: Story = {
  render: () => (
    <InputGroup className="w-[300px]">
      <InputGroupAddon>
        <Search className="h-4 w-4" />
      </InputGroupAddon>
      <InputGroupInput placeholder="Search products..." />
    </InputGroup>
  ),
};

/**
 * URL 입력 그룹입니다.
 * URL 프리픽스와 함께 사용합니다.
 */
export const UrlInput: Story = {
  render: () => (
    <InputGroup className="w-[400px]">
      <InputGroupAddon>
        <InputGroupText>https://</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput placeholder="www.example.com" />
      <InputGroupAddon align="inline-end">
        <InputGroupButton>
          <Copy className="h-4 w-4" />
          Copy
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
};

/**
 * 비밀번호 입력 그룹입니다.
 * 비밀번호 표시/숨기기 토글 버튼을 포함합니다.
 */
export const PasswordInput: Story = {
  render: function PasswordInputDemo() {
    const [showPassword, setShowPassword] = React.useState(false);

    return (
      <InputGroup className="w-[300px]">
        <InputGroupInput
          type={showPassword ? "text" : "password"}
          placeholder="Enter password"
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    );
  },
};

/**
 * 로딩 상태의 입력 그룹입니다.
 * 로딩 인디케이터를 표시합니다.
 */
export const WithLoading: Story = {
  render: () => (
    <InputGroup className="w-[300px]">
      <InputGroupInput placeholder="Loading data..." disabled />
      <InputGroupAddon align="inline-end">
        <LoaderIcon className="h-4 w-4 animate-spin" />
      </InputGroupAddon>
    </InputGroup>
  ),
};

/**
 * 드롭다운 메뉴가 있는 입력 그룹입니다.
 * 추가 옵션을 제공합니다.
 */
export const WithDropdown: Story = {
  render: () => (
    <InputGroup className="w-[300px]">
      <InputGroupInput placeholder="Select action..." />
      <InputGroupAddon align="inline-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <InputGroupButton size="icon-sm">
              <ChevronDownIcon className="h-4 w-4" />
            </InputGroupButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Copy</DropdownMenuItem>
            <DropdownMenuItem>Paste</DropdownMenuItem>
            <DropdownMenuItem>Cut</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </InputGroupAddon>
    </InputGroup>
  ),
};

/**
 * 여러 버튼이 있는 입력 그룹입니다.
 * 여러 액션을 제공합니다.
 */
export const WithMultipleButtons: Story = {
  render: () => (
    <InputGroup className="w-[400px]">
      <InputGroupInput placeholder="Enter text..." />
      <InputGroupAddon align="inline-end">
        <InputGroupButton size="icon-xs">
          <Copy className="h-4 w-4" />
        </InputGroupButton>
        <Separator orientation="vertical" className="h-4" />
        <InputGroupButton size="icon-xs">
          <XIcon className="h-4 w-4" />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
};

/**
 * Textarea가 있는 입력 그룹입니다.
 * 여러 줄 입력과 액션 버튼을 포함합니다.
 */
export const WithTextarea: Story = {
  render: () => (
    <InputGroup className="w-[400px]">
      <InputGroupTextarea placeholder="Type your message..." rows={4} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton size="icon-xs">
          <ArrowUpIcon className="h-4 w-4" />
        </InputGroupButton>
        <Kbd>⏎</Kbd>
      </InputGroupAddon>
    </InputGroup>
  ),
};

/**
 * 블록 정렬 addon이 있는 입력 그룹입니다.
 * 상단이나 하단에 전체 너비로 addon을 배치합니다.
 */
export const WithBlockAddon: Story = {
  render: () => (
    <div className="w-[400px] space-y-4">
      <InputGroup>
        <InputGroupAddon align="block-start">
          <InputGroupText>Title</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput placeholder="Enter title..." />
      </InputGroup>
      <InputGroup>
        <InputGroupInput placeholder="Enter description..." />
        <InputGroupAddon align="block-end">
          <InputGroupText className="text-muted-foreground">
            Maximum 100 characters
          </InputGroupText>
        </InputGroupAddon>
      </InputGroup>
    </div>
  ),
};

/**
 * 인라인 텍스트가 있는 입력 그룹입니다.
 * 입력 필드 내부에 텍스트를 포함합니다.
 */
export const WithInlineText: Story = {
  render: () => (
    <div className="w-[400px] space-y-4">
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>$</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput placeholder="0.00" />
        <InputGroupAddon align="inline-end">
          <InputGroupText>USD</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput placeholder="username" />
        <InputGroupAddon align="inline-end">
          <InputGroupText>@example.com</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
    </div>
  ),
};

/**
 * 숫자 입력 그룹입니다.
 * 증가/감소 버튼을 포함합니다.
 */
export const NumberInput: Story = {
  render: function NumberInputDemo() {
    const [value, setValue] = React.useState("0");

    return (
      <InputGroup className="w-[200px]">
        <InputGroupAddon>
          <InputGroupButton
            size="icon-xs"
            onClick={() => setValue(String(Math.max(0, Number(value) - 1)))}
          >
            <XIcon className="h-4 w-4" />
          </InputGroupButton>
          <span className="h-3 w-px border-r" />
        </InputGroupAddon>
        <InputGroupInput
          placeholder="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="text-center"
        />
        <InputGroupAddon align="inline-end">
          <span className="h-3 w-px border-r" />
          <InputGroupButton
            size="icon-xs"
            onClick={() => setValue(String(Number(value) + 1))}
          >
            <PlusIcon className="h-4 w-4" />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    );
  },
};

/**
 * 오류 상태의 입력 그룹입니다.
 * 유효성 검사 실패를 나타냅니다.
 */
export const ErrorState: Story = {
  render: () => (
    <InputGroup className="w-[300px]">
      <InputGroupInput placeholder="Enter email..." aria-invalid="true" />
      <InputGroupAddon align="inline-end">
        <XIcon className="text-destructive h-4 w-4" />
      </InputGroupAddon>
    </InputGroup>
  ),
};

/**
 * 비활성화된 입력 그룹입니다.
 * 모든 요소가 비활성화됩니다.
 */
export const DisabledState: Story = {
  render: () => (
    <InputGroup className="w-[300px]" data-disabled="true">
      <InputGroupAddon>
        <Search className="h-4 w-4" />
      </InputGroupAddon>
      <InputGroupInput placeholder="Search..." disabled />
      <InputGroupAddon align="inline-end">
        <InputGroupButton size="icon-xs" disabled>
          <XIcon className="h-4 w-4" />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
};
