-- ════════════════════════════════════════════════════════════════════════
-- Sectores: lo que un vendedor recorre en una semana
--
-- Jerarquía completa:
--   zona   (1 mes de una célula de 5)     → 4,693 negocios objetivo
--     └── sector (1 semana de 1 vendedor) → ~213
--           └── ruta (1 día de 1 vendedor) → ~43
--
-- Por qué NO se parte por mitades como las zonas: 22 no es potencia de
-- dos. Cortar por mitades solo da 2, 4, 8, 16, 32… nunca 22.
--
-- El método es por columnas:
--   1. La zona se corta en 5 franjas verticales con la misma cantidad
--      de negocios cada una (no del mismo ancho: donde hay más negocios
--      la franja es más angosta).
--   2. Cada franja se corta en pisos horizontales, también por cantidad
--      de negocios. 5+5+4+4+4 = 22 sectores por zona.
--
-- Cinco columnas porque es la raíz de 22 redondeada: así los sectores
-- salen más o menos cuadrados (~1 km de lado) en lugar de tiras largas y
-- flacas, y un vendedor no termina cruzando la zona de lado a lado.
--
-- Como los cortes son líneas rectas que heredan los límites de la zona,
-- los 22 sectores embonan exactamente dentro de ella: sin huecos ni
-- traslapes, igual que las zonas entre sí.
--
-- Dos detalles que costaron sangre y quedan documentados aquí:
--
--   · Todo va en DOUBLE PRECISION, no en numeric. PostGIS trabaja en
--     double precision; al convertir numeric → float8 → numeric se pierde
--     el último bit y los sectores de la última columna sobresalían de su
--     zona por 1e-14 grados (un nanómetro). Inofensivo en campo, pero
--     rompía la prueba de contención, y una prueba que falla "por poquito"
--     acaba tapando una de verdad.
--
--   · La asignación usa ST_COVERS, no ST_Contains. ST_Contains excluye los
--     puntos que caen exactamente sobre el borde, y los cortes se calculan
--     con valores reales de coordenadas. En el Centro hay cientos de
--     negocios con coordenadas idénticas (plazas, edificios con varios
--     locales), así que caían justo encima del corte y se quedaban sin
--     sector: 533 negocios perdidos solo en Z2.
--
-- Receta:
--   select * from public.generar_sectores();            -- dibuja los 176
--   select public.asignar_sectores_de_zona(code)
--     from public.zones where code is not null
--    order by priority;                                 -- pega los negocios
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.generar_sectores(p_por_zona integer default 22)
returns table (zona text, sectores bigint, min_negocios bigint,
               promedio numeric, max_negocios bigint)
language plpgsql
security definer
set search_path = public, pg_catalog
as $fn$
#variable_conflict use_column
declare
  z        record;
  k        integer := p_por_zona;
  ncols    integer;
  pisos    integer[];
  i        integer;
  j        integer;
  seq      integer;
  acum     double precision;
  x_ini    double precision;
  x_fin    double precision;
  y_ini    double precision;
  y_fin    double precision;
  xmin     double precision;
  xmax     double precision;
  ymin     double precision;
  ymax     double precision;
  -- Holgura mínima para que un corte nunca produzca un rectángulo de
  -- ancho cero. Pasa cuando muchos negocios comparten la misma esquina:
  -- la mediana cae justo encima del corte anterior.
  epsilon  constant double precision := 0.00001;
