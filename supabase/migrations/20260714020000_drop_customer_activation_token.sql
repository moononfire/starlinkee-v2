-- Checkout now creates the Supabase auth account immediately and emails
-- the login credentials directly, so the token-based activation link
-- (/portal/activate) is no longer used.
ALTER TABLE customers
  DROP COLUMN activation_token;
