import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { expect, userEvent, within } from "storybook/test";

export function CardDemo() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Login to your account</CardTitle>
        <CardDescription>
          Enter your email below to login to your account
        </CardDescription>
        <CardAction>
          <Button variant="link">Sign Up</Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <form>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <a
                  href="#"
                  className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                >
                  Forgot your password?
                </a>
              </div>
              <Input id="password" type="password" required />
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <Button type="submit" className="w-full">
          Login
        </Button>
        <Button variant="outline" className="w-full">
          Login with Google
        </Button>
      </CardFooter>
    </Card>
  );
}

/**
 * Displays a card with header, content, and footer.
 */
const meta = {
  title: "ui/Card",
  component: Card,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  excludeStories: /.*Demo$/,
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * 기본 Card 컴포넌트입니다. Header, Content, Footer로 구성되어 정보를 그룹화하며,
 * 로그인 폼 예제처럼 관련 콘텐츠를 하나의 시각적 단위로 묶습니다. 대시보드나 목록 UI에 적합합니다.
 */
export const Default: Story = {
  render: () => <CardDemo />,
};

/**
 * Ref 사용 예제: Card에 ref를 전달하여 DOM 요소에 직접 접근합니다.
 * 이 예제는 ref를 통한 scrollIntoView 제어를 보여줍니다.
 */
export const WithRef: Story = {
  parameters: {
    layout: "padded",
  },
  render: () => {
    // 🎯 목적: HTMLDivElement에 대한 ref를 생성하여 scrollIntoView() 메서드 접근
    const card1Ref = useRef<HTMLDivElement>(null);
    const card2Ref = useRef<HTMLDivElement>(null);
    const card3Ref = useRef<HTMLDivElement>(null);

    return (
      <div className="flex flex-col gap-4">
        <div className="bg-background/95 sticky top-0 z-10 flex gap-2 rounded-md border p-2 backdrop-blur">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              card1Ref.current?.scrollIntoView({
                behavior: "smooth",
                block: "center",
              })
            }
          >
            Scroll to Card 1
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              card2Ref.current?.scrollIntoView({
                behavior: "smooth",
                block: "center",
              })
            }
          >
            Scroll to Card 2
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              card3Ref.current?.scrollIntoView({
                behavior: "smooth",
                block: "center",
              })
            }
          >
            Scroll to Card 3
          </Button>
        </div>

        <Card ref={card1Ref} className="w-full max-w-sm scroll-mt-20">
          <CardHeader>
            <CardTitle>Card 1</CardTitle>
            <CardDescription>First card in the list</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              This is the first card that can be scrolled to using ref.
            </p>
          </CardContent>
        </Card>

        <div className="h-96" />

        <Card ref={card2Ref} className="w-full max-w-sm scroll-mt-20">
          <CardHeader>
            <CardTitle>Card 2</CardTitle>
            <CardDescription>Second card in the list</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              This is the second card that can be scrolled to using ref.
            </p>
          </CardContent>
        </Card>

        <div className="h-96" />

        <Card ref={card3Ref} className="w-full max-w-sm scroll-mt-20">
          <CardHeader>
            <CardTitle>Card 3</CardTitle>
            <CardDescription>Third card in the list</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              This is the third card that can be scrolled to using ref.
            </p>
          </CardContent>
        </Card>

        <div className="h-96" />
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    // 🎯 목적: play function을 통해 ref 동작을 자동으로 테스트
    const canvas = within(canvasElement);
    const button2 = canvas.getByRole("button", { name: "Scroll to Card 2" });

    // "Scroll to Card 2" 버튼 클릭하여 스크롤 트리거
    await userEvent.click(button2);

    // Card 2가 뷰포트에 표시되는지 확인
    const card2 = canvas.getByText("Card 2");
    await expect(card2).toBeVisible();
  },
};
