---
scope: project
repo: plumbing-agent
last_updated: 2025-09-05
version: 3.0
---
# CLAUDE (PROJECT)

> **SCOPE**: PROJECT - applies only to plumbing-agent repository  
> **GLOBAL PATTERNS**: See `C:\Users\styry\CLAUDE.md` for guard pipeline and universal rules  
> **DO NOT**: Duplicate global patterns; link instead  
> **CADENCE**: `pnpm check` after every 1-2 edits; `pnpm guard` only at slice end

This file provides project-specific guidance for the plumbing-agent repository.

## Quick Init

**Working Directory**: `C:\Users\styry\plumbing-agent-in\` (absolute paths required)  
**File Access Pattern**: Always use full Windows paths like `C:\Users\styry\plumbing-agent-in\src\...`  
**Status**: Check `Docs/PROJECT_STATUS.md` first  
**Completion**: 85% (Customer Management & RLS Security production-ready)

### Critical File Path Rule
```typescript
// ✅ CORRECT: Use absolute Windows paths in Read tool
Read("C:\Users\styry\plumbing-agent-in\src\server\db\sql\001_init.sql")

// ❌ WRONG: Relative paths cause "file not found" errors  
Read("src\server\db\sql\001_init.sql")
```

```bash
pnpm dev        # localhost:3000
pnpm check      # MANDATORY after every 2-3 files
pnpm guard      # Complete validation pipeline
pnpm context    # Bundle for ChatGPT collaboration
```

## Key Implementations

### RLS Security ✅ PRODUCTION READY
- Full multi-tenant data isolation with JWT-based auth
- All 12 tables secured with organization isolation
- Service-role only allowed in verified webhooks

### Zod v4 API (Critical Change)
```typescript
// ✅ MODERN (v4): Top-level format schemas
email: z.email().max(255, { error: "E-mail te lang" }).optional(),
uuid: z.uuid(),

// ❌ DEPRECATED (v3): Chained methods
email: z.string().email("message").max(255).optional(),
```

### i18n Canonical Pattern (CRITICAL)
```typescript
// ✅ CORRECT: Prevents INSUFFICIENT_PATH errors
const tForm = useTranslations('customers.form');
<Label>{tForm('name.label')}</Label>  // Reads string

// ❌ WRONG: Causes component render failures  
const t = useTranslations();
<Label>{t('customers.form.name')}</Label>  // Reads object!
```

## Project-Specific Patterns

### Schedule-X Calendar Integration + Temporal Autopilot
- **Global Temporal polyfill**: Use `src/lib/time.ts` for all date operations
- **4-function system**: `now()`, `parseISO()`, `format()`, `zonedTimeToUtc()` 
- **Why**: Schedule-X v3 is ONLY calendar lib with proper Temporal support
- **⚡ AUTOPILOT**: Any file touching time/calendar → `import "~/lib/time"` FIRST

### Employee Color System  
- **File**: `src/app/jobs/calendar/useEmployeeColors.ts`
- **Pattern**: Deterministic colors based on employee ID (not random)
- **Benefit**: Consistent colors across calendar views for emergency visibility

### Dutch Locale Requirements + i18n Autopilot
```typescript
// Always use nl-NL formatting
date.toLocaleDateString('nl-NL')
amount.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' })
// 24-hour format: "13:30" not "1:30 PM"
```

### i18n Autopilot Rules (CRITICAL - Prevents UI Failures)
```
⚡ MANDATORY on every UI change:
• Update BOTH nl AND en translation keys (never just one language)
• Verify with `pnpm i18n:check` before marking complete
• Any hardcoded string triggers ESLint error → must use translation key
• Namespace hooks prevent INSUFFICIENT_PATH runtime errors:
  ✅ const tForm = useTranslations('customers.form');
  ❌ const t = useTranslations(); // Causes component failures
