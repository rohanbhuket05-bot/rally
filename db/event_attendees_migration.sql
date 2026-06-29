-- Run this in the Supabase SQL Editor
-- Migrates attendees from JSONB column on events to a normalized join table.
-- Existing event attendee data will be lost (acceptable for pre-launch).

CREATE TABLE IF NOT EXISTS event_attendees (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    bigint      NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text,
  initials    text,
  avatar_url  text,
  joined_at   timestamptz DEFAULT now(),
  UNIQUE (event_id, user_id)
);

ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendees_select"
  ON event_attendees FOR SELECT USING (true);

CREATE POLICY "attendees_insert"
  ON event_attendees FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "attendees_delete"
  ON event_attendees FOR DELETE
  USING (auth.uid() = user_id);
