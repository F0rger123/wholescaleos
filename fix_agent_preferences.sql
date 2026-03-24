-- 1. Ensure agent_preferences table exists with all required columns
CREATE TABLE IF NOT EXISTS agent_preferences (
    user_id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    phone_number TEXT,
    carrier TEXT DEFAULT 'Auto-Detect',
    sms_gateway TEXT DEFAULT 'auto',
    sms_auto_reply_enabled BOOLEAN DEFAULT FALSE,
    sms_auto_reply_message TEXT,
    whatsapp_enabled BOOLEAN DEFAULT FALSE,
    whatsapp_status TEXT DEFAULT 'disconnected',
    whatsapp_qr TEXT,
    whatsapp_session TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add columns if they were missing (idempotent)
ALTER TABLE agent_preferences 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS carrier TEXT DEFAULT 'Auto-Detect',
ADD COLUMN IF NOT EXISTS sms_auto_reply_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sms_auto_reply_message TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_session TEXT;

-- 3. Migration: rename sms_auto_reply to sms_auto_reply_enabled if it existed
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agent_preferences' AND column_name='sms_auto_reply') THEN
    ALTER TABLE agent_preferences RENAME COLUMN sms_auto_reply TO sms_auto_reply_enabled;
  END IF;
END $$;

-- 4. Disable RLS for development (per user's project pattern)
ALTER TABLE agent_preferences DISABLE ROW LEVEL SECURITY;

-- 5. Enable Realtime
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE agent_preferences; EXCEPTION WHEN OTHERS THEN NULL; END $$;
