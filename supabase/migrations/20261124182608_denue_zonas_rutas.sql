-- ════════════════════════════════════════════════════════════════════════
-- DENUE, zonas y rutas de cambaceo
--
-- Mete una capa nueva antes del embudo: el DIRECTORIO de negocios.
--   negocio   = candidato del DENUE que nadie ha tocado  (tabla businesses)
--   prospecto = alguien que ya mostró interés            (tabla prospects)
-- El vendedor visita negocios; cuando uno responde, se convierte en
-- prospecto y entra al embudo que ya existe. Así el embudo no se llena
-- con decenas de miles de registros fríos.
--
-- Fuente de los datos: INEGI, DENUE. Los Términos de Libre Uso del INEGI
-- permiten copiarlos y explotarlos comercialmente citando la fuente.
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists unaccent;   -- para comparar "MÉXICO" con "MEXICO"
create extension if not exists pg_trgm;    -- búsqueda por parecido en nombres

-- ── Normalizar nombres de colonia ───────────────────────────────────────
-- El INEGI captura las colonias a mano: llegan "CENTRO", "Centro" y
-- "Col. Centro" como si fueran tres cosas distintas.
--
-- OJO: esta version quita prefijos y ESTA SUPERADA. Ver la migracion
-- 20261124231500_conservar_tipo_de_asentamiento.sql: el tipo de
-- asentamiento es parte del nombre del lugar y no se quita nunca. La
-- Colonia San Marcos, el Barrio San Marcos y el Fraccionamiento San
-- Marcos son tres lugares distintos de la ciudad.
create or replace function public.normalizar_colonia(txt text)
returns text
language sql
immutable
set search_path = public, pg_catalog
as $fn$
  select nullif(
    btrim(
      regexp_replace(
        regexp_replace(
          upper(unaccent(coalesce(txt, ''))),
          '^(COL\.?|COLONIA|FRACC\.?|FRACCIONAMIENTO|UNIDAD HAB\.?|U\. HAB\.?|CONJUNTO HAB\.?)\s+', ''
        ),
        '\s+', ' ', 'g'
      )
    ), ''
  );
$fn$;

