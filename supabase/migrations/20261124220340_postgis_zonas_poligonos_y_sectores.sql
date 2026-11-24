-- ════════════════════════════════════════════════════════════════════════
-- Zonas y sectores como POLÍGONOS en el mapa, no como listas de colonias
--
-- Por qué el cambio: una zona de cambaceo se recorre a pie. El límite que
-- importa es geográfico (esta avenida, aquel arroyo), no administrativo.
-- Agrupar por nombre de colonia tenía dos defectos graves:
--
--   1. Partía colonias entre dos vendedores, porque el INEGI captura el
--      tipo de asentamiento a mano y es inconsistente: el mismo Barrio de
--      Guadalupe aparece como "BARRIO DE GUADALUPE" (647 negocios) y como
--      "DE GUADALUPE" (334). Hay hasta un "BARRIO ZONA CENTRO" con 70
--      negocios que no existe.
--   2. Confundía el "CENTRO" de la capital con el de Calvillo, Jesús
--      María y otros ocho municipios.
--
-- Con polígonos ninguno de los dos problemas aplica: se pregunta "¿este
-- punto cae dentro de esta zona?" y la respuesta no depende de cómo
-- alguien escribió el nombre de la colonia.
--
-- Jerarquía que queda armada:
--   zona   (1 mes de una célula de 5 vendedores)
--     └── sector (1 semana de 1 vendedor)
--           └── ruta (1 día de 1 vendedor)
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists postgis;

-- ── Punto geográfico de cada negocio ────────────────────────────────────
-- Columna generada: se calcula sola desde lat/lng y nunca se desincroniza.
alter table public.businesses
  add column if not exists geom geometry(Point, 4326)
  generated always as (
    case when lat is not null and lng is not null
         then st_setsrid(st_makepoint(lng, lat), 4326)
    end
  ) stored;

create index if not exists businesses_geom_idx on public.businesses using gist (geom);

-- ── Zonas: ahora con frontera ───────────────────────────────────────────
alter table public.zones
  add column if not exists boundary     geometry(Polygon, 4326),
  add column if not exists code         text,
  add column if not exists target_count integer,
  add column if not exists priority     integer,
  add column if not exists notes        text;

-- Sin "where": un índice parcial no lo puede usar ON CONFLICT, y Postgres
-- ya admite varios NULL en un unique normal.
create unique index if not exists zones_code_key on public.zones (code);
create index        if not exists zones_boundary_idx on public.zones using gist (boundary);

-- colonies deja de ser obligatoria: las zonas nuevas no la usan
alter table public.zones alter column colonies drop not null;

-- ── Sectores: una semana de un vendedor ─────────────────────────────────
create table if not exists public.sectors (
  id           uuid primary key default gen_random_uuid(),
  zone_id      uuid not null references public.zones(id) on delete cascade,
  code         text not null,
  name         text,
  boundary     geometry(Polygon, 4326),
  seller_id    uuid references public.profiles(id) on delete set null,
  priority     integer,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index if not exists sectors_code_key     on public.sectors (code);
create index        if not exists sectors_zone_idx     on public.sectors (zone_id);
create index        if not exists sectors_seller_idx   on public.sectors (seller_id);
create index        if not exists sectors_boundary_idx on public.sectors using gist (boundary);

alter table public.businesses
  add column if not exists sector_id uuid references public.sectors(id) on delete set null;
create index if not exists businesses_sector_idx on public.businesses (sector_id);

alter table public.routes
  add column if not exists sector_id uuid references public.sectors(id) on delete set null;

-- ── Marca del universo objetivo ─────────────────────────────────────────
-- No todo el DENUE es cliente de Kiuvo. Esta bandera separa "a quién sí
-- vamos a tocar" del resto, para que las metas se midan sobre lo real.
-- La llena marcar_objetivo(), definida en la migración del rebalanceo.
alter table public.businesses
  add column if not exists is_target boolean not null default false;
create index if not exists businesses_target_idx on public.businesses (is_target) where is_target;

-- ── El disparador, ahora sin trabajo de más ─────────────────────────────
-- Antes recalculaba colony_norm en CADA update, aunque solo se hubiera
-- movido el negocio de zona. Con 47 mil negocios cambiando de zona eran
-- 47 mil expresiones regulares inútiles, y el rebalanceo no alcanzaba a
-- terminar dentro del límite de 2 minutos.
create or replace function public.businesses_normalizar()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $fn$
begin
  if tg_op = 'INSERT' or new.colony is distinct from old.colony then
    new.colony_norm := public.normalizar_colonia(new.colony);
  end if;
  new.updated_at := now();
  return new;
end;
$fn$;

-- ── Asignar por geografía ───────────────────────────────────────────────
-- Reemplaza el match por nombre de colonia: ahora pregunta
-- "¿este punto cae dentro de este polígono?".
--
-- Va zona por zona a propósito: mover decenas de miles de negocios en una
-- sola transacción se pasa del límite de tiempo, porque cada renglón
-- reescribe una docena de índices.
create or replace function public.asignar_zona(p_code text)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $fn$
declare
  z_id    uuid;
  z_poly  geometry;
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

-- Versión que recorre todas las zonas de un jalón. Sirve para bases
-- chicas; en producción se usa asignar_zona() una por una.
create or replace function public.asignar_zonas()
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $fn$
declare afectados integer;
begin
  update public.businesses b
     set zone_id = z.id
    from public.zones z
   where z.active
     and z.boundary is not null
     and b.geom is not null
     and st_contains(z.boundary, b.geom)
     and b.zone_id is distinct from z.id;
  get diagnostics afectados = row_count;
  return afectados;
end;
$fn$;

alter function public.asignar_zona(text) set statement_timeout = '600s';
alter function public.asignar_zonas()    set statement_timeout = '600s';

-- ── Permisos de sectores: igual que zonas ───────────────────────────────
alter table public.sectors enable row level security;

drop policy if exists "sectors: lectura" on public.sectors;
create policy "sectors: lectura" on public.sectors
  for select to authenticated using (true);

drop policy if exists "sectors: admin escribe" on public.sectors;
create policy "sectors: admin escribe" on public.sectors
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

comment on table public.sectors is
  'Sector: lo que un vendedor recorre en una semana. Pedazo de una zona.';
comment on column public.businesses.is_target is
  'true = universo objetivo de Kiuvo (mipyme de la ciudad, giro de trato al público).';
