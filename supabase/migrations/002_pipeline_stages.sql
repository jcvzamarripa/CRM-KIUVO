-- ── Pipeline Stages ──────────────────────────────────────────────────────────
-- Allows admins to rename stages, change colors, and set minimum visits

create table if not exists pipeline_stages (
  id          text primary key,
  label       text        not null,
  color       text        not null default '#888780',
  min_visits  integer     not null default 1,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Seed default stages (skip if already exist)
insert into pipeline_stages (id, label, color, min_visits, sort_order) values
  ('prospeccion',  'Prospección',  '#888780', 1, 0),
  ('presentacion', 'Presentación', '#378ADD', 2, 1),
  ('cotizacion',   'Cotización',   '#EF9F27', 2, 2),
  ('negociacion',  'Negociación',  '#D85A30', 3, 3),
  ('cierre',       'Cierre',       '#1D9E75', 2, 4)
on conflict (id) do nothing;

-- Updated_at trigger
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger pipeline_stages_updated_at
  before update on pipeline_stages
  for each row execute function set_updated_at();

-- RLS
alter table pipeline_stages enable row level security;

create policy "Authenticated users can read stages"
  on pipeline_stages for select
  using (auth.role() = 'authenticated');

create policy "Admins can update stages"
  on pipeline_stages for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );
