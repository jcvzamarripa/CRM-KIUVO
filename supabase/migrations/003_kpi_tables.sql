-- 003_kpi_tables.sql
-- Tablas para KPIs del dashboard: prospects, quotes, activities

-- ─── PROSPECTS ────────────────────────────────────────────────────────────────
create table if not exists public.prospects (
  id          bigint generated always as identity primary key,
  name        text        not null,
  contact     text,
  phone       text,
  email       text,
  value       numeric(12,2)  default 0,
  stage_id    bigint      references public.pipeline_stages(id),
  status      text        not null default 'active'
                check (status in ('active', 'won', 'lost')),
  health      text        default 'green'
                check (health in ('green', 'amber', 'red')),
  visits      int         default 0,
  city        text,
  owner_id    uuid        references auth.users(id),
  lat         double precision,
  lng         double precision,
  notes       text,
  created_at  timestamptz not null default now(),
  closed_at   timestamptz,
  updated_at  timestamptz not null default now()
);

alter table public.prospects enable row level security;

create policy "prospects_read"
  on public.prospects for select
  using (auth.role() = 'authenticated');

create policy "prospects_insert"
  on public.prospects for insert
  with check (auth.uid() = owner_id);

create policy "prospects_update"
  on public.prospects for update
  using (
    auth.uid() = owner_id
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ─── QUOTES ───────────────────────────────────────────────────────────────────
create table if not exists public.quotes (
  id           bigint generated always as identity primary key,
  prospect_id  bigint      references public.prospects(id) on delete cascade,
  seller_id    uuid        references auth.users(id),
  status       text        not null default 'draft'
                 check (status in ('draft', 'sent', 'accepted', 'rejected')),
  total        numeric(12,2) default 0,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.quotes enable row level security;

create policy "quotes_read"
  on public.quotes for select
  using (auth.role() = 'authenticated');

create policy "quotes_insert"
  on public.quotes for insert
  with check (auth.uid() = seller_id);

create policy "quotes_update"
  on public.quotes for update
  using (
    auth.uid() = seller_id
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ─── ACTIVITIES ───────────────────────────────────────────────────────────────
create table if not exists public.activities (
  id           bigint generated always as identity primary key,
  prospect_id  bigint      references public.prospects(id) on delete cascade,
  seller_id    uuid        references auth.users(id),
  kind         text        not null
                 check (kind in ('visit','call','whatsapp','email','quote','stage','win','new')),
  notes        text,
  created_at   timestamptz not null default now()
);

alter table public.activities enable row level security;

create policy "activities_read"
  on public.activities for select
  using (auth.role() = 'authenticated');

create policy "activities_insert"
  on public.activities for insert
  with check (auth.uid() = seller_id);

-- ─── updated_at TRIGGER (reutilizable) ────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger prospects_updated_at
  before update on public.prospects
  for each row execute procedure public.handle_updated_at();

create trigger quotes_updated_at
  before update on public.quotes
  for each row execute procedure public.handle_updated_at();