```

### Multi-Assignee Jobs
- **Migration**: `src/server/db/sql/003_multi_assignees.sql`  
- **UI**: `src/components/calendar/EmployeeChips.tsx`
- **Business Rule**: Jobs can have multiple plumbers (emergency redundancy)

### Anti-Placeholder Protection (4-Layer)
1. **Database**: Removed all "Tijdelijke klant" test data
2. **ESLint**: Custom rules detect placeholder patterns
3. **Guard**: Automated validation in `pnpm guard`
4. **Documentation**: Prevents future placeholder creation

## tRPC Router Status

```typescript
// src/server/api/routers/
customers.ts   // ✅ PRODUCTION READY - Complete CRUD with DTO layer
jobs.ts        // ✅ Complete with multi-assignee support  
invoices.ts    // ✅ Dutch BTW compliance
employees.ts   // ✅ Working with color system
ai.ts          // 🔄 Scaffold ready (returns [])
whatsapp.ts    // 🔄 Scaffold ready (returns [])
```

## Critical Rules

1. **Run `pnpm check` after every 2-3 file edits** - prevents TypeScript accumulation
2. **Zero ESLint suppressions** - fix root issues, escalate to ChatGPT if needed
3. **i18n namespace hooks** - prevent UI render failures
4. **RLS-aware clients only** - use tRPC context, never direct service-role
5. **Nullish discipline** - `??` only for null|undefined; never `||` for defaults; remove `??` when LHS non-nullable
6. **Supabase results** - Always `.throwOnError()` or `rowsOrEmpty<T>()` from ~/server/db/unwrap.ts
7. **Time helpers** - Only `parseZdt`, `zdtToISO`, `parseDate`, `dateToISODate` from ~/lib/time; any other time util banned
8. **Feature flags** - All external flows gated and default OFF until acceptance
9. **GDPR logging** - No `console.*` in production; use structured logger with PII redaction; Temporal ZDT timestamps
10. **Service-role allow-list** - Only cron/system jobs, specific webhook verifiers, migrations. Everything else = RLS
11. **Schema-drift gate** - After DB change, regenerate Supabase types and include diff in acceptance. No hand edits
12. **No mocks/hardcoded IDs** - Prefer real empty states; stubs fail acceptance
13. **WhatsApp safeguards** - Session vs template helper required; all sends via Outbox with idempotency

### WhatsApp Integration Footguns (CRITICAL - API Compliance)
```
📋 WhatsApp Critical Rules - NEVER bypass these:
• 24-hour session window vs template message distinction (different endpoints)
• Short-lived media URLs → download & re-store immediately in Supabase storage  
• All sends MUST go via Outbox table with idempotency checks (prevent duplicates)
• Session expiry handling → graceful degradation to templates
• Webhook signature verification → always verify before processing
• Rate limiting respect → batch sends, handle 429 responses
```

### Provider Integration - Invoice SoT Rule (CRITICAL - Financial Flow)
```
🔒 Post-Send Invoice Rule - Provider becomes source of truth:
• After successful send: store ONLY links (PDF/UBL/PaymentURL) from provider response
• Feature-flag all provider UI behind ENABLE_* environment flags (default OFF)
• Legacy invoice numbers = read-only compatibility layer (never regenerate)
• Provider health monitoring via precise status types (not boolean checks)
• OAuth2 PKCE flow with state verification (never direct token storage)
• Webhook idempotency via database deduplication (not memory-based)
```

## Quality Gates & Escalation

**Guard Pipeline**: See `C:\Users\styry\CLAUDE.md` for complete validation steps
**Escalation Protocol**: See `C:\Users\styry\CLAUDE.md` for ChatGPT handoff rules
**Quick Command**: `pnpm context` → create focused bundle for ChatGPT collaboration

## Environment & Deployment

### Required Environment Variables
```bash
# Supabase (Database & Auth)
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Clerk (Authentication)  
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SECRET=whsec_...

