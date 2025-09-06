-- Baseline Migration: Initial Schema Documentation
-- Applied: Already exists in Supabase database
-- Date: August 2025
-- Phase: MVP (Phase 1.0)
-- 
-- ⚠️ This is a documentation-only migration!
-- All tables already exist in the database.
-- RLS will be enabled in Phase 1.1

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- Core Business Tables
-- =============================================================================

-- Organizations (Multi-tenant root)
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY, -- Clerk organization ID (e.g. org_...)
    name TEXT NOT NULL,
    owner_user_id TEXT NOT NULL, -- Clerk user ID
    kvk TEXT, -- Dutch Chamber of Commerce number
    vat_id TEXT, -- Dutch VAT identification
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Employees (Staff members)
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL REFERENCES organizations(id),
    user_id TEXT NOT NULL, -- Clerk user ID
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'staff')),
    name TEXT NOT NULL,
    color TEXT, -- Calendar color
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Customers (End users requesting services)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL REFERENCES organizations(id),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    postal_code TEXT,
    language TEXT NOT NULL DEFAULT 'nl' CHECK (language IN ('nl', 'en')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- Job Management Tables
-- =============================================================================

-- Jobs (Work orders/service requests)
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL REFERENCES organizations(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    employee_id UUID REFERENCES employees(id), -- Assigned technician
    title TEXT NOT NULL,
    description TEXT,
    address TEXT,
    postal_code TEXT,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent', 'emergency')),
    status TEXT NOT NULL DEFAULT 'unscheduled' CHECK (status IN ('unscheduled', 'scheduled', 'completed', 'invoiced', 'paid')),
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Materials (Inventory items)
CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL REFERENCES organizations(id),
    name TEXT NOT NULL,
    sku TEXT, -- Stock keeping unit
    unit TEXT NOT NULL, -- 'pieces', 'meters', etc.
    cost_ex_vat NUMERIC NOT NULL,
    default_markup_pct NUMERIC DEFAULT 30,
    default_vat_rate INTEGER NOT NULL CHECK (default_vat_rate IN (9, 21)), -- Dutch VAT rates
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Job Materials (Materials used in specific jobs)
CREATE TABLE IF NOT EXISTS job_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id),
    material_id UUID REFERENCES materials(id), -- Nullable for ad-hoc items
    name_snapshot TEXT NOT NULL, -- Frozen name at time of use
    unit TEXT NOT NULL,
    qty NUMERIC NOT NULL,
    unit_price_ex_vat NUMERIC NOT NULL,
    vat_rate INTEGER NOT NULL CHECK (vat_rate IN (9, 21))
);

-- =============================================================================
-- Invoicing Tables
-- =============================================================================

-- Invoices (Bills sent to customers)
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL REFERENCES organizations(id),
    job_id UUID NOT NULL REFERENCES jobs(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    number TEXT NOT NULL UNIQUE, -- Invoice number
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    due_at TIMESTAMPTZ, -- Payment due date
    subtotal_ex_vat NUMERIC NOT NULL DEFAULT 0,
    vat_total NUMERIC NOT NULL DEFAULT 0,
    total_inc_vat NUMERIC NOT NULL DEFAULT 0,
    mollie_payment_id TEXT, -- Mollie payment reference
    mollie_checkout_url TEXT, -- Payment link
    paid_at TIMESTAMPTZ,
    pdf_url TEXT, -- Public PDF access
    pdf_object_path TEXT -- Supabase Storage path
);

-- Invoice Lines (Individual line items)
CREATE TABLE IF NOT EXISTS invoice_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    line_type TEXT NOT NULL CHECK (line_type IN ('labor', 'material')),
    description TEXT NOT NULL,
    qty NUMERIC NOT NULL,
    unit_price_ex_vat NUMERIC NOT NULL,
    vat_rate INTEGER NOT NULL CHECK (vat_rate IN (0, 9, 21)),
    line_total_ex_vat NUMERIC NOT NULL,
    vat_amount NUMERIC NOT NULL,
    line_total_inc_vat NUMERIC NOT NULL
);

-- =============================================================================
-- Communication Tables
-- =============================================================================

-- Conversations (WhatsApp/SMS message history)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL REFERENCES organizations(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    wa_message_id TEXT NOT NULL, -- WhatsApp message ID
    direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
    body TEXT, -- Message text
    media_url TEXT, -- Attached media
    media_type TEXT CHECK (media_type IN ('image', 'audio', 'other')),
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    wa_chat_id TEXT, -- WhatsApp chat identifier
    source_type TEXT NOT NULL DEFAULT 'cloud_api' CHECK (source_type IN ('cloud_api', 'bridge')),
    bridge_event_id UUID REFERENCES bridge_events(id)
);

-- WhatsApp Contacts (Contact registry)
CREATE TABLE IF NOT EXISTS wa_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL REFERENCES organizations(id),
    phone_e164 TEXT NOT NULL, -- E.164 format phone
    customer_id UUID REFERENCES customers(id), -- Linked customer
    wa_name TEXT, -- WhatsApp display name
    wa_chat_id TEXT, -- WhatsApp chat ID
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    message_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- AI & Voice Tables
-- =============================================================================

