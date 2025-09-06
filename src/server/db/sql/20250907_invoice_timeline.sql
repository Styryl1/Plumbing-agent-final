-- Migration: Invoice Timeline View
-- Creates unified timeline view merging invoice anchors with dunning events
-- Designed for RLS inheritance and chronological ordering

-- Drop view if exists for clean migration
DROP VIEW IF EXISTS invoice_timeline CASCADE;

-- Create invoice_timeline view with SECURITY INVOKER for RLS inheritance
CREATE VIEW invoice_timeline
WITH (security_invoker = true)
AS
-- 1) Invoice created event (always present)
SELECT
  i.id AS invoice_id,
  i.created_at AS at,
  'system'::text AS source,
  'created'::text AS type,
  jsonb_build_object(
    'status', i.status,
    'provider_status', i.provider_status
  ) AS meta
FROM invoices i
WHERE i.created_at IS NOT NULL

UNION ALL

-- 2) Invoice sent/issued event (when issued_at is set)
SELECT
  i.id AS invoice_id,
  i.issued_at AS at,
  'provider'::text AS source,
  'sent'::text AS type,
  jsonb_build_object(
    'provider', i.provider
  ) AS meta
FROM invoices i
WHERE i.issued_at IS NOT NULL

UNION ALL

-- 3) Invoice paid event (when paid_at is set)
SELECT
  i.id AS invoice_id,
  i.paid_at AS at,
  'payment'::text AS source,
  'paid'::text AS type,
  jsonb_build_object(
    'payment_method', i.payment_method
  ) AS meta
FROM invoices i
WHERE i.paid_at IS NOT NULL

UNION ALL

-- 4) Dunning events (all reminder activities)
SELECT
  d.invoice_id,
  d.created_at AS at,
  'dunning'::text AS source,
  CASE
    WHEN d.event_type = 'reminder_sent' AND d.delivery_status = 'sent' THEN 'reminder_sent'
    WHEN d.event_type = 'reminder_sent' AND d.delivery_status = 'failed' THEN 'reminder_error'
    WHEN d.event_type = 'opted_out' THEN 'reminder_skipped'
    WHEN d.event_type = 'manual_follow_up' THEN 'manual_follow_up'
    ELSE d.event_type
  END AS type,
  jsonb_build_object(
    'channel', d.channel,
    'template', d.template_used,
    'delivery_status', d.delivery_status,
    'event_type', d.event_type
  ) AS meta
FROM dunning_events d
WHERE d.created_at IS NOT NULL;

-- Add comment explaining view purpose and RLS behavior
COMMENT ON VIEW invoice_timeline IS 'Unified timeline of invoice lifecycle events. Inherits RLS from underlying tables (invoices, dunning_events). Events ordered chronologically by at timestamp.';

-- Create index to optimize timeline queries by invoice_id and timestamp
-- Note: This creates an index on the view which may not be supported by all PostgreSQL versions
-- If this fails, queries will still work but may be slower on large datasets
-- The underlying table indexes should provide adequate performance
CREATE INDEX IF NOT EXISTS idx_invoice_timeline_lookup 
ON invoices(id, created_at, issued_at, paid_at);