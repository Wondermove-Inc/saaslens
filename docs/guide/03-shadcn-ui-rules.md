# shadcn/ui Component Rules (컴포넌트 규칙)

> **황금률: shadcn/ui 컴포넌트는 절대 재생성하지 않는다**

---

## 1. 핵심 원칙

### 1.1 컴포넌트 재생성 금지

```typescript
// ❌ 금지: 기본 컴포넌트 새로 만들기
// src/components/MyButton.tsx - 절대 금지!
export function MyButton({ children }) {
  return <button className="px-4 py-2">{children}</button>;
}

// ✅ 필수: 기존 shadcn/ui 컴포넌트 사용
import { Button } from "@/components/ui/button";

export function SubmitButton() {
  return <Button type="submit">제출</Button>;
}
```

### 1.2 왜 재생성을 금지하는가?

- **일관성**: 전체 앱에서 동일한 디자인 시스템 유지
- **유지보수**: 한 곳에서 스타일 변경 시 전체 반영
- **테스트**: shadcn/ui 컴포넌트는 이미 테스트됨
- **접근성**: 기본 a11y 지원 포함
- **시간 절약**: 바퀴를 재발명하지 않음

---

## 2. 사용 가능한 컴포넌트 (54개)

### 2.1 Layout & Navigation

```typescript
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Resizable,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Sidebar } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { NavigationMenu } from "@/components/ui/navigation-menu";
import { Menubar } from "@/components/ui/menubar";
import { Pagination } from "@/components/ui/pagination";
```

### 2.2 Forms & Input

```typescript
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Field } from "@/components/ui/field";
import { InputOTP } from "@/components/ui/input-otp";
import { Calendar } from "@/components/ui/calendar";
import { ButtonGroup } from "@/components/ui/button-group";
import { InputGroup } from "@/components/ui/input-group";
```

### 2.3 Feedback & Overlay

```typescript
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Sonner } from "@/components/ui/sonner"; // Toast notifications
```

### 2.4 Data Display

```typescript
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Chart } from "@/components/ui/chart";
import { Empty } from "@/components/ui/empty";
import { Typography } from "@/components/ui/typography";
import { Kbd } from "@/components/ui/kbd";
import { AspectRatio } from "@/components/ui/aspect-ratio";
```

### 2.5 Menu & Command

```typescript
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Item } from "@/components/ui/item";
```

---

## 3. 컴포넌트 확인 방법

### 3.1 파일 목록 확인

```bash
# 사용 가능한 모든 컴포넌트 확인
ls packages/ui-registry/src/components/ui/
```

### 3.2 Storybook 실행

```bash
npm run storybook
# http://localhost:6006 에서 확인
```

### 3.3 소스 코드 확인

```bash
# 특정 컴포넌트 소스 확인
cat packages/ui-registry/src/components/ui/button.tsx
```

---

## 4. 올바른 사용 패턴

### 4.1 도메인 컴포넌트 생성 (권장)

shadcn/ui 컴포넌트를 **합성**하여 도메인 컴포넌트 생성

```typescript
// src/components/dashboard/stats-card.tsx
// ✅ 올바른 패턴: shadcn/ui 컴포넌트 합성

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StatsCardProps {
  title: string;
  value: string | number;
  badge?: string;
  icon: React.ReactNode;
}

export function StatsCard({ title, value, badge, icon }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {badge && (
          <Badge variant="secondary" className="mt-1">
            {badge}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
```

### 4.2 Form 컴포넌트 생성

```typescript
// src/components/forms/app-form.tsx
// ✅ shadcn/ui Form 컴포넌트 활용

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export function AppForm({ onSubmit }: AppFormProps) {
  const form = useForm<AppFormValues>({
    resolver: zodResolver(appSchema),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>앱 이름</FormLabel>
              <FormControl>
                <Input placeholder="Slack" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>카테고리</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="communication">Communication</SelectItem>
                  <SelectItem value="productivity">Productivity</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">저장</Button>
      </form>
    </Form>
  );
}
```

