-- KIUVO CRM — Supabase schema
-- Run this in the Supabase SQL editor

-- ─── Profiles ─────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  full_name   text not null,
  initials    text not null check (char_length(initials) <= 3),
  role        text not null check (role in ('admin', 'seller')),
  avatar_color text default '#185FA5',
  goal_amount numeric default 100000,
  created_at  timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can read their own profile"
  on profiles for select using (auth.uid() = id);
create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);
create policy "Admins can read all profiles"
  on profiles for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ─── Stages ────────────────────────────────────────────────────────
create table if not exists public.stages (
  id          text primary key,
  label       text not null,
  color       text not null,
  min_visits  int  not null default 1,
  order_index int  not null,
  updated_at  timestamptz default now()
);
alter table public.stages enable row level security;
create policy "All users can read stages" on stages for select using (true);
create policy "Admins can update stages" on stages for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Seed default stages
insert into stages (id, label, color, min_visits, order_index) values
  ('prospeccion',  'Prospección',  '#888780', 1, 1),
  ('presentacion', 'Presentación', '#378ADD', 2, 2),
  ('cotizacion',   'Cotización',   '#EF9F27', 2, 3),
  ('negociacion',  'Negociación',  '#D85A30', 3, 4),
  ('cierre',       'Cierre',       '#1D9E75', 2, 5)
on conflict (id) do nothing;

-- ─── Prospects ─────────────────────────────────────────────────────
create table if not exists public.prospects (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  company         text,
  phone           text,
  email           text,
  address         text,
  lat             numeric,
  lng             numeric,
  stage_id        text references stages(id) default 'prospeccion',
  owner_id        uuid references profiles(id),
  value           numeric default 0,
  notes           text,
  health          text check (health in ('green', 'amber', 'red', 'black')) default 'green',
  days_in_stage   int default 0,
  last_contact_at timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
alter table public.prospects enable row level security;
create policy "Sellers see their own prospects"
  on prospects for select using (owner_id = auth.uid());
create policy "Admins see all prospects"
  on prospects for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
create policy "Sellers can manage their prospects"
  on prospects for all using (owner_id = auth.uid());

-- ─── Visits ────────────────────────────────────────────────────────
create table if not exists public.visits (
  id           uuid primary key default gen_random_uuid(),
  prospect_id  uuid references prospects(id) on delete cascade,
  seller_id    uuid references profiles(id),
  lat          numeric,
  lng          numeric,
  notes        text,
  created_at   timestamptz default now()
);
alter table public.visits enable row level security;
create policy "Sellers see their own visits"
  on visits for select using (seller_id = auth.uid());
create policy "Sellers can insert visits"
  on visits for insert with check (seller_id = auth.uid());
create policy "Admins see all visits"
  on visits for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ─── Activities (feed) ─────────────────────────────────────────────
create table if not exists public.activities (
  id           uuid primary key default gen_random_uuid(),
  seller_id    uuid references profiles(id),
  prospect_id  uuid references prospects(id) on delete cascade,
  kind         text not null, -- visit, quote, win, stage, msg, add
  details      jsonb default '{}',
  created_at   timestamptz default now()
);
alter table public.activities enable row level security;
create policy "All authenticated users can read activities"
  on activities for select using (auth.uid() is not null);
create policy "Sellers can insert activities"
  on activities for insert with check (seller_id = auth.uid());

-- ─── Weekly goals ──────────────────────────────────────────────────
create table if not exists public.weekly_goals (
  id               uuid primary key default gen_random_uuid(),
  seller_id        uuid references profiles(id),
  week_start       date not null,
  goal_amount      numeric not null,
  achieved_amount  numeric default 0,
  unique(seller_id, week_start)
);
alter table public.weekly_goals enable row level security;
create policy "Users can see their own goals"
  on weekly_goals for select using (seller_id = auth.uid());
create policy "Admins can see all goals"
  on weekly_goals for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ─── Stage history ─────────────────────────────────────────────────
create table if not exists public.stage_history (
  id            uuid primary key default gen_random_uuid(),
  prospect_id   uuid references prospects(id) on delete cascade,
  from_stage    text references stages(id),
  to_stage      text references stages(id),
  moved_by      uuid references profiles(id),
  created_at    timestamptz default now()
);
alter table public.stage_history enable row level security;
create policy "All authenticated users can read stage history"
  on stage_history for select using (auth.uid() is not null);
create policy "Sellers can insert stage history"
  on stage_history for insert with check (moved_by = auth.uid());

-- ─── Trigger: auto-create profile on signup ────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, initials, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'initials', upper(left(new.email, 2))),
    coalesce(new.raw_user_meta_data->>'role', 'seller')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── View: visit counts per prospect ──────────────────────────────
create or replace view public.prospect_visit_counts as
  select prospect_id, count(*) as total_visits
  from visits
  group by prospect_id;
