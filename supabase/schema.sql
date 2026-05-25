-- KIUVO CRM — Supabase schema
-- Run this in the Supabase SQL editor
-- If the project already exists, run supabase/rls.sql instead to update policies only.

-- ─── Helper ────────────────────────────────────────────────────────
-- Security definer avoids recursive RLS lookups on profiles
create or replace function public.is_admin()
returns boolean language sql security definer stable
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') $$;

-- ─── Profiles ─────────────────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid references auth.users(id) on delete cascade primary key,
  full_name    text not null,
  initials     text not null check (char_length(initials) <= 3),
  role         text not null check (role in ('admin', 'seller')),
  position     text,                          -- display title, e.g. "Vendedor de campo"
  avatar_color text default '#185FA5',
  avatar_url   text,                          -- Supabase Storage public URL
  goal_amount  numeric default 100000,
  created_at   timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "profiles: select own or admin"
  on profiles for select using (auth.uid() = id or is_admin());
create policy "profiles: update own or admin"
  on profiles for update using (auth.uid() = id or is_admin());
create policy "profiles: insert admin only"
  on profiles for insert with check (is_admin());
create policy "profiles: delete admin only"
  on profiles for delete using (is_admin());

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
create policy "stages: select authenticated" on stages for select using (auth.uid() is not null);
create policy "stages: all admin only" on stages for all using (is_admin());

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
create policy "prospects: select owner or admin"
  on prospects for select using (owner_id = auth.uid() or is_admin());
create policy "prospects: insert own"
  on prospects for insert with check (owner_id = auth.uid());
create policy "prospects: update owner or admin"
  on prospects for update using (owner_id = auth.uid() or is_admin());
create policy "prospects: delete admin only"
  on prospects for delete using (is_admin());

-- ─── Visits ────────────────────────────────────────────────────────
create table if not exists public.visits (
  id           uuid primary key default gen_random_uuid(),
  prospect_id  uuid references prospects(id) on delete cascade,
  seller_id    uuid references profiles(id),
  kind         text not null check (kind in ('visit', 'call', 'whatsapp', 'email')) default 'visit',
  lat          numeric,
  lng          numeric,
  notes        text,
  created_at   timestamptz default now()
);
alter table public.visits enable row level security;
create policy "visits: select own or admin"
  on visits for select using (seller_id = auth.uid() or is_admin());
create policy "visits: insert own"
  on visits for insert with check (seller_id = auth.uid());
create policy "visits: update own or admin"
  on visits for update using (seller_id = auth.uid() or is_admin());
create policy "visits: delete admin only"
  on visits for delete using (is_admin());

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
create policy "activities: select own or admin"
  on activities for select using (seller_id = auth.uid() or is_admin());
create policy "activities: insert own"
  on activities for insert with check (seller_id = auth.uid());
create policy "activities: delete admin only"
  on activities for delete using (is_admin());

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
create policy "weekly_goals: select own or admin"
  on weekly_goals for select using (seller_id = auth.uid() or is_admin());
create policy "weekly_goals: insert own"
  on weekly_goals for insert with check (seller_id = auth.uid());
create policy "weekly_goals: update own or admin"
  on weekly_goals for update using (seller_id = auth.uid() or is_admin());
create policy "weekly_goals: delete admin only"
  on weekly_goals for delete using (is_admin());

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
create policy "stage_history: select own prospects or admin"
  on stage_history for select using (
    is_admin() or
    exists (select 1 from prospects where id = prospect_id and owner_id = auth.uid())
  );
create policy "stage_history: insert own"
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

-- ─── Quotes ────────────────────────────────────────────────────────
create table if not exists public.quotes (
  id           uuid primary key default gen_random_uuid(),
  prospect_id  uuid references prospects(id) on delete cascade,
  seller_id    uuid references profiles(id),
  status       text not null check (status in ('draft', 'sent', 'approved', 'rejected')) default 'draft',
  total        numeric not null default 0,
  notes        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
alter table public.quotes enable row level security;
create policy "quotes: select own or admin"
  on quotes for select using (seller_id = auth.uid() or is_admin());
create policy "quotes: insert own"
  on quotes for insert with check (seller_id = auth.uid());
create policy "quotes: update own or admin"
  on quotes for update using (seller_id = auth.uid() or is_admin());
create policy "quotes: delete own drafts or admin"
  on quotes for delete using (
    (seller_id = auth.uid() and status = 'draft') or is_admin()
  );

-- ─── Quote items ────────────────────────────────────────────────────
create table if not exists public.quote_items (
  id           uuid primary key default gen_random_uuid(),
  quote_id     uuid references quotes(id) on delete cascade,
  product_name text not null,
  sku          text,
  unit         text,
  quantity     numeric not null default 1,
  unit_price   numeric not null default 0,
  subtotal     numeric generated always as (quantity * unit_price) stored,
  created_at   timestamptz default now()
);
alter table public.quote_items enable row level security;
create policy "quote_items: select via quote owner or admin"
  on quote_items for select using (
    is_admin() or
    exists (select 1 from quotes where id = quote_id and seller_id = auth.uid())
  );
create policy "quote_items: insert via own quote"
  on quote_items for insert with check (
    exists (select 1 from quotes where id = quote_id and seller_id = auth.uid())
  );
create policy "quote_items: update via own quote or admin"
  on quote_items for update using (
    is_admin() or
    exists (select 1 from quotes where id = quote_id and seller_id = auth.uid())
  );
create policy "quote_items: delete via own quote or admin"
  on quote_items for delete using (
    is_admin() or
    exists (select 1 from quotes where id = quote_id and seller_id = auth.uid())
  );

-- ─── Notifications ──────────────────────────────────────────────────
create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references profiles(id) on delete cascade,
  kind         text not null, -- inactivity, pending_visit, agenda_reminder, quote_status
  title        text not null,
  body         text,
  read         boolean not null default false,
  prospect_id  uuid references prospects(id) on delete set null,
  created_at   timestamptz default now()
);
alter table public.notifications enable row level security;
create policy "notifications: select own"
  on notifications for select using (user_id = auth.uid());
create policy "notifications: update own"
  on notifications for update using (user_id = auth.uid());
-- DB triggers use security definer and bypass RLS; admin can insert manually
create policy "notifications: insert admin only"
  on notifications for insert with check (is_admin());
create policy "notifications: delete own or admin"
  on notifications for delete using (user_id = auth.uid() or is_admin());

-- ─── View: visit counts per prospect ──────────────────────────────
create or replace view public.prospect_visit_counts as
  select prospect_id, count(*) as total_visits
  from visits
  group by prospect_id;

-- ─── Storage: avatars bucket ────────────────────────────────────────
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

create policy "avatars: insert own"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatars: update own"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatars: delete own"
  on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatars: public read"
  on storage.objects for select
  using (bucket_id = 'avatars');
