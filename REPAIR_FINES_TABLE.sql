-- RUN THIS SCRIPT TO FIX THE ERROR
-- It ensures the 'fines' table has all the required columns.

-- 1. Ensure table exists
CREATE TABLE IF NOT EXISTS fines (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now()
);

-- 2. Add columns if they are missing (Safe to run multiple times)
ALTER TABLE fines ADD COLUMN IF NOT EXISTS amount numeric DEFAULT 0;
ALTER TABLE fines ADD COLUMN IF NOT EXISTS month int DEFAULT 1;
ALTER TABLE fines ADD COLUMN IF NOT EXISTS year int DEFAULT 2026;
ALTER TABLE fines ADD COLUMN IF NOT EXISTS status text DEFAULT 'unpaid';
ALTER TABLE fines ADD COLUMN IF NOT EXISTS description text DEFAULT '';

-- 3. Force cache reload (sometimes needed)
NOTIFY pgrst, 'reload config';
