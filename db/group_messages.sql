-- Migration: group chat messages

CREATE TABLE IF NOT EXISTS public.group_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name text NOT NULL,
  text        text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_messages_group
  ON public.group_messages(group_id, created_at);

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- Group members (or creator) can read messages
CREATE POLICY "group_members_read_messages" ON public.group_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_id
        AND (
          g.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM jsonb_array_elements(g.members) AS m
            WHERE (m->>'user_id') = auth.uid()::text
          )
        )
    )
  );

-- Users can only insert messages as themselves
CREATE POLICY "insert_own_messages" ON public.group_messages
  FOR INSERT WITH CHECK (user_id = auth.uid());
