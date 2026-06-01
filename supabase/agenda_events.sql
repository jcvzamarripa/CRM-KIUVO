-- KIUVO CRM — Tabla agenda_events
-- Ejecutar en: Supabase SQL Editor > New query
-- Habilitar también Realtime: Database → Replication → supabase_realtime → agregar agenda_events

create table if not exists public.agenda_events (
  id          uuid primary key default gen_random_uuid(),
  seller_id   uuid references public.profiles(id) on delete cascade not null,
  prospect_id uuid references public.prospects(id) on delete set null,
  date        date not null,
  start_time  time not null,
  end_time    time not null,
  type        text not null default 'visita'
              check (type in ('visita', 'llamada', 'cotizacion', 'cierre', 'reunion')),
  name        text not null,
  contact     text default '',
  stage       text,
  address     text default '',
  notes       text default '',
  created_at  timestamptz default now()
);

alter table public.agenda_events enable row level security;

create policy "agenda_events: select own or admin"
  on agenda_events for select using (seller_id = auth.uid() or is_admin());

create policy "agenda_events: insert own"
  on agenda_events for insert with check (seller_id = auth.uid());

create policy "agenda_events: update own or admin"
  on agenda_events for update using (seller_id = auth.uid() or is_admin());

create policy "agenda_events: delete own or admin"
  on agenda_events for delete using (seller_id = auth.uid() or is_admin());

-- Índice para queries por rango de fecha
create index if not exists agenda_events_date_seller_idx
  on public.agenda_events (seller_id, date);

-- Habilitar Realtime para que el admin vea cambios en tiempo real
alter publication supabase_realtime add table agenda_events;
