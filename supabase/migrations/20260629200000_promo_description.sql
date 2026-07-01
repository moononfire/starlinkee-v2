ALTER TABLE customer_locations
  ADD COLUMN IF NOT EXISTS promo_description TEXT;