begin
  if k < 2 then
    raise exception 'Se necesitan al menos 2 sectores por zona, no %', k;
  end if;

  -- Cinco columnas para 22; la raíz redondeada hacia arriba en general
  ncols := ceil(sqrt(k::numeric));

  -- Reparte los 22 sectores entre las 5 columnas: las primeras cargan
  -- el sobrante. 22 entre 5 da 4 con resto 2, así que 5,5,4,4,4.
  pisos := array[]::integer[];
  for i in 1..ncols loop
    pisos := pisos || (k / ncols + case when i <= k % ncols then 1 else 0 end);
  end loop;

  delete from public.sectors;

  for z in
    select id, code, boundary from public.zones
     where code is not null and boundary is not null
     order by priority
  loop
    -- Las zonas son rectángulos, así que su caja ES la zona: los
    -- sectores van a tapizarla completa.
    select st_xmin(z.boundary), st_xmax(z.boundary),
           st_ymin(z.boundary), st_ymax(z.boundary)
      into xmin, xmax, ymin, ymax;

    seq   := 0;
    acum  := 0;
    x_ini := xmin;

    for i in 1..ncols loop
      acum := acum + pisos[i]::double precision / k;

      if i = ncols then
        x_fin := xmax;                       -- la última cierra en la orilla
      else
        select percentile_cont(acum) within group (order by b.lng::double precision)
          into x_fin
          from public.businesses b
         where b.zone_id = z.id and b.is_target;
        x_fin := greatest(coalesce(x_fin, x_ini + epsilon), x_ini + epsilon);
        x_fin := least(x_fin, xmax);
      end if;

      y_ini := ymin;

      for j in 1..pisos[i] loop
        if j = pisos[i] then
          y_fin := ymax;
        else
          select percentile_cont(j::double precision / pisos[i])
                 within group (order by b.lat::double precision)
            into y_fin
            from public.businesses b
           where b.zone_id = z.id and b.is_target
             and b.lng::double precision >= x_ini
             and b.lng::double precision <  x_fin;
          y_fin := greatest(coalesce(y_fin, y_ini + epsilon), y_ini + epsilon);
          y_fin := least(y_fin, ymax);
        end if;

        seq := seq + 1;
        insert into public.sectors (zone_id, code, name, boundary, priority)
        values (
          z.id,
          z.code || '-S' || lpad(seq::text, 2, '0'),
          z.code || ' sector ' || seq,
          -- El recorte final garantiza que el sector nunca se salga de su
          -- zona, pase lo que pase con los decimales.
          st_intersection(
            st_setsrid(st_makeenvelope(x_ini, y_ini, x_fin, y_fin), 4326),
            z.boundary
          ),
          seq
        );

        y_ini := y_fin;
      end loop;

      x_ini := x_fin;
    end loop;
  end loop;

  return query
    with conteo as (
      select s.zone_id, s.id,
             count(b.id) filter (where b.is_target) as n
        from public.sectors s
        left join public.businesses b
               on b.geom is not null and st_covers(s.boundary, b.geom)
       group by s.zone_id, s.id
    )
    select z.code, count(*)::bigint, min(c.n)::bigint,
           round(avg(c.n), 1), max(c.n)::bigint
      from conteo c
      join public.zones z on z.id = c.zone_id
     group by z.code, z.priority
     order by z.priority;
end;
$fn$;

comment on function public.generar_sectores(integer) is
  'Parte cada zona en N sectores con la misma cantidad de negocios objetivo. Default 22 = una semana de vendedor cada uno.';


-- ── Pegar los negocios a su sector, una zona a la vez ───────────────────
-- Igual que con las zonas: todo de golpe se pasa del límite de 2 minutos.
-- Un negocio en el borde califica para dos sectores vecinos; se queda en
-- el de número menor. Así no hay huecos ni duplicados.
create or replace function public.asignar_sectores_de_zona(p_code text)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $fn$
declare
  z_id    uuid;
  movidos integer;
begin
  select id into z_id from public.zones where code = p_code;
  if z_id is null then
    raise exception 'No existe la zona %', p_code;
  end if;

  update public.businesses b
     set sector_id = (
           select s.id
             from public.sectors s
            where s.zone_id = z_id
              and st_covers(s.boundary, b.geom)
            order by s.priority
            limit 1
         )
   where b.zone_id = z_id
     and b.geom is not null;
  get diagnostics movidos = row_count;
  return movidos;
end;
$fn$;

alter function public.generar_sectores(integer)      set statement_timeout = '600s';
alter function public.asignar_sectores_de_zona(text) set statement_timeout = '600s';
