-- 1. Fines Table: Tracks individual fines with monthly granularity
CREATE TABLE IF NOT EXISTS fines (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    amount numeric NOT NULL,
    month int NOT NULL, -- 1 to 12
    year int NOT NULL,
    status text DEFAULT 'unpaid', -- 'paid' or 'unpaid'
    description text,
    created_at timestamptz DEFAULT now()
);

-- 2. Society Fund Table: Tracks expenses (money going OUT from the fine fund)
CREATE TABLE IF NOT EXISTS society_expenses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    amount numeric NOT NULL,
    description text,
    created_at timestamptz DEFAULT now()
);

-- 3. Policy Cleanup (Optional but good for access)
ALTER TABLE fines ENABLE ROW LEVEL SECURITY;
ALTER TABLE society_expenses ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone
CREATE POLICY "Public Read Fines" ON fines FOR SELECT USING (true);
CREATE POLICY "Public Read Expenses" ON society_expenses FOR SELECT USING (true);

-- Allow Insert/Update only for Admins (controlled by app logic mostly, but good for RLS)
-- For simplicity in this dev phase, we might allow all authenticated logic if RLS is tricky, 
-- but sticking to the request, we just need the structure.
