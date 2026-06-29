-- Run this in the Supabase SQL Editor

-- events: queries filter by user_id, visibility, personal, and sort by date_iso
CREATE INDEX IF NOT EXISTS idx_events_user_id        ON events (user_id);
CREATE INDEX IF NOT EXISTS idx_events_visibility     ON events (visibility) WHERE personal = false;
CREATE INDEX IF NOT EXISTS idx_events_date_iso       ON events (date_iso);

-- event_attendees: queries filter by event_id and user_id
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON event_attendees (event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user_id  ON event_attendees (user_id);

-- groups: queries filter by created_by
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups (created_by);

-- group_messages: queries filter by group_id and sort by created_at
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id    ON group_messages (group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at  ON group_messages (created_at);

-- event_messages: queries filter by event_id and sort by created_at
CREATE INDEX IF NOT EXISTS idx_event_messages_event_id   ON event_messages (event_id);
CREATE INDEX IF NOT EXISTS idx_event_messages_created_at ON event_messages (created_at);

-- friendships: queries filter by both user columns
CREATE INDEX IF NOT EXISTS idx_friendships_requester_id ON friendships (requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee_id ON friendships (addressee_id);

-- profiles: username lookups (search, invite flows)
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles (username);
