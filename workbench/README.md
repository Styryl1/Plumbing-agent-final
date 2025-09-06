# Workbench

This folder is for experimental code, prototypes, and development utilities that are excluded from ESLint and the main build process.

## Purpose

- **Test scripts** - Quick scripts to test API endpoints, database queries, etc.
- **Prototypes** - Experimental features before integration
- **Development tools** - One-off utilities for development tasks
- **Research code** - Code for exploring new libraries or patterns

## 🚨 DATABASE TESTING SAFETY

**CRITICAL: Some workbench tests can modify real database tables!**

### Safe Testing Setup

1. **Enable database testing** (required):
   ```bash
   export WB_ALLOW_DB=1
   # or add to .env.local: WB_ALLOW_DB=1
   ```

2. **Verify you're using a development environment**:
   - URL must contain: `-dev`, `-local`, `-test`, `-staging`, `localhost`, or `127.0.0.1`
   - Production URLs are automatically blocked

3. **Run workbench tests**:
   ```bash
   cd workbench
   npx vitest run        # Run all tests
   npx vitest tests/integration/wa_basic.test.ts  # Run specific test
   ```

### ⚠️ Dangerous Tests (Modify Database)
- `tests/integration/wa_basic.test.ts` - Deletes from 4 tables, upserts to wa_numbers
- `tests/jobs/status/refresh.test.ts` - Job status operations  
- `tests/payments/mollie.webhook.test.ts` - Payment webhook processing
- `tests/providers/moneybird.webhook.test.ts` - Provider webhook testing
- `tests/providers/wefact.adapter.test.ts` - Provider adapter testing

### Environment Variables Required
```bash
# Basic Supabase setup
SUPABASE_URL=https://your-project-dev.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# WhatsApp testing (if running wa_basic.test.ts)
TEST_ORG_ID=org_test
WHATSAPP_BUSINESS_PHONE_ID=test_phone_id
WHATSAPP_CONTROL_PHONE_ID=test_control_phone
WHATSAPP_APP_SECRET=test_secret

# Database testing enabler
WB_ALLOW_DB=1
```

### CI Safety
- Tests automatically skip if `WB_ALLOW_DB` not set
- CI environments blocked unless `WB_RUN=1` explicitly set
- `passWithNoTests` prevents CI failures when tests are skipped

## Important Notes

- Code in this folder is **NOT** included in production builds
- ESLint rules are **NOT** enforced here
- TypeScript is still checked but with relaxed rules
- Use this for rapid prototyping without the strict validation pipeline
- **NEVER** import workbench code from `src/` directory

## Guidelines

1. Move code to the main `src/` directory once it's ready for production
2. Clean up old experiments periodically
3. Document what each file/folder is for
4. Don't reference workbench code from production code
5. **Always** use `WB_ALLOW_DB=1` when running database tests
6. **Never** run database tests against production URLs

## Example Usage

```typescript
// workbench/test-whatsapp.ts
// Quick script to test WhatsApp webhook processing
import { POST } from '~/app/api/wa/customer/route'

const testPayload = {
  // ... test data
}

// Run with: tsx workbench/test-whatsapp.ts
```

## Test Structure

```
workbench/
├── tests/
│   ├── _setup/
│   │   └── env-safety.ts      # Environment validation
│   ├── fixtures/
│   │   └── whatsapp_payloads.ts
│   ├── helpers/
│   │   ├── db.ts              # 🚨 DATABASE ACCESS (requires WB_ALLOW_DB=1)
│   │   ├── crypto.ts
│   │   └── next.ts
│   ├── integration/
│   │   ├── wa_basic.test.ts   # 🚨 MODIFIES DATABASE
│   │   └── wa_basic_mock.test.ts  # Safe (mocked)
│   └── ...
└── vitest.config.ts
```