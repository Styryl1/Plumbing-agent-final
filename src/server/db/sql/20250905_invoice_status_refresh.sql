-- S7: Provider-Agnostic Status Refresh & Reconciliation
-- Queue + poller + exponential backoff with jitter + dead-letter system
-- Works for Moneybird (safety-poll), WeFact, and e-Boekhouden

-- Invoice status refresh queue table
CREATE TABLE IF NOT EXISTS invoice_status_refresh_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('moneybird','wefact','eboekhouden')),
  external_id text NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 7,
  run_after timestamptz NOT NULL DEFAULT now(),
  last_error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure one job per invoice (idempotency)
  CONSTRAINT unique_invoice_refresh UNIQUE (invoice_id),
  
  -- Foreign key to invoices table
  CONSTRAINT fk_refresh_queue_invoice 
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Dead letter table for failed refresh attempts
CREATE TABLE IF NOT EXISTS invoice_status_refresh_dead_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid,
  provider text,
  external_id text,
  attempts int,
  last_error text,
  deadlettered_at timestamptz DEFAULT now()
);

-- Performance indexes  
CREATE INDEX IF NOT EXISTS idx_refresh_queue_run_after 
  ON invoice_status_refresh_queue(run_after);

CREATE INDEX IF NOT EXISTS idx_refresh_queue_provider 
  ON invoice_status_refresh_queue(provider);

CREATE INDEX IF NOT EXISTS idx_refresh_dead_letters_provider 
  ON invoice_status_refresh_dead_letters(provider);

-- Trigger to update updated_at on queue updates
CREATE OR REPLACE FUNCTION update_refresh_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_refresh_queue_updated_at
  BEFORE UPDATE ON invoice_status_refresh_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_refresh_queue_updated_at();

-- RLS policies for multi-tenant isolation
ALTER TABLE invoice_status_refresh_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_status_refresh_dead_letters ENABLE ROW LEVEL SECURITY;

-- Queue access through invoices org_id relationship
CREATE POLICY "Queue access through invoice org_id" ON invoice_status_refresh_queue
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_status_refresh_queue.invoice_id 
      AND invoices.org_id = auth.jwt() ->> 'org_id'
    )
  );

-- Dead letters access through org_id (store org context)
CREATE POLICY "Dead letters org access" ON invoice_status_refresh_dead_letters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_status_refresh_dead_letters.invoice_id 
      AND invoices.org_id = auth.jwt() ->> 'org_id'
    )
  );

-- Comments for documentation
COMMENT ON TABLE invoice_status_refresh_queue IS 
  'Queue for polling provider invoice status updates with exponential backoff';
COMMENT ON TABLE invoice_status_refresh_dead_letters IS 
  'Dead letter storage for refresh jobs that exceeded max retry attempts';
COMMENT ON COLUMN invoice_status_refresh_queue.run_after IS 
  'Timestamp when this job should be processed next (supports backoff delays)';
COMMENT ON COLUMN invoice_status_refresh_queue.max_attempts IS 
  'Maximum retry attempts before moving to dead letter (default: 7)';