# saaslens

> Open-source SaaS subscription management platform. Discover unused subscriptions, match payments to apps, and manage users, seats, and costs in one place.

[![CI](https://github.com/Wondermove-Inc/saaslens/actions/workflows/ci.yml/badge.svg)](https://github.com/Wondermove-Inc/saaslens/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Next.js](https://img.shields.io/badge/Next.js-15-black)

## Features

- Subscription & SaaS app inventory
- Payment-to-app matching (with optional Korean card issuer preset)
- Team / user / seat management
- Department-level cost analytics
- Browser extension for automatic usage capture
- AI agent for insights and recommendations

## Tech Stack

| Layer    | Technology                                      |
| -------- | ----------------------------------------------- |
| Frontend | Next.js 15 (App Router) + React 19 + TypeScript |
| UI       | Shadcn/ui + Radix + Tailwind CSS 4              |
| Data     | Refine 5 + TanStack React Query/Table           |
| Auth     | NextAuth 5 + Prisma Adapter                     |
| ORM      | Prisma 6 / PostgreSQL                           |
| AI       | Anthropic AI SDK + Vercel AI SDK                |
| Cache    | Upstash Redis                                   |

## Quick Start

Requirements: Node.js 20+, PostgreSQL 14+.

```bash
# 1. Clone
git clone https://github.com/Wondermove-Inc/saaslens.git
cd saaslens

# 2. Install
npm install --legacy-peer-deps

# 3. Configure
cp .env.example .env.local
# Required: DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
# Optional: Google OAuth, Upstash Redis, Resend, etc. (see README § Environment Variables)

# 4. Database
npx prisma migrate deploy
npx prisma generate

# 5. Run
npm run dev
# → http://localhost:3000
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in the values you need. The app
boots with only the required variables; optional integrations degrade
gracefully when their vars are missing.

**Required**

| Variable          | Purpose                                          |
| ----------------- | ------------------------------------------------ |
| `DATABASE_URL`    | PostgreSQL connection string (Supabase works)    |
| `NEXTAUTH_SECRET` | NextAuth session encryption (>= 32 bytes random) |
| `NEXTAUTH_URL`    | Canonical app URL (e.g. `http://localhost:3000`) |

Generate a `NEXTAUTH_SECRET` with `openssl rand -base64 32`.

**Required for Google sign-in**

| Variable               | Purpose                    |
| ---------------------- | -------------------------- |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID     |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

**Optional integrations**

| Feature                              | Variables                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| Upstash Redis (rate limiting, cache) | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`                            |
| Resend (email)                       | `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME`                               |
| Google Workspace Admin SDK (SSO)     | `GOOGLE_ADMIN_CLIENT_EMAIL`, `GOOGLE_ADMIN_PRIVATE_KEY`, `GOOGLE_ADMIN_SUBJECT` |
| Cloudflare R2 (file storage)         | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`   |
| OpenAI (SaaS classification LLM)     | `OPENAI_API_KEY`, `OPENAI_FAST_MODEL` (default: `gpt-4o-mini`)                  |
| FleetDM (device management)          | `FLEETDM_API_URL`, `FLEETDM_API_TOKEN`                                          |
| Vercel Cron                          | `CRON_SECRET`                                                                   |
| Feature flags                        | `ENABLE_REFINE` (Refine UI), `ENABLE_V2_FEATURES` (Tasks/Kanban)                |

See `.env.example` for the complete list.

### UI Components (shadcn)

The 46+ shadcn-style components (Button, Card, Input, etc.) are **vendored
into `packages/ui-registry/`** — you do **not** need the shadcn CLI at
runtime. `npm install` plus the project's Tailwind + Radix dependencies
is enough.

The shadcn CLI is only useful if you want to **add new components** from a
registry:

    npx shadcn@latest add <component-name>

`components.json` is configured with optional Shadcn Studio registries
(`@ss-components`, `@ss-themes`, `@ss-blocks`) that require `EMAIL` and
`LICENSE_KEY` environment variables. These are not needed unless you use
those registries.

## Documentation

- [Development guide](docs/guide/) — TDD, Shadcn rules, deployment, audit logging
- [CONTRIBUTING](CONTRIBUTING.md)
- [SECURITY](SECURITY.md)
- [CHANGELOG](CHANGELOG.md)

## Architecture (overview)

```
Next.js App Router
├── (auth)/            — login, signup, invite, password reset
├── (dashboard)/       — main app (subscriptions, payments, users, teams, reports)
├── super-admin/       — tenant/admin management
└── api/v1/            — REST API

src/lib/
├── services/          — business logic (matcher, notification, hyphen/*, …)
├── config/presets/    — regional presets (e.g. Korean card issuers)
└── …
```

## Roadmap

- [ ] v0.1: initial public release
- [ ] v0.2: plugin system for payment integrations
- [ ] v0.3: self-host Docker Compose quickstart
- [ ] v1.0: stable API, i18n beyond EN/KO

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Bug reports & feature requests via [GitHub Issues](../../issues). Vulnerability reports via [GitHub Security Advisories](../../security/advisories).

## License

MIT © 2026 Wondermove-Inc. See [LICENSE](LICENSE).
