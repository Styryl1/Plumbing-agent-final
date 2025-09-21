Claude Code Super Prompt — Execution Template (v3)

**MCP-LITE MODE**
- Do **not** call Supabase MCP unless files under `src/server/db/sql/**` changed or you received explicit approval for a one-off schema check.
- Never include or expand `src/types/supabase.generated.ts` in chat; import from the shim (`src/types/supabase.ts`) only.
- If DB files did not change, skip MCP introspection and reuse the committed generated types.
- Prefer CLI commands (`pnpm db:types`, Supabase CLI) and committed artifacts over runtime introspection.

**Role**: Claude Code implements ChatGPT's strategic plans through precise, validated changes.
**Reference**: Always read `C:\Users\styry\CLAUDE.md` first for technical patterns and critical rules.

🎯 **Execution Summary**
**Objective**: <ONE clear outcome>
**Files**: <exact paths/globs to modify>  
**Budget**: ≤10 files, ≤300 LOC total
**Validation**: `pnpm check` after 2-3 edits → `pnpm guard` at completion (includes i18n:check)
**Escalate**: >3 TypeScript errors or schema changes

1) Starting Context

Bundle / Repo State: <describe snapshot or pnpm context summary>

Known issues: <summarize lint/type/i18n errors to fix>

Pre-Flight:

git status -s
pnpm check

2) Scope, Touch Map & Diff Budget

Create/Edit only these:

<LIST the exact files to create/edit (small + explicit)>


Do NOT touch (hard ban):

src/types/supabase.ts (generated)
src/components/_legacy_invoices/** (quarantined)
Any provider HTTP calls in S2
Money/BTW math (integer cents) unless explicitly requested


Diff budget: ≤10 files / ≤300 lines changed.
Per-batch rule: run `pnpm check` after every 2-3 file edits.

3) **Critical Patterns** (See `C:\Users\styry\CLAUDE.md` for complete reference)

**MUST FOLLOW**: All patterns from CLAUDE.md "CRITICAL: Things Claude Code Must Never Miss" section:
- Zod v4 only (`z.url()`, `z.uuid()`, `z.iso.datetime()`)
- Temporal only (never `Date`) 
- `??` for nullish, never `||` for defaults
- Explicit return types on all exports
- Strict booleans (`.length > 0`, not truthiness)
- i18n keys only (no UI literals)
- Integer cents (no floats)
- DTO→mapper→UI boundaries
- Never edit generated files

**Process**: `pnpm check` after 2-3 edits → `pnpm guard` at completion (includes i18n:check)

4) Operational Guardrails

No any / no ! non-null (except generated types). Prefer Zod-validated data and type guards.

Server-only boundaries: No secrets/client-unsafe code in client bundles. Use "server-only" where appropriate; provider credentials & RLS remain server-side.

Schema-drift check: After any DB migration, (1) apply migration, (2) regenerate Supabase TS types, (3) prove no drift in acceptance. Never hand-edit generated types.

Feature flags by default: New flows hidden behind flags and default off.

No legal file storage: Never persist provider PDFs/UBLs; link only (provider is SoT).

No mock data/hardcoded IDs: Prefer empty states; for S2 adapters, deterministic no-op values (no network) that are removed later.

5) Ranked File Read Plan (example)

src/schema/invoice.ts (types & Zod v4 usage)

src/server/api/routers/invoices.ts (DTO↔mapper boundaries; Temporal usage)

src/components/invoices/* (UI: i18n + strict booleans + return types)

messages/en/** & messages/nl/** (new keys; verify parity)

eslint.config.mjs (legacy ignores; generated-file overrides)

6) Execution Workflow (streamlined batches)

**Batch A** — Types & Messages (2-3 files)
- Ensure Zod v4 APIs (`z.url()`, `z.iso.datetime()`, `z.uuid()`)
- Add/align i18n keys in both EN & NL messages  
- Run `pnpm check` (TypeScript + pretypecheck validation)

**Batch B** — Server/Router Fixes (2-3 files)  
- Remove unnecessary `??` on non-nullable fields
- Use Temporal helpers (never `Date`)
- Ensure mappers return concrete types (no `any`)
- Run `pnpm check` 

**Batch C** — UI Fixes (2-3 files)
- Add explicit return types (`: JSX.Element`)  
- Replace `||` with `??` only where nullable; use strict booleans
- Remove JSX literals; use `useTranslations("…")`
- Run `pnpm check`

**Final Validation**
- Run `pnpm guard` (complete pipeline includes all validation)
- If schema changed: Use MCP supabase tools to apply migration and regenerate types

7) What NOT to Do

❌ No provider HTTP code in S2 (signatures/stubs only).

❌ Don’t store PDF/UBL blobs—surface provider links only.

❌ Don’t change BTW/totals logic or float money types.

❌ Don’t widen types or disable rules to “get green.” Fix code to satisfy rules.

❌ Don’t re-wire legacy components; keep _legacy_invoices/** unused and ignored by ESLint.

8) Acceptance Criteria

✅ `pnpm guard` passes completely (includes all validation: lint, typecheck, i18n, build)
✅ Temporal-only in edited files (no `Date` usage)  
✅ Zod v4 APIs only (no deprecated v3 methods)
✅ Nullish coalescing correct (no `||` for defaults; no unnecessary `??`)
✅ No `any` or `!` non-null assertions (except generated files)
✅ DTO→mapper→UI boundaries respected (no RouterOutputs in UI)
✅ Schema integrity: if migrations involved, types regenerated via MCP tools
✅ Diff budget: ≤10 files, ≤300 LOC total

9) Common Pitfalls & How to Avoid

“Prefer nullish coalescing” loops: If TS says the left side is non-nullable, delete the fallback; don’t change the type to make ?? “legal.”

Truthiness on arrays/strings: Replace with .length > 0 or .trim().length > 0.

Missing i18n keys: Add to both locales; validation happens in final `pnpm guard`.

Generated types: Never edit; add ESLint overrides for no-duplicate-type-constituents if needed on that single file.

Temporal: Use parseZdt and Temporal.ZonedDateTime.compare(); don’t cast strings to dates.

10) Final Validation Checklist

✅ `pnpm guard` passes (includes i18n:check, lint, typecheck, build)
✅ All edited files follow critical patterns from CLAUDE.md  
✅ If schema changed: regenerated src/types/supabase.ts via MCP tools (no hand edits)
✅ UI inspected: no literals, strict booleans, explicit return types
✅ Diff budget: ≤10 files, ≤300 LOC
✅ Commit messages are scoped & clear

Suggested commits:

git commit -m "fix(lint): enforce Temporal, Zod v4, nullish rules across invoices v2"
git commit -m "chore(i18n): add EN/NL keys and enable i18n parity check"
git commit -m "chore(eslint): ensure legacy ignores and generated-types overrides"

11) **ChatGPT → Claude Code Handoff**

Before sending to Claude Code, ChatGPT fills:
- **OBJECTIVE**: `<single clear outcome>`
- **FILES**: `<specific paths to edit>`
- **CURRENT_ERRORS**: `<top 3-5 blocking issues>`
- **ACCEPTANCE**: `<testable completion criteria>`

**Template Usage**: Claude Code reads `C:\Users\styry\CLAUDE.md` for technical patterns, then executes this workflow template with the specific objective and constraints provided by ChatGPT.
