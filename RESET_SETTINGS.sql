-- RUN THIS TO RESET THE SETTINGS TABLE COMPLETELY
-- This fixes the "column key_name does not exist" error by recreating the table accurately.

-- 1. Drop the old table (It seems corrupted or missing columns)
DROP TABLE IF EXISTS settings;

-- 2. Create it fresh with the correct columns
CREATE TABLE settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    key_name text NOT NULL UNIQUE, -- This is the crucial column
    value text,
    created_at timestamptz DEFAULT now()
);

-- 3. Enable Security
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- 4. Policies (Allow everyone to read, everyone to update/insert for now)
CREATE POLICY "Public Read Settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Public Update Settings" ON settings FOR ALL USING (true) WITH CHECK (true);

-- 5. Reload Cache
NOTIFY pgrst, 'reload config';
