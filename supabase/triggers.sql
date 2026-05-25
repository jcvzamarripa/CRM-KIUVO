-- KIUVO CRM — Notification triggers & scheduled functions
-- Run this in Supabase SQL Editor AFTER schema.sql and rls.sql
-- Safe to re-run: uses CREATE OR REPLACE and IF NOT EXISTS throughout.

-- ══════════════════════════════════════════════════════════════════
-- 0. HELPER is_admin() — por si no viene de schema.sql
-- ══════════════════════════════════════════════════════════════════
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
$$;

-- ══════════════════════════════════════════════════════════════════
-- 1. EVENTS TABLE (agenda persistida en DB)
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  seller_id    uuid references profiles(id) on delete cascade not null,
  prospect_id  uuid references prospects(id) on delete set null,
  title        text not null,
  type         text not null check (type in ('visit', 'call', 'meeting', 'other')) default 'visit',
  start_at     timestamptz not null,
  duration_min int not null default 60,
  address      text,
  notes        text,
  activity     text,
  status       text not null check (status in ('pending', 'done', 'cancelled')) default 'pending',
  source       text not null check (source in ('local', 'google')) default 'local',
  created_at   timestamptz default now()
);

alter table public.events enable row level security;

create policy "events: select own or admin"
  on events for select using (seller_id = auth.uid() or is_admin());
create policy "events: insert own"
  on events for insert with check (seller_id = auth.uid());
create policy "events: update own or admin"
  on events for update using (seller_id = auth.uid() or is_admin());
create policy "events: delete own or admin"
  on events for delete using (seller_id = auth.uid() or is_admin());


-- ══════════════════════════════════════════════════════════════════
-- 2. reference_id EN NOTIFICATIONS (deduplicación por evento)
-- ══════════════════════════════════════════════════════════════════
alter table public.notifications
  add column if not exists reference_id uuid;


-- ══════════════════════════════════════════════════════════════════
-- 3. TRIGGER: actualizar last_contact_at al registrar visita
-- ══════════════════════════════════════════════════════════════════
create or replace function public.update_prospect_last_contact()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.prospects
  set
    last_contact_at = new.created_at,
    updated_at      = now()
  where id = new.prospect_id;
  return new;
end;
$$;

drop trigger if exists on_visit_created on public.visits;
create trigger on_visit_created
  after insert on public.visits
  for each row
  execute function public.update_prospect_last_contact();


-- ══════════════════════════════════════════════════════════════════
-- 4. FUNCIÓN: prospectos sin actividad por N días
--    Corre diario a las 09:00. Notifica al dueño del prospecto
--    si no hubo contacto en los últimos INACTIVE_DAYS días.
--    Dedup: no se repite la misma notificación en 24h por prospecto.
-- ══════════════════════════════════════════════════════════════════
create or replace function public.notify_inactive_prospects()
returns void
language plpgsql
security definer
as $$
declare
  inactive_days constant int := 7;
  rec record;
begin
  for rec in
    select
      p.id          as prospect_id,
      p.name        as prospect_name,
      p.owner_id    as user_id,
      p.last_contact_at
    from public.prospects p
    where
      p.owner_id is not null
      -- sin contacto en N días (o nunca contactado)
      and (
        p.last_contact_at is null
        or p.last_contact_at < now() - (inactive_days || ' days')::interval
      )
      -- no enviar la misma notificación dos veces en 24h
      and not exists (
        select 1
        from public.notifications n
        where
          n.user_id      = p.owner_id
          and n.kind     = 'inactivity'
          and n.reference_id = p.id
          and n.created_at > now() - interval '24 hours'
      )
  loop
    insert into public.notifications (user_id, kind, title, body, prospect_id, reference_id)
    values (
      rec.user_id,
      'inactivity',
      'Prospecto sin actividad',
      rec.prospect_name || ' lleva más de ' || inactive_days || ' días sin contacto.',
      rec.prospect_id,
      rec.prospect_id   -- reference_id = prospect_id para dedup
    );
  end loop;
end;
$$;


