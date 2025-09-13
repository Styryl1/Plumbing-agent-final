# Repository Guidelines

## Session Bootstrap
- First read C:\Users\styry\CLAUDE.md and C:\Users\styry\plumbing-agent\CLAUDE.md
- For guard-fixing runs, use `Docs/Guard_Fixer_Prompt.md`

## Project Structure & Module Organization
- `src/` — Next.js App Router code: `app/`, `server/`, `components/`, `lib/`, `i18n/`, `types/`.
- `public/` — static assets. `Docs/` — project docs. `scripts/` — maintenance/validation scripts.
- `workbench/` — integration tooling and tests (`vitest.config.ts`, `tests/**`).
- Aliases: import from `~` for the `src` root (e.g., `import x from "~/lib/x"`).

## Build, Test & Development
- Prereqs: Node `22.18.x`, pnpm `>=9` (enforced via preinstall/volta).
- `pnpm dev` — start Next dev (runs i18n aggregate on predev).
- `pnpm check` — type-safety gate (`pretypecheck` + `tsc --noEmit`).
- `pnpm build` / `pnpm start` — production build and run (i18n sync on prebuild).
- `pnpm test` | `pnpm test:watch` | `pnpm test:coverage` — unit tests via Vitest.
- `pnpm guard` — full pipeline: Biome format, ESLint, typecheck, unit + workbench tests, i18n prune/check, custom audits, Next build.
- i18n utils: `pnpm i18n:aggregate`, `pnpm i18n:check`, `pnpm i18n:prune`.

## Coding Style & Naming Conventions
- Language: TypeScript (strict). Formatting: Biome. Linting: ESLint (Next, TS, security, a11y) with custom rules.
- Components use `PascalCase`; hooks `useCamelCase`; files generally `kebab-case`.
- Time: use Temporal polyfill helpers from `~/lib/time` (avoid `Date`).
- Env: read via `~/lib/env.ts` only (no direct `process.env`).
- Nullish discipline: prefer `??` over `||` for defaults; avoid eslint disables.

## Testing Guidelines
- Framework: Vitest (`vitest.config.ts`). Integration/workbench tests under `workbench/tests/**` (`workbench/vitest.config.ts`).
- Run all: `pnpm test` (unit) and `pnpm guard` (includes workbench). For DB-backed workbench tests, set `WB_ALLOW_DB=1` when invoking the workbench config.
- Naming: `*.test.ts`/`*.test.tsx` colocated or under `workbench/tests/**`.

## Commit & Pull Request Guidelines
- Conventional Commits: `feat:`, `fix:`, `chore:`, etc. Scope optional (e.g., `feat(calendar): …`).
- PRs: clear description, linked issues, screenshots for UI changes, and pass `pnpm guard`. For larger diffs/UI, attach a `pnpm context` bundle.

## Architecture & Multi‑Repo Flow
- Repos: `plumbing-agent` (main), `plumbing-agent-web`, `plumbing-agent-in` — developed in parallel and merged as needed. Keep branches and i18n namespaces consistent across repos.
- Global rules live in `C:\Users\styry\CLAUDE.md`; project specifics in `plumbing-agent/CLAUDE.md`. Do not duplicate; link and follow.

## Security & Configuration Tips
- RLS-first: use tRPC/server clients that honor RLS; service-role only in verified webhooks/cron.
- No `console.*` in production; use the structured logger. Keep WhatsApp sends via the Outbox with signature checks.
