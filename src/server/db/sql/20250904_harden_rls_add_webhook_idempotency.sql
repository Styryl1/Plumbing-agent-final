-- Migration: 20250904_harden_rls_add_webhook_idempotency
-- Purpose: Harden RLS policies with WITH CHECK clauses and add webhook idempotency

-- Step 1: Replace broad FOR ALL policy with specific policies
DROP POLICY IF EXISTS invoice_provider_credentials_org_isolation ON invoice_provider_credentials;

-- Separate SELECT policy
CREATE POLICY invoice_provider_credentials_select
    ON invoice_provider_credentials
    FOR SELECT
    USING (org_id = auth.jwt() ->> 'org_id'::text);

-- INSERT policy with WITH CHECK clause (prevents cross-tenant inserts)
CREATE POLICY invoice_provider_credentials_insert
    ON invoice_provider_credentials
    FOR INSERT
    WITH CHECK (org_id = auth.jwt() ->> 'org_id'::text);

-- UPDATE policy with WITH CHECK clause (prevents moving records between orgs)
CREATE POLICY invoice_provider_credentials_update
    ON invoice_provider_credentials
    FOR UPDATE
    USING (org_id = auth.jwt() ->> 'org_id'::text)
    WITH CHECK (org_id = auth.jwt() ->> 'org_id'::text);

-- DELETE policy
CREATE POLICY invoice_provider_credentials_delete
    ON invoice_provider_credentials
    FOR DELETE
    USING (org_id = auth.jwt() ->> 'org_id'::text);

-- Step 2: Create webhook idempotency table
CREATE TABLE webhook_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id text NOT NULL, -- External webhook event ID
    provider text NOT NULL CHECK (provider IN ('moneybird', 'mollie', 'whatsapp', 'clerk')),
    event_type text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    processed_at timestamptz NOT NULL DEFAULT now(),
    org_id text, -- Can be null for system events (Clerk)
    
    -- Prevent duplicate processing
    CONSTRAINT unique_webhook_event UNIQUE (webhook_id, provider)
);

-- Performance indexes
CREATE INDEX idx_webhook_events_provider_entity 
    ON webhook_events (provider, entity_type, entity_id);
    
CREATE INDEX idx_webhook_events_processed_at 
    ON webhook_events (processed_at);

-- RLS policies for webhook events
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- SELECT: Organizations can only see their own events (system events visible to all)
CREATE POLICY webhook_events_select
    ON webhook_events
    FOR SELECT
    USING (org_id IS NULL OR org_id = auth.jwt() ->> 'org_id'::text);

-- INSERT: Service role only (webhooks are external system events)
CREATE POLICY webhook_events_insert
    ON webhook_events
    FOR INSERT
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- No UPDATE/DELETE allowed (immutable audit trail)

-- Grant permissions
GRANT SELECT ON webhook_events TO authenticated;
GRANT INSERT ON webhook_events TO service_role;
GRANT USAGE ON SEQUENCE webhook_events_id_seq TO service_role;

-- Add cleanup function for old webhook events (prevent unbounded growth)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete events older than 30 days
    DELETE FROM webhook_events 
    WHERE processed_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Grant execute permission to authenticated users for cleanup function
GRANT EXECUTE ON FUNCTION cleanup_old_webhook_events() TO authenticated;

-- Helper function to check if webhook event exists (for idempotency)
CREATE OR REPLACE FUNCTION get_webhook_event_exists(
    p_webhook_id text,
    p_provider text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM webhook_events 
        WHERE webhook_id = p_webhook_id 
        AND provider = p_provider
    );
END;
$$;

-- Helper function to record webhook event (with duplicate handling)
CREATE OR REPLACE FUNCTION record_webhook_event(
    p_webhook_id text,
    p_provider text,
    p_event_type text,
    p_entity_type text,
    p_entity_id text,
    p_org_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO webhook_events (
        webhook_id,
        provider,
        event_type,
        entity_type,
        entity_id,
        org_id,
        processed_at
    ) VALUES (
        p_webhook_id,
        p_provider,
        p_event_type,
        p_entity_type,
        p_entity_id,
        p_org_id,
        NOW()
    )
    ON CONFLICT (webhook_id, provider) DO NOTHING;
END;
$$;

-- Grant execute permissions for webhook helper functions
GRANT EXECUTE ON FUNCTION get_webhook_event_exists(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION record_webhook_event(text, text, text, text, text, text) TO service_role;