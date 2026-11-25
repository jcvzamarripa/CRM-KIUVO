-- ════════════════════════════════════════════════════════════════════════
-- Lo que el vendedor hace parado en la puerta
--
-- Dos acciones, las dos desde el teléfono:
--   1. Marcar la parada con el resultado de la visita.
--   2. Corregir el turno cuando el horario real no es el que dedujimos.
--
-- ── Por qué la corrección de turno importa tanto ───────────────────────
--
-- Ninguna base de datos del mundo conoce el horario del puesto de
-- gorditas de la esquina. Lo medimos: OpenStreetMap tiene el horario de
-- 250 negocios en toda Aguascalientes, de 37,544 que nos interesan — el
-- 0.7%, y cero en el sector que íbamos a trabajar. Google sí los tendría
-- en parte, pero cobra y obliga a borrar los datos a los 30 días.
--
-- El único que sabe a qué hora abre es quien está enfrente. Por eso una
-- corrección de campo se marca con shifts_source = 'campo' y el
-- recalculo automático nunca la pisa. Cada visita deja el directorio un
-- poco mejor que el del INEGI, y eso se acumula.
-- ════════════════════════════════════════════════════════════════════════

alter table public.route_stops
  add column if not exists outcome text,
  add column if not exists notes   text,
  add column if not exists done_at timestamptz;

comment on column public.route_stops.outcome is
  'Resultado de la visita. Mismos valores que visits.outcome, para que el reporte del dia cuadre sin traducir.';

-- ── Marcar una parada ───────────────────────────────────────────────────
-- outcome null la devuelve a pendiente (para deshacer un toque mal dado).
create or replace function public.marcar_parada(
  p_stop_id uuid, p_outcome text, p_notas text default null)
returns table (hechas bigint, total bigint)
language plpgsql security definer
set search_path = public, pg_catalog
as $fn$
declare
  v_route uuid; v_seller uuid; v_biz uuid;
begin
  select rs.route_id, r.seller_id, rs.business_id
    into v_route, v_seller, v_biz
    from public.route_stops rs
    join public.routes r on r.id = rs.route_id
   where rs.id = p_stop_id;

  if v_route is null then
    raise exception 'No existe esa parada';
  end if;

  -- Es security definer, asi que se salta RLS: hay que revisar a mano
  -- que la ruta sea suya. Sin esto un vendedor podria marcar las paradas
  -- de otro y falsear el avance del equipo.
  if auth.uid() is not null
     and v_seller is distinct from auth.uid()
     and not public.is_admin() then
    raise exception 'Esa ruta no es tuya' using errcode = '42501';
  end if;

  update public.route_stops
     set status  = case when p_outcome is null then 'pendiente' else 'hecha' end,
         outcome = p_outcome,
         notes   = coalesce(p_notas, notes),
         done_at = case when p_outcome is null then null else now() end
   where id = p_stop_id;

  -- El negocio queda marcado como visitado: asi se pinta de verde en el
  -- mapa del supervisor y deja de contar como pendiente.
  update public.businesses
     set last_visit_at = case when p_outcome is null then null else now() end,
         status        = case when p_outcome is null then 'nuevo' else 'visitado' end
   where id = v_biz;

  return query
    select count(*) filter (where rs.status = 'hecha'), count(*)
      from public.route_stops rs where rs.route_id = v_route;
end;
$fn$;

-- ── Corregir el turno desde la calle ────────────────────────────────────
create or replace function public.corregir_turno(
  p_business_id uuid, p_turnos text[])
returns text[]
language plpgsql security definer
set search_path = public, pg_catalog
as $fn$
begin
  if p_turnos is null or array_length(p_turnos, 1) is null then
    raise exception 'Hay que decir al menos un turno';
  end if;
  if exists (select 1 from unnest(p_turnos) t
              where t not in ('manana','tarde','noche')) then
    raise exception 'Turnos validos: manana, tarde, noche';
  end if;

  update public.businesses
     set shifts        = p_turnos,
         shifts_source = 'campo',   -- ya no lo pisa aplicar_turnos()
         verified_at   = now(),
         verified_by   = auth.uid()
   where id = p_business_id;

  return p_turnos;
end;
$fn$;

alter function public.marcar_parada(uuid, text, text) set statement_timeout = '60s';
alter function public.corregir_turno(uuid, text[])    set statement_timeout = '60s';

-- ── La ruta del vendedor ────────────────────────────────────────────────
-- No filtra por vendedor: RLS ya hace que cada quien vea solo las suyas.
create or replace view public.v_mi_ruta
with (security_invoker = true) as
select r.id, r.title as titulo, r.date as fecha, r.shift as turno,
       r.status, r.seller_id, s.code as sector_code, z.code as zona_code,
       count(rs.id)                                    as paradas,
       count(rs.id) filter (where rs.status = 'hecha') as hechas,
       count(distinct rs.street)                       as calles,
       coalesce(round(st_length(
         st_makeline(b.geom order by rs.order_index)::geography))::integer, 0) as metros
  from public.routes r
  join public.sectors s on s.id = r.sector_id
  join public.zones   z on z.id = r.zone_id
  left join public.route_stops rs on rs.route_id = r.id
  left join public.businesses  b  on b.id = rs.business_id
 where r.seller_id is not null
 group by r.id, r.title, r.date, r.shift, r.status, r.seller_id, s.code, z.code;

grant select on public.v_mi_ruta to authenticated;
