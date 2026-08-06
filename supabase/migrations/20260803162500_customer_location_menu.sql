ALTER TABLE customer_locations
ADD COLUMN has_menu_enabled BOOLEAN DEFAULT false,
ADD COLUMN menu_type TEXT DEFAULT 'link',
ADD COLUMN menu_link TEXT,
ADD COLUMN menu_image_url TEXT,
ADD COLUMN menu_banner_text TEXT,
ADD COLUMN menu_banner_text_en TEXT,
ADD COLUMN menu_banner_text_de TEXT;
