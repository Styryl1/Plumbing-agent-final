-- RLS Policies for Invoice-related tables
-- Ensures organization-level data isolation

-- Enable RLS on invoices table
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see invoices from their organization
CREATE POLICY "Users can view own org invoices"
  ON invoices
  FOR SELECT
  USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

-- Policy: Users can only insert invoices for their organization
CREATE POLICY "Users can create own org invoices"
  ON invoices
  FOR INSERT
  WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);

-- Policy: Users can only update invoices from their organization
CREATE POLICY "Users can update own org invoices"
  ON invoices
  FOR UPDATE
  USING (org_id = (auth.jwt() ->> 'org_id')::uuid)
  WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);

-- Policy: Users can only delete invoices from their organization
CREATE POLICY "Users can delete own org invoices"
  ON invoices
  FOR DELETE
  USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

-- Enable RLS on invoice_drafts table
ALTER TABLE invoice_drafts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see drafts from their organization
CREATE POLICY "Users can view own org drafts"
  ON invoice_drafts
  FOR SELECT
  USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

-- Policy: Users can only insert drafts for their organization
CREATE POLICY "Users can create own org drafts"
  ON invoice_drafts
  FOR INSERT
  WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);

-- Policy: Users can only update drafts from their organization
CREATE POLICY "Users can update own org drafts"
  ON invoice_drafts
  FOR UPDATE
  USING (org_id = (auth.jwt() ->> 'org_id')::uuid)
  WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);

-- Policy: Users can only delete drafts from their organization
CREATE POLICY "Users can delete own org drafts"
  ON invoice_drafts
  FOR DELETE
  USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

-- Enable RLS on org_settings table
ALTER TABLE org_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see settings from their organization
CREATE POLICY "Users can view own org settings"
  ON org_settings
  FOR SELECT
  USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

-- Policy: Users can only insert settings for their organization
CREATE POLICY "Users can create own org settings"
  ON org_settings
  FOR INSERT
  WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);

-- Policy: Users can only update settings from their organization
CREATE POLICY "Users can update own org settings"
  ON org_settings
  FOR UPDATE
  USING (org_id = (auth.jwt() ->> 'org_id')::uuid)
  WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);

-- Note: No DELETE policy for org_settings as they should not be deleted