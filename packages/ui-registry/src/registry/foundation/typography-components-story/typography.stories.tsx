import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Typography as TypographyComponent } from "@/components/ui/typography";

/**
 * Typography components for consistent text styling across the application.
 */
const meta = {
  title: "design/Typography",
  component: TypographyComponent,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  argTypes: {
    variant: {
      control: "select",
      options: [
        "h1",
        "h2",
        "h3",
        "h4",
        "p",
        "blockquote",
        "table",
        "list",
        "inlineCode",
        "lead",
        "large",
        "small",
        "muted",
      ],
      description: "The typography variant to render",
    },
    children: {
      control: "text",
      description: "The text content to display",
    },
  },
  args: {
    variant: "h1",
    children: "Taxing Laughter: The Joke Tax Chronicles",
  },
} satisfies Meta<typeof TypographyComponent>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * All typography heading variants displayed together.
 */
export const Typography: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <p className="text-muted-foreground mb-2 text-sm">h1</p>
        <TypographyComponent variant="h1">
          Taxing Laughter: The Joke Tax Chronicles
        </TypographyComponent>
      </div>
      <div>
        <p className="text-muted-foreground mb-2 text-sm">h2</p>
        <TypographyComponent variant="h2">
          The People of the Kingdom
        </TypographyComponent>
      </div>
      <div>
        <p className="text-muted-foreground mb-2 text-sm">h3</p>
        <TypographyComponent variant="h3">The Joke Tax</TypographyComponent>
      </div>
      <div>
        <p className="text-muted-foreground mb-2 text-sm">h4</p>
        <TypographyComponent variant="h4">
          People stopped telling jokes
        </TypographyComponent>
      </div>
      <div>
        <p className="text-muted-foreground mb-2 text-sm">p</p>
        <TypographyComponent variant="p">
          The king, seeing how much happier his subjects were, realized the
          error of his ways and repealed the joke tax.
        </TypographyComponent>
      </div>
      <div>
        <p className="text-muted-foreground mb-2 text-sm">blockquote</p>
        <TypographyComponent variant="blockquote">
          "After all," he said, "everyone enjoys a good joke, so it's only fair
          that they should pay for the privilege."
        </TypographyComponent>
      </div>
      <div>
        <p className="text-muted-foreground mb-2 text-sm">table</p>
        <TypographyComponent variant="table" />
      </div>
      <div>
        <p className="text-muted-foreground mb-2 text-sm">list</p>
        <TypographyComponent variant="list">
          <li>1st level of puns: 5 gold coins</li>
          <li>2nd level of jokes: 10 gold coins</li>
          <li>3rd level of one-liners : 20 gold coins</li>
        </TypographyComponent>
      </div>
      <div>
        <p className="text-muted-foreground mb-2 text-sm">inline code</p>
        <p>
          Use{" "}
          <TypographyComponent variant="inlineCode">
            @radix-ui/react-alert-dialog
          </TypographyComponent>{" "}
          for building accessible alert dialogs.
        </p>
      </div>
      <div>
        <p className="text-muted-foreground mb-2 text-sm">lead</p>
        <TypographyComponent variant="lead">
          The joke tax was a preposterous idea that shook the very foundations
          of our society.
        </TypographyComponent>
      </div>
      <div>
        <p className="text-muted-foreground mb-2 text-sm">large</p>
        <TypographyComponent variant="large">
          The people rejoiced at the repeal.
        </TypographyComponent>
      </div>
      <div>
        <p className="text-muted-foreground mb-2 text-sm">small</p>
        <TypographyComponent variant="small">
          Fine print: No refunds on previously paid joke taxes.
        </TypographyComponent>
      </div>
      <div>
        <p className="text-muted-foreground mb-2 text-sm">muted</p>
        <TypographyComponent variant="muted">
          This story is entirely fictional. Any resemblance to real tax policies
          is purely coincidental.
        </TypographyComponent>
      </div>
    </div>
  ),
};
