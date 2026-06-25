-- Row Level Security policies and a trigger to create a profile user on auth sign-up

-- Enable RLS on events
ALTER TABLE IF EXISTS public.events ENABLE ROW LEVEL SECURITY;

-- Allow users to select their own events
CREATE POLICY "select_own_events" ON public.events FOR SELECT USING (user_id = auth.uid());

-- Allow users to insert events where user_id is their own id
CREATE POLICY "insert_own_events" ON public.events FOR INSERT WITH CHECK (user_id = auth.uid());

-- Allow users to update or delete their own events
CREATE POLICY "modify_own_events" ON public.events FOR UPDATE, DELETE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Only group admins (or creator) can delete a group
ALTER TABLE IF EXISTS public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_delete_group" ON public.groups
  FOR DELETE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(members) AS m
      WHERE (m->>'user_id') = auth.uid()::text
        AND (m->>'role') = 'admin'
    )
  );

-- Create a users row when a new auth user is created
-- This function runs as SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, username, full_name, created_at)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta->>'full_name', now())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE PROCEDURE public.handle_auth_user_created();
