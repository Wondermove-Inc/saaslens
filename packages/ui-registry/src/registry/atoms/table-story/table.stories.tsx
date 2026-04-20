import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import { expect, userEvent, within } from "storybook/test";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Data from official docs
const invoices = [
  {
    invoice: "INV001",
    paymentStatus: "Paid",
    totalAmount: "$250.00",
    paymentMethod: "Credit Card",
  },
  {
    invoice: "INV002",
    paymentStatus: "Pending",
    totalAmount: "$150.00",
    paymentMethod: "PayPal",
  },
  {
    invoice: "INV003",
    paymentStatus: "Unpaid",
    totalAmount: "$350.00",
    paymentMethod: "Bank Transfer",
  },
  {
    invoice: "INV004",
    paymentStatus: "Paid",
    totalAmount: "$450.00",
    paymentMethod: "Credit Card",
  },
  {
    invoice: "INV005",
    paymentStatus: "Paid",
    totalAmount: "$550.00",
    paymentMethod: "PayPal",
  },
  {
    invoice: "INV006",
    paymentStatus: "Pending",
    totalAmount: "$200.00",
    paymentMethod: "Bank Transfer",
  },
  {
    invoice: "INV007",
    paymentStatus: "Unpaid",
    totalAmount: "$300.00",
    paymentMethod: "Credit Card",
  },
];

// Default example from official docs
export function TableDemo() {
  return (
    <Table>
      <TableCaption>A list of your recent invoices.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">Invoice</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Method</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow key={invoice.invoice}>
            <TableCell className="font-medium">{invoice.invoice}</TableCell>
            <TableCell>{invoice.paymentStatus}</TableCell>
            <TableCell>{invoice.paymentMethod}</TableCell>
            <TableCell className="text-right">{invoice.totalAmount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3}>Total</TableCell>
          <TableCell className="text-right">$2,500.00</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

/**
 * A responsive table component.
 */
const meta = {
  title: "ui/Table",
  component: Table,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  excludeStories: /.*Demo$/,
  render: () => <TableDemo />,
} satisfies Meta<typeof Table>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default table with invoice data.
 */
export const Default: Story = {};

/**
 * 테이블 정렬 기능을 테스트합니다.
 */
export const ShouldSortTableByColumn: Story = {
  name: "when user clicks column header, should sort table data by that column",
  tags: ["!dev", "!autodocs"],
  render: () => {
    const [sortKey, setSortKey] = React.useState<
      "invoice" | "paymentStatus" | "totalAmount" | null
    >(null);
    const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");

    const handleSort = (key: "invoice" | "paymentStatus" | "totalAmount") => {
      if (sortKey === key) {
        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
      } else {
        setSortKey(key);
        setSortOrder("asc");
      }
    };

    const sortedInvoices = React.useMemo(() => {
      if (!sortKey) return invoices;

      return [...invoices].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];

        if (sortKey === "totalAmount") {
          const aNum = parseFloat(aVal.replace("$", ""));
          const bNum = parseFloat(bVal.replace("$", ""));
          return sortOrder === "asc" ? aNum - bNum : bNum - aNum;
        }

        return sortOrder === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      });
    }, [sortKey, sortOrder]);

    return (
      <Table>
        <TableCaption>A list of your recent invoices.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">
              <button
                onClick={() => handleSort("invoice")}
                className="font-medium"
              >
                Invoice{" "}
                {sortKey === "invoice" && (sortOrder === "asc" ? "↑" : "↓")}
              </button>
            </TableHead>
            <TableHead>
              <button
                onClick={() => handleSort("paymentStatus")}
                className="font-medium"
              >
                Status{" "}
                {sortKey === "paymentStatus" &&
                  (sortOrder === "asc" ? "↑" : "↓")}
              </button>
            </TableHead>
            <TableHead>Method</TableHead>
            <TableHead className="text-right">
              <button
                onClick={() => handleSort("totalAmount")}
                className="font-medium"
              >
                Amount{" "}
                {sortKey === "totalAmount" && (sortOrder === "asc" ? "↑" : "↓")}
              </button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedInvoices.map((invoice) => (
            <TableRow key={invoice.invoice}>
              <TableCell className="font-medium">{invoice.invoice}</TableCell>
              <TableCell>{invoice.paymentStatus}</TableCell>
              <TableCell>{invoice.paymentMethod}</TableCell>
              <TableCell className="text-right">
                {invoice.totalAmount}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3}>Total</TableCell>
            <TableCell className="text-right">$2,500.00</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 🎯 목적: 테이블 컬럼 헤더 클릭 시 해당 컬럼으로 정렬되는지 확인

    // Invoice 컬럼으로 정렬
    const invoiceHeader = canvas.getByRole("button", { name: /Invoice/i });
    await expect(invoiceHeader).toBeInTheDocument();
    await userEvent.click(invoiceHeader);

    // 정렬 표시(↑) 확인
    await expect(invoiceHeader).toHaveTextContent("↑");

    // 첫 번째 행이 INV001인지 확인 (오름차순)
    const cells = canvas.getAllByRole("cell");
    await expect(cells[0]).toHaveTextContent("INV001");

    // 다시 클릭하여 내림차순 정렬
    await userEvent.click(invoiceHeader);
    await expect(invoiceHeader).toHaveTextContent("↓");

    // 첫 번째 행이 INV007인지 확인 (내림차순)
    const cellsDesc = canvas.getAllByRole("cell");
    await expect(cellsDesc[0]).toHaveTextContent("INV007");

    // Amount 컬럼으로 정렬
    const amountHeader = canvas.getByRole("button", { name: /Amount/i });
    await userEvent.click(amountHeader);

    // Amount로 정렬 표시 확인
    await expect(amountHeader).toHaveTextContent("↑");

    // 첫 번째 행이 $150.00인지 확인 (가장 작은 금액)
    const amountCells = canvas.getAllByRole("cell");
    const firstAmountCell = amountCells.find((cell: HTMLElement) =>
      cell.textContent?.includes("$"),
    );
    await expect(firstAmountCell).toHaveTextContent("$150.00");
  },
};
