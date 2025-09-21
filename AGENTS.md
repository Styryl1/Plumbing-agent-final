# GPT-5 Codex — Non-Negotiable Rules (Plumbing Agent)

**Mission**: Deliver the Plumbing Agent MVP (Docs/plumbing_agent_mvp_epic.md) — AI-assisted intake → proposal → schedule → offline job card loop for Dutch plumbing teams, with GDPR, RLS, and provider-integrated invoicing staged in separate slices.

- **TL;DR — MCP-LITE PLAN**
- Regenerate Supabase types via CLI scripts (`pnpm db:types`) and only call the Supabase MCP server for migrations or one-off schema checks.
- Keep the generated file committed; regenerate manually with `pnpm db:types` when SQL changes (or use the CI drift job for safety).
- Use stacked PRs plus `git worktree` for parallel feature slices; optional pnpm workspaces stay on the radar but are not mandatory.
- Update Codex/Claude prompts with the MCP-LITE guidance so automated agents respect the new workflow.

## Tooling & Context Commitments
- Keep work scoped to ≤10 files / ≤300 LOC per task. Prefer additive changes and targeted refactors.
- After every 1–2 files touched (or when logic demands), run `pnpm check`; fix issues immediately.
- After completing a slice of work, run the full `pnpm guard` pipeline before handing back.
- Load full context before touching code: review the relevant PRPs/Epics in `Docs/`. Docs to open first for most slices: `plumbing_agent_mvp_prp.md`, `plumbing_agent_mvp_epic.md`, `whatsapp_ai_unified_prp.md`, `schedule_x_prp.md`, `invoicing_epic.md`. Never guess requirements.
- Default working dir: `/home/styryl/dev/pa`. Use `rg`, `sed`, `ls` instead of ad-hoc scripts for basic inspection.
- Before writing code, snapshot the current repo state (`git status -sb`, `rg TODO`, `rg "FIXME"`) so you account for existing deltas and cleanup items.
- Use the script-based dev workflow: `pnpm dev:bg` (runs `scripts/start-dev.sh`, restarts the server on 127.0.0.1:3000, and tails output into `.logs/dev.log`), sanity-check with `pnpm logs:once`, read `.logs/dev.log` directly if you need deeper history, and shut down via `pnpm dev:stop` (auto-clears log); treat any error-level log line as a blocker to fix immediately.
- MCP servers (MCP-LITE usage only):
  - **supabase**: reserve for applying migrations or one-off schema introspection. Use the Supabase CLI scripts (`pnpm db:types`) for routine type generation and commit the refreshed `src/types/supabase.generated.ts` via the shim (`src/types/supabase.ts`).
  - **playwright**: run interactive browser flows, snapshots, accessibility checks.
  - **context7**: resolve and fetch live library docs before relying on memory.
  - **firecrawl**: search or scrape external resources when unsure about APIs/specs.
  - **testsprite**, **clerk**, **shadcn**, **semgrep**: leverage as needed for tests, auth workflows, UI scaffolds, or security scans.
- Log AI assist flows: any automated proposal must include accept/reject metadata per Docs/whatsapp_ai_unified_epic.md.

## Workflow Quickstart
1. Read the active PRP/Epic slices and acceptance notes in `Docs/`.
2. Inspect existing implementations (`rg`, `ls`, `context7`, `firecrawl`) and stage the required MCP servers.
3. Plan the minimum diff (≤10 files / ≤300 LOC), then edit one file at a time.
4. After 1–2 files, run `pnpm check` and fix any failures immediately.
5. Repeat steps 3–4 until the slice is complete, then run `pnpm guard`.
6. Capture verification evidence (test output, MCP runs, Playwright snapshots) before handoff.

## 0) Scope & Diff Budget
- Limit change-sets per task to ≤10 files / ≤300 LOC.
- Prefer adding new modules or adapters over rewriting wide surfaces.
- Stop if >3 unresolved TypeScript errors or a gate fails; report blockers with file + line + fix intent.
- Keep a running checklist; if a dependent PRP/Epic isn’t clear, pause and gather context before coding.

## 1) Architecture & Boundaries
- Respect DTO → mapper → UI flow. Convert database rows inside server routes/services (see `src/server/api/routers/*`). Never pass raw Supabase rows into React components.
- Client components must not hold secrets or call external APIs directly. Use tRPC (`~/lib/trpc/...`) for all server I/O.
- AI actions are propose-only. Validate every AI JSON payload with Zod v4 (`~/server/api/routers/ai.ts` pattern) and audit acceptance decisions.
- Post-migration: use supabase MCP server to regenerate types, stage `supabase.generated.ts`, and ensure the shim (`src/types/supabase.ts`) stays untouched except for helper exports.

## 2) Time, Money, i18n (Dutch Defaults)
- Temporal everywhere: import `temporal-polyfill/global` once (see `src/app/layout.tsx`). Use helpers in `src/lib/time.ts` (`parseZdt`, `zdtToISO`, `parseDate`, `dateToISODate`). No `Date`.
- Store monetary values as integer cents. Use Zod schemas (`src/schema/invoice.legacy.ts`) to enforce.
- UI formatting defaults to `nl-NL`: `Intl.NumberFormat` for euro currency, 24-hour clocks.
- Translation rules: use `useTranslations()` root hook + full keys (`src/app/whatsapp/page.tsx:27`). Edit namespace files (`src/i18n/messages/en|nl/*.json`), run `pnpm i18n:aggregate`, then `pnpm check`. Aggregated files (`en.json`, `nl.json`) are generated.

