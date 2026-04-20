"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { expect, fn, userEvent, within } from "storybook/test";
import { z } from "zod";

export function CheckboxDemo() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Checkbox id="terms" />
        <Label htmlFor="terms">Accept terms and conditions</Label>
      </div>
      <div className="flex items-start gap-3">
        <Checkbox id="terms-2" defaultChecked />
        <div className="grid gap-2">
          <Label htmlFor="terms-2">Accept terms and conditions</Label>
          <p className="text-muted-foreground text-sm">
            By clicking this checkbox, you agree to the terms and conditions.
          </p>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <Checkbox id="toggle" disabled />
        <Label htmlFor="toggle">Enable notifications</Label>
      </div>
      <Label className="hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-3 has-[[aria-checked=true]]:border-blue-600 has-[[aria-checked=true]]:bg-blue-50 dark:has-[[aria-checked=true]]:border-blue-900 dark:has-[[aria-checked=true]]:bg-blue-950">
        <Checkbox
          id="toggle-2"
          defaultChecked
          className="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700"
        />
        <div className="grid gap-1.5 font-normal">
          <p className="text-sm leading-none font-medium">
            Enable notifications
          </p>
          <p className="text-muted-foreground text-sm">
            You can enable or disable notifications at any time.
          </p>
        </div>
      </Label>
    </div>
  );
}

/**
 * A control that allows the user to toggle between checked and not checked.
 */
const meta = {
  title: "ui/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  args: {
    defaultChecked: false,
    disabled: false,
    onCheckedChange: fn(),
  },
  excludeStories: /.*Demo$/,
} satisfies Meta<typeof Checkbox>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default form of the checkbox.
 */
export const Default: Story = {};

/**
 * Checkbox in checked state.
 */
export const DefaultChecked: Story = {
  args: {
    defaultChecked: true,
  },
};

/**
 * Disabled checkbox.
 */
export const DefaultDisabled: Story = {
  args: {
    disabled: true,
  },
};

/**
 * Basic checkbox with label.
 */
export const Basic: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Checkbox id="terms" />
      <Label htmlFor="terms">Accept terms and conditions</Label>
    </div>
  ),
};

/**
 * Checkbox with default checked state.
 */
export const Checked: Story = {
  render: () => (
    <div className="flex items-start gap-3">
      <Checkbox id="terms-2" defaultChecked />
      <div className="grid gap-2">
        <Label htmlFor="terms-2">Accept terms and conditions</Label>
        <p className="text-muted-foreground text-sm">
          By clicking this checkbox, you agree to the terms and conditions.
        </p>
      </div>
    </div>
  ),
};

/**
 * Disabled checkbox.
 */
export const Disabled: Story = {
  render: () => (
    <div className="flex items-start gap-3">
      <Checkbox id="toggle" disabled />
      <Label htmlFor="toggle">Enable notifications</Label>
    </div>
  ),
};

/**
 * Custom styled checkbox with card-like appearance.
 */
export const WithCard: Story = {
  render: () => (
    <Label className="hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-3 has-[[aria-checked=true]]:border-blue-600 has-[[aria-checked=true]]:bg-blue-50 dark:has-[[aria-checked=true]]:border-blue-900 dark:has-[[aria-checked=true]]:bg-blue-950">
      <Checkbox
        id="toggle-2"
        defaultChecked
        className="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700"
      />
      <div className="grid gap-1.5 font-normal">
        <p className="text-sm leading-none font-medium">Enable notifications</p>
        <p className="text-muted-foreground text-sm">
          You can enable or disable notifications at any time.
        </p>
      </div>
    </Label>
  ),
};

/**
 * Individual checkbox states
 */
export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Checkbox id="unchecked" />
        <Label htmlFor="unchecked">Unchecked</Label>
      </div>
      <div className="flex items-center gap-3">
        <Checkbox id="checked" defaultChecked />
        <Label htmlFor="checked">Checked</Label>
      </div>
      <div className="flex items-center gap-3">
        <Checkbox id="disabled-unchecked" disabled />
        <Label htmlFor="disabled-unchecked">Disabled Unchecked</Label>
      </div>
      <div className="flex items-center gap-3">
        <Checkbox id="disabled-checked" disabled defaultChecked />
        <Label htmlFor="disabled-checked">Disabled Checked</Label>
      </div>
    </div>
  ),
};

export const ShouldToggleCheck: Story = {
  name: "when the checkbox is clicked, should toggle between checked and not checked",
  tags: ["!dev", "!autodocs"],
  render: () => (
    <div className="flex items-center gap-3">
      <Checkbox id="test-terms" />
      <Label htmlFor="test-terms">Accept terms and conditions</Label>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const checkbox = canvas.getByRole("checkbox");
    await userEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    await userEvent.click(checkbox, { delay: 100 });
    expect(checkbox).not.toBeChecked();
    await userEvent.click(checkbox, { delay: 100 });
    expect(checkbox).toBeChecked();
  },
};

