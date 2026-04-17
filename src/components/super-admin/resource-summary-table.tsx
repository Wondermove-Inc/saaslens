// src/components/super-admin/resource-summary-table.tsx
import type { AppSubscriptionSummary } from "@/actions/super-admin/dashboard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Image from "next/image";

interface ResourceSummaryTableProps {
  data: AppSubscriptionSummary[];
}

export function ResourceSummaryTable({ data }: ResourceSummaryTableProps) {
  const formatCurrency = (amount: number, currency: string) =>
    new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);

  if (data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        활성 구독이 없습니다.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>앱</TableHead>
          <TableHead className="text-right">구독 수</TableHead>
          <TableHead className="text-right">월 비용</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow key={item.appId}>
            <TableCell>
              <div className="flex items-center gap-2">
                {item.logoUrl ? (
                  <Image
                    src={item.logoUrl}
                    alt={item.appName}
                    width={24}
                    height={24}
                    className="rounded"
                    unoptimized
                  />
                ) : (
                  <div className="bg-muted flex h-6 w-6 items-center justify-center rounded text-xs font-medium">
                    {item.appName.charAt(0)}
                  </div>
                )}
                <span className="font-medium">{item.appName}</span>
              </div>
            </TableCell>
            <TableCell className="text-right">
              {item.subscriptionCount}
            </TableCell>
            <TableCell className="text-right font-medium">
              {formatCurrency(item.totalMonthlyCost, item.currency)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
