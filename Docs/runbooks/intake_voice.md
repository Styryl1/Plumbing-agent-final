# Runbook — MessageBird Voice Intake

_Last updated: 2025-09-21_

## Scope
This runbook covers ingestion of MessageBird voice webhooks, storage of call metadata and recordings, transcription enqueueing, and the 90-day retention sweep for voice assets used in the Plumbing Agent MVP slice.

## Webhook Endpoint
- **URL**: `/api/webhooks/messagebird`
- **Runtime**: Node.js (server-only)
- **Verification**: HMAC SHA-256 using `MESSAGEBIRD_WEBHOOK_SIGNING_KEY`.
- **Headers**:
  - Signature: `MessageBird-Signature` (configurable via env)
  - Timestamp: `MessageBird-Request-Timestamp`
- **Idempotency**: Every event writes to `webhook_events` with provider `messagebird`. Duplicate events are ignored.

### Failure Modes
| Symptom | Likely Cause | Mitigation |
| --- | --- | --- |
| 401 Invalid signature | Out-of-sync signing key or stale timestamp | Verify env secrets; ensure webhook timestamp tolerance (±300s) is satisfied |
| 422 Missing org | `clientReference` not set on call | Update MessageBird flow to pass org UUID, or patch call record manually |
| Recording upload error | Storage bucket missing or duplicate key conflict | Check Supabase Storage bucket `voice-intake`; duplicates are skipped intentionally |

## Intake Flow
1. Webhook validated and de-duplicated.
2. Recording downloaded (if URL present) using `MESSAGEBIRD_ACCESS_KEY`.
3. Recording stored in `voice-intake` bucket under `org_{orgId}/YYYY/MM/DD/voice/call_{id}.{ext}`.
4. `intake_events` upserted with channel `voice`, details JSON validated via Zod.
5. `intake_voice_calls` row created/updated with metadata and storage key.
6. Matching `unscheduled_items` row upserted (`status=pending`).
7. Audit events emitted for both intake and unscheduled ensure.

## Retention Policy
- **Timer**: 90-day soft delete enforced by `pruneExpiredVoiceRecordings()`.
- **Action**: Deletes recording object, nulls `recording_storage_key`, sets `intake_events.expires_at`.
- **Run cadence**: Daily cron (see `src/server/cron/intake-voice-retention.ts`).
- **Logging**: Success and failure logged via `logger` and audit trail `voice_call.retention`.

### Manual Execution
```ts
import { pruneExpiredVoiceRecordings } from "~/server/cron/intake-voice-retention";
await pruneExpiredVoiceRecordings();
```
Expect a `{ removed, failures }` summary; investigate failures via Supabase logs.

## Transcription & Analyzer
- Recording metadata saved immediately; transcription job is enqueued separately (provider configurable via `VOICE_TRANSCRIBE_PROVIDER`).
- Once transcript stored, re-run analyzer using shared intake helper to update `intake_events.details.voice.transcript` and unscheduled priority.

## On-Call Checklist
1. **Webhook errors**: Review Sentry breadcrumbs tagged `provider:messagebird`.
2. **Missing intake in UI**: Query `intake_events` by `source_ref=<callId>`; ensure `unscheduled_items` row exists.
3. **Retention drift**: Confirm cron executed (logs in `voice_call.retention` audit entries); run manual sweep if needed.
4. **Bucket access issues**: Verify Supabase service-role key and bucket ACLs. Recordings require private bucket `voice-intake` in EU region.
5. **Replay**: Re-run webhook payload by POSTing to endpoint with preserved headers after verifying signature.

## Contacts
- MessageBird Support: https://support.messagebird.com/
- Internal Slack: `#intake-ops`
- Pager escalation: `@ops-oncall` (week rotation)
