-- Supabase / Postgres schema for Rally minimal profile/events

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text unique,
  full_name text,
  bio text,
  created_at timestamptz default now()
);

create table if not exists events (
  id bigserial primary key,
  user_id uuid references users(id) on delete cascade,
  title text not null,
  date_iso timestamptz not null,
  show_time boolean default true,
  location text,
  attendees jsonb,
  created_at timestamptz default now()
);

create table if not exists groups (
  id bigserial primary key,
  name text not null,
  members_count int default 0,
  metadata jsonb,
  created_at timestamptz default now()
);

create table if not exists cheers (
  id bigserial primary key,
  giver_id uuid,
  receiver_id uuid,
  event_id bigint,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_events_user on events(user_id);
create index if not exists idx_events_date on events(date_iso);
