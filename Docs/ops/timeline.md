# Invoice Timeline System

The invoice timeline system provides a unified chronological view of all invoice lifecycle events, merging data from multiple sources into a single, ordered feed for UI consumption.

## Overview

The timeline system consists of:
- **Database view**: `invoice_timeline` - UNION of events from invoices and dunning_events tables
- **Normalizer**: `~/server/timeline/normalize.ts` - Converts raw DB rows to UI-friendly DTOs
- **Server API**: `timeline.getInvoiceTimeline(invoiceId)` - RLS-protected tRPC endpoint
- **Documentation**: This file explaining sources, ordering, and privacy compliance

## Architecture & RLS Security

The `invoice_timeline` view uses `SECURITY INVOKER` mode, ensuring Row Level Security (RLS) inheritance from underlying tables:

1. **RLS Inheritance**: The view inherits RLS policies from `invoices` and `dunning_events` tables
2. **Tenant Isolation**: Users can only see timeline events for invoices in their organization
3. **No Service Role**: Timeline reads use regular authenticated user context, not service-role bypass
4. **GDPR Compliance**: No PII (personal identifiable information) stored in timeline meta fields

## Event Sources & Types

The timeline unifies events from multiple sources:

### System Events (from `invoices` table)
- **created**: Invoice creation timestamp (`invoices.created_at`)
  - Always present for every invoice
  - Meta: `{status, provider_status}`

### Provider Events (from `invoices` table)
- **sent**: Invoice sent/issued by provider (`invoices.issued_at`)
  - Present when provider confirms invoice delivery
  - Meta: `{provider}` (e.g., "moneybird", "wefact")

### Payment Events (from `invoices` table)
- **paid**: Invoice payment received (`invoices.paid_at`)
  - Present when payment is confirmed
  - Meta: `{payment_method}` (e.g., "ideal", "bank_transfer")

### Dunning Events (from `dunning_events` table)
- **reminder_sent**: Reminder successfully delivered
- **reminder_error**: Reminder delivery failed
- **reminder_skipped**: Reminder skipped (customer opted out)
- **manual_follow_up**: Manual intervention logged
- **opted_out**: Customer opted out of reminders

Each dunning event includes meta: `{channel, template, delivery_status, event_type}`

## Timeline Ordering & Stability

Events are ordered chronologically by the `at` timestamp field:

1. **Primary Sort**: `at` timestamp (ascending - oldest first)
2. **Deterministic Tiebreaks**: When timestamps are identical:
   - System events before provider events
   - Provider events before payment events
   - Payment events before dunning events
3. **Stable Results**: Multiple queries return identical ordering

## Privacy & Compliance

### No PII in Timeline Meta
The timeline system is designed with GDPR compliance:
- **No message content**: Reminder texts are not stored in timeline
- **No phone numbers**: Only channel type ("whatsapp", "email") stored
- **No customer data**: Personal info stays in customer table with separate RLS
- **Template codes only**: Generic template identifiers (e.g., "urgent", "final_notice")

### RLS Policy Enforcement
```sql
-- Example: Users can only see timeline for invoices in their org
SELECT * FROM invoice_timeline WHERE invoice_id = $1;
-- Automatically filtered by org_id via RLS inheritance
```

## Server API Usage

### Basic Timeline Query
```typescript
// tRPC client usage
const timeline = await api.timeline.getInvoiceTimeline.query({ 
  invoiceId: "123e4567-e89b-12d3-a456-426614174000" 
});

// Returns normalized items:
// [
//   { at: "2024-01-01T10:00:00Z", kind: "created", label: "Created", icon: "sparkles" },
//   { at: "2024-01-01T11:00:00Z", kind: "sent", label: "Sent", icon: "send" },
//   { at: "2024-01-02T09:00:00Z", kind: "reminder", label: "Reminder sent", icon: "bell" },
//   { at: "2024-01-15T14:30:00Z", kind: "paid", label: "Paid", icon: "euro" }
// ]
```