## 3) Next.js App Router & React Discipline
- Default to Server Components; mark interactive files with `'use client'` only when stateful UI is required.
- Never import server-only modules (env, db clients, secrets) into client code. Split files when in doubt.
- Keep client components slim: delegate heavy logic to hooks/services in `src/lib/` or server actions.

## 4) Data Security & AuthZ
- Use Clerk org context; derive `{ orgId, role, userId }` in tRPC context and enforce roles for Owner/Admin/Staff flows (`src/server/api/trpc`).
- Honor Supabase RLS policies. Service-role credentials live server-side only (`src/lib/env.ts`); never expose in the client.
- Ensure webhook handlers verify signatures (MessageBird, WhatsApp, Mollie) and use idempotency guards.

## 5) Scheduling & Calendar
- Schedule-X v3 is the single calendar source. Use Temporal for all calculations, 15-minute snap, deterministic colour chips (`src/components/calendar/useEmployeeColors.ts`).
- Support multi-assignee jobs. Persist optimistic drag-and-drop updates via tRPC with rollback on failure per Docs/schedule_x_prp.md.

## 6) WhatsApp + AI + Job Cards Loop
- Maintain two-number routing (Customer vs Control). Webhooks must verify HMAC, enforce idempotency, and respect the 24-hour session versus template boundary (Docs/whatsapp_ai_unified_prp.md).
- AI triage proposes updates; organisers approve before job creation. Track every decision in audit logs.
- Job cards must work offline-first with background sync and conflict policy (Docs/plumbing_agent_mvp_epic.md §Offline Job Card Sync Strategy).

## 7) Invoicing & Payments (Provider-Based)
- Providers (Moneybird, e-Boekhouden, WeFact) own numbering, legal PDFs/UBLs, and payment URLs. Treat provider response as source of truth post-send.
- Feature-flag provider UI (`ENABLE_*` flags in `src/lib/env.ts`).
- iDEAL via Mollie: create payment → redirect using `_links.checkout` → rely on webhook for final status (Docs/Invoicing_epic.md). Never trust client redirects alone.

## 8) Accessibility, Mobile, UX Polish
- WCAG AA: 44–48 px touch targets, proper contrast, focus states, aria labels.
- Provide skeletons/loading states, Dutch microcopy, and undo-friendly interactions instead of modal confirmations.
- Verify accessible flows with MCP Playwright snapshots when altering UI.

## 9) Coding Style & Validation
- TypeScript strict; no `any`, no `eslint-disable`. Fix root causes or escalate with plan.
- Boundary validation via Zod v4 (`.input()` on tRPC routers, env schema in `src/lib/env.ts`).
- Write tests for money math, Temporal conversions, and webhook verifiers. Use Vitest (`tests/`) and Testsprite MCP for larger plans when helpful.
- Format via Biome/ESLint; the guard pipeline already enforces but keep files clean before commit.

## References & Quick Commands
- `pnpm dev` (hot reload + i18n aggregation), `pnpm check` (i18n doctor + typecheck), `pnpm guard` (full pipeline) — see `package.json` scripts.
- `pnpm context` builds a bundle for handoff; keep it updated before escalation.
- Supabase migrations: use MCP `apply_migration`, then `generate_typescript_types`, run `pnpm check`, inspect `src/types/supabase.generated.ts`.
- Regenerating Supabase types: run `pnpm db:types` (uses Supabase CLI locally, falls back to remote) to refresh `src/types/supabase.generated.ts` and keep the shim (`src/types/supabase.ts`) untouched. Only reach for Supabase MCP if both local and remote CLI generation fail.
- Supabase CLI helpers: `pnpm db:start` boots the local stack; `pnpm db:types:local` / `pnpm db:types:remote` give explicit control when the auto fallback isn’t desired; `pnpm db:types:project` hits the production project (`akuktezoisvblrnkaljb`) when you need the authoritative schema (the script prefixes PATH with `/home/linuxbrew/.linuxbrew/bin` so the CLI resolves).
- Parallel workspaces:
  - `/home/styryl/dev/pa` – primary workspace (branch `main`).
  - `/home/styryl/dev/pa-feature` – branch `feature`, tracks `origin/main`.
  - `/home/styryl/dev/pa-feature2` – branch `feature2`, tracks `origin/main`.
  - `/home/styryl/dev/pa-web` – branch `web`, tracks `origin/main`.
  - All repos share `origin=https://github.com/Styryl1/Plumbing-agent-final`. Run `pnpm guard` in each before pushing; rebase onto `origin/main`, then merge via the primary repo.
- For uncertain APIs or library behavior: `context7__resolve-library-id` → `context7__get-library-docs`, and `firecrawl_search`/`firecrawl_scrape` for external references.

Stay disciplined, document assumptions, and escalate early when requirements conflict or validation gates fail.
