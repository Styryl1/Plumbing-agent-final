-- Migration: 20250923_wa_suggestions_materials_time.sql
-- Purpose: Add stubbed materials and time fields for WhatsApp analyzer output (S3)
-- Date: 2025-09-23

ALTER TABLE wa_suggestions
	ADD COLUMN IF NOT EXISTS materials_stub text[] DEFAULT '{}'::text[];

ALTER TABLE wa_suggestions
	ADD COLUMN IF NOT EXISTS time_stub text;

COMMENT ON COLUMN wa_suggestions.materials_stub IS 'AI suggested materials names before structured enrichment';
COMMENT ON COLUMN wa_suggestions.time_stub IS 'Human-readable time estimate provided by analyzer (e.g. "60-90 minuten")';
