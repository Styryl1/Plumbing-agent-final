scope: project
repo: plumbing-agent
owner: jordan
last_updated: 2025-09-20
version: 1.0 (Codex-only)
-------------------------

# AGENTS.md  ChatGPT5 Codex (Single Source of Truth)

> **We only use ChatGPT5 Codex for coding.** This file replaces previous *CLAUDE.md* and consolidates agent rules, MCP tooling, context packs, escalation workflow, and Windows autonomy requirements.

## Windows Autonomy Policy (Codex CLI)

Target OS: Windows 10/11  Shell: PowerShell 7 (pwsh)  Repo line endings: LF
Goal: Codex operates fully autonomously without emitting commands that fail on Windows.

1) Allowed output formats (exactly one of these)
A) Edit Blocks (preferred for surgical changes)

Format Codex must output:

/// EDIT file: <relative/path/from/repo/root>
//// FIND:
<verbatim old snippet>

//// REPLACE WITH:
<verbatim new snippet>


Multiple EDIT blocks allowed in one response.

FIND must be verbatim (not regex). If whitespace might vary, include 13 stable surrounding lines to make it unique.

Apply (Windows-safe):

# Save model output into edit_blocks.txt, then:
node .\tools\apply-edit-blocks.mjs < .\edit_blocks.txt
pnpm check
pnpm guard


B) Unified Diff (git patch)

Format Codex must output: a standard unified diff (10 files / 300 LOC), saved as patch.diff.

Apply:

git apply --3way --index .\patch.diff
pnpm check
pnpm guard


If a hunk fails, Codex must re-emit the patch with more context, or switch to Edit Blocks.

2) Forbidden outputs (Codex must never emit)

Inline one-liners or Unix-only tools for editing files:

python -c "...", sed -i, awk, perl -pi, ed, xargs, bash/WSL-only commands.

Commands that assume non-Windows paths (/usr/bin/..., /tmp/...) or CRLF mutations.

Registry edits, elevation, or PATH mutations without an explicit, reversible plan.

3) Standard apply & verify steps (always after edits)
pnpm check          # tsc + eslint + prettier -c
pnpm guard          # project test runner (vitest or equivalent)

Batch size rule: 10 files / 300 LOC per batch.

If checks fail, Codex must output a follow-up Edit Blocks or patch (not ad-hoc shell edits).

4) Research & uncertainty

If API/contracts are unclear, read local PRPs/Epics first.

If still uncertain, use MCP (Context7 / Firecrawl) to look up docs, then proceed with Edit Blocks or patch.

No edits that guess types/contracts.

5) One-time repo helpers (so Codex reuses, not invents)

Add this script to your repo:

tools/apply-edit-blocks.mjs

#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const input = await new Promise((res) => {
  let d = "";
  process.stdin.on("data", c => d += c);
  process.stdin.on("end", () => res(d));
});

const blocks = input.split("/// EDIT file:").slice(1);
if (!blocks.length) { console.error("No EDIT blocks found."); process.exit(1); }

let changed = 0;
for (const b of blocks) {
  const [fileLine, ...rest] = b.split(/\r?\n/);
  const file = fileLine.trim();
  const text = rest.join("\n");

  const findTag = "//// FIND:";
  const replTag = "//// REPLACE WITH:";
  if (!text.includes(findTag) || !text.includes(replTag)) {
    throw new Error(`Bad EDIT block format for ${file}`);
  }

  const find = text.split(findTag)[1].split(replTag)[0].trim();
  const repl = text.split(replTag)[1].trim();

  const p = path.resolve(process.cwd(), file);
  const src = fs.readFileSync(p, "utf8");

  if (!src.includes(find)) {
    throw new Error(`Context not found in ${file}.\n--- FIND ---\n${find}\n--------------`);
  }

  const out = src.replace(find, repl);
  if (out === src) throw new Error(`No change after replace in ${file}.`);

  // Optional backup:
  // fs.writeFileSync(p + ".bak", src, "utf8");

  fs.writeFileSync(p, out, "utf8");
  console.log(` Edited ${file}`);
  changed++;
}

console.log(`Done. ${changed} file(s) updated.`);


Add convenience scripts to package.json:

{
  "scripts": {
    "apply:edits": "node ./tools/apply-edit-blocks.mjs < edit_blocks.txt",
    "apply:patch": "git apply --3way --index patch.diff",
    "check": "tsc -p tsconfig.json --noEmit && eslint . && prettier -c .",
    "guard": "vitest run --reporter=dot"
  }
}


Line endings / encoding hygiene (recommend add once):

# .gitattributes
* text=auto eol=lf

6) When to choose which

Edit Blocks: one-off, surgical, human-readable changes (your default).

Unified Diff: multi-file or larger edits that still fit the batch budget.

(Optional) ts-morph codemod: only when structure varies across many TS/TSX files; otherwise stick to Edit Blocks.

Implementation note for Codex:
When emitting edits, output only the Edit Blocks or unified diff body (no extra prose in the same code block). Then print the exact apply command block shown above. Add this to the rules.

---

## 0) Golden Rules

