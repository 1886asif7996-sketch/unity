-- RUN THIS TO FIX SETTINGS SYNC

-- 1. Ensure table exists
CREATE TABLE IF NOT EXISTS settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    key_name text NOT NULL UNIQUE, -- Must be UNIQUE for upsert to work
    value text,
    created_at timestamptz DEFAULT now()
);

-- 2. If table exists but key_name isn't unique, we might need to fix it.
-- This tries to add the constraint safely.
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'settings_key_name_key') THEN
        ALTER TABLE settings ADD CONSTRAINT settings_key_name_key UNIQUE (key_name);
    END IF; 
END $$;

-- 3. Reload cache
NOTIFY pgrst, 'reload config';
