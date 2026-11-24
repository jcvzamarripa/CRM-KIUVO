-- ════════════════════════════════════════════════════════════════════════
-- Rebalanceo de las 8 zonas de cambaceo
--
-- El problema que resuelve: los polígonos dibujados a mano sobre una foto
-- del DENUE se desbalancean en cuanto entran negocios nuevos. Si una zona
-- tiene 4,800 puertas y otra 3,500, dejan de valer lo mismo: el equipo de
-- la primera nunca termina y el de la segunda se queda sin trabajo.
--
-- Cómo lo parte: cortes por la mediana, tres veces.
--   1. Una línea vertical donde queda la mitad de los negocios  → 2 mitades
--   2. En cada mitad, una línea horizontal por la mediana       → 4 partes
--   3. En cada parte, otra vertical por la mediana              → 8 zonas
--
-- Cortar siempre por la mediana garantiza que las 8 queden con el mismo
-- número de puertas, y como los cortes son líneas rectas las zonas embonan
-- sin huecos ni traslapes. Los límites quedan sobre calles de la cuadrícula
-- de la ciudad, que es más fácil de explicar en campo que un polígono
-- irregular ("de la López Mateos a la Convención" se entiende; "del
-- vértice 14 al 15" no).
--
-- Va en DOS pasos a propósito. Mover 47 mil negocios de zona en una sola
-- transacción se pasa del límite de 2 minutos, porque cada renglón
-- reescribe una docena de índices. Así que:
--
--   select public.marcar_objetivo();      -- 1. a quién vamos a tocar
--   select * from public.rebalancear_zonas();  -- 2. redibuja las 8 zonas
--   select public.asignar_zona(z.code) from public.zones z
--    where z.code is not null order by z.priority;   -- 3. pega los negocios
--
-- El paso 3 también se puede correr zona por zona si alguna se atora.
-- ════════════════════════════════════════════════════════════════════════

-- ── El universo objetivo ────────────────────────────────────────────────
-- Giros de trato directo con el público, que son los que reparten tarjeta:
--   46  comercio al por menor
--   72  restaurantes, bares y hoteles
--   81  otros servicios: estéticas, talleres, lavanderías
--   62  salud: consultorios, dentistas, laboratorios, veterinarias
create or replace function public.marcar_objetivo()
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $fn$
declare
  marcados integer;
  giros   text[] := array['46','72','81','62'];
  tamanos text[] := array['0 a 5 personas','6 a 10 personas',
                          '11 a 30 personas','31 a 50 personas'];
begin
  update public.businesses b
     set is_target = nuevo.v
    from (select id,
                 (locality ilike '%aguascalientes%'
                  and strata = any (tamanos)
                  and scian_sector = any (giros)
                  and geom is not null) as v
            from public.businesses) nuevo
   where b.id = nuevo.id
     and b.is_target is distinct from nuevo.v;
  get diagnostics marcados = row_count;
  return marcados;
end;
$fn$;

comment on function public.marcar_objetivo() is
  'Marca el universo objetivo: mipyme de la ciudad con giro de trato al público.';


-- ── Paso 2: redibujar las zonas ─────────────────────────────────────────
-- Solo toca la tabla zones (8 renglones). No mueve negocios, por eso es
-- rápida. Actualiza los polígonos en su lugar para no romper nada que ya
-- apunte a una zona.
create or replace function public.rebalancear_zonas()
returns table (code text, name text, objetivo bigint, km2 numeric, por_km2 numeric)
language plpgsql
security definer
set search_path = public, pg_catalog
as $fn$
-- Las columnas que devuelve esta función se llaman igual que las de la
-- tabla zones. Esto le dice a Postgres que ante la duda use la columna.
#variable_conflict use_column
declare margen constant numeric := 0.004;   -- ~400 m de holgura en la orilla
begin
  create temp table _zonas on commit drop as
  with pts as (
    select lng as x, lat as y, colony_norm
      from public.businesses
     where is_target and geom is not null
  ),
  caja as (   -- la orilla de la ciudad, con holgura para no cortar negocios
    select min(x) - margen as x0, max(x) + margen as x1,
           min(y) - margen as y0, max(y) + margen as y1
      from pts
  ),
  corte1 as (     -- vertical: Poniente / Oriente
    select percentile_cont(0.5) within group (order by x) as cx from pts
  ),
  n1 as (
    select p.*, case when p.x < c.cx then 'P' else 'O' end as mitad
      from pts p cross join corte1 c
  ),
  corte2 as (     -- horizontal dentro de cada mitad: Sur / Norte
    select mitad, percentile_cont(0.5) within group (order by y) as cy
      from n1 group by mitad
  ),
  n2 as (
    select n.*, case when n.y < c.cy then 'S' else 'N' end as franja
      from n1 n join corte2 c using (mitad)
  ),
  corte3 as (     -- vertical otra vez, dentro de cada cuarto
    select mitad, franja, percentile_cont(0.5) within group (order by x) as cx
      from n2 group by mitad, franja
  ),
  n3 as (
    select n.*, case when n.x < c.cx then 'a' else 'b' end as tira
      from n2 n join corte3 c using (mitad, franja)
  ),
  -- Cada celda hereda sus límites de los cortes que la produjeron, así
  -- que embonan exactamente: sin huecos, sin traslapes.
  celdas as (
    select
      n3.mitad, n3.franja, n3.tira,
      count(*)                                      as objetivo,
      mode() within group (order by n3.colony_norm) as colonia_ancla,
      case when n3.tira = 'a'
           then case when n3.mitad = 'P' then caja.x0 else corte1.cx end
           else corte3.cx end                       as xlo,
      case when n3.tira = 'a'
           then corte3.cx
           else case when n3.mitad = 'P' then corte1.cx else caja.x1 end
      end                                           as xhi,
      case when n3.franja = 'S' then caja.y0 else corte2.cy end as ylo,
      case when n3.franja = 'S' then corte2.cy else caja.y1 end as yhi
    from n3
    cross join caja
    cross join corte1
    join corte2 on corte2.mitad = n3.mitad
    join corte3 on corte3.mitad = n3.mitad and corte3.franja = n3.franja
    group by n3.mitad, n3.franja, n3.tira,
             caja.x0, caja.x1, caja.y0, caja.y1,
             corte1.cx, corte2.cy, corte3.cx
  )
  select
    -- Prioridad por densidad: donde hay más puertas por km2 se camina
    -- menos entre venta y venta, así que esa zona se ataca primero.
    row_number() over (
      order by c.objetivo / greatest(st_area(g.poly::geography) / 1e6, 0.01) desc
    )                                                          as orden,
    -- El nombre lleva el rumbo (para ubicarse en el mapa) y la colonia
    -- con más negocios (para reconocerla en la calle).
    case c.franja when 'N' then 'Nor' else 'Sur' end
      || case c.mitad when 'P' then 'poniente' else 'oriente' end
      || case c.tira  when 'a' then ' 1' else ' 2' end         as rumbo,
    initcap(coalesce(c.colonia_ancla, 'Sin nombre'))           as ancla,
    c.objetivo,
    g.poly
  from celdas c
  cross join lateral (
    select st_setsrid(st_makeenvelope(c.xlo, c.ylo, c.xhi, c.yhi), 4326) as poly
  ) g;

  -- Asegura que existan los 8 renglones Z1..Z8
  insert into public.zones (code, name, municipality, active)
  select 'Z' || z.orden, 'Z' || z.orden, 'Aguascalientes', true
    from _zonas z
  on conflict (code) do nothing;

  update public.zones t
     set name         = 'Z' || z.orden || ' ' || z.rumbo || ' — ' || z.ancla,
         boundary     = z.poly,
         municipality = 'Aguascalientes',
         color        = (array['#D9F25A','#5AC8F2','#F2A65A','#B98AF2',
                               '#7FD4A8','#F28FA6','#8AB4F2','#F2D45A'])[z.orden],
         priority     = z.orden,
         target_count = z.objetivo,
         colonies     = null,
         active       = true,
         updated_at   = now()
    from _zonas z
   where t.code = 'Z' || z.orden;

  return query
    select z.code, z.name, z.target_count::bigint,
           round((st_area(z.boundary::geography) / 1e6)::numeric, 2),
           round(z.target_count
                 / greatest(st_area(z.boundary::geography) / 1e6, 0.01)::numeric, 0)
      from public.zones z
     where z.code is not null
     order by z.priority;
end;
$fn$;

comment on function public.rebalancear_zonas() is
  'Redibuja las 8 zonas con el mismo número de negocios objetivo. No mueve negocios: después hay que correr asignar_zona() por cada una.';


-- ── Paso 3: pegar los negocios, una zona a la vez ───────────────────────
create or replace function public.asignar_zona(p_code text)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $fn$
declare
  z_id   uuid;
  z_poly geometry;
  movidos integer;
begin
  select id, boundary into z_id, z_poly
    from public.zones where code = p_code;
  if z_id is null then
    raise exception 'No existe la zona %', p_code;
  end if;

  update public.businesses b
     set zone_id = z_id
   where b.geom is not null
     and st_contains(z_poly, b.geom)
     and b.zone_id is distinct from z_id;
  get diagnostics movidos = row_count;
  return movidos;
end;
$fn$;

comment on function public.asignar_zona(text) is
  'Pega a su zona los negocios que caen dentro de ese polígono. Una zona por llamada, para no pasarse del límite de tiempo.';

alter function public.marcar_objetivo()   set statement_timeout = '600s';
alter function public.rebalancear_zonas() set statement_timeout = '600s';
alter function public.asignar_zona(text)  set statement_timeout = '600s';


-- ── Paso 4: ponerles nombre reconocible ─────────────────────────────────
-- Nombrar con una sola colonia produce nombres repetidos: Z1 y Z2 salieron
-- las dos como "Zona Centro", porque las dos tienen al Centro como su
-- colonia mas cargada. Con las dos colonias principales el nombre queda
-- unico y el vendedor reconoce el rumbo en la calle.
create or replace function public.nombrar_zonas()
returns table (code text, name text)
language plpgsql
security definer
set search_path = public, pg_catalog
as $fn$
#variable_conflict use_column
begin
  update public.zones t
     set name = 'Z' || t.priority || ' ' || split_part(t.name, ' ', 2)
                || ' ' || split_part(t.name, ' ', 3)
                || ' — ' || top.colonias,
         updated_at = now()
    from (
      select z.id,
             string_agg(initcap(c.colony_norm), ' / ' order by c.n desc) as colonias
        from public.zones z
        cross join lateral (
          select b.colony_norm, count(*) as n
            from public.businesses b
           where b.zone_id = z.id and b.is_target and b.colony_norm is not null
           group by b.colony_norm
           order by count(*) desc
           limit 2
        ) c
       where z.code is not null
       group by z.id
    ) top
   where t.id = top.id;

  return query
    select z.code, z.name from public.zones z
     where z.code is not null order by z.priority;
end;
$fn$;

-- ════════════════════════════════════════════════════════════════════════
-- Receta completa, en orden:
--
--   select public.marcar_objetivo();
--   select * from public.rebalancear_zonas();
--   select public.asignar_zona(code) from public.zones
--    where code is not null order by priority;     -- una por una
--   select * from public.nombrar_zonas();
-- ════════════════════════════════════════════════════════════════════════
