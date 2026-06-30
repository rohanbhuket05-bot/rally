-- Storage bucket and policies for event cover photos
-- Run this in the Supabase SQL editor

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-covers',
  'event-covers',
  true,
  10485760,  -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Anyone can read event covers (needed to show flyers to all visitors)
CREATE POLICY "event_covers_public_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-covers');

-- Only authenticated users can upload event covers
CREATE POLICY "event_covers_auth_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-covers');

-- Only authenticated users can replace covers (upsert)
CREATE POLICY "event_covers_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'event-covers')
WITH CHECK (bucket_id = 'event-covers');

-- Only authenticated users can delete covers
CREATE POLICY "event_covers_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event-covers');
