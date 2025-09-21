-- 20250921_s1_media_unique.sql
-- Ensure each WhatsApp message has at most one stored media asset record

ALTER TABLE whatsapp_media_assets
	ADD CONSTRAINT whatsapp_media_assets_message_unique UNIQUE (message_id);
