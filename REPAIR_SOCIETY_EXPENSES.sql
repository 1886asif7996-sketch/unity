-- RUN THIS SCRIPT TO FIX THE SOCIETY EXPENSE ERROR

-- 1. Ensure table exists
CREATE TABLE IF NOT EXISTS society_expenses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now()
);

-- 2. Add columns if they are missing
ALTER TABLE society_expenses ADD COLUMN IF NOT EXISTS amount numeric DEFAULT 0;
ALTER TABLE society_expenses ADD COLUMN IF NOT EXISTS description text DEFAULT '';

-- 3. Force cache reload
NOTIFY pgrst, 'reload config';
