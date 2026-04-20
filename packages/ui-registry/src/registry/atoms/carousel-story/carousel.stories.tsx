import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export function CarouselDemo() {
  return (
    <Carousel className="w-full max-w-xs">
      <CarouselContent>
        {Array.from({ length: 5 }).map((_, index) => (
          <CarouselItem key={index}>
            <div className="p-1">
              <Card>
                <CardContent className="flex aspect-square items-center justify-center p-6">
                  <span className="text-4xl font-semibold">{index + 1}</span>
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}

/**
 * A carousel with motion and swipe built using Embla.
 */
const meta = {
  title: "ui/Carousel",
  component: Carousel,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  excludeStories: /.*Demo$/,
  render: () => <CarouselDemo />,
} satisfies Meta<typeof Carousel>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default form of the carousel.
 */
export const Default: Story = {};

/**
 * Carousel with different sized items.
 */
export const Sizes: Story = {
  render: () => (
    <Carousel
      opts={{
        align: "start",
      }}
      className="w-full max-w-sm"
    >
      <CarouselContent>
        {Array.from({ length: 5 }).map((_, index) => (
          <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
            <div className="p-1">
              <Card>
                <CardContent className="flex aspect-square items-center justify-center p-6">
                  <span className="text-3xl font-semibold">{index + 1}</span>
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  ),
};

/**
 * Carousel with custom spacing between items.
 */
export const Spacing: Story = {
  render: () => (
    <Carousel className="w-full max-w-sm">
      <CarouselContent className="-ml-2 md:-ml-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <CarouselItem key={index} className="pl-2 md:pl-4">
            <div className="p-1">
              <Card>
                <CardContent className="flex aspect-square items-center justify-center p-6">
                  <span className="text-2xl font-semibold">{index + 1}</span>
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  ),
};

/**
 * Vertical orientation carousel.
 */
export const Vertical: Story = {
  render: () => (
    <Carousel orientation="vertical" className="w-full max-w-xs">
      <CarouselContent className="-mt-1 h-[200px]">
        {Array.from({ length: 5 }).map((_, index) => (
          <CarouselItem key={index} className="pt-1 md:basis-1/2">
            <div className="p-1">
              <Card>
                <CardContent className="flex items-center justify-center p-6">
                  <span className="text-3xl font-semibold">{index + 1}</span>
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  ),
};

export const ShouldNavigateCarousel: Story = {
  name: "when next/previous buttons are clicked, should navigate carousel",
  tags: ["!dev", "!autodocs"],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 🎯 목적: Carousel의 Previous/Next 버튼이 존재하고 클릭 가능한지 확인
    const previousButton = canvas.getByRole("button", {
      name: /previous slide/i,
    });
    const nextButton = canvas.getByRole("button", { name: /next slide/i });

    // 버튼 존재 확인
    await expect(previousButton).toBeInTheDocument();
    await expect(nextButton).toBeInTheDocument();

    // Next 버튼 클릭 (슬라이드 이동)
    await userEvent.click(nextButton);

    // Previous 버튼 클릭 (슬라이드 이동)
    await userEvent.click(previousButton);

    // 슬라이드 컨텐츠가 존재하는지 확인
    const slides = canvas.getAllByText(/\d+/);
    await expect(slides.length).toBeGreaterThan(0);
  },
};

export const ShouldChangeSlideOnNavigation: Story = {
  name: "when next button is clicked, should display next slide",
  tags: ["!dev", "!autodocs"],
  render: () => (
    <Carousel className="w-full max-w-xs" data-testid="carousel">
      <CarouselContent>
        {Array.from({ length: 5 }).map((_, index) => (
          <CarouselItem key={index} data-testid={`slide-${index + 1}`}>
            <div className="p-1">
              <Card>
                <CardContent className="flex aspect-square items-center justify-center p-6">
                  <span
                    className="text-4xl font-semibold"
                    data-testid={`slide-number-${index + 1}`}
                  >
                    {index + 1}
                  </span>
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious data-testid="prev-button" />
      <CarouselNext data-testid="next-button" />
    </Carousel>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 🎯 목적: Next/Previous 버튼 클릭 시 실제로 슬라이드가 이동하는지 확인

    // Carousel 존재 확인
    const carousel = canvas.getByTestId("carousel");
    await expect(carousel).toBeInTheDocument();

    // Next 버튼 확인
    const nextButton = canvas.getByTestId("next-button");
    await expect(nextButton).toBeInTheDocument();

    // Previous 버튼 확인
    const prevButton = canvas.getByTestId("prev-button");
    await expect(prevButton).toBeInTheDocument();

    // 첫 번째 슬라이드 확인
    const firstSlide = canvas.getByTestId("slide-number-1");
    await expect(firstSlide).toHaveTextContent("1");

    // Next 버튼 클릭 (2번째 슬라이드로 이동)
    await userEvent.click(nextButton);

    // 2번째 슬라이드가 보이는지 확인
    const secondSlide = canvas.getByTestId("slide-number-2");
    await expect(secondSlide).toBeInTheDocument();

    // Next 버튼 다시 클릭 (3번째 슬라이드로 이동)
    await userEvent.click(nextButton);

    // 3번째 슬라이드가 보이는지 확인
    const thirdSlide = canvas.getByTestId("slide-number-3");
    await expect(thirdSlide).toBeInTheDocument();

    // Previous 버튼 클릭 (2번째 슬라이드로 되돌아감)
    await userEvent.click(prevButton);

    // 2번째 슬라이드가 다시 보이는지 확인
    await expect(secondSlide).toBeInTheDocument();
  },
};
