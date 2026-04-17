import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { addDays, addMonths } from "date-fns";
import {
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MoreHorizontal,
  SortDesc,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { DateRange } from "react-day-picker";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

/**
 * 🎯 목적: Figma 디자인을 기반으로 만든 대시보드 템플릿
 *
 * 이 템플릿은 Data Table, Calendar, Chart 컴포넌트를 포함한
 * 완전한 대시보드 레이아웃을 제공합니다.
 *
 * 📐 디자인 토큰 사용:
 * - Typography: text-2xl (24px), text-3xl (30px)
 * - Spacing: p-8 (32px), gap-6 (24px), space-y-8 (32px)
 * - Layout: max-w-7xl, h-96 (384px)
 * - 모든 값은 Storybook 디자인 토큰을 준수합니다
 */
const meta: Meta = {
  title: "templates/Test Dashboard",
  parameters: {
    layout: "fullscreen",
    viewport: {
      defaultViewport: "figmaDesktop",
    },
    chromatic: {
      viewports: [1721],
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// 🎯 차트 데이터
const chartData = [
  { month: "Jan", value: 186 },
  { month: "Feb", value: 305 },
  { month: "Mar", value: 237 },
  { month: "Apr", value: 273 },
  { month: "May", value: 209 },
  { month: "Jun", value: 214 },
];

const chartConfig = {
  value: {
    label: "Revenue",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

// 🎯 테이블 데이터
const invoiceData = [
  { id: 1, email: "david291@gmail.com", amount: 2173.52, status: "Success" },
  {
    id: 2,
    email: "k.r.mastrangelo@outlook.com",
    amount: 2839.41,
    status: "Success",
  },
  {
    id: 3,
    email: "c_j_mccoy@gmail.com",
    amount: 6222.27,
    status: "Processing",
  },
  {
    id: 4,
    email: "s.t.sharkey@outlook.com",
    amount: 4171.32,
    status: "Success",
  },
  {
    id: 5,
    email: "patricia651@outlook.com",
    amount: 2012.93,
    status: "Failed",
  },
];

/**
 * 전체 대시보드 템플릿
 */
export const Default: Story = {
  render: () => {
    const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(
      new Set(),
    );
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
      from: new Date(2025, 0, 12),
      to: addDays(new Date(2025, 0, 12), 13),
    });
    const [currentMonth, setCurrentMonth] = useState(new Date(2025, 0));
    const [emailFilter, setEmailFilter] = useState("");

    // 🎯 전체 선택 처리
    const handleSelectAll = (checked: boolean) => {
      if (checked) {
        setSelectedRowIds(new Set(invoiceData.map((item) => item.id)));
      } else {
        setSelectedRowIds(new Set());
      }
    };

    // 🎯 개별 선택 처리
    const handleSelectRow = (id: number, checked: boolean) => {
      const newSelectedIds = new Set(selectedRowIds);
      if (checked) {
        newSelectedIds.add(id);
      } else {
        newSelectedIds.delete(id);
      }
      setSelectedRowIds(newSelectedIds);
    };

    // 🎯 필터링된 데이터
    const filteredData = invoiceData.filter((item) =>
      item.email.toLowerCase().includes(emailFilter.toLowerCase()),
    );

    return (
      <div className="bg-background min-h-screen p-8">
        <div className="mx-auto" style={{ maxWidth: "1625px" }}>
          {/* 🎯 목적: 2컬럼 그리드 레이아웃 - 디자인 토큰 기반 */}
          <div
            className="grid gap-6"
            style={{ gridTemplateColumns: "768px 1fr" }}
          >
            {/* 왼쪽 컬럼: 차트 카드 (전체 높이) */}
            <Card className="shadow-sm">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="text-muted-foreground h-8 w-8" />
                    <span className="text-muted-foreground text-2xl font-medium">
                      Chart
                    </span>
                  </div>
                  <Button
                    variant="link"
                    className="flex h-auto items-center gap-2 p-0 text-base"
                  >
                    View docs
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-8">
                  <div>
                    <CardTitle className="text-3xl font-semibold">
                      Bar Chart
                    </CardTitle>
                    <CardDescription className="text-muted-foreground mt-3 text-2xl">
                      January - June 2024
                    </CardDescription>
                  </div>

                  <ChartContainer config={chartConfig} className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="0" vertical={false} />
                        <XAxis
                          dataKey="month"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tickFormatter={(value) => `$${value}`}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar
                          dataKey="value"
                          fill="hsl(var(--primary))"
                          radius={[8, 8, 0, 0]}
                          className="fill-primary"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-4 px-8 pb-8">
                <div className="flex items-center gap-4 text-2xl leading-none font-medium">
                  Trending up by 5.2% this month
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div className="text-muted-foreground text-2xl leading-none">
                  Showing total visitors for the last 6 months
                </div>
              </CardFooter>
            </Card>

            {/* 오른쪽 컬럼: 캘린더와 테이블 (세로 배치) */}
            <div className="flex flex-col gap-6">
              {/* 캘린더 카드 */}
              <Card className="shadow-sm">
                <CardContent className="p-0">
                  <div className="flex gap-4 p-3">
                    <div className="w-1/2">
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-medium">January 2025</h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setCurrentMonth(addMonths(currentMonth, -1))
                          }
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                      </div>
                      <Calendar
                        mode="range"
                        selected={dateRange}
                        onSelect={setDateRange}
                        month={currentMonth}
                        className="rounded-md border-0"
                      />
                    </div>
                    <div className="w-1/2">
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-medium">February 2025</h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setCurrentMonth(addMonths(currentMonth, 1))
                          }
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                      <Calendar
                        mode="range"
                        selected={dateRange}
                        onSelect={setDateRange}
                        month={addMonths(currentMonth, 1)}
                        className="rounded-md border-0"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 데이터 테이블 */}
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="relative max-w-sm">
                      <Input
                        placeholder="Filter emails..."
                        value={emailFilter}
                        onChange={(e) => setEmailFilter(e.target.value)}
                        className="h-9 pr-8"
                      />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="gap-2">
                          Columns
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Status</DropdownMenuItem>
                        <DropdownMenuItem>Email</DropdownMenuItem>
                        <DropdownMenuItem>Amount</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={
                                filteredData.length > 0 &&
                                selectedRowIds.size === filteredData.length
                              }
                              onCheckedChange={handleSelectAll}
                            />
                          </TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              className="-ml-4 h-auto p-2 hover:bg-transparent"
                            >
                              Email
                              <SortDesc className="ml-2 h-4 w-4" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredData.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedRowIds.has(invoice.id)}
                                onCheckedChange={(checked) =>
                                  handleSelectRow(
                                    invoice.id,
                                    checked as boolean,
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  invoice.status === "Success"
                                    ? "default"
                                    : invoice.status === "Processing"
                                      ? "secondary"
                                      : "destructive"
                                }
                              >
                                {invoice.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {invoice.email}
                            </TableCell>
                            <TableCell className="text-right">
                              ${invoice.amount.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Open menu</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    Copy email
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    View details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>Edit</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between border-t py-4">
                  <div className="text-muted-foreground text-sm">
                    {selectedRowIds.size} of {filteredData.length} row(s)
                    selected.
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9"
                      disabled
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9"
                      disabled
                    >
                      Next
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  },
};
