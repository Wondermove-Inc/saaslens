import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useEffect, useState } from "react";

// 🎨 Tailwind 기본 색상 정의 (OKLCH 형식)
// 📝 Tailwind CSS v4 공식 OKLCH 팔레트 사용
const tailwindColors = {
  slate: {
    50: "oklch(0.984 0.003 247.858)",
    100: "oklch(0.968 0.007 247.896)",
    200: "oklch(0.929 0.013 255.508)",
    300: "oklch(0.869 0.022 252.894)",
    400: "oklch(0.704 0.04 256.788)",
    500: "oklch(0.554 0.046 257.417)",
    600: "oklch(0.446 0.043 257.281)",
    700: "oklch(0.372 0.044 257.287)",
    800: "oklch(0.279 0.041 260.031)",
    900: "oklch(0.208 0.042 265.755)",
    950: "oklch(0.129 0.042 264.695)",
  },
  gray: {
    50: "oklch(0.985 0.002 247.839)",
    100: "oklch(0.967 0.003 264.542)",
    200: "oklch(0.928 0.006 264.531)",
    300: "oklch(0.872 0.01 258.338)",
    400: "oklch(0.707 0.022 261.325)",
    500: "oklch(0.551 0.027 264.364)",
    600: "oklch(0.446 0.03 256.802)",
    700: "oklch(0.373 0.034 259.733)",
    800: "oklch(0.278 0.033 256.848)",
    900: "oklch(0.21 0.034 264.665)",
    950: "oklch(0.13 0.028 261.692)",
  },
  zinc: {
    50: "oklch(0.985 0 0)",
    100: "oklch(0.967 0.001 286.375)",
    200: "oklch(0.923 0.003 286.32)",
    300: "oklch(0.871 0.006 286.286)",
    400: "oklch(0.698 0.015 285.938)",
    500: "oklch(0.534 0.022 286.067)",
    600: "oklch(0.422 0.025 285.885)",
    700: "oklch(0.35 0.026 285.805)",
    800: "oklch(0.263 0.024 285.905)",
    900: "oklch(0.203 0.021 285.857)",
    950: "oklch(0.131 0.017 285.823)",
  },
  neutral: {
    50: "oklch(0.985 0 0)",
    100: "oklch(0.97 0 0)",
    200: "oklch(0.922 0 0)",
    300: "oklch(0.871 0 0)",
    400: "oklch(0.698 0 0)",
    500: "oklch(0.534 0 0)",
    600: "oklch(0.421 0 0)",
    700: "oklch(0.35 0 0)",
    800: "oklch(0.259 0 0)",
    900: "oklch(0.2 0 0)",
    950: "oklch(0.13 0 0)",
  },
  stone: {
    50: "oklch(0.985 0.002 106.423)",
    100: "oklch(0.97 0.003 106.424)",
    200: "oklch(0.926 0.006 49.402)",
    300: "oklch(0.875 0.01 56.366)",
    400: "oklch(0.703 0.016 63.533)",
    500: "oklch(0.549 0.02 70.034)",
    600: "oklch(0.434 0.02 75.803)",
    700: "oklch(0.363 0.018 72.305)",
    800: "oklch(0.276 0.014 57.195)",
    900: "oklch(0.224 0.01 68.364)",
    950: "oklch(0.144 0.008 88.801)",
  },
  red: {
    50: "oklch(0.971 0.013 17.38)",
    100: "oklch(0.936 0.032 17.717)",
    200: "oklch(0.885 0.062 18.334)",
    300: "oklch(0.808 0.114 19.571)",
    400: "oklch(0.704 0.191 22.216)",
    500: "oklch(0.637 0.237 25.331)",
    600: "oklch(0.577 0.245 27.325)",
    700: "oklch(0.505 0.213 27.518)",
    800: "oklch(0.444 0.177 26.899)",
    900: "oklch(0.396 0.141 25.723)",
    950: "oklch(0.258 0.092 26.042)",
  },
  orange: {
    50: "oklch(0.98 0.016 73.684)",
    100: "oklch(0.954 0.038 75.164)",
    200: "oklch(0.901 0.076 70.697)",
    300: "oklch(0.837 0.128 66.29)",
    400: "oklch(0.75 0.183 55.934)",
    500: "oklch(0.705 0.213 47.604)",
    600: "oklch(0.646 0.222 41.116)",
    700: "oklch(0.553 0.195 38.402)",
    800: "oklch(0.47 0.157 37.304)",
    900: "oklch(0.408 0.123 38.172)",
    950: "oklch(0.266 0.079 36.259)",
  },
  amber: {
    50: "oklch(0.988 0.024 95.277)",
    100: "oklch(0.969 0.059 95.586)",
    200: "oklch(0.935 0.111 96.042)",
    300: "oklch(0.897 0.153 94.764)",
    400: "oklch(0.859 0.171 89.935)",
    500: "oklch(0.795 0.169 82.293)",
    600: "oklch(0.691 0.158 68.942)",
    700: "oklch(0.572 0.144 55.578)",
    800: "oklch(0.493 0.123 49.693)",
    900: "oklch(0.433 0.104 47.675)",
    950: "oklch(0.293 0.073 45.063)",
  },
  yellow: {
    50: "oklch(0.987 0.026 102.212)",
    100: "oklch(0.973 0.071 103.193)",
    200: "oklch(0.945 0.129 101.54)",
    300: "oklch(0.905 0.182 98.111)",
    400: "oklch(0.852 0.199 91.936)",
    500: "oklch(0.795 0.184 86.047)",
    600: "oklch(0.681 0.162 75.834)",
    700: "oklch(0.554 0.135 66.442)",
    800: "oklch(0.476 0.114 61.907)",
    900: "oklch(0.421 0.095 57.708)",
    950: "oklch(0.286 0.066 53.813)",
  },
  lime: {
    50: "oklch(0.986 0.031 120.757)",
    100: "oklch(0.967 0.067 122.328)",
    200: "oklch(0.938 0.127 124.321)",
    300: "oklch(0.897 0.196 126.665)",
    400: "oklch(0.841 0.238 128.85)",
    500: "oklch(0.768 0.233 130.85)",
    600: "oklch(0.648 0.2 131.684)",
    700: "oklch(0.532 0.157 131.589)",
    800: "oklch(0.453 0.124 130.933)",
    900: "oklch(0.405 0.101 131.063)",
    950: "oklch(0.274 0.072 132.109)",
  },
  green: {
    50: "oklch(0.982 0.018 155.826)",
    100: "oklch(0.962 0.044 156.743)",
    200: "oklch(0.925 0.084 155.995)",
    300: "oklch(0.871 0.15 154.449)",
    400: "oklch(0.792 0.209 151.711)",
    500: "oklch(0.723 0.219 149.579)",
    600: "oklch(0.627 0.194 149.214)",
    700: "oklch(0.527 0.154 150.069)",
    800: "oklch(0.448 0.119 151.328)",
    900: "oklch(0.393 0.095 152.535)",
    950: "oklch(0.266 0.065 152.934)",
  },
  emerald: {
    50: "oklch(0.979 0.021 166.113)",
    100: "oklch(0.957 0.047 165.695)",
    200: "oklch(0.922 0.091 164.279)",
    300: "oklch(0.871 0.148 163.228)",
    400: "oklch(0.787 0.179 162.487)",
    500: "oklch(0.696 0.17 162.48)",
    600: "oklch(0.593 0.153 163.225)",
    700: "oklch(0.512 0.133 164.202)",
    800: "oklch(0.439 0.109 165.294)",
    900: "oklch(0.385 0.089 166.141)",
    950: "oklch(0.259 0.061 168.163)",
  },
  teal: {
    50: "oklch(0.984 0.019 180.801)",
    100: "oklch(0.963 0.05 181.734)",
    200: "oklch(0.93 0.098 181.071)",
    300: "oklch(0.883 0.142 180.723)",
    400: "oklch(0.811 0.154 180.753)",
    500: "oklch(0.737 0.139 180.675)",
    600: "oklch(0.619 0.121 181.071)",
    700: "oklch(0.527 0.102 182.503)",
    800: "oklch(0.449 0.082 186.388)",
    900: "oklch(0.396 0.065 192.463)",
    950: "oklch(0.275 0.046 197.774)",
  },
  cyan: {
    50: "oklch(0.984 0.019 200.873)",
    100: "oklch(0.966 0.043 203.409)",
    200: "oklch(0.94 0.079 205.976)",
    300: "oklch(0.898 0.127 209.873)",
    400: "oklch(0.831 0.143 215.403)",
    500: "oklch(0.755 0.125 220.921)",
    600: "oklch(0.658 0.115 223.507)",
    700: "oklch(0.553 0.101 225.204)",
    800: "oklch(0.47 0.085 227.392)",
    900: "oklch(0.411 0.069 232.429)",
    950: "oklch(0.301 0.053 235.458)",
  },
  sky: {
    50: "oklch(0.982 0.013 236.622)",
    100: "oklch(0.96 0.027 236.856)",
    200: "oklch(0.925 0.053 235.692)",
    300: "oklch(0.859 0.093 233.388)",
    400: "oklch(0.779 0.132 233.672)",
    500: "oklch(0.703 0.139 237.309)",
    600: "oklch(0.612 0.148 241.066)",
    700: "oklch(0.535 0.142 242.681)",
    800: "oklch(0.461 0.119 243.458)",
    900: "oklch(0.392 0.094 244.990)",
    950: "oklch(0.287 0.066 246.060)",
  },
  blue: {
    50: "oklch(0.984 0.007 254.604)",
    100: "oklch(0.959 0.021 255.388)",
    200: "oklch(0.925 0.048 255.585)",
    300: "oklch(0.796 0.099 250.366)",
    400: "oklch(0.71 0.156 255)",
    500: "oklch(0.623 0.214 259.815)",
    600: "oklch(0.546 0.245 262.881)",
    700: "oklch(0.488 0.243 264.376)",
    800: "oklch(0.45 0.197 265.522)",
    900: "oklch(0.398 0.143 266.996)",
    950: "oklch(0.296 0.093 269.542)",
  },
  indigo: {
    50: "oklch(0.979 0.01 272.314)",
    100: "oklch(0.952 0.023 272.736)",
    200: "oklch(0.908 0.047 272.314)",
    300: "oklch(0.814 0.093 272.067)",
    400: "oklch(0.702 0.152 272.831)",
    500: "oklch(0.585 0.196 274.274)",
    600: "oklch(0.51 0.225 275.673)",
    700: "oklch(0.462 0.221 276.966)",
    800: "oklch(0.398 0.176 277.023)",
    900: "oklch(0.351 0.131 277.691)",
    950: "oklch(0.258 0.086 280.76)",
  },
  violet: {
    50: "oklch(0.969 0.016 293.756)",
    100: "oklch(0.943 0.029 294.588)",
    200: "oklch(0.894 0.057 293.283)",
    300: "oklch(0.811 0.111 293.571)",
    400: "oklch(0.702 0.183 293.541)",
    500: "oklch(0.606 0.25 292.717)",
    600: "oklch(0.541 0.281 293.009)",
    700: "oklch(0.491 0.27 292.581)",
    800: "oklch(0.432 0.232 292.759)",
    900: "oklch(0.38 0.189 293.745)",
    950: "oklch(0.283 0.141 291.089)",
  },
  purple: {
    50: "oklch(0.977 0.014 308.299)",
    100: "oklch(0.955 0.03 307.709)",
    200: "oklch(0.918 0.057 307.174)",
    300: "oklch(0.845 0.108 306.457)",
    400: "oklch(0.732 0.176 304.986)",
    500: "oklch(0.631 0.234 302.321)",
    600: "oklch(0.558 0.266 299.428)",
    700: "oklch(0.499 0.253 297.370)",
    800: "oklch(0.441 0.215 296.868)",
    900: "oklch(0.384 0.17 297.036)",
    950: "oklch(0.294 0.137 295.946)",
  },
  fuchsia: {
    50: "oklch(0.982 0.017 320.058)",
    100: "oklch(0.964 0.035 319.339)",
    200: "oklch(0.935 0.068 319.754)",
    300: "oklch(0.882 0.133 321.434)",
    400: "oklch(0.787 0.211 322.480)",
    500: "oklch(0.713 0.275 322.938)",
    600: "oklch(0.633 0.294 322.366)",
    700: "oklch(0.551 0.273 321.873)",
    800: "oklch(0.482 0.233 321.584)",
    900: "oklch(0.429 0.187 322.200)",
    950: "oklch(0.324 0.139 321.536)",
  },
  pink: {
    50: "oklch(0.981 0.012 343.198)",
    100: "oklch(0.961 0.028 342.537)",
    200: "oklch(0.930 0.055 343.231)",
    300: "oklch(0.868 0.109 346.018)",
    400: "oklch(0.757 0.174 349.761)",
    500: "oklch(0.676 0.213 353.566)",
    600: "oklch(0.598 0.238 0.472)",
    700: "oklch(0.541 0.229 3.958)",
    800: "oklch(0.482 0.194 6.555)",
    900: "oklch(0.439 0.157 8.346)",
    950: "oklch(0.331 0.111 9.375)",
  },
  rose: {
    50: "oklch(0.982 0.011 12.422)",
    100: "oklch(0.958 0.026 12.578)",
    200: "oklch(0.925 0.052 11.976)",
    300: "oklch(0.866 0.101 13.428)",
    400: "oklch(0.756 0.176 15.487)",
    500: "oklch(0.661 0.222 17.585)",
    600: "oklch(0.587 0.243 19.635)",
    700: "oklch(0.524 0.228 20.409)",
    800: "oklch(0.471 0.19 19.943)",
    900: "oklch(0.432 0.158 18.945)",
    950: "oklch(0.316 0.104 18.228)",
  },
};