-- Voice Notes (Audio transcriptions)
CREATE TABLE IF NOT EXISTS voice_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id),
    audio_url TEXT NOT NULL, -- Supabase Storage URL
    transcript TEXT, -- Speech-to-text result
    lang TEXT NOT NULL DEFAULT 'nl' CHECK (lang IN ('nl', 'en')),
    confidence NUMERIC, -- Transcription confidence 0-1
    created_at TIMESTAMPTZ DEFAULT now()
);

-- AI Recommendations (AI-generated suggestions)
CREATE TABLE IF NOT EXISTS ai_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL REFERENCES organizations(id),
    source TEXT NOT NULL CHECK (source IN ('conversation', 'voice')),
    source_id UUID NOT NULL, -- References conversation or voice_note
    payload_json JSONB NOT NULL, -- AI recommendations data
    confidence NUMERIC, -- AI confidence 0-1
    accepted BOOLEAN, -- User accepted recommendation
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- System Tables
-- =============================================================================

-- Audit Logs (Action history)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL REFERENCES organizations(id),
    user_id TEXT, -- Clerk user ID (nullable for system actions)
    action TEXT NOT NULL, -- 'create', 'update', 'delete'
    resource TEXT, -- Table/resource name
    payload_json JSONB, -- Changed data
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bridge Sessions (WhatsApp Web bridge connections)
CREATE TABLE IF NOT EXISTS bridge_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'degraded', 'offline', 'error')),
    webhook_secret TEXT, -- Webhook authentication
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_heartbeat TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    meta JSONB DEFAULT '{}'
);

-- Bridge Events (WhatsApp Web bridge message events)
CREATE TABLE IF NOT EXISTS bridge_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL REFERENCES organizations(id),
    event_type TEXT NOT NULL, -- 'message', 'status', 'qr_code'
    wa_message_id TEXT, -- WhatsApp message ID (nullable for non-message events)
    payload_json JSONB NOT NULL, -- Event data
    processed_at TIMESTAMPTZ, -- When successfully processed
    error_message TEXT, -- Processing error if any
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- Indexes for Performance
-- =============================================================================

-- Organizations
CREATE INDEX IF NOT EXISTS idx_organizations_owner_user_id ON organizations(owner_user_id);

-- Employees
CREATE INDEX IF NOT EXISTS idx_employees_org_id ON employees(org_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);

-- Customers
CREATE INDEX IF NOT EXISTS idx_customers_org_id ON customers(org_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- Jobs
CREATE INDEX IF NOT EXISTS idx_jobs_org_id ON jobs(org_id);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_employee_id ON jobs(employee_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_priority ON jobs(priority);
CREATE INDEX IF NOT EXISTS idx_jobs_starts_at ON jobs(starts_at);

-- Materials
CREATE INDEX IF NOT EXISTS idx_materials_org_id ON materials(org_id);
CREATE INDEX IF NOT EXISTS idx_materials_sku ON materials(sku);

-- Job Materials
CREATE INDEX IF NOT EXISTS idx_job_materials_job_id ON job_materials(job_id);
CREATE INDEX IF NOT EXISTS idx_job_materials_material_id ON job_materials(material_id);

-- Invoices
CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_invoices_job_id ON invoices(job_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(number);
CREATE INDEX IF NOT EXISTS idx_invoices_issued_at ON invoices(issued_at);

-- Invoice Lines
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_id ON invoice_lines(invoice_id);

-- Conversations
CREATE INDEX IF NOT EXISTS idx_conversations_org_id ON conversations(org_id);
CREATE INDEX IF NOT EXISTS idx_conversations_customer_id ON conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_wa_message_id ON conversations(wa_message_id);
CREATE INDEX IF NOT EXISTS idx_conversations_received_at ON conversations(received_at);

-- WhatsApp Contacts
CREATE INDEX IF NOT EXISTS idx_wa_contacts_org_id ON wa_contacts(org_id);
CREATE INDEX IF NOT EXISTS idx_wa_contacts_phone_e164 ON wa_contacts(phone_e164);
CREATE INDEX IF NOT EXISTS idx_wa_contacts_customer_id ON wa_contacts(customer_id);

-- Voice Notes
CREATE INDEX IF NOT EXISTS idx_voice_notes_job_id ON voice_notes(job_id);

-- AI Recommendations
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_org_id ON ai_recommendations(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_source_id ON ai_recommendations(source_id);

-- Audit Logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Bridge Sessions
CREATE INDEX IF NOT EXISTS idx_bridge_sessions_org_id ON bridge_sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_bridge_sessions_status ON bridge_sessions(status);

-- Bridge Events
CREATE INDEX IF NOT EXISTS idx_bridge_events_org_id ON bridge_events(org_id);
CREATE INDEX IF NOT EXISTS idx_bridge_events_created_at ON bridge_events(created_at);

-- =============================================================================
-- End of Baseline Migration
-- =============================================================================

-- Note: RLS (Row Level Security) will be enabled in Phase 1.1
-- Currently all tables operate with admin privileges via service role