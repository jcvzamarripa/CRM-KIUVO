-- ════════════════════════════════════════════════════════════════════════
-- Vistas para el panel de Territorio del supervisor
--
-- El navegador no entiende las geometrías de PostGIS, así que estas vistas
-- entregan el polígono ya convertido a GeoJSON, que es lo que Leaflet
-- dibuja directo.
--
-- ── Por qué los totales van guardados y no se cuentan al vuelo ──────────
--
-- La primera versión contaba todo en cada carga y tardaba 5.9 s en frío.
-- La API de Supabase corta las consultas de un usuario a los 8 s, así que
-- el panel devolvía error 500 y no mostraba nada.
--
-- La causa de fondo: agrupaba los 71,871 negocios JUNTO con el nombre, el
-- color y los datos del vendedor de cada zona. Agrupar por columnas anchas
-- obliga a Postgres a ordenar renglones gordos, y acababa escribiendo
-- 16 MB en disco nada más para contar.
--
-- La clave está en que hay dos clases de número y se comportan distinto:
--
--   · "Cuántos negocios tiene este sector" cambia casi nunca: solo al
--     reimportar el DENUE o al rehacer los sectores. Se guarda en
--     sectors.objetivo y sectors.con_tel, y se refresca a mano.
--   · "Cuántos ya se visitaron" cambia todos los días, pero es un puñado
--     comparado con el total. Se cuenta en vivo con un índice parcial que
--     solo cubre esa parte, así que el costo es proporcional a lo
--     visitado, no al directorio completo.
--
-- Resultado: 45 ms en lugar de 5,924 ms — 130 veces más rápido. Y sigue
-- siendo rápido cuando el equipo lleve 10,000 visitas encima, que es lo
-- que importa de verdad.
--
-- Después de importar el DENUE o de rehacer sectores:
--   select * from public.refrescar_conteos();
-- ════════════════════════════════════════════════════════════════════════

-- ── Totales guardados ───────────────────────────────────────────────────
alter table public.sectors
  add column if not exists objetivo integer not null default 0,
  add column if not exists con_tel  integer not null default 0;

-- Índices parciales para los conteos en vivo: solo cubren lo visitado y lo
-- convertido en prospecto, que es la parte chica.
create index if not exists businesses_sector_target_idx
  on public.businesses (sector_id) where is_target;
create index if not exists businesses_sector_visitado_idx
  on public.businesses (sector_id) where is_target and last_visit_at is not null;
create index if not exists businesses_sector_prospecto_idx
  on public.businesses (sector_id) where is_target and prospect_id is not null;
create index if not exists businesses_zona_visitado_idx
  on public.businesses (zone_id)   where is_target and last_visit_at is not null;
create index if not exists businesses_zona_prospecto_idx
  on public.businesses (zone_id)   where is_target and prospect_id is not null;

create or replace function public.refrescar_conteos()
returns table (sectores integer, negocios bigint)
language plpgsql
security definer
set search_path = public, pg_catalog
as $fn$
#variable_conflict use_column
declare tocados integer;
begin
  with c as (
    select sector_id,
           count(*)                                                 as objetivo,
           count(*) filter (where phone is not null and phone <> '') as con_tel
      from public.businesses
     where is_target and sector_id is not null
     group by sector_id
  )
  update public.sectors s
     set objetivo   = coalesce(c.objetivo, 0),
         con_tel    = coalesce(c.con_tel, 0),
         updated_at = now()
    from c
   where c.sector_id = s.id
     and (s.objetivo, s.con_tel) is distinct from (c.objetivo::integer, c.con_tel::integer);
  get diagnostics tocados = row_count;

  -- Los sectores que se quedaron sin negocios vuelven a cero
  update public.sectors s
     set objetivo = 0, con_tel = 0, updated_at = now()
   where not exists (select 1 from public.businesses b
                      where b.sector_id = s.id and b.is_target)
     and (s.objetivo <> 0 or s.con_tel <> 0);

  -- Y la zona es la suma de sus sectores
  update public.zones z
     set target_count = t.total, updated_at = now()
    from (select zone_id, sum(objetivo)::integer as total
            from public.sectors where active group by zone_id) t
   where t.zone_id = z.id
     and z.target_count is distinct from t.total;

  return query
    select tocados,
           (select coalesce(sum(objetivo), 0)::bigint from public.sectors);
