-- RUN THIS IN SUPABASE SQL EDITOR TO FIX ALL DATE ISSUES

-- 1. Remove the strict check constraint on 'type' so you can save any description
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

-- 2. Ensure 'description' column exists (if you want to separate type and text, typically good practice)
-- But for simplicity based on your requests, we can just allow text in 'type'.
-- Let's stick to using 'type' for storing the description as per previous code, BUT we removed the constraint above.
-- OR better, let's add a proper description column to be safe.
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS description text;

-- 3. Sync 'approved' column name
-- If you have 'is_approved', rename it to 'approved' to match the code.
DO $$
BEGIN
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'is_approved') THEN
    ALTER TABLE transactions RENAME COLUMN is_approved TO approved;
  END IF;
END $$;

-- 4. Ensure 'approved' defaults to true if not specified (optional)
ALTER TABLE transactions ALTER COLUMN approved SET DEFAULT true;

-- 5. Add 'fine_amount' to Profiles if missing (just in case)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fine_amount numeric DEFAULT 0;

-- 6. Add 'status' to Profiles if missing
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
