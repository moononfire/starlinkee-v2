-- add wifi fields to customer_locations
ALTER TABLE customer_locations
ADD COLUMN has_wifi_enabled BOOLEAN DEFAULT false,
ADD COLUMN wifi_ssid TEXT,
ADD COLUMN wifi_password TEXT;
