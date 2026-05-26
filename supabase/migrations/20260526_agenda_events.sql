-- ── Tabla agenda_events ──────────────────────────────────────────────────────
create table if not exists public.agenda_events (
  id          uuid        primary key default gen_random_uuid(),
  date        date        not null,
  start_time  time        not null,
  end_time    time        not null,
  type        text        not null default 'visita'
                          check (type in ('visita','llamada','cotizacion','cierre','reunion')),
  name        text        not null,
  contact     text        not null default '',
  seller_id   uuid        references public.profiles(id) on delete set null,
  prospect_id uuid        references public.prospects(id) on delete set null,
  stage       text        not null default '',
  address     text        not null default '',
  notes       text        not null default '',
  created_at  timestamptz not null default now()
);

-- Índices útiles
create index if not exists agenda_events_date_idx      on agenda_events(date);
create index if not exists agenda_events_seller_id_idx on agenda_events(seller_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.agenda_events enable row level security;

-- Admins ven y modifican todo
create policy "Admin full access on agenda_events"
  on public.agenda_events for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Sellers ven sus propios eventos
create policy "Seller sees own agenda_events"
  on public.agenda_events for select
  using (seller_id = auth.uid());

-- Sellers pueden crear sus propios eventos
create policy "Seller insert own agenda_events"
  on public.agenda_events for insert
  with check (seller_id = auth.uid());

-- Sellers pueden actualizar sus propios eventos
create policy "Seller update own agenda_events"
  on public.agenda_events for update
  using (seller_id = auth.uid());