-- ══════════════════════════════════════════════════════════════════
-- 5. FUNCIÓN: visitas pendientes (eventos vencidos sin completar)
--    Corre cada hora. Notifica cuando un evento agendado
--    ya pasó (> 1h) y sigue en status 'pending'.
--    Dedup: una sola notificación por event.id.
-- ══════════════════════════════════════════════════════════════════
create or replace function public.notify_pending_visits()
returns void
language plpgsql
security definer
as $$
declare
  rec record;
begin
  for rec in
    select
      e.id          as event_id,
      e.seller_id   as user_id,
      e.prospect_id,
      e.title,
      e.type,
      e.start_at
    from public.events e
    where
      e.status  = 'pending'
      -- venció hace más de 1 hora y sigue sin marcarse como hecho
      and e.start_at < now() - interval '1 hour'
      -- notificar solo una vez por evento
      and not exists (
        select 1
        from public.notifications n
        where
          n.user_id      = e.seller_id
          and n.kind     = 'pending_visit'
          and n.reference_id = e.id
      )
  loop
    insert into public.notifications (user_id, kind, title, body, prospect_id, reference_id)
    values (
      rec.user_id,
      'pending_visit',
      'Actividad pendiente sin completar',
      '"' || rec.title || '" quedó pendiente. Marca como realizada o reagenda.',
      rec.prospect_id,
      rec.event_id
    );
  end loop;
end;
$$;


-- ══════════════════════════════════════════════════════════════════
-- 6. FUNCIÓN: recordatorio de agenda (próximas 24h)
--    Corre cada hora. Notifica eventos que inician
--    entre 30 min y 24h en el futuro.
--    Dedup: una sola notificación por event.id.
-- ══════════════════════════════════════════════════════════════════
create or replace function public.notify_upcoming_agenda()
returns void
language plpgsql
security definer
as $$
declare
  rec    record;
  mins   int;
  when_text text;
begin
  for rec in
    select
      e.id          as event_id,
      e.seller_id   as user_id,
      e.prospect_id,
      e.title,
      e.start_at
    from public.events e
    where
      e.status  = 'pending'
      -- ventana: entre 30 min y 24h a partir de ahora
      and e.start_at > now() + interval '30 minutes'
      and e.start_at < now() + interval '24 hours'
      -- notificar solo una vez por evento
      and not exists (
        select 1
        from public.notifications n
        where
          n.user_id      = e.seller_id
          and n.kind     = 'agenda_reminder'
          and n.reference_id = e.id
      )
  loop
    -- texto amigable del tiempo restante
    mins := extract(epoch from (rec.start_at - now()))::int / 60;
    when_text := case
      when mins < 60  then 'en ' || mins || ' minutos'
      when mins < 120 then 'en 1 hora'
      else                 'en ' || (mins / 60) || ' horas'
    end;

    insert into public.notifications (user_id, kind, title, body, prospect_id, reference_id)
    values (
      rec.user_id,
      'agenda_reminder',
      'Recordatorio de agenda',
      '"' || rec.title || '" inicia ' || when_text || '.',
      rec.prospect_id,
      rec.event_id
    );
  end loop;
end;
$$;


-- ══════════════════════════════════════════════════════════════════
-- 7. pg_cron — programar las funciones
--    Requiere que pg_cron esté habilitado en Extensions.
--    Si el job ya existe, cron.schedule() lo actualiza.
-- ══════════════════════════════════════════════════════════════════
create extension if not exists pg_cron;

-- Limpiar schedules previos si existen (seguro aunque no existan)
do $$
begin
  perform cron.unschedule(jobname)
  from cron.job
  where jobname in (
    'kiuvo-inactive-prospects',
    'kiuvo-pending-visits',
    'kiuvo-agenda-reminders'
  );
exception when others then null;
end
$$;

-- Prospectos sin actividad: diario a las 09:00 (hora UTC)
select cron.schedule(
  'kiuvo-inactive-prospects',
  '0 15 * * *',   -- 09:00 hora CDMX (UTC-6)
  $$ select public.notify_inactive_prospects() $$
);

-- Visitas pendientes: cada hora en punto
select cron.schedule(
  'kiuvo-pending-visits',
  '0 * * * *',
  $$ select public.notify_pending_visits() $$
);

-- Recordatorios de agenda: cada hora en punto
select cron.schedule(
  'kiuvo-agenda-reminders',
  '0 * * * *',
  $$ select public.notify_upcoming_agenda() $$
);
