# Contributing to saaslens

Thanks for your interest. Please read this before opening a PR.

## Development setup

1. Fork & clone the repo.
2. Install deps: `npm install --legacy-peer-deps`
3. Copy env: `cp .env.example .env.local` and fill in.
4. Start Postgres locally (e.g. `docker run -p 5432:5432 -e POSTGRES_PASSWORD=dev postgres:16`).
5. `npx prisma migrate deploy && npx prisma generate`
6. `npm run dev`

## Branch strategy

- `main`: protected, merged via PR only.
- `feature/<short-desc>`: for new features.
- `fix/<short-desc>`: for bug fixes.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: short description
fix: short description
docs: short description
refactor: short description
chore: short description
```

## Before opening a PR

- [ ] `npm run lint` passes
- [ ] `npm run type-check` passes
- [ ] `npm test` passes
- [ ] New code has tests (TDD preferred)
- [ ] `CHANGELOG.md` updated (under `[Unreleased]`)
- [ ] PR description explains the "why"

## Issue reporting

Use the provided issue templates (bug / feature). For security issues see [SECURITY.md](SECURITY.md).

## Code of Conduct

This project follows the [Contributor Covenant 2.1](CODE_OF_CONDUCT.md).