export const ShouldHandleIndeterminateState: Story = {
  name: "when parent checkbox is clicked with partial children selection, should show indeterminate state",
  tags: ["!dev", "!autodocs"],
  render: () => {
    const [checkedItems, setCheckedItems] = React.useState([
      true,
      false,
      false,
    ]);

    const allChecked = checkedItems.every(Boolean);
    const noneChecked = checkedItems.every((item) => !item);
    const isIndeterminate = !allChecked && !noneChecked;

    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Checkbox
            id="parent"
            checked={isIndeterminate ? "indeterminate" : allChecked}
            onCheckedChange={(checked) => {
              setCheckedItems([
                checked === true,
                checked === true,
                checked === true,
              ]);
            }}
            data-testid="parent-checkbox"
          />
          <Label htmlFor="parent" className="font-semibold">
            Select All
          </Label>
        </div>
        <div className="ml-6 flex flex-col gap-2">
          {["Option 1", "Option 2", "Option 3"].map((label, index) => (
            <div key={index} className="flex items-center gap-3">
              <Checkbox
                id={`child-${index}`}
                checked={checkedItems[index]}
                onCheckedChange={(checked) => {
                  const newItems = [...checkedItems];
                  newItems[index] = checked === true;
                  setCheckedItems(newItems);
                }}
                data-testid={`child-checkbox-${index}`}
              />
              <Label htmlFor={`child-${index}`}>{label}</Label>
            </div>
          ))}
        </div>
        <div
          className="text-muted-foreground text-sm"
          data-testid="state-display"
        >
          State:{" "}
          {allChecked
            ? "All Selected"
            : isIndeterminate
              ? "Partially Selected"
              : "None Selected"}
        </div>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 🎯 목적: 부모 Checkbox가 자식 Checkbox의 선택 상태에 따라 indeterminate 상태를 올바르게 표시하는지 확인

    const parentCheckbox = canvas.getByTestId("parent-checkbox");
    const stateDisplay = canvas.getByTestId("state-display");

    // 초기 상태: Option 1만 선택됨 (Partially Selected)
    await expect(stateDisplay).toHaveTextContent("State: Partially Selected");
    await expect(parentCheckbox).toHaveAttribute("data-state", "indeterminate");

    // Option 2 선택
    const child1Checkbox = canvas.getByTestId("child-checkbox-1");
    await userEvent.click(child1Checkbox);
    await expect(stateDisplay).toHaveTextContent("State: Partially Selected");
    await expect(parentCheckbox).toHaveAttribute("data-state", "indeterminate");

    // Option 3 선택 (모두 선택됨)
    const child2Checkbox = canvas.getByTestId("child-checkbox-2");
    await userEvent.click(child2Checkbox);
    await expect(stateDisplay).toHaveTextContent("State: All Selected");
    await expect(parentCheckbox).toBeChecked();

    // 부모 Checkbox 클릭으로 모두 선택 해제
    await userEvent.click(parentCheckbox);
    await expect(stateDisplay).toHaveTextContent("State: None Selected");
    await expect(parentCheckbox).not.toBeChecked();

    // Option 1 선택 (다시 Partially Selected)
    const child0Checkbox = canvas.getByTestId("child-checkbox-0");
    await userEvent.click(child0Checkbox);
    await expect(stateDisplay).toHaveTextContent("State: Partially Selected");
    await expect(parentCheckbox).toHaveAttribute("data-state", "indeterminate");

    // 부모 Checkbox 클릭으로 모두 선택
    await userEvent.click(parentCheckbox);
    await expect(stateDisplay).toHaveTextContent("State: All Selected");
    await expect(parentCheckbox).toBeChecked();
  },
};

const items = [
  {
    id: "recents",
    label: "Recents",
  },
  {
    id: "home",
    label: "Home",
  },
  {
    id: "applications",
    label: "Applications",
  },
  {
    id: "desktop",
    label: "Desktop",
  },
  {
    id: "downloads",
    label: "Downloads",
  },
  {
    id: "documents",
    label: "Documents",
  },
] as const;

const FormSchema = z.object({
  items: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one item.",
  }),
});

function CheckboxReactHookFormMultiple() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      items: ["recents", "home"],
    },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    toast("You submitted the following values", {
      description: (
        <pre className="mt-2 w-[320px] rounded-md bg-neutral-950 p-4">
          <code className="text-white">{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="items"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel className="text-base">Sidebar</FormLabel>
                <FormDescription>
                  Select the items you want to display in the sidebar.
                </FormDescription>
              </div>
              {items.map((item) => (
                <FormField
                  key={item.id}
                  control={form.control}
                  name="items"
                  render={({ field }) => {
                    return (
                      <FormItem
                        key={item.id}
                        className="flex flex-row items-center gap-2"
                      >
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(item.id)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...field.value, item.id])
                                : field.onChange(
                                    field.value?.filter(
                                      (value) => value !== item.id,
                                    ),
                                  );
                            }}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">
                          {item.label}
                        </FormLabel>
                      </FormItem>
                    );
                  }}
                />
              ))}
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}

/**
 * Checkbox with React Hook Form
 */
export const WithForm: Story = {
  render: () => <CheckboxReactHookFormMultiple />,
};