* **Cadence:** run `pnpm check` after every 12 file edits; run `pnpm guard` at the end of a slice.
* **Diff budget:**  10 files /  300 LOC per patch unless explicitly raised.
* **Absolute paths:** when an agent reads files, prefer absolute Windows paths like `C:\Users\styry\plumbing-agent\src\...`.
* **EU/NL defaults:** Temporal dates (Europe/Amsterdam), money in integer cents, Zod v4 at boundaries, i18n EN+NL parity.
* **Guardrails:** no `any`, no `eslint-disable` without inline justification, no client `process.env`, RLS-aware server access only.

## 1) Project Topology & Commands

```
src/  (Next.js App Router)  app/, components/, server/, lib/, i18n/, types/
public/ (assets) | Docs/ (PRPs, epics) | scripts/ (maintenance) | workbench/
```

* Dev: `pnpm dev`   Validate: `pnpm check`   Full pipeline: `pnpm guard`
* i18n: `pnpm i18n:aggregate` (build en.json/nl.json)  `pnpm i18n:check`

## 2) Context Packs (for Codex Context Slots)

> Keep each context  15 KB, example-first.

1. **Context 1  Engineering Canon** (TypeScript strict, Temporal helpers, DTO mapper UI, cents math, audit logging, RLS lite).
2. **Context 2  i18n Rules** (root hook or allowlisted namespaces, leaf keys only, EN/NL parity, aggregation steps).
3. **Context 3  ScheduleX** (Temporal helpers, travel buffers, multi-assignee chips, risk buffers).
4. **Context 4  WhatsApp AI Partner** (template vs session, Outbox/idempotency, media URL expiry, signature verification, 24-hour rule).
5. **Context 5  Invoicing** (Quote -> Job -> Invoice flow, Dutch BTW 0/9/21, provider source of truth, payment links, review prompt after payment).
6. **Context 6  Supabase/RLS** (JWT org isolation, unwrap helpers, service-role allowlist, migration + types shim).
7. **Context 7  API Coding** (authoritative; see below).

### Context 7  API Coding (Authoritative)

* **HTTP helper** with optional `schema` (Zod v4), `Idempotency-Key` on POST/PUT, `Accept: application/json`, `retry` on 429/502/504 with backoff and `Retry-After`.
* **Error model:** `ApiResult<T>` = `{ ok: true; data: T } | { ok: false; error: { code; message; details? } }`.
* **Pagination:** normalize page/offset into `{ items, nextCursor }`.
* **Testing:** Vitest + `nock/msw` for HTTP; Playwright E2E with mock servers; never call real providers in tests.
* **Security:** PII minimization in logs, GDPR purpose notes, manual-review answers for risky gas/boiler content.

> When doing any API work, **load Context 7** and prefer examples over prose. Ensure DTOs/Zod at all boundaries.

## 3) MCP Servers  Installed & How Codex Should Use Them

