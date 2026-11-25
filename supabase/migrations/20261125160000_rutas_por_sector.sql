-- ════════════════════════════════════════════════════════════════════════
-- Rutas de día: la lista que el vendedor saca a la calle
--
-- Un sector son ~213 negocios, entre 5 y 7 días a 30-40 contactos diarios.
-- Esto lo parte en rutas de un día, cada una ORDENADA para caminarse.
--
-- ── Cómo se ordena, y por qué así ──────────────────────────────────────
--
-- No se ordena por cercanía punto a punto. Eso produce zigzag: manda al
-- vendedor a cruzar la calle, volver, cruzar otra vez. Un cambaceador
-- real camina una acera completa, se regresa por la otra, y hasta
-- entonces brinca de calle.
--
-- Así que el orden es por CALLE:
--   1. Los negocios se agrupan por calle.
--   2. Dentro de cada calle van en orden de número, de menor a mayor o al
--      revés según por qué punta se entre, para no devolverse.
--   3. Al terminar una calle se brinca a la calle no visitada cuya punta
--      quede más cerca de donde uno acabó.
--
-- El resultado se puede dictar en voz alta: "Jardines Eternos del 202 al
-- 2107, luego cruzas a Tlaquepaque del 102 al 230". Eso un vendedor lo
-- entiende; una lista de coordenadas no.
--
-- Los días salen cortando ese recorrido en tramos del tamaño de la meta
-- diaria. Como el recorrido ya viene ordenado, cada día queda en calles
-- vecinas y no repartido por todo el sector.
--
-- Uso:
--   select * from public.generar_rutas_de_sector('Z7-S01');
--   select * from public.generar_rutas_de_sector('Z7-S01', 40, '2026-12-01');
-- ════════════════════════════════════════════════════════════════════════

-- Una ruta puede existir antes de tener dueño: se genera con el sector y
-- se le asigna vendedor después.
alter table public.routes alter column seller_id drop not null;

alter table public.route_stops
  add column if not exists street   text,
  add column if not exists ext_num  text;

create index if not exists route_stops_business_idx on public.route_stops (business_id);


create or replace function public.generar_rutas_de_sector(
  p_code    text,
  p_por_dia integer default 35,
  p_desde   date    default current_date
)
returns table (ruta text, fecha date, paradas bigint, calles bigint, metros integer)
language plpgsql
security definer
set search_path = public, pg_catalog
as $fn$
declare
  s_id        uuid;
  s_zone      uuid;
  s_seller    uuid;
  s_boundary  geometry;
  -- Nombres que NO chocan con ninguna columna: dentro de una consulta,
  -- PL/pgSQL no sabría si "calle" es la variable o la columna.
  v_calle     text;
  v_por_abajo boolean;
  v_parada    record;
  pos         geometry;      -- dónde terminó el vendedor la calle anterior
  orden       integer := 0;
  r_id        uuid;
  ultimo_dia  integer := -1;
