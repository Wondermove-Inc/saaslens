import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Copy } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { expect, fn, userEvent, within } from "storybook/test";

function DialogDemo() {
  return (
    <Dialog>
      <form>
        <DialogTrigger asChild>
          <Button variant="outline">Open Dialog</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>
              Make changes to your profile here. Click save when you&apos;re
              done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="name-1">Name</Label>
              <Input id="name-1" name="name" defaultValue="Pedro Duarte" />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="username-1">Username</Label>
              <Input id="username-1" name="username" defaultValue="@peduarte" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}

// Custom Close Button Dialog (Share)
function CustomCloseButtonDemo() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Share</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share link</DialogTitle>
          <DialogDescription>
            Anyone who has this link will be able to view this.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="link" className="sr-only">
              Link
            </Label>
            <Input
              id="link"
              defaultValue="https://ui.shadcn.com/docs/installation"
              readOnly
            />
          </div>
          <Button type="submit" size="sm" className="px-3">
            <span className="sr-only">Copy</span>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * A dialog component for editing user profile information.
 */
const meta = {
  title: "ui/Dialog",
  component: Dialog,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  args: {
    onOpenChange: fn(),
  },
  excludeStories: /.*Demo$/,
} satisfies Meta<typeof Dialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * 기본 Dialog 모달입니다. 프로필 수정 폼 예제로 제목, 설명, 입력 필드, 버튼을 포함하며,
 * 중요한 작업이나 추가 정보 입력이 필요할 때 사용합니다. 모달 오버레이로 집중도를 높입니다.
 */
export const Default: Story = {
  render: () => <DialogDemo />,
};

/**
 * 커스텀 닫기 버튼이 있는 Dialog입니다. 링크 공유 UI 예제로 읽기 전용 input과 복사 버튼을 제공하며,
 * DialogClose를 사용해 취소 액션을 구현합니다. 공유, 알림 등 정보 표시용 모달에 적합합니다.
 */
export const CustomCloseButton: Story = {
  render: () => <CustomCloseButtonDemo />,
};

/**
 * Ref 사용 예제: DialogContent에 ref를 전달하여 Radix UI primitive에 접근합니다.
 * 이 예제는 프로그래매틱하게 Dialog를 열고 닫는 방법을 보여줍니다.
 */
export const WithRef: Story = {
  render: () => {
    // 🎯 목적: Radix UI Dialog primitive의 ElementRef 타입을 사용하여 ref 생성
    const contentRef =
      useRef<React.ElementRef<typeof DialogPrimitive.Content>>(null);
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setMessage("Form submitted successfully!");
      // 3초 후 Dialog 닫기
      setTimeout(() => {
        setOpen(false);
        setMessage("");
      }, 3000);
    };

    return (
      <div className="flex flex-col gap-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">Open Controlled Dialog</Button>
          </DialogTrigger>
          <DialogContent ref={contentRef} className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Controlled Dialog Example</DialogTitle>
              <DialogDescription>
                This dialog can be controlled programmatically using state and
                ref.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4">
                <div className="grid gap-3">
                  <Label htmlFor="email-input">Email</Label>
                  <Input
                    id="email-input"
                    type="email"
                    placeholder="example@email.com"
                    required
                  />
                </div>
                {message && (
                  <div className="text-sm text-green-600 dark:text-green-400">
                    {message}
                  </div>
                )}
              </div>
              <DialogFooter className="mt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit">Submit</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
            Open via State
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
            Close via State
          </Button>
        </div>

        <p className="text-muted-foreground text-sm">
          Dialog state: {open ? "Open" : "Closed"}
        </p>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    // 🎯 목적: play function을 통해 Dialog ref와 상태 제어를 테스트
    const canvas = within(canvasElement);

    // "Open via State" 버튼으로 Dialog 열기
    const openButton = canvas.getByRole("button", { name: "Open via State" });
    await userEvent.click(openButton);

    // Dialog가 열렸는지 확인
    const dialogTitle = await canvas.findByText("Controlled Dialog Example");
    await expect(dialogTitle).toBeVisible();

    // Dialog 상태 텍스트 확인
    const stateText = canvas.getByText(/Dialog state:/);
    await expect(stateText).toHaveTextContent("Dialog state: Open");
  },
};
