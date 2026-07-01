ALTER TABLE customer_location_links
  ADD COLUMN IF NOT EXISTS title_pl text,
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS title_de text;
