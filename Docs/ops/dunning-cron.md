# Dunning Cron - Automated Payment Reminders

This document describes the automated daily dunning system that sends payment reminders for overdue invoices.

## Overview

The dunning cron job runs daily at **09:00 Europe/Amsterdam** via GitHub Actions and triggers the internal dunning engine to process overdue invoices and send payment reminders.

## Configuration

### Required GitHub Secrets

Set these secrets in your GitHub repository settings:

1. **`DUNNING_CRON_TOKEN`** - The internal job authentication token
   - Must match the `INTERNAL_JOB_TOKEN` environment variable in your app
   - Generate a secure random token (32+ characters)
   - Example: `openssl rand -base64 32`

2. **`APP_URL`** - Your production application URL
   - Example: `https://your-app.vercel.app`
   - No trailing slash

### Environment Variable

Ensure your app has the `INTERNAL_JOB_TOKEN` environment variable set to match the GitHub secret:

REDACTED
INTERNAL_JOB_TOKEN=REDACTED
```

## Manual Testing

### Local Testing

Test the dunning endpoint locally:

```bash
# Dry run (no reminders sent)
curl -X POST http://localhost:3000/api/jobs/dunning/run \
  -H "Content-Type: application/json" \
  -H "X-Internal-Job-Token: REDACTED
  -d '{"mode":"dry","batch":10}'

# Live run (sends reminders)
curl -X POST http://localhost:3000/api/jobs/dunning/run \
  -H "Content-Type: application/json" \
  -H "X-Internal-Job-Token: REDACTED
  -d '{"mode":"run","batch":50}'
```

### Production Testing

Test against production:

```bash
curl -X POST https://your-app.vercel.app/api/jobs/dunning/run \
  -H "Content-Type: application/json" \
  -H "X-Internal-Job-Token: REDACTED
  -d '{"mode":"dry","batch":5}'
```

## Manual Execution

You can manually trigger the workflow from GitHub:

1. Go to **Actions** → **Dunning Daily**
2. Click **Run workflow**
3. Choose options:
   - **Run mode**: `run` (send reminders) or `dry` (simulate only)
   - **Batch size**: Number of invoices to process (default: 50)

## Schedule Details

- **Frequency**: Daily
- **Time**: 07:00 UTC ≈ 09:00 Europe/Amsterdam
- **Note**: Time adjusts naturally with DST since GitHub Actions uses UTC

## Request Format

The cron job sends a POST request to `/api/jobs/dunning/run` with:

```json
{
  "mode": "run",
  "batch": 50
}
```

**Headers:**
- `Content-Type: application/json`
- `X-Internal-Job-Token: REDACTED

## Response Format

Successful response (HTTP 200):

```json
{
  "processed": 15,
  "sent": 8,
  "skipped": 7,
  "errors": 0,
  "runtime_ms": 1234
}
```

## Security

- The endpoint requires `X-Internal-Job-Token` header matching `INTERNAL_JOB_TOKEN`
- Uses service-role database access (bypasses RLS) for system operations
- Token validation prevents unauthorized access
- All operations are logged for audit purposes

## Monitoring

The GitHub Action will:
- ✅ Show success for HTTP 2xx responses
- ❌ Fail for HTTP errors (4xx, 5xx)
- 📊 Log response summary (first 200 chars)
- 🔍 Indicate dry run vs live run

Check the Actions tab for execution history and logs.

## Vercel Cron Alternative

If you prefer Vercel Cron over GitHub Actions, add to `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/jobs/dunning/run",
    "schedule": "0 7 * * *"
  }]
}
```

**Note**: Vercel Cron doesn't support custom headers or request bodies, so you'd need to modify the endpoint to accept the token as a query parameter or environment variable.

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check `DUNNING_CRON_TOKEN` secret matches `INTERNAL_JOB_TOKEN`
   - Verify token is not empty or malformed

2. **404 Not Found**
   - Verify `APP_URL` is correct
   - Ensure `/api/jobs/dunning/run` endpoint exists

3. **500 Internal Server Error**
   - Check app logs for database/service errors
   - Verify dunning engine is properly configured

### Debug Mode

For debugging, manually run with a small batch and dry mode:

```bash
curl -X POST "$APP_URL/api/jobs/dunning/run" \
  -H "X-Internal-Job-Token: REDACTED
  -H "Content-Type: application/json" \
  -d '{"mode":"dry","batch":1}' \
  -v
```

This will show detailed HTTP exchange and response without sending real reminders.