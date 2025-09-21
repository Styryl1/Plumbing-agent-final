-- 20250921_customer_address_fields.sql
-- Ensure customers table exposes split address fields for legacy UI compatibility during Slice 0

ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS house_number TEXT,
    ADD COLUMN IF NOT EXISTS street TEXT,
    ADD COLUMN IF NOT EXISTS city TEXT;