> All servers launch via Windows shims using `cmd /c` (stable on Jordan's machine). Use these instead of bespoke scripts.

### Firecrawl (web/doc ingestion)

* **Command:** `cmd /c C:\Users\styry\mcp\node_modules\.bin\firecrawl-mcp.cmd`
* **Tools:** `firecrawl_check_crawl_status`, `firecrawl_crawl`, `firecrawl_extract`, `firecrawl_map`, `firecrawl_scrape`, `firecrawl_search`
* **Use cases:** fetch official docs, map+summarize API sections, extract code blocks. Respect robots/ToS.

### Playwright (browser automation)

* **Command:** `cmd /c C:\Users\styry\mcp\node_modules\.bin\mcp-server-playwright`
* **Tools:** `browser_navigate`, `browser_click`, `browser_type`, `browser_fill_form`, `browser_select_option`, `browser_press_key`, `browser_wait_for`, `browser_take_screenshot`, `browser_snapshot`, `browser_console_messages`, `browser_network_requests`, `browser_tabs`, `browser_navigate_back`, `browser_resize`, `browser_file_upload`, `browser_drag`, `browser_hover`, `browser_handle_dialog`, `browser_evaluate`, `browser_close`, `browser_install`
* **Use cases:** run app locally, capture flows, assert UI regressions, generate snapshots for PRs.

### shadcn (UI patterns)

* **Command:** `cmd /c C:\Users\styry\mcp\node_modules\.bin\shadcn-ui-server.cmd`
* **Tools:** `list_shadcn_components`, `search_components`, `get_component_details`, `get_component_examples`
* **Use cases:** pick components, copy minimal examples, keep Tailwind/shadcn idioms consistent.

### context7 (library docs resolver)

* **Command:** `cmd /c C:\Users\styry\mcp\node_modules\.bin\context7-mcp.cmd`
* **Tools:** `get-library-docs`, `resolve-library-id`
* **Use cases:** pull authoritative docs for libraries (Next.js, Zod, Temporal, ScheduleX) used in this repo.

### Supabase (DB/types/migrations)

* **Command:** `cmd /c C:\Users\styry\mcp\node_modules\.bin\mcp-server-supabase --project-ref=akuktezoisvblrnkaljb --access-token=sbp_98ab9bf832b23cebca433f5792b0a40e789311f9`
* **Tools:** `apply_migration`, `generate_typescript_types`, `execute_sql`, `list_tables`, `list_migrations`, `get_logs`, `get_project_url`, `get_anon_key`, `list_extensions`, `create_branch`, `list_branches`, `merge_branch`, `rebase_branch`, `reset_branch`, `delete_branch`, `deploy_edge_function`, `get_edge_function`, `get_advisors`, `search_docs`
* **Use cases:** apply migrations, regenerate types (`src/types/supabase.generated.ts`), follow shim pattern via `src/types/supabase.ts` re-exports.

## 4) When Codex Is Unsure  Decision Workflow

> **Goal:** Never guess. Always ground changes in docs or our PRPs/epics.

**A. Working on API code (internal or external)**

1. Load **Context 7  API Coding**.
2. If still ambiguous: call **context7** `get-library-docs` for the exact lib (e.g., Next.js route handlers, Zod v4 transforms).
3. If it's provider/external (Moneybird, MessageBird/Mollie/etc.) or third-party docs: call **Firecrawl** `firecrawl_search` then `firecrawl_extract` the relevant pages (rate limit, auth examples).
4. Propose the minimal change set (10 files/300 LOC), include typed DTOs, retries, idempotency.

**B. Unsure about domain rules or acceptance**

1. Read **Docs/** epics + PRPs for the area (e.g., `Invoicing_epic.md`, `whatsapp_ai_unified_prp.md`, `schedule_x_prp.md`).
2. Summarize constraints, list acceptance checks, proceed with surgical patch.

**C. UI uncertainty (component patterns)**

1. Ask **shadcn** for component examples.
2. Verify i18n keys exist (EN & NL); if adding new keys, run `pnpm i18n:aggregate`.

**D. End-to-end behavior doubts**

1. Use **Playwright** to navigate to the page, click through, and snapshot.
2. If failures occur, propose fixes, then re-run Playwright.

> At any branch of uncertainty, prefer *reading* (contexts/docs) over coding. If still unclear after one pass, **escalate to Jordan** with a tight question and a 3-option plan.

## 5) Coding Patterns We Enforce

* **Time:** import from `~/lib/time` only (`now`, `parseISO`, `format`, `zonedTimeToUtc`).
* **Supabase:** use `rowsOrEmpty` / `mustSingle` unwrap helpers; always `.throwOnError()` in low-level wrappers.
* **Errors/Logging:** no `console.*` in prod; use structured logger with PII redaction and Temporal timestamps.
* **WhatsApp:** session vs template logic, Outbox with idempotency, verify signatures, download short-lived media immediately.
* **Invoices:** provider becomes source of truth after send; store links (PDF/UBL/PaymentURL), not regenerated artifacts.

## 6) i18n Canon (next-intl)

* **Default:** *root hook OR allowlisted namespace* per file (do not mix); call **leaf keys only**.
* **Workflow:** edit `src/i18n/messages/en/*.json` + `nl/*.json` -> `pnpm i18n:aggregate` -> `pnpm check`.

## 7) Performance & Local Search Aids (Windows/WSL)

* Prefer **WSL2** for heavy IO; otherwise add Defender exclusions for repo, pnpm store, and `node_modules`.
* Use **ripgrep (`rg`)**, **fd**, **jq** for fast search/filters. Example:

  * `rg -n -C3 "term" -g "*.{ts,tsx}"`
  * `rg -l "key" src | xargs wc -l`
  * `fd invoice -e ts -e tsx -E node_modules`
* Codex `--search "query"` narrows patch surface; it is **not** a replacement for structured reasoning or these tools.

## 8) Supabase Types & Migration Shim (Critical)

* Generated file: `src/types/supabase.generated.ts` (**never edit**).
* Stable shim: `src/types/supabase.ts` re-exports generated types and helpers.
* Flow:

1. `mcp__supabase__apply_migration` (or `execute_sql`).
2. `mcp__supabase__generate_typescript_types`.
3. `pnpm check` -> fix compile if needed.

## 9) Acceptance Checklist (attach to every patch)

* [ ] `pnpm check` clean (types + lint + build preflight)
* [ ] No new `eslint-disable` without justification
* [ ] i18n keys present in EN & NL; no hardcoded strings
* [ ] DTOs + Zod v4 at every boundary; idempotency on POST/PUT
* [ ] Retry/backoff on 429/5xx; pagination normalized
* [ ] Structured logs on all mutations (who/when/what)
* [ ] Supabase types regenerated if DB touched
* [ ] Slice stays within diff budget (10 files / 300 LOC)

## 10) Escalation Protocol

* If **3+** consecutive `pnpm check` failures or ambiguous requirements remain after Context/Docs + MCP pass:

  * Post a short note with: *observed errors*, *what you tried*, *next best 2-3 plans*.
  * Pause edits; await guidance.

---

**Mission:** Turn "oh fuck, I need a plumber" into a booked job within 30 seconds. NL-first; GDPR/BTW compliant. Keep it safe, fast, and human.

