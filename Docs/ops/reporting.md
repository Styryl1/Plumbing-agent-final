# Reporting v1 (Daily Snapshots)

## Overview

The reporting system provides aggregated daily invoice metrics per organization without storing any PII. It consists of:

1. **Daily snapshots table**: `invoice_daily_snapshots` 
2. **Aggregation engine**: Computes metrics from source invoices
3. **Query APIs**: tRPC endpoints for dashboard data
4. **Job endpoint**: Token-gated automation for snapshot computation

## Daily Snapshots Table

Located in: `src/server/db/sql/20250907_invoice_snapshots.sql`

### Structure

```sql
invoice_daily_snapshots (
  snapshot_date date,           -- YYYY-MM-DD in UTC
  org_id uuid,                  -- Organization identifier
  total_invoices int,           -- Total invoice count for the day
  sent_count int,              -- Invoices sent within day window
  paid_count int,              -- Invoices paid within day window  
  revenue_paid_cents bigint,   -- Revenue from invoices paid in day
  revenue_outstanding_cents bigint, -- Total unpaid revenue
  overdue_count int,           -- Count of overdue invoices
  overdue_cents bigint,        -- Total overdue amount
  aging_0_7_cents bigint,      -- 0-7 days past due
  aging_8_30_cents bigint,     -- 8-30 days past due
  aging_31_60_cents bigint,    -- 31-60 days past due
  aging_61_plus_cents bigint,  -- 61+ days past due
  created_at timestamptz,
  updated_at timestamptz,
  PRIMARY KEY (org_id, snapshot_date)
)
```

### Key Features

- **PII-free**: Only aggregated numbers, no customer data
- **Idempotent**: Re-running same day yields identical results
- **RLS compliant**: Source queries respect organization isolation
- **Integer precision**: All money stored as cents to avoid float errors

## Computation Logic

### Day Window Calculation

- Uses `Europe/Amsterdam` timezone for local day boundaries
- Day window: `[00:00:00, 24:00:00)` in local time
- `snapshot_date` reflects the local date (YYYY-MM-DD)

### Metrics Definitions

- **sent_count**: Invoices with `issued_at` within day window
- **paid_count**: Invoices with `paid_at` within day window  
- **revenue_paid_cents**: Sum of `total_cents` for invoices paid in day
- **revenue_outstanding_cents**: Sum of unpaid invoices (across all time)
- **overdue_***: Based on `due_date` vs end of local day
- **aging_buckets**: Days past due at end of day (0-7, 8-30, 31-60, 61+)

## Job Endpoint

**URL**: `POST /api/jobs/reporting/snapshot`
**Auth**: Requires `X-Internal-Job-Token` header

### Request Body

```typescript
{
  mode: "one" | "backfill",
  date?: string,          // ISO datetime for "one" mode
  from?: string,          // ISO datetime for "backfill" start  
  to?: string             // ISO datetime for "backfill" end
}
```

### Examples

Single day (today):
```bash
curl -X POST /api/jobs/reporting/snapshot \
  -H "X-Internal-Job-Token: $INTERNAL_JOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode": "one"}'
```

Specific date:
```bash
curl -X POST /api/jobs/reporting/snapshot \
  -H "X-Internal-Job-Token: $INTERNAL_JOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode": "one", "date": "2025-09-06T12:00:00+02:00[Europe/Amsterdam]"}'
```

Backfill range:
```bash
curl -X POST /api/jobs/reporting/snapshot \
  -H "X-Internal-Job-Token: $INTERNAL_JOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "backfill", 
    "from": "2025-09-01T12:00:00+02:00[Europe/Amsterdam]",
    "to": "2025-09-05T12:00:00+02:00[Europe/Amsterdam]"
  }'
```

## Automation

### Recommended Schedule

Run daily at **00:30 Europe/Amsterdam** to capture complete previous day:

```bash
# Cron: 30 0 * * * (adjust for timezone)
curl -X POST https://your-domain.com/api/jobs/reporting/snapshot \
  -H "X-Internal-Job-Token: $INTERNAL_JOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode": "one"}'
```

### Backfill Operations

For historical data or system recovery:

```bash
# Backfill last 30 days
curl -X POST /api/jobs/reporting/snapshot \
  -H "X-Internal-Job-Token: $INTERNAL_JOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "backfill", 
    "from": "2025-08-07T12:00:00+02:00[Europe/Amsterdam]",
    "to": "2025-09-06T12:00:00+02:00[Europe/Amsterdam]"
  }'
```

## Query APIs

### tRPC Endpoints

Available via `api.reporting.getDaily` and `api.reporting.getWeekly`:

```typescript
// Get daily snapshots
const daily = await api.reporting.getDaily.query({
  from: "2025-09-01", 
  to: "2025-09-07"
});

// Get weekly rollup
const weekly = await api.reporting.getWeekly.query({
  from: "2025-09-01", 
  to: "2025-09-30"
});
```

### Response Format

Daily snapshots return the raw table data:
```typescript
{
  snapshot_date: "2025-09-06",
  total_invoices: 150,
  sent_count: 23,
  paid_count: 18,
  revenue_paid_cents: 485000, // €4,850.00
  revenue_outstanding_cents: 1250000, // €12,500.00
  // ... aging buckets
}
```

Weekly rollups aggregate daily data:
```typescript
{
  week: "2025-W36",
  from_date: "2025-09-02", 
  to_date: "2025-09-08",
  total_invoices: 1050, // Sum of daily totals
  // ... other summed metrics
}
```

## Operational Notes

### Performance

- **Memory usage**: Aggregation happens in-memory (suitable for daily batches)
- **Query optimization**: Covering indexes on `(org_id, snapshot_date)` and `(snapshot_date)`
- **Backfill efficiency**: Processes day-by-day to avoid large memory usage

### Data Integrity

- **Idempotency**: Safe to re-run snapshots (upsert operation)
- **Atomicity**: Each day processes independently
- **Consistency**: Uses single DB transaction per day per org
- **Durability**: Snapshots persist until manually deleted

### Security

- **No PII**: Only aggregated numbers stored
- **RLS inheritance**: Source queries respect organization boundaries
- **Token authentication**: System endpoints protected by internal token
- **Audit trail**: All operations logged with timestamps

### Monitoring

Check job health:
```bash
curl /api/jobs/reporting/snapshot  # GET for health check
```

Expected response:
```json
{
  "service": "reporting-snapshot",
  "status": "healthy", 
  "timestamp": "2025-09-06T10:30:00+02:00[Europe/Amsterdam]"
}
```