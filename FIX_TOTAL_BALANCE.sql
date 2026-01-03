-- Ensuring profiles has total_deposit column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_deposit numeric DEFAULT 0;

-- Optional: Recalculate total_deposit from existing transactions to ensure sync
UPDATE profiles 
SET total_deposit = (
  SELECT COALESCE(SUM(amount), 0)
  FROM transactions 
  WHERE transactions.user_id = profiles.id AND approved = true
);