end;
$fn$;

alter function public.refrescar_conteos() set statement_timeout = '600s';

comment on function public.refrescar_conteos() is
  'Recalcula los totales guardados de cada sector y zona. Correr tras importar el DENUE o rehacer sectores.';


-- ── Las vistas del mapa ─────────────────────────────────────────────────
-- security_invoker: la vista se evalúa con los permisos de quien consulta,
-- no del dueño. Sin esto, cualquiera vería todo saltándose RLS.
drop view if exists public.v_zonas_mapa;
drop view if exists public.v_sectores_mapa;

create view public.v_sectores_mapa
with (security_invoker = true) as
select
  s.id,
  s.code,
  s.zone_id,
  z.code                                   as zona_code,
  z.name                                   as zona_nombre,
  z.color                                  as zona_color,
  z.priority                               as zona_prioridad,
  s.seller_id,
  p.full_name                              as vendedor,
  p.initials                               as vendedor_iniciales,
  p.avatar_color                           as vendedor_color,
  s.objetivo,
  s.con_tel,
  (select count(*) from public.businesses b
    where b.sector_id = s.id and b.is_target and b.last_visit_at is not null) as visitados,
  (select count(*) from public.businesses b
    where b.sector_id = s.id and b.is_target and b.prospect_id is not null)   as prospectos,
  -- A 35 contactos por día, que es el centro de la meta de 30 a 40
  ceil(s.objetivo / 35.0)::integer         as dias_de_trabajo,
  st_asgeojson(s.boundary)::jsonb          as geojson,
  st_y(st_centroid(s.boundary))            as lat,
  st_x(st_centroid(s.boundary))            as lng
from public.sectors s
join public.zones z          on z.id = s.zone_id
left join public.profiles p  on p.id = s.seller_id
where s.active
order by z.priority, s.priority;

comment on view public.v_sectores_mapa is
  'Sectores con su polígono en GeoJSON, el vendedor asignado y el avance. Los totales vienen guardados; lo visitado se cuenta en vivo.';

create view public.v_zonas_mapa
with (security_invoker = true) as
select
  z.id,
  z.code,
  z.name,
  z.color,
  z.priority,
  coalesce(z.target_count, 0)                   as objetivo,
  (select count(*) from public.sectors s
    where s.zone_id = z.id and s.active)                              as sectores,
  (select count(distinct s.seller_id) from public.sectors s
    where s.zone_id = z.id and s.active and s.seller_id is not null)  as vendedores_asignados,
  (select count(*) from public.sectors s
    where s.zone_id = z.id and s.active and s.seller_id is null)      as sectores_libres,
  (select count(*) from public.businesses b
    where b.zone_id = z.id and b.is_target and b.last_visit_at is not null) as visitados,
  (select count(*) from public.businesses b
    where b.zone_id = z.id and b.is_target and b.prospect_id is not null)   as prospectos,
  round((st_area(z.boundary::geography) / 1e6)::numeric, 1)           as km2,
  round(coalesce(z.target_count, 0)
        / greatest(st_area(z.boundary::geography) / 1e6, 0.01)::numeric, 0) as por_km2,
  st_asgeojson(z.boundary)::jsonb               as geojson,
  st_y(st_centroid(z.boundary))                 as lat,
  st_x(st_centroid(z.boundary))                 as lng
from public.zones z
where z.code is not null and z.active
order by z.priority;

comment on view public.v_zonas_mapa is
  'Las 8 zonas con su polígono en GeoJSON y el avance de sus sectores.';

grant select on public.v_sectores_mapa to authenticated;
grant select on public.v_zonas_mapa    to authenticated;
