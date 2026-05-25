-- KIUVO CRM — events table
-- Run this in the Supabase SQL Editor once.
-- Then enable Realtime for the `events` table in Dashboard → Database → Replication.

create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade not null,
  title       text not null,
  type        text not null default 'visit'
                check (type in ('visit', 'call', 'meeting', 'other')),
  starts_at   timestamptz not null,
  duration    int  not null default 60,   -- minutes
  address     text,
  notes       text,
  activity    text,
  stage       text references public.stages(id),
  prospect_id uuid references public.prospects(id) on delete set null,
  source      text not null default 'local'
                check (source in ('local', 'google')),
  notified    boolean not null default false,
  created_at  timestamptz default now()
);

alter table public.events enable row level security;

create policy "events: select own or admin"
  on events for select using (user_id = auth.uid() or is_admin());

create policy "events: insert own"
  on events for insert with check (user_id = auth.uid());

create policy "events: update own or admin"
  on events for update using (user_id = auth.uid() or is_admin());

create policy "events: delete own or admin"
  on events for delete using (user_id = auth.uid() or is_admin());

-- Index for fast per-user date-ordered queries
create index if not exists events_user_starts_at
  on public.events (user_id, starts_at);
