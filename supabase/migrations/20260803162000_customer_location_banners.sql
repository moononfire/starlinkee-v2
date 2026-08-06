-- add banner texts and module order
ALTER TABLE customer_locations
ADD COLUMN module_order JSONB DEFAULT '["promo", "loyalty", "wifi"]'::jsonb,
ADD COLUMN wifi_banner_text TEXT,
ADD COLUMN wifi_banner_text_en TEXT,
ADD COLUMN wifi_banner_text_de TEXT,
ADD COLUMN loyalty_banner_text TEXT,
ADD COLUMN loyalty_banner_text_en TEXT,
ADD COLUMN loyalty_banner_text_de TEXT;