begin
  -- Escribe en routes y route_stops saltandose RLS, asi que hay que
  -- cortarle el paso a quien no sea admin.
  perform public.exigir_admin('generar rutas');

  if p_por_dia < 1 then
    raise exception 'La meta diaria tiene que ser al menos 1, no %', p_por_dia;
  end if;

  select id, zone_id, seller_id, boundary
    into s_id, s_zone, s_seller, s_boundary
    from public.sectors where code = p_code;
  if s_id is null then
    raise exception 'No existe el sector %', p_code;
  end if;

  -- Se rehacen solo las rutas que nadie ha empezado. Si el vendedor ya
  -- salió con una, no se le borra el avance.
  delete from public.routes
   where sector_id = s_id and status = 'pendiente';

  -- ── Los negocios del sector, con su número de puerta ──────────────────
  create temp table _negocios on commit drop as
  select b.id,
         coalesce(nullif(btrim(b.street), ''), 'SIN CALLE')          as calle,
         b.ext_num,
         -- El número puede traer letras ("120A"); se queda con los dígitos
         coalesce(nullif(regexp_replace(coalesce(b.ext_num,''), '\D', '', 'g'), '')::bigint, 0) as num,
         b.geom
    from public.businesses b
   where b.sector_id = s_id and b.is_target and b.geom is not null;

  if not exists (select 1 from _negocios) then
    raise exception 'El sector % no tiene negocios objetivo', p_code;
  end if;

  -- ── Las calles, con sus dos puntas ────────────────────────────────────
  create temp table _calles on commit drop as
  select calle,
         count(*)                                                   as cuantos,
         min(num)                                                   as num_ini,
         max(num)                                                   as num_fin,
         (array_agg(geom order by num asc))[1]                      as punta_baja,
         (array_agg(geom order by num desc))[1]                     as punta_alta,
         false                                                      as hecha,
         0                                                          as paso,
         true                                                       as ascendente
    from _negocios
   group by calle;

  -- Se arranca por la esquina noroeste del sector, para que el recorrido
  -- sea siempre el mismo y el vendedor lo reconozca de un día a otro.
  pos := st_setsrid(st_makepoint(st_xmin(s_boundary), st_ymax(s_boundary)), 4326);

  -- ── Recorrido codicioso: siempre la calle más cercana ─────────────────
  loop
    select c.calle,
           -- ¿Por cuál punta queda más cerca entrar?
           (st_distance(c.punta_baja::geography, pos::geography)
            <= st_distance(c.punta_alta::geography, pos::geography))
      into v_calle, v_por_abajo
      from _calles c
     where not c.hecha
     order by least(st_distance(c.punta_baja::geography, pos::geography),
                    st_distance(c.punta_alta::geography, pos::geography))
     limit 1;

    exit when not found;

    orden := orden + 1;
    update _calles c
       set hecha = true, paso = orden, ascendente = v_por_abajo
     where c.calle = v_calle;

    -- El vendedor termina la calle en la punta contraria a la que entró
    select case when v_por_abajo then c.punta_alta else c.punta_baja end
      into pos
      from _calles c where c.calle = v_calle;
  end loop;

  -- ── El orden final de todas las paradas ───────────────────────────────
  create temp table _paradas on commit drop as
  select n.id,
         n.calle,
         n.ext_num,
         row_number() over (
           order by c.paso,
                    case when c.ascendente then n.num end asc,
                    case when c.ascendente then null else n.num end desc,
                    n.id
         )::integer as orden
    from _negocios n
    join _calles  c using (calle);

  -- ── Una ruta por día ──────────────────────────────────────────────────
  for v_parada in
    select p.id, p.calle, p.ext_num, p.orden,
           ceil(p.orden::numeric / p_por_dia)::integer as dia
      from _paradas p
     order by p.orden
  loop
    if v_parada.dia is distinct from ultimo_dia then
      ultimo_dia := v_parada.dia;
      insert into public.routes
        (seller_id, zone_id, sector_id, date, title, goal_count, status)
      values
        (s_seller, s_zone, s_id,
         p_desde + (v_parada.dia - 1),
         p_code || ' · día ' || v_parada.dia,
         p_por_dia, 'pendiente')
      returning id into r_id;
    end if;

    insert into public.route_stops
      (route_id, business_id, order_index, status, street, ext_num)
    values
      (r_id, v_parada.id,
       v_parada.orden - (v_parada.dia - 1) * p_por_dia,
       'pendiente', v_parada.calle, v_parada.ext_num);
  end loop;

  -- ── Qué quedó ─────────────────────────────────────────────────────────
  return query
    select r.title,
           r.date,
           count(rs.id),
           count(distinct rs.street),
           -- Metros a pie siguiendo el orden de la ruta
           coalesce(round(st_length(
             st_makeline(b.geom order by rs.order_index)::geography
           ))::integer, 0)
      from public.routes r
      join public.route_stops rs on rs.route_id = r.id
      join public.businesses  b  on b.id = rs.business_id
     where r.sector_id = s_id and r.status = 'pendiente'
     group by r.id, r.title, r.date
     order by r.date;
end;
$fn$;

alter function public.generar_rutas_de_sector(text, integer, date)
  set statement_timeout = '600s';

comment on function public.generar_rutas_de_sector(text, integer, date) is
  'Parte un sector en rutas de un día, ordenadas calle por calle en orden de número.';