# Optional (Future)
MOLLIE_API_KEY=test_...  # iDEAL payments
```

### Quality Gates Before Deployment
```bash
pnpm guard  # Must pass: Biome + ESLint + TypeScript + Build + i18n + Custom rules
```

### MCP Testing Workflow
```typescript
// Use these MCP tools instead of .spec.ts files:
mcp__playwright__browser_navigate("http://localhost:3000/customers")
mcp__playwright__browser_snapshot()  // Full accessibility analysis
mcp__playwright__browser_click("element", "ref")  // Real interactions
```

## Supabase Migration & Types Workflow (CRITICAL - Automated)

### Types Shim Pattern (NEW - Eliminates Manual Edits)
```typescript
// ✅ AUTOMATED: Types update automatically after migrations
// src/types/supabase.ts is now a stable shim that re-exports
// from src/types/supabase.generated.ts (overwritten by MCP)

// 1. Apply migration via MCP tools
mcp__supabase__apply_migration({ name: "024_new_feature", sql: migrationSql })

// 2. Regenerate types - automatically updates supabase.generated.ts
mcp__supabase__generate_typescript_types()

// 3. No manual edits needed - shim pattern handles re-exports automatically
// Application code continues importing from ~/types/supabase unchanged
```

**Key Insight**: The shim pattern at `src/types/supabase.ts` provides stable import paths while `src/types/supabase.generated.ts` gets overwritten by MCP tools. This eliminates the recurring manual edit problem forever.

### Migration Workflow (Updated - Fully Automated)
```bash
# Old workflow (manual edits required):
# 1. Apply migration → 2. Manual supabase.ts updates → 3. Fix import conflicts

# ✅ NEW workflow (zero manual edits):
# 1. Apply migration via MCP
# 2. Regenerate types via MCP  
# 3. pnpm check (types update automatically)
```

### Shim Architecture Files
```typescript
// src/types/supabase.ts - STABLE SHIM (edit for helpers only)
export type { Database, Tables, ... } from "./supabase.generated";
export type TableRow<T> = AllTables[T]["Row"];  // Helper types

// src/types/supabase.generated.ts - GENERATED (never edit directly)
// Overwritten by mcp__supabase__generate_typescript_types()
export type Database = { /* generated content */ };
```

## Supabase Query Patterns (CRITICAL - ESLint Compliance)

### Unwrap Helper Canonization
```typescript
// ✅ ALWAYS: Use ~/server/db/unwrap.ts helpers - never manual ?? []
import { rowsOrEmpty, mustSingle } from "~/server/db/unwrap";

// Multi-row queries - returns T[], never null
const customers = rowsOrEmpty(await db.from("customers").select("*"));
const markers = rowsOrEmpty(await db.from("wa_read_markers").select("*"));

// Single row queries - returns T, throws if not found
const customer = mustSingle(await db.from("customers").select("*").eq("id", id).single());

// ❌ BANNED: Manual destructuring triggers ESLint violations
const { data: rows, error } = await db.from("customers").select("*");
if (error) throw error;
for (const r of rows ?? []) { } // Triggers strict-boolean-expressions + no-unnecessary-condition
```

### Lint-Clean Iteration (Post-Unwrap)
```typescript
// ✅ CORRECT: Simple loops work after unwrap helpers
for (const customer of customers) {  // No ?? needed - customers is T[]
  console.log(customer.name);
}

// ✅ CORRECT: Length checks work cleanly
if (customers.length > 0) {  // No truthiness issues
  const first = customers[0]!;  // Safe after length check
}

// ❌ BANNED: Manual ?? patterns that unwrap helpers eliminate
for (const item of items ?? []) { }  // ESLint error - unnecessary ??
if (items?.length) { }  // ESLint error - use items.length > 0
```

**Key Insight**: `rowsOrEmpty()` and `mustSingle()` at `src/server/db/unwrap.ts` eliminate all Supabase-related ESLint violations by handling the `T[] | null` → `T[]` conversion properly.

## Emergency Plumber Context

**Mission**: Transform "oh fuck, I need a plumber" → "booked in 30 seconds"  
**Market**: Netherlands (Amsterdam → Rotterdam → Utrecht)  
**Compliance**: GDPR, KVK (Chamber of Commerce), BTW (21% VAT)

## Next Priority

**Customer Integration**: Replace placeholder data in job creation (picker ready)