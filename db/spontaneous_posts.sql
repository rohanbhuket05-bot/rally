-- Migration: spontaneous posts (expire after 4 hours)

CREATE TABLE IF NOT EXISTS public.spontaneous_posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name text NOT NULL,
  avatar_url  text DEFAULT '',
  text        text NOT NULL,
  location    text DEFAULT '',
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '4 hours'),
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spontaneous_posts_expires
  ON public.spontaneous_posts(expires_at);

ALTER TABLE public.spontaneous_posts ENABLE ROW LEVEL SECURITY;

ALTER PUBLICATION supabase_realtime ADD TABLE public.spontaneous_posts;

CREATE POLICY "read_active_posts" ON public.spontaneous_posts
  FOR SELECT USING (auth.uid() IS NOT NULL AND expires_at > now());

CREATE POLICY "insert_own_post" ON public.spontaneous_posts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "delete_own_post" ON public.spontaneous_posts
  FOR DELETE USING (user_id = auth.uid());
