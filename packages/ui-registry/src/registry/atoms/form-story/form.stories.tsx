import { zodResolver } from "@hookform/resolvers/zod";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { expect, userEvent, within } from "storybook/test";
import * as z from "zod";

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
import { Input } from "@/components/ui/input";

/**
 * Building forms with React Hook Form and Zod.
 */
const meta: Meta<typeof Form> = {
  title: "ui/Form",
  component: Form,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof meta>;

const formSchema = z.object({
  username: z.string().min(6, {
    message: "Username must be at least 6 characters.",
  }),
});

const ProfileForm = (args: Story["args"]) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
    },
  });
  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("onSubmit", values);
  }
  return (
    <Form {...args} {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <input
                  className="border-input bg-background w-full rounded-md border px-3 py-2"
                  placeholder="username"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                This is your public display name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
};

/**
 * The default form of the form.
 */
export const Default: Story = {
  render: () => <ProfileForm />,
};

export const ShouldSucceedWhenValidInput: Story = {
  name: "when typing a valid username, should not show an error message",
  tags: ["!dev", "!autodocs"],
  render: () => <ProfileForm />,
  play: async ({ canvas, step }) => {
    await step("Type a valid username", async () => {
      await userEvent.type(
        await canvas.findByRole("textbox", { name: /username/i }),
        "mockuser",
      );
    });

    await step("Click the submit button", async () => {
      await userEvent.click(
        await canvas.findByRole("button", { name: /submit/i }),
      );
      expect(
        await canvas.queryByText(/username must be at least 6 characters/i, {
          exact: true,
        }),
      ).toBeNull();
    });
  },
};

export const ShouldShowErrorWhenInvalidInput: Story = {
  name: "when typing a short username, should show an error message",
  tags: ["!dev", "!autodocs"],
  render: () => <ProfileForm />,
  play: async ({ canvas, step }) => {
    await step("Type a short username", async () => {
      await userEvent.type(
        await canvas.findByRole("textbox", { name: /username/i }),
        "fail",
      );
    });

    await step("Click the submit button", async () => {
      await userEvent.click(
        await canvas.findByRole("button", { name: /submit/i }),
      );
      expect(
        await canvas.queryByText(/username must be at least 6 characters/i, {
          exact: true,
        }),
      ).toBeVisible();
    });
  },
};

/**
 * Ref 사용 예제: FormControl을 통해 Input에 ref를 전달하여 DOM 요소에 접근합니다.
 * react-hook-form의 register 대신 ref를 명시적으로 전달하는 방법을 보여줍니다.
 */
export const WithRef: Story = {
  render: () => {
    // 🎯 목적: react-hook-form과 함께 ref를 명시적으로 관리
    const inputRef = useRef<HTMLInputElement>(null);

    const formSchema = z.object({
      email: z.string().email({ message: "Invalid email address." }),
      password: z
        .string()
        .min(8, { message: "Password must be at least 8 characters." }),
    });

    const form = useForm<z.infer<typeof formSchema>>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        email: "",
        password: "",
      },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
      console.log("Form submitted:", values);
    }

    return (
      <div className="flex flex-col gap-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field: { ref, ...fieldWithoutRef } }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      ref={(e) => {
                        ref(e);
                        // React 18 호환성: ref.current는 read-only이므로 타입 단언 사용
                        (
                          inputRef as React.MutableRefObject<HTMLInputElement | null>
                        ).current = e;
                      }}
                      type="email"
                      placeholder="example@email.com"
                      {...fieldWithoutRef}
                    />
                  </FormControl>
                  <FormDescription>
                    Your email address for account access.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter password"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Must be at least 8 characters long.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2">
              <Button type="submit">Submit</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => inputRef.current?.focus()}
              >
                Focus Email Input
              </Button>
            </div>
          </form>
        </Form>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    // 🎯 목적: play function을 통해 form ref와 validation을 테스트
    const canvas = within(canvasElement);

    // "Focus Email Input" 버튼으로 email input에 focus
    const focusButton = canvas.getByRole("button", {
      name: "Focus Email Input",
    });
    await userEvent.click(focusButton);

    // Email input이 포커스되었는지 확인
    const emailInput = canvas.getByLabelText("Email");
    await expect(emailInput).toHaveFocus();

    // 잘못된 이메일 입력
    await userEvent.type(emailInput, "invalid-email");

    // Submit 버튼 클릭
    const submitButton = canvas.getByRole("button", { name: "Submit" });
    await userEvent.click(submitButton);

    // Validation 에러 메시지 확인
    const errorMessage = await canvas.findByText("Invalid email address.");
    await expect(errorMessage).toBeVisible();
  },
};