type Color = {
  name: string;
  value: string;
  description?: string;
};

// 🎨 shadcn 토큰 색상 타일 컴포넌트 (다크모드 감지 포함)
const ColorTile = ({ value }: Pick<Color, "value">) => {
  const [colorValue, setColorValue] = useState("");

  useEffect(() => {
    // 🌓 CSS 변수 값을 읽어서 표시용으로만 사용
    const updateColor = () => {
      const styles = getComputedStyle(document.documentElement);
      const cssValue = styles.getPropertyValue(value);
      setColorValue(cssValue.trim());
    };

    // 초기 로드 시 색상 읽기
    updateColor();

    // 🔄 MutationObserver로 다크모드 실시간 감지
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          updateColor();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
    };
  }, [value]);

  // 🎯 목적: CSS 변수명을 Tailwind 클래스명으로 변환
  // 📝 로직: Tailwind v4는 bg-{name} 형식을 자동으로 --color-{name}으로 매핑
  //   - --primary → bg-primary → --color-primary
  //   - --chart-1 → bg-chart-1 → --color-chart-1
  //   - --primary-foreground → bg-primary-foreground → --color-primary-foreground
  const getBackgroundClass = (cssVariable: string): string => {
    const varName = cssVariable.replace(/^--/, "");
    return `bg-${varName}`;
  };

  const bgClass = getBackgroundClass(value);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`size-20 rounded-md border ${bgClass}`} />
      <p className="text-center text-xs opacity-70">{value}</p>
      <p className="text-center font-mono text-xs">{colorValue}</p>
    </div>
  );
};