### RLS Security in Action
```typescript
// User from org A tries to access invoice from org B
const timeline = await api.timeline.getInvoiceTimeline.query({ 
  invoiceId: "other-org-invoice-id" 
});
// Returns: [] (empty array - RLS blocks access)

// User from correct org
const timeline = await api.timeline.getInvoiceTimeline.query({ 
  invoiceId: "same-org-invoice-id" 
});
// Returns: [events...] (full timeline)
```

## Event Types & UI Icons

The normalizer maps database events to UI-friendly representations:

| DB Source | DB Type | UI Kind | UI Label | UI Icon |
|-----------|---------|---------|----------|---------|
| system | created | created | "Created" | sparkles |
| provider | sent | sent | "Sent" | send |
| payment | paid | paid | "Paid" | euro |
| dunning | reminder_sent | reminder | "Reminder sent" | bell |
| dunning | reminder_error | reminder | "Reminder failed" | bell |
| dunning | reminder_skipped | reminder | "Reminder skipped" | bell |
| dunning | manual_follow_up | reminder | "Manual follow-up" | bell |
| dunning | opted_out | reminder | "Opted out" | bell |

## Database Schema

### Timeline View Structure
```sql
CREATE VIEW invoice_timeline AS
  -- Union of all event sources
  SELECT invoice_id, at, source, type, meta FROM ...
```

### Key Fields
- `invoice_id`: UUID foreign key to invoices table
- `at`: timestamptz of when event occurred
- `source`: text enum ('system', 'provider', 'payment', 'dunning', 'note')
- `type`: text description of specific event type
- `meta`: jsonb metadata (no PII, only codes and flags)

## Future Enhancements

### Planned Features (Future Slices)
- **Note Events**: System-generated or manual notes in timeline
- **Provider Transitions**: More detailed provider status changes
- **Webhook Events**: Direct webhook delivery confirmations
- **Export Functionality**: Timeline export for audit/compliance

### Extension Points
The timeline system is designed to accommodate new event sources:
1. Add new UNION branch to `invoice_timeline` view
2. Update normalizer to handle new source/type combinations
3. No API changes needed - existing endpoints work automatically

## Monitoring & Troubleshooting

### Performance Monitoring
```sql
-- Check timeline query performance
EXPLAIN ANALYZE 
SELECT * FROM invoice_timeline 
WHERE invoice_id = '...' 
ORDER BY at ASC;
```

### Common Issues

#### Empty Timeline
- **Cause**: RLS blocking access or invoice doesn't exist
- **Debug**: Check user's org_id matches invoice's org_id
- **Fix**: Ensure proper authentication and authorization

#### Missing Events
- **Cause**: NULL timestamps in source tables
- **Debug**: Check `invoices.created_at`, `issued_at`, `paid_at` fields
- **Fix**: Data integrity issue in source tables

#### Incorrect Ordering
- **Cause**: Timestamp precision or timezone issues
- **Debug**: Check raw `at` values and timezone consistency
- **Fix**: Ensure all timestamps use consistent timezone (UTC in DB)

## Security Notes

- **View Security**: Uses `SECURITY INVOKER` mode for RLS inheritance
- **API Access**: Only available via authenticated tRPC procedures  
- **Tenant Isolation**: Users cannot access other organizations' timelines
- **Privacy First**: No PII stored in timeline meta fields
- **Audit Ready**: All events include timestamps for compliance tracking

## Implementation Details

The timeline system was designed with these principles:
- **Scalability**: View-based approach scales with underlying table indexes
- **Extensibility**: Easy to add new event sources via UNION
- **Privacy**: GDPR-compliant by design (no PII in timeline)
- **Security**: RLS inheritance ensures proper tenant isolation
- **Performance**: Leverages existing table indexes for fast queries

This system provides a solid foundation for invoice activity tracking while maintaining security and privacy standards required for financial applications.