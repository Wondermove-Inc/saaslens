import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import { expect, userEvent, within } from "storybook/test";

function LabelDemo() {
  return (
    <div>
      <div className="flex items-center space-x-2">
        <Checkbox id="terms" />
        <Label htmlFor="terms">Accept terms and conditions</Label>
      </div>
    </div>
  );
}

/**
 * Renders an accessible label associated with controls.
 */
const meta = {
  title: "ui/Label",
  component: Label,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  args: {
    children: "Label",
    htmlFor: "input",
  },
  excludeStories: /.*Demo$/,
} satisfies Meta<typeof Label>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default form of the label.
 */
export const Default: Story = {};

/**
 * Label with checkbox example.
 */
export const WithCheckbox: Story = {
  render: () => <LabelDemo />,
};

export const ShouldToggleCheckboxWhenClicked: Story = {
  name: "when label is clicked, should toggle the associated checkbox",
  tags: ["!dev", "!autodocs"],
  render: () => <LabelDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const label = canvas.getByText("Accept terms and conditions");
    const checkbox = canvas.getByRole("checkbox") as HTMLInputElement;

    // 🎯 목적: Label 클릭 시 연결된 checkbox가 토글되는지 확인
    await expect(checkbox).not.toBeChecked();

    await userEvent.click(label);
    await expect(checkbox).toBeChecked();

    await userEvent.click(label);
    await expect(checkbox).not.toBeChecked();
  },
};

export const ShouldFocusInputWithHtmlFor: Story = {
  name: "when label with htmlFor is clicked, should focus the associated input",
  tags: ["!dev", "!autodocs"],
  render: () => {
    const [value, setValue] = React.useState("");

    return (
      <div className="flex flex-col gap-2">
        <Label htmlFor="email-input">Email Address</Label>
        <Input
          id="email-input"
          type="email"
          placeholder="Enter your email"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <div
          className="text-muted-foreground text-sm"
          data-testid="value-display"
        >
          Value: {value || "(empty)"}
        </div>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 🎯 목적: htmlFor 속성으로 연결된 Label 클릭 시 Input에 포커스가 이동하는지 확인

    // Label과 Input 요소 찾기
    const label = canvas.getByText("Email Address");
    const input = canvas.getByPlaceholderText(
      "Enter your email",
    ) as HTMLInputElement;

    // 초기 상태 확인
    await expect(input).not.toHaveFocus();

    // Label 클릭 시 Input에 포커스 이동
    await userEvent.click(label);
    await expect(input).toHaveFocus();

    // Input에 값 입력
    await userEvent.type(input, "test@example.com");

    // 값 표시 확인
    const valueDisplay = canvas.getByTestId("value-display");
    await expect(valueDisplay).toHaveTextContent("Value: test@example.com");
  },
};
