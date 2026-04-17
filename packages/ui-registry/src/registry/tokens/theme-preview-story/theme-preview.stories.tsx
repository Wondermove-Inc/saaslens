"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * 🎯 목적: OKLCH 테마 미리보기 및 디자인 토큰 시각화
 *
 * 이 스토리는 프로젝트에 적용된 OKLCH 색상 체계를 시각적으로 보여줍니다.
 * - OKLCH(Oklab Lightness Chroma Hue): 지각적으로 균일한 색 공간
 * - 더 넓은 색역(P3) 지원으로 더 생생한 색상 표현 가능
 * - 브라우저 호환성: 93% (PostCSS fallback으로 100%)
 * - Light/Dark 모드 전환 지원
 */
const meta = {
  title: "design/Theme Preview",
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "OKLCH 색상 체계를 사용한 전체 테마 미리보기. 모든 디자인 토큰과 실제 컴포넌트 적용 예시를 확인할 수 있습니다.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 🎨 전체 테마 미리보기
 *
 * 프로젝트의 모든 색상 토큰을 시각적으로 표시합니다.
 * 우측 상단의 테마 전환 버튼으로 Light/Dark 모드를 전환할 수 있습니다.
 */
export const AllTokens: Story = {
  render: () => {
    const [theme, setTheme] = useState<"light" | "dark">("light");

    // 🎯 목적: Storybook iframe의 실제 <html> 요소에 테마 클래스 적용
    // <html>/<body> 태그를 직접 렌더링하지 않고 document.documentElement 조작
    useEffect(() => {
      document.documentElement.className =
        theme === "dark" ? "theme-default-dark" : "theme-default-light";
    }, [theme]);

    return (
      <div className="relative space-y-8">
        {/* Theme Switcher Button */}
        <div className="absolute top-4 right-4 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Sun className="h-5 w-5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                <Moon className="absolute h-5 w-5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                <span className="sr-only">테마 전환</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setTheme("light")}
                className={theme === "light" ? "bg-accent" : ""}
              >
                <Sun className="mr-2 h-4 w-4" />
                <span>라이트</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTheme("dark")}
                className={theme === "dark" ? "bg-accent" : ""}
              >
                <Moon className="mr-2 h-4 w-4" />
                <span>다크</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {/* 색상 팔레트 섹션 */}
        <section>
          <h2 className="mb-4 text-2xl font-bold">색상 팔레트</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Background Colors */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Background</CardTitle>
                <CardDescription>배경 색상</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="bg-background h-10 w-10 rounded-md border" />
                  <code className="text-sm">--background</code>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-foreground h-10 w-10 rounded-md border" />
                  <code className="text-sm">--foreground</code>
                </div>
              </CardContent>
            </Card>

            {/* Card Colors */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Card</CardTitle>
                <CardDescription>카드 색상</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="bg-card h-10 w-10 rounded-md border" />
                  <code className="text-sm">--card</code>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-card-foreground h-10 w-10 rounded-md border" />
                  <code className="text-sm">--card-foreground</code>
                </div>
              </CardContent>
            </Card>

            {/* Primary Colors */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Primary</CardTitle>
                <CardDescription>주요 색상</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="bg-primary h-10 w-10 rounded-md border" />
                  <code className="text-sm">--primary</code>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-primary-foreground h-10 w-10 rounded-md border" />
                  <code className="text-sm">--primary-foreground</code>
                </div>
              </CardContent>
            </Card>

            {/* Secondary Colors */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Secondary</CardTitle>
                <CardDescription>보조 색상</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="bg-secondary h-10 w-10 rounded-md border" />
                  <code className="text-sm">--secondary</code>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-secondary-foreground h-10 w-10 rounded-md border" />
                  <code className="text-sm">--secondary-foreground</code>
                </div>
              </CardContent>
            </Card>

            {/* Muted Colors */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Muted</CardTitle>
                <CardDescription>약한 색상</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="bg-muted h-10 w-10 rounded-md border" />
                  <code className="text-sm">--muted</code>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-muted-foreground h-10 w-10 rounded-md border" />
                  <code className="text-sm">--muted-foreground</code>
                </div>
              </CardContent>
            </Card>

            {/* Accent Colors */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Accent</CardTitle>
                <CardDescription>강조 색상</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="bg-accent h-10 w-10 rounded-md border" />
                  <code className="text-sm">--accent</code>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-accent-foreground h-10 w-10 rounded-md border" />
                  <code className="text-sm">--accent-foreground</code>
                </div>
              </CardContent>
            </Card>

            {/* Destructive Colors */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Destructive</CardTitle>
                <CardDescription>위험/삭제 색상</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="bg-destructive h-10 w-10 rounded-md border" />
                  <code className="text-sm">--destructive</code>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-destructive-foreground h-10 w-10 rounded-md border" />
                  <code className="text-sm">--destructive-foreground</code>
                </div>
              </CardContent>
            </Card>

            {/* Border & Input */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Border & Input</CardTitle>
                <CardDescription>테두리 & 입력 색상</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="border-border bg-background h-10 w-10 rounded-md border-2" />
                  <code className="text-sm">--border</code>
                </div>
                <div className="flex items-center gap-2">
                  <div className="border-input bg-background h-10 w-10 rounded-md border-2" />
                  <code className="text-sm">--input</code>
                </div>
              </CardContent>
            </Card>

            {/* Ring */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ring</CardTitle>
                <CardDescription>포커스 링 색상</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="bg-background ring-ring h-10 w-10 rounded-md border ring-2 ring-offset-2" />
                  <code className="text-sm">--ring</code>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 차트 색상 섹션 */}
        <section>
          <h2 className="mb-4 text-2xl font-bold">차트 색상</h2>
          <div className="grid gap-4 md:grid-cols-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <CardTitle className="text-lg">Chart {i}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`h-20 w-full rounded-md border`}
                    style={{
                      backgroundColor: `var(--chart-${i})`,
                    }}
                  />
                  <code className="text-sm">--chart-{i}</code>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* 실제 컴포넌트 적용 예시 */}
        <section>
          <h2 className="mb-4 text-2xl font-bold">컴포넌트 적용 예시</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>버튼 변형</CardTitle>
                <CardDescription>
                  다양한 버튼 스타일에 테마가 적용된 모습
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button variant="default">Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>배지 변형</CardTitle>
                <CardDescription>
                  다양한 배지 스타일에 테마가 적용된 모습
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Badge variant="default">Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>카드 예시</CardTitle>
                <CardDescription>
                  카드 컴포넌트에서 background, card, border 토큰 사용
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  이 카드는 <code>--card</code>, <code>--card-foreground</code>,{" "}
                  <code>--border</code> 색상을 사용합니다.
                </p>
              </CardContent>
              <CardFooter>
                <Button>액션</Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        {/* OKLCH 정보 */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>OKLCH 색상 체계에 대하여</CardTitle>
              <CardDescription>
                이 프로젝트는 OKLCH 색 공간을 사용합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold">장점</h3>
                <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
                  <li>지각적으로 균일한 색상 표현 (HSL보다 자연스러움)</li>
                  <li>더 넓은 색역(P3) 지원으로 더 생생한 색상</li>
                  <li>Tailwind CSS v4의 기본 색상 형식</li>
                  <li>일관된 밝기와 채도 조절</li>
                </ul>
              </div>
              <div>
                <h3 className="mb-2 font-semibold">브라우저 지원</h3>
                <p className="text-muted-foreground text-sm">
                  Chrome 111+, Firefox 113+, Safari 15.4+ (93%)
                  <br />
                  PostCSS fallback 플러그인으로 구형 브라우저 100% 지원
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold">형식</h3>
                <code className="bg-muted block rounded-md p-2 text-sm">
                  oklch(lightness chroma hue)
                  <br />
                  예: oklch(0.623 0.214 259.815)
                </code>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    );
  },
};

/**
 * 🎨 컴포넌트별 색상 적용 예시
 *
 * 각 shadcn/ui 컴포넌트가 테마 색상을 어떻게 사용하는지 보여줍니다.
 * 우측 상단의 테마 전환 버튼으로 Light/Dark 모드를 전환할 수 있습니다.
 */
export const ComponentShowcase: Story = {
  render: () => {
    const [theme, setTheme] = useState<"light" | "dark">("light");

    // 🎯 목적: Storybook iframe의 실제 <html> 요소에 테마 클래스 적용
    // <html>/<body> 태그를 직접 렌더링하지 않고 document.documentElement 조작
    useEffect(() => {
      document.documentElement.className =
        theme === "dark" ? "theme-default-dark" : "theme-default-light";
    }, [theme]);

    return (
      <div className="relative space-y-6">
        {/* Theme Switcher Button */}
        <div className="absolute top-4 right-4 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Sun className="h-5 w-5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                <Moon className="absolute h-5 w-5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                <span className="sr-only">테마 전환</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setTheme("light")}
                className={theme === "light" ? "bg-accent" : ""}
              >
                <Sun className="mr-2 h-4 w-4" />
                <span>라이트</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTheme("dark")}
                className={theme === "dark" ? "bg-accent" : ""}
              >
                <Moon className="mr-2 h-4 w-4" />
                <span>다크</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">컴포넌트 쇼케이스</h2>
        </div>

        {/* Primary Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Primary Actions</CardTitle>
            <CardDescription>
              --primary와 --primary-foreground 사용
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button>Save</Button>
            <Button>Submit</Button>
            <Badge>New</Badge>
          </CardContent>
        </Card>

        {/* Secondary Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Secondary Actions</CardTitle>
            <CardDescription>
              --secondary와 --secondary-foreground 사용
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button variant="secondary">Cancel</Button>
            <Button variant="secondary">Back</Button>
            <Badge variant="secondary">Draft</Badge>
          </CardContent>
        </Card>

        {/* Destructive Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Destructive Actions</CardTitle>
            <CardDescription>
              --destructive와 --destructive-foreground 사용
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button variant="destructive">Delete</Button>
            <Button variant="destructive">Remove</Button>
            <Badge variant="destructive">Error</Badge>
          </CardContent>
        </Card>

        {/* Muted Elements */}
        <Card>
          <CardHeader>
            <CardTitle>Muted Elements</CardTitle>
            <CardDescription>--muted와 --muted-foreground 사용</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              이것은 muted foreground 색상을 사용한 보조 텍스트입니다.
            </p>
            <div className="bg-muted mt-4 rounded-md p-4">
              <p className="text-sm">muted background를 사용한 영역</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  },
};
