-- Atomic invoice issuing with idempotent behavior
-- Ensures single invoice creation even under concurrent sends

-- Create unique index for invoice numbers per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_org_number 
ON invoices(org_id, number);

-- RPC function for atomic invoice issuing
CREATE OR REPLACE FUNCTION issue_invoice(
  p_draft_id uuid,
  p_org_id uuid
) RETURNS invoices AS $$
DECLARE
  v_draft invoice_drafts%ROWTYPE;
  v_settings org_settings%ROWTYPE;
  v_invoice invoices%ROWTYPE;
  v_next_number integer;
BEGIN
  -- Lock org settings to prevent concurrent number generation
  SELECT * INTO v_settings 
  FROM org_settings 
  WHERE org_id = p_org_id 
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization settings not found for org_id: %', p_org_id;
  END IF;

  -- Get and validate draft
  SELECT * INTO v_draft
  FROM invoice_drafts
  WHERE id = p_draft_id
    AND org_id = p_org_id;
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Draft not found or not in this organization: %', p_draft_id;
  END IF;
  
  IF v_draft.status != 'confirmed' THEN
    RAISE EXCEPTION 'Draft must be confirmed before issuing. Current status: %', v_draft.status;
  END IF;

  -- Get next invoice number
  v_next_number := v_settings.next_invoice_number;
  
  -- Create the invoice
  INSERT INTO invoices (
    id,
    org_id,
    created_by,
    customer_id,
    job_id,
    draft_id,
    number,
    issue_date,
    due_date,
    status,
    subtotal_cents,
    vat_amount_cents,
    total_cents,
    notes,
    payment_terms,
    line_items,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    p_org_id,
    v_draft.created_by,
    v_draft.customer_id,
    v_draft.job_id,
    p_draft_id,
    v_next_number,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    'unpaid',
    v_draft.subtotal_cents,
    v_draft.vat_amount_cents,
    v_draft.total_cents,
    v_draft.notes,
    v_draft.payment_terms,
    v_draft.line_items,
    NOW(),
    NOW()
  ) RETURNING * INTO v_invoice;
  
  -- Update next invoice number
  UPDATE org_settings 
  SET next_invoice_number = next_invoice_number + 1,
      updated_at = NOW()
  WHERE org_id = p_org_id;
  
  -- Delete the draft
  DELETE FROM invoice_drafts WHERE id = p_draft_id;
  
  RETURN v_invoice;
  
EXCEPTION
  WHEN unique_violation THEN
    -- Invoice already exists for this draft (idempotent behavior)
    SELECT * INTO v_invoice
    FROM invoices
    WHERE draft_id = p_draft_id
      AND org_id = p_org_id;
    
    IF FOUND THEN
      -- Clean up the draft if invoice exists
      DELETE FROM invoice_drafts WHERE id = p_draft_id;
      RETURN v_invoice;
    ELSE
      -- Different unique violation, re-raise
      RAISE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION issue_invoice(uuid, uuid) TO authenticated;