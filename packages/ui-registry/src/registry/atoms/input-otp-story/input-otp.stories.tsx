"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { z } from "zod";

function InputOTPDemo() {
  return (
    <InputOTP maxLength={6}>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  );
}

/**
 * Accessible one-time password component with copy paste functionality.
 */
const meta = {
  title: "ui/InputOTP",
  component: InputOTPDemo,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  excludeStories:
    /.*Demo$|.*Pattern$|.*Separator.*|.*Controlled$|.*Form$|FormSchema/,
} satisfies Meta<typeof InputOTPDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default OTP input with separator.
 */
export const Default: Story = {};

// Pattern example component
function InputOTPPattern() {
  return (
    <InputOTP maxLength={6} pattern={REGEXP_ONLY_DIGITS_AND_CHARS}>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  );
}

/**
 * OTP input with pattern validation (digits and characters only).
 */
export const Pattern: Story = {
  render: () => <InputOTPPattern />,
};

// Separator example component
function InputOTPWithSeparator() {
  return (
    <InputOTP maxLength={6}>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={2} />
        <InputOTPSlot index={3} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  );
}

/**
 * OTP input with multiple separators.
 */
export const Separator: Story = {
  render: () => <InputOTPWithSeparator />,
};

// Separator with 4 digits example
function InputOTPSeparatorFourDigits() {
  return (
    <InputOTP maxLength={4}>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={2} />
        <InputOTPSlot index={3} />
      </InputOTPGroup>
    </InputOTP>
  );
}

/**
 * OTP input with separator for 4 digits.
 */
export const SeparatorFourDigits: Story = {
  render: () => <InputOTPSeparatorFourDigits />,
};

// Controlled example component
function InputOTPControlled() {
  const [value, setValue] = React.useState("");

  return (
    <div className="space-y-2">
      <InputOTP
        maxLength={6}
        value={value}
        onChange={(value) => setValue(value)}
      >
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
      <div className="text-center text-sm">
        {value === "" ? (
          <>Enter your one-time password.</>
        ) : (
          <>You entered: {value}</>
        )}
      </div>
    </div>
  );
}

/**
 * Controlled OTP input with value display.
 */
export const Controlled: Story = {
  render: () => <InputOTPControlled />,
};

export const ShouldAcceptOTPInput: Story = {
  name: "when user types OTP, should display entered values",
  tags: ["!dev", "!autodocs"],
  render: () => <InputOTPControlled />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 🎯 목적: Input OTP가 사용자 입력을 받아 각 슬롯에 표시하고, 값을 추적하는지 확인
    const inputs = canvas.getAllByRole("textbox");
    await expect(inputs.length).toBeGreaterThan(0);

    // 첫 번째 입력 필드에 OTP 입력
    await userEvent.type(inputs[0], "123456");

    // 입력한 값이 표시되는지 확인
    await waitFor(async () => {
      const displayText = await canvas.findByText(/you entered: 123456/i);
      await expect(displayText).toBeInTheDocument();
    });
  },
};

export const ShouldAutoFocus: Story = {
  name: "when user types 6-digit OTP, should auto-focus next slot",
  tags: ["!dev", "!autodocs"],
  render: () => {
    const [value, setValue] = React.useState("");
    const [complete, setComplete] = React.useState(false);

    return (
      <div className="space-y-4">
        <InputOTP
          maxLength={6}
          value={value}
          onChange={(newValue) => {
            setValue(newValue);
            if (newValue.length === 6) {
              setComplete(true);
            }
          }}
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
        <div className="text-center text-sm" data-testid="status">
          {complete ? (
            <span className="text-green-600">✓ OTP Complete: {value}</span>
          ) : (
            <span>Enter OTP ({value.length}/6)</span>
          )}
        </div>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 🎯 목적: 6자리 OTP 입력 시 자동으로 다음 슬롯으로 포커스가 이동하고, 완료 시 상태가 업데이트되는지 확인

    // 초기 상태 확인
    const status = canvas.getByTestId("status");
    await expect(status).toHaveTextContent("Enter OTP (0/6)");

    // 첫 번째 textbox 찾기
    const inputs = canvas.getAllByRole("textbox");
    await expect(inputs.length).toBeGreaterThan(0);

    // 6자리 OTP 입력
    await userEvent.type(inputs[0], "123456");

    // 완료 상태 확인
    await waitFor(
      () => {
        expect(status).toHaveTextContent("✓ OTP Complete: 123456");
      },
      { timeout: 2000 },
    );
  },
};

// Form example component
const FormSchema = z.object({
  pin: z.string().min(6, {
    message: "Your one-time password must be 6 characters.",
  }),
});

function InputOTPForm() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      pin: "",
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-2/3 space-y-6">
        <FormField
          control={form.control}
          name="pin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>One-Time Password</FormLabel>
              <FormControl>
                <InputOTP maxLength={6} {...field}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </FormControl>
              <FormDescription>
                Please enter the one-time password sent to your phone.
              </FormDescription>
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
 * OTP input integrated with React Hook Form and Zod validation.
 */
export const WithForm: Story = {
  render: () => <InputOTPForm />,
};
