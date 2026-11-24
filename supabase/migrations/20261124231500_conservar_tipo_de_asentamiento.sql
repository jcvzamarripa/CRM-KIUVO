-- ════════════════════════════════════════════════════════════════════════
-- El tipo de asentamiento ES parte del nombre del lugar
--
-- Error que corrige: normalizar_colonia quitaba "Colonia", "Fracc.",
-- "Unidad Hab." y otros prefijos, pensando que eran ruido de captura.
-- No lo son. En Aguascalientes la Colonia San Marcos, el Barrio San
-- Marcos y el Fraccionamiento San Marcos son TRES lugares distintos, en
-- rumbos distintos de la ciudad. Lo mismo pasa con privadas, cotos,
-- condominios y unidades habitacionales.
--
-- Tamaño del daño: quedaban revueltos 590 nombres de 1,474, que cubrían
-- 62,064 de los 71,871 negocios — el 86% del directorio. "Zona Centro"
-- escondía 6 lugares distintos y "Centro" 7. Al arreglarlo el directorio
-- pasó de 1,584 asentamientos a 2,382: aparecieron 798 lugares que
-- estaban confundidos con otros.
--
-- Ahora el tipo se conserva siempre. La normalización se limita a lo que
-- de verdad es ruido: mayúsculas, acentos, espacios de más y abreviaturas
-- (Col. y Colonia son el mismo tipo escrito de dos formas; se expanden,
-- no se borran).
--
-- Esto NO afecta zonas ni sectores: están definidos por polígonos
-- geográficos justamente para no depender de cómo se escribió el nombre.
-- Después de correr esto conviene refrescar los nombres de las zonas con
-- select * from public.nombrar_zonas();
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.normalizar_colonia(txt text)
returns text
language sql
immutable
set search_path = public, pg_catalog
as $fn$
  select nullif(btrim(
    regexp_replace(
      -- Expandir abreviaturas al tipo completo, para que "Col. Centro" y
      -- "Colonia Centro" caigan en el mismo lugar. Expande, no borra: el
      -- tipo identifica al asentamiento.
      regexp_replace(
      regexp_replace(
      regexp_replace(
      regexp_replace(
        upper(unaccent(coalesce(txt, ''))),
        '^COL\.\s*',                      'COLONIA '),
        '^FRACC\.?\s+',                   'FRACCIONAMIENTO '),
        '^(U\.?\s*|UNIDAD\s+)HAB\.?\s+',  'UNIDAD HABITACIONAL '),
        '^(CONJ\.?|CJTO\.?)\s*HAB\.?\s+', 'CONJUNTO HABITACIONAL '),
      '\s+', ' ', 'g'
    )
  ), '');
$fn$;

comment on function public.normalizar_colonia(text) is
  'Normaliza un nombre de asentamiento sin quitarle el tipo: Colonia San Marcos y Barrio San Marcos son lugares distintos.';


-- ── Reconstruir el nombre completo desde el registro original ───────────
-- El importador guardaba solo la segunda mitad del campo (el nombre sin
-- el tipo). El registro original del INEGI quedó completo en la columna
-- raw, así que se puede reconstruir sin volver a descargar los 546 MB.
create or replace function public.colonia_desde_raw(r jsonb)
returns text
language sql
immutable
set search_path = public, pg_catalog
as $fn$
  with p as (
    select upper(btrim(coalesce(r->>'tipo_asent', ''))) as tipo,
           btrim(coalesce(r->>'nomb_asent', ''))        as nombre
  )
  select case
           when p.nombre = '' then null
           -- Tipos que no dicen nada del lugar
           when p.tipo in ('', 'NINGUNO', 'OTRO') then p.nombre
           -- El INEGI a veces ya trae el tipo dentro del nombre
           -- ("BARRIO" + "BARRIO DE TRIANA"); no hay que duplicarlo
           when upper(unaccent(p.nombre)) like upper(unaccent(p.tipo)) || ' %'
             then p.nombre
           else p.tipo || ' ' || p.nombre
         end
    from p;
$fn$;

comment on function public.colonia_desde_raw(jsonb) is
  'Arma el nombre completo del asentamiento (tipo + nombre) desde el registro original del DENUE.';


-- ── Aplicarlo por lotes ─────────────────────────────────────────────────
-- 71,871 renglones de golpe se pasan del límite de 2 minutos, porque cada
-- uno reescribe una docena de índices. Se corre en lotes hasta que
-- devuelva cero:
--   select public.reconstruir_colonias(20000);   -- repetir hasta 0
create or replace function public.reconstruir_colonias(p_lote integer default 8000)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $fn$
declare arreglados integer;
begin
  update public.businesses b
     set colony = public.colonia_desde_raw(b.raw)
   where b.id in (
     select id from public.businesses
      where raw ? 'nomb_asent'
        and colony is distinct from public.colonia_desde_raw(raw)
      limit p_lote
   );
  get diagnostics arreglados = row_count;
  return arreglados;
end;
$fn$;

alter function public.reconstruir_colonias(integer) set statement_timeout = '600s';