---

## 5. 커스텀 컴포넌트 위치

### 5.1 디렉토리 구조

```
src/components/
├── ui/                    # ❌ 여기에 추가 금지! (서브모듈 심볼릭 링크)
├── dashboard/             # ✅ 대시보드 도메인 컴포넌트
│   ├── stats-card.tsx
│   ├── stats-card.test.tsx
│   ├── app-list.tsx
│   └── app-list.test.tsx
├── forms/                 # ✅ 폼 컴포넌트
│   ├── app-form.tsx
│   └── app-form.test.tsx
├── charts/                # ✅ 차트 컴포넌트
│   └── spending-chart.tsx
└── layouts/               # ✅ 레이아웃 컴포넌트
    ├── dashboard-header.tsx
    └── dashboard-sidebar.tsx
```

### 5.2 컴포넌트 생성 체크리스트

```markdown
새 컴포넌트 생성 전:
[ ] packages/ui-registry/src/components/ui/에 유사 컴포넌트 있는지 확인
[ ] Storybook에서 사용 가능한 컴포넌트 확인
[ ] 기존 shadcn/ui로 해결 가능한지 검토

새 컴포넌트 생성 시:
[ ] src/components/[domain]/ 폴더에 생성
[ ] shadcn/ui 컴포넌트를 합성하여 구현
[ ] 테스트 파일 함께 생성 (.test.tsx)
```

---

## 6. 테스트 작성 가이드

### 6.1 도메인 컴포넌트 테스트

```typescript
// src/components/dashboard/stats-card.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatsCard } from './stats-card';
import { TrendingUp } from 'lucide-react';

describe('StatsCard', () => {
  it('should render title and value', () => {
    render(
      <StatsCard
        title="Total Apps"
        value={42}
        icon={<TrendingUp />}
      />
    );

    expect(screen.getByText('Total Apps')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('should render badge when provided', () => {
    render(
      <StatsCard
        title="Active Users"
        value={100}
        badge="+12%"
        icon={<TrendingUp />}
      />
    );

    expect(screen.getByText('+12%')).toBeInTheDocument();
  });
});
```

### 6.2 테스트하지 않아도 되는 것

```typescript
// ❌ shadcn/ui 내부 동작 테스트 불필요
// Button이 클릭 가능한지, Dialog가 열리는지 등은 이미 테스트됨

// ✅ 도메인 로직만 테스트
// - 올바른 데이터가 표시되는지
// - 이벤트 핸들러가 올바르게 호출되는지
// - 조건부 렌더링이 동작하는지
```

---

## 7. 자주 하는 실수

### 7.1 중복 컴포넌트 생성

```typescript
// ❌ 실수: 이미 있는 컴포넌트 재생성
// src/components/common/LoadingSpinner.tsx
export function LoadingSpinner() {
  return <div className="animate-spin">...</div>;
}

// ✅ 해결: 기존 컴포넌트 사용
import { Spinner } from "@/components/ui/spinner";
// 또는
import { Skeleton } from "@/components/ui/skeleton";
```

### 7.2 스타일 오버라이드

```typescript
// ❌ 실수: 인라인 스타일로 완전히 다른 버튼 만들기
<Button style={{ backgroundColor: 'purple', borderRadius: '20px' }}>

// ✅ 해결: variant 사용 또는 className으로 확장
<Button variant="secondary" className="rounded-full bg-purple-500">
```

### 7.3 직접 HTML 요소 사용

```typescript
// ❌ 실수: 직접 <button> 사용
<button onClick={handleClick}>Click me</button>

// ✅ 해결: shadcn/ui Button 사용
<Button onClick={handleClick}>Click me</Button>
```

---

## 8. 다음 단계

- [04-test-templates.md](./04-test-templates.md) - 복사해서 사용하는 테스트 템플릿
- [05-common-patterns.md](./05-common-patterns.md) - 공통 테스트 패턴
