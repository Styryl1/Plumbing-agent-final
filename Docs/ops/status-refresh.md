# Invoice Status Refresh System

The invoice status refresh system provides automated and manual polling of provider invoice statuses with exponential backoff, dead letter handling, and minimal operational overhead.

## Overview

This system consists of:
- **Queue table**: `invoice_status_refresh_queue` - Active jobs with retry logic
- **Dead letter table**: `invoice_status_refresh_dead_letters` - Failed jobs after max attempts
- **Background poller**: Processes due jobs with exponential backoff
- **Admin API**: Manual refresh endpoints for operational control
- **Atomic claim RPC**: `job_claim_due()` uses `FOR UPDATE SKIP LOCKED` for race-free job claiming

## Architecture & Service Role Justification

The refresh job API route (`/api/jobs/invoices/refresh`) legitimately uses `getAdminDb()` because:

1. **Cross-tenant operations**: System jobs need to process invoices across all organizations
2. **Queue atomicity**: The `job_claim_due` RPC requires elevated permissions to bypass RLS temporarily  
3. **Security boundary**: Access is restricted by `X-Internal-Job-Token` authentication
4. **Narrow scope**: Service-role access is contained to this single system operation

This is the correct pattern for background job processing that operates across tenant boundaries.

## Provider Behavior

### Moneybird (Safety Polling)
- **Frequency**: Once per day (24-hour intervals)
- **Purpose**: Safety check even though webhooks exist
- **Continues**: Until terminal state (paid/cancelled)

### WeFact & e-Boekhouden (Active Polling)  
- **Frequency**: Every 5 minutes (300s base interval) 
- **Purpose**: Primary status tracking (no reliable webhooks)
- **Continues**: Until terminal state (paid/cancelled)

## Operations Guide

### Manual Refresh (Single Invoice)

#### Using API Route
```bash
curl -X POST "http://localhost:3000/api/jobs/invoices/refresh" \
  -H "X-Internal-Job-Token: $INTERNAL_JOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "one",
    "invoiceId": "123e4567-e89b-12d3-a456-426614174000"
  }'
```

#### Using pnpm Script (Local Development)
```bash
# Add to package.json scripts:
"refresh:invoice": "curl -X POST http://localhost:3000/api/jobs/invoices/refresh -H \"X-Internal-Job-Token: $INTERNAL_JOB_TOKEN\" -H \"Content-Type: application/json\" -d"

# Usage:
pnpm refresh:invoice '{"mode":"one","invoiceId":"uuid-here"}'
```

### Batch Refresh (All Due Jobs)

#### Using API Route
```bash
curl -X POST "http://localhost:3000/api/jobs/invoices/refresh" \
  -H "X-Internal-Job-Token: $INTERNAL_JOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "due",
    "batch": 20
  }'
```

#### Using pnpm Script  
```bash
# Add to package.json scripts:
"refresh:due": "curl -X POST http://localhost:3000/api/jobs/invoices/refresh -H \"X-Internal-Job-Token: $INTERNAL_JOB_TOKEN\" -H \"Content-Type: application/json\" -d '{\"mode\":\"due\"}'"

# Usage:
pnpm refresh:due
```

### Cron Setup (Production)

```bash
# Run every 5 minutes for active polling (WeFact/e-Boekhouden)
*/5 * * * * curl -X POST https://your-app.com/api/jobs/invoices/refresh \
  -H "X-Internal-Job-Token: $INTERNAL_JOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode":"due","batch":50}' \
  >> /var/log/invoice-refresh.log 2>&1
```

## Environment Variables

```bash
# Required for API authentication
INTERNAL_JOB_TOKEN="your-secure-random-token-here"

# Provider feature flags (must be enabled)
INVOICING_MONEYBIRD="true"
INVOICING_WEFACT="true" 
INVOICING_EB="true"
```

## Monitoring & Troubleshooting

### Database Queries

#### Check Queue Status
```sql
SELECT 
  provider,
  COUNT(*) as pending_jobs,
  AVG(attempts) as avg_attempts,
  MIN(run_after) as next_run
FROM invoice_status_refresh_queue 
GROUP BY provider;
```

