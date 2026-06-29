-- Run this in the Supabase SQL Editor
-- Migrates group members from JSONB column on groups to a normalized join table.
-- Existing member data will be lost (acceptable for pre-launch).

CREATE TABLE IF NOT EXISTS group_members (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   uuid        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text        NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at  timestamptz DEFAULT now(),
  UNIQUE (group_id, user_id)
);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gm_select"
  ON group_members FOR SELECT USING (true);

CREATE POLICY "gm_insert"
  ON group_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gm_self_delete"
  ON group_members FOR DELETE
  USING (auth.uid() = user_id);

-- Group admins (and creators) can remove any member
CREATE POLICY "gm_admin_delete"
  ON group_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_members.group_id AND g.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM group_members gm2
      WHERE gm2.group_id = group_members.group_id
        AND gm2.user_id = auth.uid()
        AND gm2.role = 'admin'
    )
  );
