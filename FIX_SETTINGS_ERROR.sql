-- RUN THIS SCRIPT TO FIX THE 'ERROR SAVING NOTICE' ISSUE

-- 1. Remove duplicate entries for 'notice' and 'rules' to make them unique
-- This keeps the most recent one and deletes older duplicates
DELETE FROM settings
WHERE id NOT IN (
    SELECT DISTINCT ON (key_name) id
    FROM settings
    ORDER BY key_name, created_at DESC
);

-- 2. Force the UNIQUE constraint so 'upsert' works
-- We drop it first to be safe, then add it back
ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_key_name_key;
ALTER TABLE settings ADD CONSTRAINT settings_key_name_key UNIQUE (key_name);

-- 3. Ensure RLS Policies allow Admin updates
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Allow Read for everyone
CREATE POLICY "Public Read Settings" ON settings FOR SELECT USING (true);

-- Allow Insert/Update for everyone (or limit to admin if you have auth setup, but for now allow correct functionality)
-- Dropping existing to avoid conflicts
DROP POLICY IF EXISTS "Enable Insert/Update for All" ON settings;
CREATE POLICY "Enable Insert/Update for All" ON settings FOR ALL USING (true) WITH CHECK (true);

-- 4. Reload Schema
NOTIFY pgrst, 'reload config';