/**
 * 🎨 shadcn/ui 디자인 시스템 색상 토큰 및 Tailwind CSS 색상 팔레트
 *
 * 이 스토리는 두 가지 색상 시스템을 제공합니다:
 * 1. **shadcn Design Tokens**: 프로젝트에서 사용되는 디자인 시스템 토큰 (CSS 변수)
 * 2. **Tailwind Palette**: Tailwind CSS의 전체 색상 팔레트 (22개 색상 × 11개 shade)
 *
 * 다크모드 전환 시 shadcn 토큰 값이 실시간으로 업데이트됩니다.
 */
const meta = {
  title: "foundation/Color",
  tags: ["autodocs"],
  argTypes: {},
  render: (args) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>
            <span className="sr-only">Preview</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {args.colors.map(({ name, value, description }) => (
          <TableRow key={name}>
            <TableCell className="font-medium">{name}</TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {description}
            </TableCell>
            <TableCell>
              <ColorTile value={value} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
} satisfies Meta<{
  colors: Color[];
}>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * 🎯 Primary: 주요 색상 토큰
 *
 * 애플리케이션의 배경, 텍스트, 주요 브랜드 색상 등 기본 색상 토큰입니다.
 * 다크모드 전환 시 자동으로 업데이트됩니다.
 */
export const Primary: Story = {
  args: {
    colors: [
      {
        name: "Background",
        value: "--background",
        description: "애플리케이션의 메인 배경 색상",
      },
      {
        name: "Foreground",
        value: "--foreground",
        description: "애플리케이션의 메인 텍스트 색상",
      },
      {
        name: "Primary",
        value: "--primary",
        description: "주요 액션을 위한 브랜드 색상",
      },
      {
        name: "Primary Foreground",
        value: "--primary-foreground",
        description: "Primary 배경 위의 텍스트 색상",
      },
      {
        name: "Secondary",
        value: "--secondary",
        description: "덜 중요한 액션을 위한 보조 색상",
      },
      {
        name: "Secondary Foreground",
        value: "--secondary-foreground",
        description: "Secondary 배경 위의 텍스트 색상",
      },
    ],
  },
};

/**
 * 🗂️ Surface: 표면 색상 토큰
 *
 * 카드, 팝오버, 코드 블록 등 UI 표면 요소를 위한 색상 토큰입니다.
 */
export const Surface: Story = {
  args: {
    colors: [
      {
        name: "Card",
        value: "--card",
        description: "카드 컴포넌트의 배경 색상",
      },
      {
        name: "Card Foreground",
        value: "--card-foreground",
        description: "Card 배경 위의 텍스트 색상",
      },
      {
        name: "Popover",
        value: "--popover",
        description: "팝오버 컴포넌트의 배경 색상",
      },
      {
        name: "Popover Foreground",
        value: "--popover-foreground",
        description: "Popover 배경 위의 텍스트 색상",
      },
      {
        name: "Surface",
        value: "--surface",
        description: "일반 표면 요소의 배경 색상",
      },
      {
        name: "Surface Foreground",
        value: "--surface-foreground",
        description: "Surface 배경 위의 텍스트 색상",
      },
      {
        name: "Code",
        value: "--code",
        description: "코드 블록의 배경 색상",
      },
      {
        name: "Code Foreground",
        value: "--code-foreground",
        description: "코드 블록의 텍스트 색상",
      },
      {
        name: "Code Highlight",
        value: "--code-highlight",
        description: "코드 블록의 하이라이트 배경 색상",
      },
      {
        name: "Code Number",
        value: "--code-number",
        description: "코드 블록의 라인 번호 색상",
      },
    ],
  },
};

/**
 * ⚡ State: 상태 및 유틸리티 색상 토큰
 *
 * 비활성화, 강조, 파괴적 액션, 선택 영역 등 다양한 상태를 나타내는 색상 토큰입니다.
 */
export const State: Story = {
  args: {
    colors: [
      {
        name: "Muted",
        value: "--muted",
        description: "비활성화/뮤트된 요소의 배경 색상",
      },
      {
        name: "Muted Foreground",
        value: "--muted-foreground",
        description: "보조 텍스트의 색상",
      },
      {
        name: "Accent",
        value: "--accent",
        description: "강조 및 하이라이트를 위한 색상",
      },
      {
        name: "Accent Foreground",
        value: "--accent-foreground",
        description: "Accent 배경 위의 텍스트 색상",
      },
      {
        name: "Destructive",
        value: "--destructive",
        description: "파괴적/에러 액션을 위한 색상",
      },
      {
        name: "Destructive Foreground",
        value: "--destructive-foreground",
        description: "Destructive 배경 위의 텍스트 색상",
      },
      {
        name: "Selection",
        value: "--selection",
        description: "텍스트 선택 영역의 배경 색상",
      },
      {
        name: "Selection Foreground",
        value: "--selection-foreground",
        description: "선택된 텍스트의 색상",
      },
    ],
  },
};

/**
 * 🔲 Border: 테두리 및 입력 색상 토큰
 *
 * 폼 컨트롤과 구분선을 위한 색상 토큰입니다.
 */
export const Border: Story = {
  args: {
    colors: [
      {
        name: "Border",
        value: "--border",
        description: "UI 요소의 기본 테두리 색상",
      },
      {
        name: "Input",
        value: "--input",
        description: "입력 필드의 테두리 색상",
      },
      {
        name: "Ring",
        value: "--ring",
        description: "포커스 링 색상",
      },
    ],
  },
};

/**
 * 📊 Chart: 차트 색상 팔레트
 *
 * 데이터 시각화 컴포넌트를 위한 색상 팔레트입니다.
 */
export const Chart: Story = {
  args: {
    colors: [
      {
        name: "Chart 1",
        value: "--chart-1",
        description: "차트 팔레트의 첫 번째 색상",
      },
      {
        name: "Chart 2",
        value: "--chart-2",
        description: "차트 팔레트의 두 번째 색상",
      },
      {
        name: "Chart 3",
        value: "--chart-3",
        description: "차트 팔레트의 세 번째 색상",
      },
      {
        name: "Chart 4",
        value: "--chart-4",
        description: "차트 팔레트의 네 번째 색상",
      },
      {
        name: "Chart 5",
        value: "--chart-5",
        description: "차트 팔레트의 다섯 번째 색상",
      },
    ],
  },
};

/**
 * 🧭 Sidebar: 사이드바 색상 토큰
 *
 * 내비게이션 사이드바 컴포넌트를 위한 색상 토큰입니다.
 */
export const Sidebar: Story = {
  args: {
    colors: [
      {
        name: "Sidebar",
        value: "--sidebar",
        description: "사이드바의 배경 색상",
      },
      {
        name: "Sidebar Foreground",
        value: "--sidebar-foreground",
        description: "사이드바의 텍스트 색상",
      },
      {
        name: "Sidebar Primary",
        value: "--sidebar-primary",
        description: "사이드바의 주요 색상",
      },
      {
        name: "Sidebar Primary Foreground",
        value: "--sidebar-primary-foreground",
        description: "Sidebar Primary 배경 위의 텍스트 색상",
      },
      {
        name: "Sidebar Accent",
        value: "--sidebar-accent",
        description: "사이드바의 강조 색상",
      },
      {
        name: "Sidebar Accent Foreground",
        value: "--sidebar-accent-foreground",
        description: "Sidebar Accent 배경 위의 텍스트 색상",
      },
      {
        name: "Sidebar Border",
        value: "--sidebar-border",
        description: "사이드바의 테두리 색상",
      },
      {
        name: "Sidebar Ring",
        value: "--sidebar-ring",
        description: "사이드바의 포커스 링 색상",
      },
    ],
  },
};

/**
 * 🎨 Tailwind Palette: Tailwind CSS 전체 색상 팔레트
 *
 * Tailwind CSS의 22개 색상 시스템 (각 11개 shade: 50-950)과 shadcn 토큰을 함께 보여줍니다.
 * 다크모드 전환 시 shadcn 토큰 값이 실시간으로 업데이트됩니다.
 */
export const TailwindPalette: Story = {
  args: {
    colors: [],
  },
  render: () => {
    const [tokens, setTokens] = useState<Record<string, string>>({});
    const [isDarkMode, setIsDarkMode] = useState(false);

    // 🌓 CSS 변수 값을 가져오는 함수 (다크모드 실시간 감지)
    const updateTokens = () => {
      const styles = getComputedStyle(document.documentElement);
      const tokenList = [
        "--background",
        "--foreground",
        "--primary",
        "--primary-foreground",
        "--secondary",
        "--secondary-foreground",
        "--muted",
        "--muted-foreground",
        "--accent",
        "--accent-foreground",
        "--destructive",
        "--destructive-foreground",
        "--border",
        "--input",
        "--ring",
        "--card",
        "--card-foreground",
        "--popover",
        "--popover-foreground",
        "--chart-1",
        "--chart-2",
        "--chart-3",
        "--chart-4",
        "--chart-5",
        "--sidebar",
        "--sidebar-foreground",
        "--sidebar-primary",
        "--sidebar-primary-foreground",
        "--sidebar-accent",
        "--sidebar-accent-foreground",
        "--sidebar-border",
        "--sidebar-ring",
        "--surface",
        "--surface-foreground",
        "--code",
        "--code-foreground",
        "--code-highlight",
        "--code-number",
        "--selection",
        "--selection-foreground",
      ];
      const newValues: Record<string, string> = {};
      tokenList.forEach((token) => {
        newValues[token] = styles.getPropertyValue(token).trim();
      });
      setTokens(newValues);
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };

    // 🔄 초기 로드 및 다크모드 변경 감지
    useEffect(() => {
      updateTokens();

      // MutationObserver로 클래스 변경 감지
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (
            mutation.type === "attributes" &&
            mutation.attributeName === "class"
          ) {
            updateTokens();
          }
        });
      });

      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });

      return () => {
        observer.disconnect();
      };
    }, []);

    // 단일 컬러 박스 컴포넌트
    const ColorBox = ({ name, value }: { name: string; value: string }) => (
      <div key={name} style={{ textAlign: "center" }}>
        <div
          style={{
            background: value || "transparent",
            width: "100%",
            height: "60px",
            borderRadius: "8px",
            border: isDarkMode ? "1px solid #333" : "1px solid #e5e5e5",
          }}
        />
        <p style={{ fontSize: "12px", marginTop: "4px" }}>{name}</p>
        <code style={{ fontSize: "10px" }}>{value || "-"}</code>
      </div>
    );

    // Tailwind 팔레트 렌더링 함수
    const renderTailwindColors = (
      colors: Record<string, string | Record<string, string>>,
      parent = "",
    ) => {
      return Object.entries(colors).map(([name, value]) => {
        const key = parent ? `${parent}-${name}` : name;
        if (typeof value === "string") {
          return <ColorBox key={key} name={key} value={value} />;
        }
        if (typeof value === "object") {
          return (
            <div key={key} style={{ marginBottom: "2rem", width: "100%" }}>
              <h3
                style={{ marginBottom: "0.5rem", textTransform: "capitalize" }}
              >
                {name}
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(11, 1fr)",
                  gap: "0.5rem",
                }}
              >
                {renderTailwindColors(value, name)}
              </div>
            </div>
          );
        }
        return null;
      });
    };

    // 🎯 목적: Tailwind 클래스 매핑으로 shadcn 토큰 표시
    // 📝 로직: Tailwind v4는 bg-{name} 형식을 자동으로 --color-{name}으로 매핑
    //   - --primary → bg-primary → --color-primary
    //   - --chart-1 → bg-chart-1 → --color-chart-1
    //   - --sidebar → bg-sidebar → --color-sidebar
    //   - --surface → bg-surface → --color-surface
    const tokenClassMap: Record<string, string> = {
      "--background": "bg-background",
      "--foreground": "bg-foreground",
      "--primary": "bg-primary",
      "--primary-foreground": "bg-primary-foreground",
      "--secondary": "bg-secondary",
      "--secondary-foreground": "bg-secondary-foreground",
      "--muted": "bg-muted",
      "--muted-foreground": "bg-muted-foreground",
      "--accent": "bg-accent",
      "--accent-foreground": "bg-accent-foreground",
      "--destructive": "bg-destructive",
      "--destructive-foreground": "bg-destructive-foreground",
      "--border": "bg-border",
      "--input": "bg-input",
      "--ring": "bg-ring",
      "--card": "bg-card",
      "--card-foreground": "bg-card-foreground",
      "--popover": "bg-popover",
      "--popover-foreground": "bg-popover-foreground",
      "--chart-1": "bg-chart-1",
      "--chart-2": "bg-chart-2",
      "--chart-3": "bg-chart-3",
      "--chart-4": "bg-chart-4",
      "--chart-5": "bg-chart-5",
      "--sidebar": "bg-sidebar",
      "--sidebar-foreground": "bg-sidebar-foreground",
      "--sidebar-primary": "bg-sidebar-primary",
      "--sidebar-primary-foreground": "bg-sidebar-primary-foreground",
      "--sidebar-accent": "bg-sidebar-accent",
      "--sidebar-accent-foreground": "bg-sidebar-accent-foreground",
      "--sidebar-border": "bg-sidebar-border",
      "--sidebar-ring": "bg-sidebar-ring",
      "--surface": "bg-surface",
      "--surface-foreground": "bg-surface-foreground",
      "--code": "bg-code",
      "--code-foreground": "bg-code-foreground",
      "--code-highlight": "bg-code-highlight",
      "--code-number": "bg-code-number",
      "--selection": "bg-selection",
      "--selection-foreground": "bg-selection-foreground",
    };

    return (
      <div>
        {/* 현재 테마 표시 */}
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.5rem",
            background: isDarkMode ? "#333" : "#f5f5f5",
            borderRadius: "4px",
          }}
        >
          <strong>Current Theme:</strong>{" "}
          {isDarkMode ? "Dark Mode" : "Light Mode"}
        </div>

        {/* shadcn 토큰 */}
        <h2 style={{ marginBottom: "1rem" }}>Shadcn Design Tokens</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          {Object.entries(tokenClassMap).map(([token, className]) => {
            const value = tokens[token];
            return (
              <div key={token} style={{ textAlign: "center" }}>
                <div
                  className={className}
                  style={{
                    width: "100%",
                    height: "60px",
                    borderRadius: "8px",
                    border:
                      token === "--card" || token === "--background"
                        ? isDarkMode
                          ? "2px solid #666"
                          : "2px solid #ccc"
                        : isDarkMode
                          ? "1px solid #333"
                          : "1px solid #e5e5e5",
                  }}
                />
                <p style={{ fontSize: "12px", marginTop: "4px" }}>{token}</p>
                <code style={{ fontSize: "10px" }}>
                  {value || "loading..."}
                </code>
              </div>
            );
          })}
        </div>

        {/* Tailwind 팔레트 */}
        <h2 style={{ marginBottom: "1rem" }}>Tailwind Color Palette</h2>
        {renderTailwindColors(tailwindColors)}
      </div>
    );
  },
};
