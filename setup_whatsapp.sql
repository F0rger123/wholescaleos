-- 1. Add WhatsApp state columns to agent_preferences
ALTER TABLE agent_preferences 
ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS whatsapp_status TEXT DEFAULT 'disconnected',
ADD COLUMN IF NOT EXISTS whatsapp_qr TEXT;

-- 2. Add status column to sms_messages to track WhatsApp queue
ALTER TABLE sms_messages
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';

-- 3. Add index for the bridge to poll pending messages efficiently
CREATE INDEX IF NOT EXISTS idx_sms_status ON sms_messages (status) WHERE status = 'pending_whatsapp';
