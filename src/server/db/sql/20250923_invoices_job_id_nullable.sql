-- Purpose: Allow invoices without an associated job link while keeping referential integrity
ALTER TABLE invoices
	ALTER COLUMN job_id DROP NOT NULL;

ALTER TABLE invoices
	DROP CONSTRAINT IF EXISTS invoices_job_id_fkey;

ALTER TABLE invoices
	ADD CONSTRAINT invoices_job_id_fkey
		FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL;
