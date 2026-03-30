
-- Add profile fields to partners table
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS mobile text;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS pan_number text;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS profile_picture_url text;

-- Create storage bucket for partner profile pictures
INSERT INTO storage.buckets (id, name, public) VALUES ('partner-profiles', 'partner-profiles', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to partner-profiles bucket
CREATE POLICY "Authenticated users can upload partner profile pictures"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'partner-profiles');

-- Allow public read access to partner profile pictures
CREATE POLICY "Public can view partner profile pictures"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'partner-profiles');

-- Allow authenticated users to update their own uploads
CREATE POLICY "Users can update own partner profile pictures"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'partner-profiles');

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Users can delete own partner profile pictures"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'partner-profiles');
