-- KIUVO CRM — check-in verificado, tareas del vendedor y metas diarias
-- Seguro de re-ejecutar.

-- ── 1. Evidencia de la visita ────────────────────────────────────────────────
alter table public.visits add column if not exists accuracy_m   numeric;
alter table public.visits add column if not exists distance_m   numeric;
alter table public.visits add column if not exists photo_path   text;
alter table public.visits add column if not exists outcome      text;
alter table public.visits add column if not exists loss_reason  text;
alter table public.visits add column if not exists verification text;
alter table public.visits add column if not exists synced_at    timestamptz default now();

alter table public.visits drop constraint if exists visits_outcome_check;
alter table public.visits add constraint visits_outcome_check
  check (outcome is null or outcome in
    ('no_estaba', 'no_interesa', 'volver', 'cita', 'cotizacion', 'venta'));

alter table public.visits drop constraint if exists visits_verification_check;
alter table public.visits add constraint visits_verification_check
  check (verification is null or verification in
    ('verified', 'far', 'no_gps', 'no_photo', 'no_reference'));

create index if not exists visits_seller_created_idx on public.visits (seller_id, created_at desc);

-- La distancia y el veredicto se calculan en el servidor: el teléfono solo
-- manda coordenadas y foto, no puede declararse "verificado" a sí mismo.
create or replace function public.verify_visit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p_lat numeric;
  p_lng numeric;
  max_distance_m constant numeric := 200;
begin
  new.synced_at  := now();
  new.created_at := least(coalesce(new.created_at, now()), now());
  new.distance_m := null;

  if new.kind <> 'visit' then
    new.verification := null;
    return new;
  end if;

  select lat, lng into p_lat, p_lng from public.prospects where id = new.prospect_id;

  if new.lat is null or new.lng is null then
    new.verification := 'no_gps';
  elsif p_lat is null or p_lng is null then
    -- Primera visita con GPS: fija la ubicación del prospecto
    update public.prospects set lat = new.lat, lng = new.lng where id = new.prospect_id;
    new.verification := case when new.photo_path is null then 'no_photo' else 'no_reference' end;
  else
    new.distance_m := round((
      6371000 * 2 * asin(sqrt(
        power(sin(radians(new.lat - p_lat) / 2), 2) +
        cos(radians(p_lat)) * cos(radians(new.lat)) *
        power(sin(radians(new.lng - p_lng) / 2), 2)
      ))
    )::numeric, 0);
    new.verification := case
      when new.distance_m > max_distance_m + coalesce(new.accuracy_m, 0) then 'far'
      when new.photo_path is null then 'no_photo'
      else 'verified'
    end;
  end if;

  return new;
end;
$$;

drop trigger if exists verify_visit on public.visits;
create trigger verify_visit
  before insert on public.visits
  for each row execute function public.verify_visit();

-- ── 2. Fotos de visita (bucket privado, carpeta por vendedor) ────────────────
insert into storage.buckets (id, name, public)
  values ('visit-photos', 'visit-photos', false)
  on conflict (id) do nothing;

drop policy if exists "visit-photos: seller upload own" on storage.objects;
create policy "visit-photos: seller upload own"
  on storage.objects for insert
  with check (bucket_id = 'visit-photos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "visit-photos: read own or admin" on storage.objects;
create policy "visit-photos: read own or admin"
  on storage.objects for select
  using (bucket_id = 'visit-photos'
         and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin()));

-- ── 3. Tareas ────────────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  seller_id   uuid not null references public.profiles(id) on delete cascade,
  prospect_id uuid references public.prospects(id) on delete cascade,
  visit_id    uuid references public.visits(id) on delete set null,
  title       text not null,
  kind        text not null default 'other'
              check (kind in ('visit', 'call', 'quote', 'whatsapp', 'other')),
  due_date    date not null default current_date,
  done_at     timestamptz,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists tasks_seller_due_idx on public.tasks (seller_id, due_date);

alter table public.tasks enable row level security;

drop policy if exists "tasks: select own or admin" on public.tasks;
create policy "tasks: select own or admin"
  on public.tasks for select using (seller_id = auth.uid() or public.is_admin());

drop policy if exists "tasks: insert own or admin" on public.tasks;
create policy "tasks: insert own or admin"
  on public.tasks for insert with check (seller_id = auth.uid() or public.is_admin());

drop policy if exists "tasks: update own or admin" on public.tasks;
create policy "tasks: update own or admin"
  on public.tasks for update
  using (seller_id = auth.uid() or public.is_admin())
  with check (seller_id = auth.uid() or public.is_admin());

-- Una tarea asignada por el admin no la borra el vendedor
drop policy if exists "tasks: delete own-created or admin" on public.tasks;
create policy "tasks: delete own-created or admin"
  on public.tasks for delete
  using ((seller_id = auth.uid() and created_by = auth.uid()) or public.is_admin());

-- ── 4. Metas diarias ─────────────────────────────────────────────────────────
alter table public.seller_goals drop constraint if exists seller_goals_period_check;
alter table public.seller_goals add constraint seller_goals_period_check
  check (period in ('Día', 'Semana', 'Mes', 'Trimestre', 'Año'));
