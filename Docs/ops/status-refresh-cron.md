# Invoice Status Refresh + Dunning Cron Jobs

This document describes the invoice status refresh and dunning system implementation and operational requirements.

## Overview

The status refresh system polls invoice providers (Moneybird, WeFact, e-Boekhouden) to synchronize invoice status changes, ensuring accurate payment tracking and enabling automated dunning.

## Architecture

### Database Tables

- `invoice_status_refresh_queue` - Active jobs with exponential backoff
- `invoice_status_refresh_dead_letters` - Failed jobs after max attempts
- `invoices.last_reminder_at` - Timestamp of last reminder sent
- `invoices.next_reminder_at` - Scheduled next reminder (populated by S9 dunning)
- `invoices.reminder_count` - Number of reminders sent for compliance

### Job Processing

```typescript
// Queue a single invoice for refresh (idempotent)
await refreshOne(db, invoiceId);

// Process all due jobs in batches
const result = await runDue(db, batchSize);
// Returns: { claimed: 20, succeeded: 18, failed: 2 }
```

## Scheduling Requirements

### Production Cron Schedule

```bash
# Every 5 minutes - process due refresh jobs
*/5 * * * * /usr/local/bin/node /app/scripts/refresh-poller.js

# Every 15 minutes - process dunning reminders (during business hours)
*/15 9-18 * * * /usr/local/bin/node /app/scripts/dunning-processor.js

# Daily at 02:00 - cleanup dead letters older than 7 days  
0 2 * * * /usr/local/bin/node /app/scripts/cleanup-refresh-jobs.js
```

### Implementation Script

Create `/app/scripts/refresh-poller.js`:

```javascript
#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { runDue } from "../src/server/jobs/status/refresh.js";
import { serverOnlyEnv } from "../src/lib/env.js";

const db = createClient(
  serverOnlyEnv.SUPABASE_URL,
  serverOnlyEnv.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log(`[${new Date().toISOString()}] Starting refresh poller...`);
  
  const result = await runDue(db, 50); // Process 50 jobs per run
  
  console.log(`[${new Date().toISOString()}] Refresh complete:`, {
    claimed: result.claimed,
    succeeded: result.succeeded, 
    failed: result.failed
  });
  
  if (result.failed > 0) {
    console.warn(`Warning: ${result.failed} jobs failed processing`);
  }
  
  process.exit(result.failed > result.succeeded ? 1 : 0);
}

main().catch(error => {
  console.error("Fatal error in refresh poller:", error);
  process.exit(1);
});
```

### Dunning Processor Script

Create `/app/scripts/dunning-processor.js`:

```javascript
#!/usr/bin/env node
import fetch from "node-fetch";
import { serverOnlyEnv } from "../src/lib/env.js";

const DUNNING_ENDPOINT = `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/dunning/run`;

async function main() {
  console.log(`[${new Date().toISOString()}] Starting dunning processor...`);
  
  try {
    const response = await fetch(DUNNING_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Job-Token": serverOnlyEnv.INTERNAL_JOB_TOKEN,
      },
      body: JSON.stringify({
        mode: "run",
        batch: 25, // Conservative batch size for cron
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    const result = await response.json();
    
    console.log(`[${new Date().toISOString()}] Dunning complete:`, {
      candidates: result.result.candidates,
      sent: result.result.sent,
      skipped: result.result.skipped,
      failed: result.result.failed,
    });
    
    if (result.result.errors?.length > 0) {
      console.warn("Errors during dunning:", result.result.errors);
    }
    
    process.exit(result.result.failed > result.result.sent ? 1 : 0);
    
  } catch (error) {
    console.error("Fatal error in dunning processor:", error);
    process.exit(1);
  }
}

main();
```

## Provider-Specific Behavior

### Moneybird
- **Webhook-driven**: Status changes via webhook
- **Safety polling**: Once per day to catch missed webhooks
- **Terminal states**: `paid`, `cancelled` (stops polling)

### WeFact / e-Boekhouden  
- **Active polling**: Every 5 minutes for unpaid invoices
- **Exponential backoff**: On API failures
- **Terminal states**: `paid`, `cancelled` (stops polling)

## Job Lifecycle

1. **Queue**: Invoice created → added to refresh queue (attempt 0)
2. **Claim**: Cron job claims due jobs with `FOR UPDATE SKIP LOCKED`
3. **Process**: Poll provider API, update invoice status
4. **Schedule Next**: 
   - Continue polling if not terminal state
   - Remove from queue if `paid`/`cancelled`
5. **Failure**: Exponential backoff → dead letter after 7 attempts

## Monitoring

### Key Metrics

```sql
-- Queue depth by provider
SELECT provider, COUNT(*) FROM invoice_status_refresh_queue GROUP BY provider;

-- Success rate over last 24h  
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total_jobs,
  AVG(attempts) as avg_attempts
FROM invoice_status_refresh_dead_letters 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour ORDER BY hour;

-- Current backlog
SELECT COUNT(*) FROM invoice_status_refresh_queue WHERE run_after < NOW();
```

### Alerts

1. **Queue growing** (> 1000 pending jobs)
2. **High failure rate** (> 20% to dead letters)
3. **Provider API errors** (consistent 4xx/5xx responses)
4. **Stale jobs** (jobs pending > 4 hours)

## Error Handling

### Common Issues

1. **Provider API down**: Exponential backoff prevents spam
2. **Invoice not found**: Log warning, move to dead letter
3. **Credential expired**: Alert ops team, pause provider polling
4. **Rate limiting**: Respect provider limits, increase backoff

### Dead Letter Recovery

```sql
-- Requeue dead letters (after fixing root cause)
INSERT INTO invoice_status_refresh_queue 
SELECT 
  gen_random_uuid(),
  invoice_id, 
  provider, 
  external_id, 
  0 as attempts,
  7 as max_attempts,
  NOW() as run_after
FROM invoice_status_refresh_dead_letters
WHERE last_error LIKE '%temporary error pattern%';

-- Clean up after requeue
DELETE FROM invoice_status_refresh_dead_letters 
WHERE last_error LIKE '%temporary error pattern%';
```

## S9 Integration (Dunning System)

The refresh system integrates with S9 dunning by:

1. **Status Changes**: `paid` status triggers automatic reminder cancellation
2. **Due Date Updates**: Ensures consistent `due_at` calculation  
3. **Reminder Scheduling**: Populates `next_reminder_at` for overdue invoices
4. **Compliance**: Tracks reminder count for GDPR compliance

### Dunning Prerequisites

- All active invoices must have valid `due_at` (migration handles this)
- Customer opt-out mechanism in place (`opt_out_dunning` column)
- Audit trail via `dunning_events` table

## Security Considerations

- Uses service-role key for database access (bypasses RLS)
- Provider credentials encrypted at rest in `invoice_provider_credentials`
- No PII logged in error messages or monitoring
- Webhook events use signature verification

## Deployment Checklist

- [ ] Cron jobs configured on production server
- [ ] Monitoring alerts set up for queue depth and failure rate
- [ ] Log rotation configured for refresh job outputs
- [ ] Provider API credentials configured and validated
- [ ] Dead letter cleanup process scheduled
- [ ] S9 dunning system dependencies met (database migration applied)