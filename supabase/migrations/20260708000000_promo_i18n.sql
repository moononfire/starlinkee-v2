ALTER TABLE customer_locations
  ADD COLUMN IF NOT EXISTS promo_description_en text,
  ADD COLUMN IF NOT EXISTS promo_description_de text,
  ADD COLUMN IF NOT EXISTS promo_banner_text_en text,
  ADD COLUMN IF NOT EXISTS promo_banner_text_de text,
  ADD COLUMN IF NOT EXISTS promo_sms_text_en text,
  ADD COLUMN IF NOT EXISTS promo_sms_text_de text;
