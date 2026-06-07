-- Create public logos bucket for location logo uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read logos (they are embedded in public pages)
CREATE POLICY "logos_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

-- Only service_role (server-side uploads via admin client) can write
CREATE POLICY "logos_service_insert"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'logos');

CREATE POLICY "logos_service_update"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'logos');

CREATE POLICY "logos_service_delete"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'logos');
