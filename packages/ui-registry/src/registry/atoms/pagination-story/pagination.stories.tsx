import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

function PaginationDemo() {
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#" />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#">1</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#" isActive>
            2
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#">3</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href="#" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

/**
 * Pagination with page navigation, next and previous links.
 */
const meta = {
  title: "ui/Pagination",
  component: PaginationDemo,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof PaginationDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default form of the pagination with active state.
 */
export const Default: Story = {};

export const ShouldNavigateBetweenPages: Story = {
  name: "when pagination links are clicked, should have correct href",
  tags: ["!dev", "!autodocs"],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 🎯 목적: Pagination 링크들이 올바른 href를 가지고 클릭 가능한지 확인
    const previousLink = canvas.getByRole("link", { name: /previous/i });
    const nextLink = canvas.getByRole("link", { name: /next/i });
    const pageOneLink = canvas.getByRole("link", { name: /^1$/i });
    const pageTwoLink = canvas.getByRole("link", { name: /^2$/i });

    // href 속성 확인
    await expect(previousLink).toHaveAttribute("href", "#");
    await expect(nextLink).toHaveAttribute("href", "#");
    await expect(pageOneLink).toHaveAttribute("href", "#");
    await expect(pageTwoLink).toHaveAttribute("href", "#");

    // 활성 상태 확인 (페이지 2가 활성)
    await expect(pageTwoLink).toHaveAttribute("aria-current", "page");

    // 링크 클릭 가능 확인
    await userEvent.click(pageOneLink);
    await userEvent.click(nextLink);
    await userEvent.click(previousLink);
  },
};
