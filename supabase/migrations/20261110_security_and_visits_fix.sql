-- KIUVO CRM — cierre de huecos de seguridad + reparación de visitas y métricas
-- Seguro de re-ejecutar.

-- ── 1. is_admin() lee profiles.role ──────────────────────────────────────────
-- Antes leía auth.users.raw_user_meta_data, que el propio usuario puede editar
-- con supabase.auth.updateUser(): cualquier vendedor podía volverse admin.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
$$;

-- ── 2. Nadie se cambia su propio rol ni su meta ──────────────────────────────
-- La política "profiles: update own" dejaba editar cualquier columna, role incluida.
-- auth.uid() es null desde el SQL editor / service role: ahí sí se permite.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.role := 'seller';
    else
      new.role        := old.role;
      new.goal_amount := old.goal_amount;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before insert or update on public.profiles
  for each row execute function public.protect_profile_role();

drop policy if exists "profiles: update admin" on public.profiles;
create policy "profiles: update admin"
  on public.profiles for update
  using (public.is_admin()) with check (public.is_admin());

-- ── 3. El registro ya no acepta el rol que mande el cliente ──────────────────
-- Para crear un admin: update public.profiles set role = 'admin' where id = '…';
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, initials, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(left(new.raw_user_meta_data->>'initials', 3), upper(left(new.email, 2))),
    'seller'
  );
  return new;
end;
$$;

-- ── 4. visits.kind ───────────────────────────────────────────────────────────
-- La app siempre envió "kind" pero la columna no existía: todo insert fallaba
-- y ninguna visita llegó a guardarse.
alter table public.visits add column if not exists kind text not null default 'visit';
alter table public.visits drop constraint if exists visits_kind_check;
alter table public.visits add constraint visits_kind_check
  check (kind in ('visit', 'call', 'whatsapp', 'email'));

-- Una visita sincronizada tarde no debe retroceder el último contacto.
create or replace function public.update_prospect_last_contact()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.prospects
  set last_contact_at = greatest(coalesce(last_contact_at, new.created_at), new.created_at),
      updated_at      = now()
  where id = new.prospect_id;
  return new;
end;
$$;

-- ── 5. Cada vendedor solo lee su propia actividad ────────────────────────────
drop policy if exists "All authenticated users can read activities" on public.activities;
drop policy if exists "activities: select own or admin" on public.activities;
create policy "activities: select own or admin"
  on public.activities for select
  using (seller_id = auth.uid() or public.is_admin());

-- ── 6. Fecha real de cierre de una cotización ────────────────────────────────
alter table public.quotes add column if not exists approved_at timestamptz;

update public.quotes
set approved_at = created_at
where status = 'approved' and approved_at is null;

create or replace function public.set_quote_approved_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'approved' then
    if tg_op = 'INSERT' or old.status is distinct from 'approved' then
      new.approved_at := coalesce(new.approved_at, now());
    end if;
  else
    new.approved_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists quotes_set_approved_at on public.quotes;
create trigger quotes_set_approved_at
  before insert or update on public.quotes
  for each row execute function public.set_quote_approved_at();

-- ── 7. Columnas que la bandeja de notificaciones pide ────────────────────────
-- La app selecciona "screen" y "stage"; al no existir, la consulta fallaba y
-- la bandeja salía siempre vacía.
alter table public.notifications add column if not exists screen text;
alter table public.notifications add column if not exists stage  text;

-- ── 8. Aviso de inactividad sin spam ─────────────────────────────────────────
-- Antes: un aviso diario por cada prospecto, incluidos cerrados y repositorio.
-- Ahora: uno por semana y solo de prospectos en etapas activas.
create or replace function public.notify_inactive_prospects()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  inactive_days constant int := 7;
begin
  insert into public.notifications (user_id, kind, title, body, prospect_id, reference_id)
  select
    p.owner_id,
    'inactivity',
    'Prospecto sin actividad',
    p.name || ' lleva más de ' || inactive_days || ' días sin contacto.',
    p.id,
    p.id
  from public.prospects p
  where p.owner_id is not null
    and p.stage_id not in ('cierre', 'repositorio')
    and (p.last_contact_at is null
         or p.last_contact_at < now() - make_interval(days => inactive_days))
    and not exists (
      select 1 from public.notifications n
      where n.user_id = p.owner_id
        and n.kind = 'inactivity'
        and n.reference_id = p.id
        and n.created_at > now() - interval '7 days'
    );
end;
$$;