-- ── Zonas ───────────────────────────────────────────────────────────────
-- Una zona de supervisión agrupa varias colonias ("Centro" puede ser
-- CENTRO + ZONA CENTRO + BARRIO DE LA ESTACION).
create table if not exists public.zones (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  colonies      text[] not null default '{}',   -- colonias normalizadas que agrupa
  municipality  text,
  color         text not null default '#D9F25A',
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index if not exists zones_name_key on public.zones (lower(name));
-- Nota: los indices unicos de esta base van SIN "where". Un indice parcial
-- no lo puede usar ON CONFLICT, y Postgres ya admite varios NULL en un
-- unique normal, asi que la condicion solo rompia las re-importaciones.

-- ── Negocios del directorio ─────────────────────────────────────────────
create table if not exists public.businesses (
  id              uuid primary key default gen_random_uuid(),

  -- Identidad en el DENUE. clee es la clave única del establecimiento;
  -- es lo que permite re-importar sin duplicar.
  denue_id        text,
  clee            text,
  source          text not null default 'denue' check (source in ('denue', 'manual')),

  -- Qué es
  name            text not null,
  legal_name      text,
  activity_class  text,                 -- descripción legible del giro
  scian_sector    text,                 -- 2 dígitos
  scian_subsector text,                 -- 3
  scian_rama      text,                 -- 4
  scian_clase     text,                 -- 6
  strata          text,                 -- estrato de personal ocupado

  -- Dónde está
  street          text,
  ext_num         text,
  int_num         text,
  colony          text,                 -- tal cual viene del INEGI
  colony_norm     text,                 -- normalizada, para agrupar en zonas
  postal_code     text,
  locality        text,
  municipality    text,
  ageb            text,
  manzana         text,
  lat             numeric,
  lng             numeric,

  -- Cómo contactarlo (el DENUE los trae vacíos en buena parte de los casos)
  phone           text,
  email           text,
  website         text,

  -- Nuestro uso
  zone_id         uuid references public.zones(id) on delete set null,
  prospect_id     uuid references public.prospects(id) on delete set null,
  status          text not null default 'nuevo'
                  check (status in ('nuevo','en_ruta','visitado','prospecto','descartado','cerrado')),
  last_visit_at   timestamptz,

  -- Correcciones del vendedor: esto es lo que con el tiempo vuelve este
  -- directorio mejor que el original del INEGI.
  verified_at     timestamptz,
  verified_by     uuid references public.profiles(id) on delete set null,
  notes           text,

  raw             jsonb not null default '{}',   -- registro original del INEGI
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Evita duplicados al re-importar. clee es la llave natural del INEGI;
-- donde no venga, cae a denue_id.
-- Sin "where": un indice unico normal ya permite varios NULL, y los
-- indices parciales no sirven para ON CONFLICT al re-importar.
create unique index if not exists businesses_clee_key
  on public.businesses (clee);
create unique index if not exists businesses_denue_id_key
  on public.businesses (denue_id) where denue_id is not null and clee is null;

create index if not exists businesses_zone_idx    on public.businesses (zone_id);
create index if not exists businesses_status_idx  on public.businesses (status);
create index if not exists businesses_colony_idx  on public.businesses (colony_norm);
create index if not exists businesses_geo_idx     on public.businesses (lat, lng);
create index if not exists businesses_sector_idx  on public.businesses (scian_sector);
create index if not exists businesses_name_trgm   on public.businesses using gin (name gin_trgm_ops);

-- colony_norm se mantiene sola
create or replace function public.businesses_normalizar()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $fn$
begin
  new.colony_norm := public.normalizar_colonia(new.colony);
  new.updated_at  := now();
  return new;
end;
$fn$;
drop trigger if exists businesses_normalizar_trg on public.businesses;
create trigger businesses_normalizar_trg
  before insert or update on public.businesses
  for each row execute function public.businesses_normalizar();

-- ── Rutas (las "misiones" del día) ──────────────────────────────────────
create table if not exists public.routes (
  id           uuid primary key default gen_random_uuid(),
  seller_id    uuid not null references public.profiles(id) on delete cascade,
  zone_id      uuid references public.zones(id) on delete set null,
  date         date not null default current_date,
  title        text not null,
  goal_count   integer not null default 0,     -- meta de negocios a visitar
  status       text not null default 'pendiente'
               check (status in ('pendiente','en_curso','terminada','cancelada')),
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists routes_seller_date_idx on public.routes (seller_id, date desc);

-- ── Paradas de la ruta ──────────────────────────────────────────────────
create table if not exists public.route_stops (
  id           uuid primary key default gen_random_uuid(),
  route_id     uuid not null references public.routes(id) on delete cascade,
  business_id  uuid not null references public.businesses(id) on delete cascade,
  order_index  integer not null default 0,
  status       text not null default 'pendiente'
               check (status in ('pendiente','hecha','omitida')),
  visit_id     uuid references public.visits(id) on delete set null,
  created_at   timestamptz not null default now()
);
create unique index if not exists route_stops_unique on public.route_stops (route_id, business_id);
create index if not exists route_stops_route_idx on public.route_stops (route_id, order_index);

-- ── Enlazar con lo que ya existe ────────────────────────────────────────
-- Hasta hoy el check-in solo podía apuntar a un prospecto. Ahora también
-- a un negocio del directorio, que es el caso normal en cambaceo.
alter table public.visits    add column if not exists business_id uuid references public.businesses(id) on delete set null;
alter table public.prospects add column if not exists business_id uuid references public.businesses(id) on delete set null;
create index if not exists visits_business_idx    on public.visits (business_id);
create index if not exists prospects_business_idx on public.prospects (business_id);

-- ── Asignar negocios a zonas ────────────────────────────────────────────
-- Se corre después de importar o de cambiar las colonias de una zona.
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
     and b.colony_norm = any (z.colonies)
     and b.colony_norm is not null
     and (b.zone_id is distinct from z.id);
  get diagnostics afectados = row_count;
  return afectados;
end;
$fn$;

-- ════════════════════════════════════════════════════════════════════════
-- Permisos
-- ════════════════════════════════════════════════════════════════════════
alter table public.zones       enable row level security;
alter table public.businesses  enable row level security;
alter table public.routes      enable row level security;
alter table public.route_stops enable row level security;

-- Zonas: todos las ven, solo el admin las define
drop policy if exists "zones: lectura" on public.zones;
create policy "zones: lectura" on public.zones
  for select to authenticated using (true);
drop policy if exists "zones: admin escribe" on public.zones;
create policy "zones: admin escribe" on public.zones
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Negocios: todos los ven (el vendedor necesita su zona).
-- El admin administra el catálogo; el vendedor solo corrige datos de campo.
drop policy if exists "businesses: lectura" on public.businesses;
create policy "businesses: lectura" on public.businesses
  for select to authenticated using (true);
drop policy if exists "businesses: admin escribe" on public.businesses;
create policy "businesses: admin escribe" on public.businesses
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "businesses: vendedor corrige" on public.businesses;
create policy "businesses: vendedor corrige" on public.businesses
  for update to authenticated using (true) with check (true);

-- Rutas: el vendedor ve las suyas, el admin todas
drop policy if exists "routes: propias o admin" on public.routes;
create policy "routes: propias o admin" on public.routes
  for select to authenticated using (seller_id = auth.uid() or public.is_admin());
drop policy if exists "routes: admin asigna" on public.routes;
create policy "routes: admin asigna" on public.routes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "routes: vendedor avanza" on public.routes;
create policy "routes: vendedor avanza" on public.routes
  for update to authenticated using (seller_id = auth.uid()) with check (seller_id = auth.uid());

drop policy if exists "route_stops: de mis rutas o admin" on public.route_stops;
create policy "route_stops: de mis rutas o admin" on public.route_stops
  for select to authenticated using (
    public.is_admin() or exists (
      select 1 from public.routes r where r.id = route_id and r.seller_id = auth.uid()
    )
  );
drop policy if exists "route_stops: admin arma" on public.route_stops;
create policy "route_stops: admin arma" on public.route_stops
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "route_stops: vendedor marca" on public.route_stops;
create policy "route_stops: vendedor marca" on public.route_stops
  for update to authenticated using (
    exists (select 1 from public.routes r where r.id = route_id and r.seller_id = auth.uid())
  ) with check (
    exists (select 1 from public.routes r where r.id = route_id and r.seller_id = auth.uid())
  );

comment on table public.businesses is
  'Directorio de negocios. Fuente: INEGI, DENUE (Términos de Libre Uso).';
