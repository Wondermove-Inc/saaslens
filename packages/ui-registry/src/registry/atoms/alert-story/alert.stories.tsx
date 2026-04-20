import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AlertCircleIcon, CheckCircle2Icon, PopcornIcon } from "lucide-react";
import { expect, within } from "storybook/test";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function AlertDemo() {
  return (
    <div className="grid w-full max-w-xl items-start gap-4">
      <Alert>
        <CheckCircle2Icon />
        <AlertTitle>Success! Your changes have been saved</AlertTitle>
        <AlertDescription>
          This is an alert with icon, title and description.
        </AlertDescription>
      </Alert>
      <Alert>
        <PopcornIcon />
        <AlertTitle>
          This Alert has a title and an icon. No description.
        </AlertTitle>
      </Alert>
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>Unable to process your payment.</AlertTitle>
        <AlertDescription>
          <p>Please verify your billing information and try again.</p>
          <ul className="list-inside list-disc text-sm">
            <li>Check your card details</li>
            <li>Ensure sufficient funds</li>
            <li>Verify billing address</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}

/**
 * Displays a callout for user attention.
 */
const meta = {
  title: "ui/Alert",
  component: Alert,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  args: {
    variant: "default",
  },
  excludeStories: /.*Demo$/,
} satisfies Meta<typeof Alert>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default form of the alert.
 */
export const Default: Story = {
  render: () => <AlertDemo />,
};

/**
 * Success alert with icon, title and description.
 */
export const Success: Story = {
  render: () => (
    <Alert>
      <CheckCircle2Icon />
      <AlertTitle>Success! Your changes have been saved</AlertTitle>
      <AlertDescription>
        This is an alert with icon, title and description.
      </AlertDescription>
    </Alert>
  ),
};

/**
 * Alert with title and icon only, no description.
 */
export const TitleOnly: Story = {
  render: () => (
    <Alert>
      <PopcornIcon />
      <AlertTitle>
        This Alert has a title and an icon. No description.
      </AlertTitle>
    </Alert>
  ),
};

/**
 * Destructive alert with list content.
 */
export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertTitle>Unable to process your payment.</AlertTitle>
      <AlertDescription>
        <p>Please verify your billing information and try again.</p>
        <ul className="list-inside list-disc text-sm">
          <li>Check your card details</li>
          <li>Ensure sufficient funds</li>
          <li>Verify billing address</li>
        </ul>
      </AlertDescription>
    </Alert>
  ),
};

export const ShouldRenderAlert: Story = {
  name: "when rendered, should display alert content",
  tags: ["!dev", "!autodocs"],
  render: () => (
    <Alert data-testid="test-alert">
      <CheckCircle2Icon />
      <AlertTitle>Success! Your changes have been saved</AlertTitle>
      <AlertDescription>
        This is an alert with icon, title and description.
      </AlertDescription>
    </Alert>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 🎯 목적: Alert가 올바르게 렌더링되고 텍스트가 표시되는지 확인
    const alert = canvas.getByTestId("test-alert");
    await expect(alert).toBeInTheDocument();

    const title = canvas.getByText("Success! Your changes have been saved");
    await expect(title).toBeInTheDocument();

    const description = canvas.getByText(
      /alert with icon, title and description/i,
    );
    await expect(description).toBeInTheDocument();
  },
};
