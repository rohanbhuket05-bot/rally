-- Storage bucket and policies for group logos
-- Run this in the Supabase SQL editor

-- Create the public bucket (if it doesn't already exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'group-logos',
  'group-logos',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Anyone (including anonymous) can read group logos
CREATE POLICY "group_logos_public_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'group-logos');

-- Only authenticated users can upload
CREATE POLICY "group_logos_auth_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'group-logos');

-- Only authenticated users can replace (upsert) their uploads
CREATE POLICY "group_logos_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'group-logos')
WITH CHECK (bucket_id = 'group-logos');

-- Only authenticated users can delete logos
CREATE POLICY "group_logos_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'group-logos');
