# shadcn/ui Storybook Registry

A comprehensive Storybook registry for shadcn/ui components with interactive
stories and documentation.

## Features

- **46+ Component Stories**: Interactive Storybook stories for shadcn/ui
  components
- **Design Tokens**: Documentation for color, typography, spacing, shadow, and
  radius tokens
- **Registry System**: Install components and stories via shadcn CLI
- **TypeScript**: Full type safety with TypeScript
- **Storybook 9**: Latest Storybook features with Vite builder
- **Vitest Testing**: Unit tests and Storybook browser tests via Playwright

## React 18/19 Compatibility

**All 191 components fully support both React 18.3.1+ and React 19** with the
`forwardRef` pattern.

### What This Means for You

- ✅ **No Breaking Changes**: Existing code works without modifications
- ✅ **Full Type Safety**: TypeScript types are maintained for both React
  versions
- ✅ **Ref Forwarding**: All components properly forward refs to underlying DOM
  elements
- ✅ **Future-Proof**: Ready for React 19 while maintaining React 18
  compatibility

### Supported React Versions

- React 18.3.1 or later
- React 19.x

### Using Refs with Components

All components support ref forwarding. Here's how to use them:

#### Basic Usage

```typescript
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRef } from "react"

export function MyComponent() {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    buttonRef.current?.focus()
    console.log("Button element:", buttonRef.current)
  }

  return (
    <div>
      <Button ref={buttonRef} onClick={handleClick}>
        Click Me
      </Button>
      <Input ref={inputRef} placeholder="Type here..." />
    </div>
  )
}
```

#### TypeScript Type Safety

```typescript
import { Card } from "@/components/ui/card"
import type { ComponentRef } from "react"

// Extract the correct ref type from the component
type CardRef = ComponentRef<typeof Card>

export function MyCard() {
  const cardRef = useRef<CardRef>(null)

  useEffect(() => {
    if (cardRef.current) {
      // Full type safety with autocomplete
      const element = cardRef.current
      console.log(element.scrollHeight)
    }
  }, [])

  return <Card ref={cardRef}>Content</Card>
}
```

#### With Radix UI Primitives

Components built on Radix UI primitives use `React.ElementRef`:

```typescript
import { Dialog, DialogContent } from "@/components/ui/dialog"
import type { ElementRef } from "react"

export function MyDialog() {
  const contentRef = useRef<ElementRef<typeof DialogContent>>(null)

  return (
    <Dialog>
      <DialogContent ref={contentRef}>
        Dialog content
      </DialogContent>
    </Dialog>
  )
}
```

## Installation

### Prerequisites

- Node.js 18.x or 20.x
- React 18.3.1+ or React 19.x
- Next.js 15+ (recommended) or any React framework

### Using shadcn CLI

Install component stories from this registry:

```bash
# Initialize shadcn/ui in your project (if not already done)
npx shadcn@latest init

# Install a component story
npx shadcn@latest add http://localhost:3000/v2/r/button-story.json

# Or from production URL
npx shadcn@latest add https://registry.lloydrichards.dev/v2/r/button-story.json
```

### Local Development

```bash
# Clone the repository
git clone <repository-url>
cd shadcn-storybook-registry

# Install dependencies
npm install
# or
bun install

# Start Storybook development server (port 6006)
npm run storybook

# Start Next.js development server (port 3000)
npm run dev

# Build registry
npm run registry:build
```

## Available Scripts

```bash
# Development
npm run storybook          # Start Storybook dev server (port 6006)
npm run dev                # Start Next.js dev server (turbopack)
npm run registry:dev       # Watch mode for registry changes

# Building
npm run build              # Full production build (Next.js + Storybook + Registry)
npm run storybook:build    # Build Storybook only
npm run registry:build     # Build registry JSON files

# Testing
npm run test               # Run all tests
npm run test:unit          # Run unit tests (Vitest)
npm run test:storybook     # Run Storybook browser tests (Playwright)
npm run storybook:test     # Run Storybook test runner

# Code Quality
npm run lint               # ESLint
npm run type-check         # TypeScript type checking
npm run format:write       # Format code with Prettier
npm run format:check       # Check code formatting
```

## Project Structure

```
shadcn-storybook-registry/
├── src/
│   ├── components/ui/        # shadcn/ui components (installed)
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utilities (cn(), etc.)
│   └── registry/             # 📍 PRIMARY WORK AREA
│       ├── atoms/            # Component stories (button, input, etc.)
│       ├── tokens/           # Design token documentation
│       ├── foundation/       # Foundation components
│       └── templates/        # Template examples
├── .github/
│   └── workflows/            # GitHub Actions CI/CD
├── registry.json             # Registry manifest
├── components.json           # shadcn CLI configuration
└── package.json
```

## Component Coverage

### ✅ Implemented (46/51 components - 90.2%)

All components with Storybook stories and forwardRef support:

- Accordion, Alert, Alert Dialog, Aspect Ratio, Avatar
- Badge, Breadcrumb, Button, Calendar, Card
- Carousel, Chart, Checkbox, Collapsible, Combobox
- Command, Context Menu, Date Picker, Dialog, Drawer
- Dropdown Menu, Form, Hover Card, Input, Input OTP
- Label, Menubar, Navigation Menu, Pagination, Popover
- Progress, Radio Group, Resizable, Scroll Area, Select
- Separator, Sheet, Sidebar, Skeleton, Slider
- Sonner, Switch, Table, Tabs, Textarea
- Toggle, Toggle Group, Tooltip

### 🎨 Design Tokens

- Color, Typography, Spacing, Shadow, Radius

## Tech Stack

- **Framework**: Next.js 15 with TypeScript
- **UI Library**: shadcn/ui (46/51 components with stories)
- **Documentation**: Storybook 9 with Vite
- **Testing**: Vitest (unit tests + Storybook browser tests via Playwright)
- **Styling**: Tailwind CSS v4 with design tokens
- **Package Manager**: npm / bun

## Contributing

Contributions are welcome! Please follow the development guidelines in
[CLAUDE.md](./CLAUDE.md).

### Development Workflow

1. Create a new branch for your feature
2. Add/modify component stories in `src/registry/`
3. Update `registry.json` if adding new stories
4. Run quality checks: `npm run lint && npm run type-check`
5. Build registry: `npm run registry:build`
6. Test in Storybook: `npm run storybook`
7. Create a pull request

## License

MIT

## Resources

- [shadcn/ui](https://ui.shadcn.com/)
- [Storybook](https://storybook.js.org/)
- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
