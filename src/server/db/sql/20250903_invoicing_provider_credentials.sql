-- Migration: 20250903_invoicing_provider_credentials
-- Purpose: Provider OAuth2 credentials storage for Moneybird integration

CREATE TABLE invoice_provider_credentials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider text NOT NULL CHECK (provider IN ('moneybird', 'wefact', 'eboekhouden')),
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    expires_at timestamptz NOT NULL,
    scopes text[] NOT NULL DEFAULT '{}',
    administration_id text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT unique_org_provider UNIQUE (org_id, provider)
);

-- Index for performance
CREATE INDEX idx_invoice_provider_credentials_org_provider 
    ON invoice_provider_credentials (org_id, provider);

-- RLS policies for multi-tenant security  
ALTER TABLE invoice_provider_credentials ENABLE ROW LEVEL SECURITY;

-- Separate policies for each operation with WITH CHECK clauses
CREATE POLICY invoice_provider_credentials_select
    ON invoice_provider_credentials
    FOR SELECT
    USING (org_id = auth.jwt() ->> 'org_id'::text);

CREATE POLICY invoice_provider_credentials_insert
    ON invoice_provider_credentials
    FOR INSERT
    WITH CHECK (org_id = auth.jwt() ->> 'org_id'::text);

CREATE POLICY invoice_provider_credentials_update
    ON invoice_provider_credentials
    FOR UPDATE
    USING (org_id = auth.jwt() ->> 'org_id'::text)
    WITH CHECK (org_id = auth.jwt() ->> 'org_id'::text);

CREATE POLICY invoice_provider_credentials_delete
    ON invoice_provider_credentials
    FOR DELETE
    USING (org_id = auth.jwt() ->> 'org_id'::text);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON invoice_provider_credentials TO authenticated;
GRANT USAGE ON SEQUENCE invoice_provider_credentials_id_seq TO authenticated;

-- Webhook events idempotency table
CREATE TABLE webhook_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id text NOT NULL,
    provider text NOT NULL CHECK (provider IN ('moneybird', 'mollie', 'whatsapp', 'clerk')),
    event_type text NOT NULL,
    entity_type text,
    entity_id text,
    processed_at timestamptz NOT NULL DEFAULT now(),
    org_id text REFERENCES organizations(id) ON DELETE CASCADE,
    
    CONSTRAINT unique_webhook_provider_event UNIQUE (webhook_id, provider)
);

-- Index for webhook idempotency lookups
CREATE INDEX idx_webhook_events_provider_webhook_id 
    ON webhook_events (provider, webhook_id);

-- Index for org-based queries  
CREATE INDEX idx_webhook_events_org_id 
    ON webhook_events (org_id) WHERE org_id IS NOT NULL;

-- RLS policies for webhook events
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Service role can insert webhook events (from external systems)
CREATE POLICY webhook_events_service_role_insert
    ON webhook_events
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Service role can select for idempotency checks
CREATE POLICY webhook_events_service_role_select
    ON webhook_events
    FOR SELECT
    TO service_role
    USING (true);

-- Authenticated users can only see their org's events
CREATE POLICY webhook_events_org_select
    ON webhook_events
    FOR SELECT
    TO authenticated
    USING (org_id = auth.jwt() ->> 'org_id'::text OR org_id IS NULL);

-- Grant permissions
GRANT SELECT, INSERT ON webhook_events TO service_role;
GRANT SELECT ON webhook_events TO authenticated;
GRANT USAGE ON SEQUENCE webhook_events_id_seq TO service_role;