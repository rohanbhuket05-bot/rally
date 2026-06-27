-- Migration: event chat messages

CREATE TABLE IF NOT EXISTS public.event_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name text NOT NULL,
  text        text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_messages_event
  ON public.event_messages(event_id, created_at);

ALTER TABLE public.event_messages ENABLE ROW LEVEL SECURITY;

-- Enable Realtime delivery
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_messages;

-- Any authenticated user can read messages (event access is gated at navigation level)
CREATE POLICY "authenticated_read_event_messages" ON public.event_messages
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can only insert messages as themselves
CREATE POLICY "insert_own_event_messages" ON public.event_messages
  FOR INSERT WITH CHECK (user_id = auth.uid());