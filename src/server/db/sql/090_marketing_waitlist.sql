-- Marketing waitlist table for launch microsite
-- Created for capturing lead signups with basic GDPR compliance

CREATE TABLE marketing_waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  phone TEXT,
  org_name TEXT,
  locale TEXT NOT NULL DEFAULT 'nl',
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient email lookups (duplicates check)
CREATE INDEX idx_marketing_waitlist_email ON marketing_waitlist(email);

-- Index for analytics by locale
CREATE INDEX idx_marketing_waitlist_locale ON marketing_waitlist(locale);

-- Index for source tracking
CREATE INDEX idx_marketing_waitlist_source ON marketing_waitlist(source);

-- Simple RLS: no organization-specific data, just basic access control
ALTER TABLE marketing_waitlist ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for API routes)
CREATE POLICY "Service role full access" ON marketing_waitlist
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Basic read access for authenticated users (future admin interface)
CREATE POLICY "Authenticated read access" ON marketing_waitlist
  FOR SELECT 
  TO authenticated 
  USING (true);