#### Check Dead Letters
```sql
SELECT 
  provider,
  COUNT(*) as failed_jobs,
  last_error,
  COUNT(*) FILTER (WHERE deadlettered_at > NOW() - INTERVAL '1 day') as recent_failures
FROM invoice_status_refresh_dead_letters 
GROUP BY provider, last_error
ORDER BY recent_failures DESC;
```

#### Find Stuck Jobs
```sql
SELECT 
  id,
  invoice_id,
  provider,
  attempts,
  max_attempts,
  run_after,
  last_error
FROM invoice_status_refresh_queue 
WHERE run_after < NOW() - INTERVAL '1 hour'
  AND attempts < max_attempts
ORDER BY run_after ASC;
```

### Health Check

```bash
curl -X GET "http://localhost:3000/api/jobs/invoices/refresh"
# Returns: {"service":"invoice-status-refresh","status":"healthy",...}
```

### Retry Failed Jobs

#### Requeue from Dead Letters
```sql
-- Requeue specific dead letter job
INSERT INTO invoice_status_refresh_queue 
  (invoice_id, provider, external_id, attempts, run_after)
SELECT 
  invoice_id, 
  provider, 
  external_id, 
  0 as attempts,  -- Reset attempts
  NOW() as run_after
FROM invoice_status_refresh_dead_letters 
WHERE id = 'dead-letter-id-here';

-- Remove from dead letters
DELETE FROM invoice_status_refresh_dead_letters 
WHERE id = 'dead-letter-id-here';
```

## Error Handling

### Retry Logic
- **Base interval**: 60 seconds (configurable)
- **Backoff**: Exponential with 20% jitter  
- **Max attempts**: 7 (configurable per job)
- **Cap**: 60 minutes maximum delay

### Common Error Patterns

#### Provider Authentication Failures
- **Moneybird**: OAuth token expired → Refresh via admin UI
- **WeFact**: API key invalid → Check `WEFACT_API_KEY`  
- **e-Boekhouden**: Token invalid → Check provider credentials

#### Network/Timeout Issues
- **Action**: Automatic retry with backoff
- **Escalation**: Dead letter after max attempts

#### Invoice Not Found
- **Cause**: External ID no longer valid
- **Action**: Move to dead letters immediately (non-retryable)

## Performance Tuning

### Batch Size Optimization
- **Local/Development**: 10-20 jobs per batch
- **Production**: 20-50 jobs per batch (monitor API rate limits)
- **High Volume**: Increase batch size and reduce frequency

### Rate Limiting
Each provider has different API limits:
- **Moneybird**: ~300 requests/minute
- **WeFact**: ~100 requests/minute
- **e-Boekhouden**: ~200 requests/minute

## Logs & Debugging

### Application Logs
```bash
# Filter for status refresh logs
tail -f application.log | grep "status_refresh"

# Check for specific invoice
tail -f application.log | grep "invoice_id:uuid-here"
```

### Common Log Messages
- `"Refresh job {job_id} succeeded"` - Normal success
- `"Refresh job {job_id} failed:"` - Retry will occur  
- `"Invoice {invoice_id} moved to dead letters"` - Max attempts reached
- `"Provider {provider} authentication failed"` - Credential issue

## Security Notes

- **INTERNAL_JOB_TOKEN**: Use cryptographically secure random string (32+ chars)
- **API Access**: Only internal systems should have token access
- **Database**: Queue tables respect RLS policies via invoice relationships
- **Audit Trail**: All status changes logged to `invoice_audit_log` table

## Migration Notes

This system was introduced to replace manual status checking and provides:
- **Reliability**: Automatic retries with exponential backoff
- **Observability**: Dead letter tracking and detailed audit logs  
- **Scalability**: Batch processing with configurable concurrency
- **Safety**: Provider-specific polling strategies (safety vs active)

The system is designed to be low-maintenance while providing comprehensive status synchronization across all integrated invoice providers.