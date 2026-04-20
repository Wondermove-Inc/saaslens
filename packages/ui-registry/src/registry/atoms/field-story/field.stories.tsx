import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

/**
 * A composable component for building accessible form fields with labels, descriptions, and error messages.
 * Provides consistent layout and styling for form inputs.
 */
const meta = {
  title: "ui/Field",
  component: Field,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <div style={{ minWidth: "448px", margin: "0 auto" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * FieldDemo 예제입니다.
 * 결제 방법 폼을 통해 Field 컴포넌트의 다양한 기능을 보여줍니다.
 */
export const Demo: Story = {
  render: () => (
    <div className="w-full max-w-md">
      <form>
        <FieldGroup>
          <FieldSet>
            <FieldLegend>Payment Method</FieldLegend>
            <FieldDescription>
              All transactions are secure and encrypted
            </FieldDescription>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="checkout-7j9-card-name-43j">
                  Name on Card
                </FieldLabel>
                <Input
                  id="checkout-7j9-card-name-43j"
                  placeholder="Evil Rabbit"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="checkout-7j9-card-number-uw1">
                  Card Number
                </FieldLabel>
                <Input
                  id="checkout-7j9-card-number-uw1"
                  placeholder="1234 5678 9012 3456"
                  required
                />
                <FieldDescription>
                  Enter your 16-digit card number
                </FieldDescription>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="checkout-7j9-expiry-f52">
                    Expiry Date
                  </FieldLabel>
                  <Input
                    id="checkout-7j9-expiry-f52"
                    placeholder="MM/YY"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="checkout-7j9-cvc-u31">CVV</FieldLabel>
                  <Input id="checkout-7j9-cvc-u31" placeholder="123" required />
                </Field>
              </div>
            </FieldGroup>
            <FieldSeparator>Or</FieldSeparator>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="checkout-7j9-digital-wallet-w8i">
                  Digital Wallet
                </FieldLabel>
                <Select>
                  <SelectTrigger id="checkout-7j9-digital-wallet-w8i">
                    <SelectValue placeholder="Select wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apple-pay">Apple Pay</SelectItem>
                    <SelectItem value="google-pay">Google Pay</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
          </FieldSet>
          <FieldSet>
            <FieldLegend>Billing Address</FieldLegend>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="checkout-7j9-address-ert">
                  Address
                </FieldLabel>
                <Input
                  id="checkout-7j9-address-ert"
                  placeholder="123 Main St"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="checkout-7j9-city-l9r">City</FieldLabel>
                <Input
                  id="checkout-7j9-city-l9r"
                  placeholder="New York"
                  required
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="checkout-7j9-state-b4j">
                    State
                  </FieldLabel>
                  <Input id="checkout-7j9-state-b4j" placeholder="NY" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="checkout-7j9-zip-i6t">
                    ZIP Code
                  </FieldLabel>
                  <Input id="checkout-7j9-zip-i6t" placeholder="10001" />
                </Field>
              </div>
            </FieldGroup>
          </FieldSet>
          <Field orientation="horizontal" className="items-center">
            <Checkbox id="checkout-7j9-save-info-d5m" />
            <FieldLabel htmlFor="checkout-7j9-save-info-d5m">
              Save this information for next time
            </FieldLabel>
          </Field>
          <Button type="submit" className="w-full max-w-md">
            Complete Purchase
          </Button>
        </FieldGroup>
      </form>
    </div>
  ),
};

/**
 * Input 필드 예제입니다.
 * 기본 텍스트 입력 필드와 비밀번호 필드를 보여줍니다.
 */
export const FieldInput: Story = {
  render: () => (
    <div className="w-full max-w-md">
      <FieldSet>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="username">Username</FieldLabel>
            <Input id="username" type="text" placeholder="Max Leiter" />
            <FieldDescription>
              Choose a unique username for your account.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <FieldDescription>
              Must be at least 8 characters long.
            </FieldDescription>
            <Input id="password" type="password" placeholder="********" />
          </Field>
        </FieldGroup>
      </FieldSet>
    </div>
  ),
};

/**
 * Textarea 필드 예제입니다.
 * 여러 줄의 텍스트 입력을 위한 필드입니다.
 */
export const FieldTextarea: Story = {
  render: () => (
    <div className="w-full max-w-md">
      <FieldSet>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="feedback">Feedback</FieldLabel>
            <Textarea
              id="feedback"
              placeholder="Your feedback helps us improve..."
              rows={4}
            />
            <FieldDescription>
              Share your thoughts about our service.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </FieldSet>
    </div>
  ),
};

/**
 * Select 필드 예제입니다.
 * 드롭다운 선택 메뉴를 보여줍니다.
 */
export const FieldSelect: Story = {
  render: () => (
    <div className="w-full max-w-md">
      <FieldSet>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="account-0l2">Account Type</FieldLabel>
            <Select>
              <SelectTrigger id="account-0l2">
                <SelectValue placeholder="Select an account type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="team">Team</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
            <FieldDescription>
              Choose the account type that best fits your needs.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </FieldSet>
    </div>
  ),
};

/**
 * Checkbox 필드 예제입니다.
 * 체크박스와 레이블을 함께 사용합니다.
 */
export const FieldCheckbox: Story = {
  render: () => (
    <div className="w-full max-w-md">
      <FieldSet>
        <FieldGroup>
          <Field orientation="horizontal" className="items-center">
            <Checkbox id="terms" />
            <FieldLabel htmlFor="terms">
              I agree to the terms of service
            </FieldLabel>
          </Field>
          <Field orientation="horizontal" className="items-center">
            <Checkbox id="newsletter" />
            <FieldLabel htmlFor="newsletter">
              Subscribe to our newsletter
            </FieldLabel>
          </Field>
        </FieldGroup>
      </FieldSet>
    </div>
  ),
};

/**
 * RadioGroup 필드 예제입니다.
 * 여러 옵션 중 하나를 선택할 수 있습니다.
 */
export const FieldRadioGroup: Story = {
  render: () => (
    <div className="w-full max-w-md">
      <FieldSet>
        <FieldLegend>Notification Preferences</FieldLegend>
        <RadioGroup defaultValue="all">
          <Field orientation="horizontal" className="items-center">
            <RadioGroupItem value="all" id="all" />
            <FieldLabel htmlFor="all">All new messages</FieldLabel>
          </Field>
          <Field orientation="horizontal" className="items-center">
            <RadioGroupItem value="mentions" id="mentions" />
            <FieldLabel htmlFor="mentions">
              Direct messages and mentions
            </FieldLabel>
          </Field>
          <Field orientation="horizontal" className="items-center">
            <RadioGroupItem value="none" id="none" />
            <FieldLabel htmlFor="none">Nothing</FieldLabel>
          </Field>
        </RadioGroup>
      </FieldSet>
    </div>
  ),
};

/**
 * Switch 필드 예제입니다.
 * 토글 스위치 컴포넌트를 보여줍니다.
 */
export const FieldSwitch: Story = {
  render: () => (
    <div className="w-full max-w-md">
      <FieldSet>
        <FieldGroup>
          <Field orientation="horizontal" className="items-center">
            <Switch id="notifications" />
            <FieldLabel htmlFor="notifications">
              Enable notifications
            </FieldLabel>
          </Field>
          <Field orientation="horizontal" className="items-center">
            <Switch id="auto-save" />
            <FieldLabel htmlFor="auto-save">Auto save</FieldLabel>
          </Field>
        </FieldGroup>
      </FieldSet>
    </div>
  ),
};

/**
 * Error 상태의 필드입니다.
 * 유효성 검사 실패 시 오류 메시지를 표시합니다.
 */
export const WithError: Story = {
  render: () => (
    <div className="w-full max-w-md">
      <FieldSet>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email-error">Email</FieldLabel>
            <Input
              id="email-error"
              type="email"
              placeholder="you@example.com"
              aria-invalid="true"
            />
            <FieldError>Please enter a valid email address</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="password-error">Password</FieldLabel>
            <Input id="password-error" type="password" aria-invalid="true" />
            <FieldError
              errors={[
                { message: "Password must be at least 8 characters" },
                { message: "Password must contain at least one number" },
                {
                  message:
                    "Password must contain at least one special character",
                },
              ]}
            />
          </Field>
        </FieldGroup>
      </FieldSet>
    </div>
  ),
};
